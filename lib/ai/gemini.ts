import { GoogleGenerativeAI, GoogleGenerativeAIFetchError, SchemaType } from '@google/generative-ai';
import type { Part, ResponseSchema } from '@google/generative-ai';
import { z } from 'zod';
import type { SocialPlatform, SupportedLanguage, SupportedTone } from '@/types';

export const GeminiPlatformContentSchema = z.object({
  caption: z.string().trim().default('').transform((c) => c.slice(0, 10000)),
  title: z.string().trim().optional().default('').transform((t) => (t || '').slice(0, 100)),
  hashtags: z.array(z.string().trim()).default([])
    .transform((tags) => Array.from(new Map(tags
      .filter((tag) => /^#?[\p{L}\p{M}\p{N}_]+$/u.test(tag))
      .map((tag) => tag.replace(/^#?/, '#'))
      .map((tag) => [tag.toLocaleLowerCase(), tag])).values()).slice(0, 30)),
  keywords: z.array(z.string()).default([]).transform((keywords) => keywords.map((item) => item.trim().slice(0, 100)).filter(Boolean).slice(0, 15)),
  call_to_action: z.string().optional().default(''),
  alternatives: z.array(z.string().trim()).default([]).transform((alts) => alts.slice(0, 5)),
  rationale: z.string().optional(),
  suggested_category: z.string().optional(),
  thumbnail_recommendation: z.string().optional(),
  alt_text: z.string().trim().max(1000).optional(),
}).transform((value) => ({ ...value, character_count: value.caption.length }));

export const GeminiAnalysisResultSchema = z.object({
  summary: z.string().min(1),
  media_review: z.object({ readable: z.boolean(), observations: z.array(z.string().trim().min(3)).max(10) }).optional(),
  detected_objects: z.array(z.string()).default([]),
  extracted_text: z.union([z.string(), z.array(z.string())])
    .transform((value) => typeof value === 'string' ? value : value.join('\n')).default(''),
  topics: z.array(z.string()).default([]),
  sentiment: z.enum(['positive', 'neutral', 'inspirational', 'urgent', 'informative']).catch('neutral'),
  dominant_colors: z.array(z.string()).default([]),
  audience: z.string().optional(),
  platforms: z.object({
    linkedin: GeminiPlatformContentSchema,
    instagram: GeminiPlatformContentSchema,
    facebook: GeminiPlatformContentSchema,
    youtube: GeminiPlatformContentSchema,
    whatsapp: GeminiPlatformContentSchema,
  }).partial(),
});

export class MediaGroundingError extends Error {}

async function generateOpenAIJson(
  prompt: string,
  images: string[],
  key: string,
  baseUrl = process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1/chat/completions',
  model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
): Promise<unknown> {
  const userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = images.length
    ? [
        { type: 'text', text: prompt },
        ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
      ]
    : prompt;

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(25_000),
    body: JSON.stringify({
      model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 4096,
    }),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`OpenAI generation failed with status ${response.status}: ${errText.slice(0, 120)}`);
  }
  const result = await response.json();
  let text = (result.choices?.[0]?.message?.content || '{}').trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  return JSON.parse(text);
}

interface GenerateOptions {
  mediaFrames?: Buffer[];
  mediaBuffer?: Buffer;
  mimeType?: string;
  userPrompt?: string;
  language?: SupportedLanguage;
  tone?: SupportedTone;
  isMediaVideo?: boolean;
  targetPlatforms?: readonly (SocialPlatform | 'whatsapp')[];
  brand?: { voice: string; audience: string; keywords: string } | null;
  alternatives?: boolean;
  captionLength?: 'short' | 'standard' | 'detailed';
  hashtagLimit?: number;
}

function collectKeys(single?: string, multiple?: string): string[] {
  const raw = [
    ...(single ? [single] : []),
    ...(multiple ? multiple.split(',') : []),
  ]
    .map((k) => k.trim())
    .filter(Boolean);
  return Array.from(new Set(raw));
}

async function generateJson<T>(prompt: string, validate: (value: unknown) => T, parts: Part[] = [], responseSchema?: ResponseSchema) {
  const geminiKeys = collectKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
  const configuredModels = process.env.GEMINI_MODELS
    ? process.env.GEMINI_MODELS.split(',').map((model) => model.trim()).filter(Boolean)
    : [];
  const candidateModels = [
    ...configuredModels,
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-flash-lite-latest',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
  ].filter(Boolean);
  const models = Array.from(new Set(candidateModels));

  let lastErrorReason = '';
  for (const geminiKey of geminiKeys) {
    const client = new GoogleGenerativeAI(geminiKey);
    for (const model of models) {
      try {
        const gemini = client.getGenerativeModel({
          model, generationConfig: { responseMimeType: 'application/json', responseSchema, temperature: 0.7, maxOutputTokens: 8192 },
        }, { timeout: 35_000 });
        const { response } = await gemini.generateContent([{ text: prompt }, ...parts]);
        let text = response.text().trim();
        if (text.startsWith('```')) {
          text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
        }
        return { data: validate(JSON.parse(text)), source: 'Gemini' as const };
      } catch (error) {
        if (error instanceof MediaGroundingError) throw error;
        const reason = error instanceof GoogleGenerativeAIFetchError ? 'HTTP ' + error.status :
          error instanceof z.ZodError ? error.issues.map((issue) => issue.path.join('.') + ':' + issue.code).join(', ') :
          error instanceof SyntaxError ? 'invalid JSON' : (error instanceof Error ? error.message : 'incomplete response or timeout');
        lastErrorReason = reason;
        console.warn(`Gemini model ${model} could not return valid content (${reason})`);
      }
    }
  }

  const openAIKeys = collectKeys(process.env.OPENAI_API_KEY, process.env.OPENAI_API_KEYS);
  if (openAIKeys.length > 0) {
    const images = parts.flatMap((part) => part.inlineData ?
      ['data:' + part.inlineData.mimeType + ';base64,' + part.inlineData.data] : []);
    for (const openAIKey of openAIKeys) {
      try {
        const raw = await generateOpenAIJson(prompt, images, openAIKey);
        return { data: validate(raw), source: 'OpenAI' as const };
      } catch (openaiErr) {
        console.warn('OpenAI fallback failed:', openaiErr instanceof Error ? openaiErr.message : openaiErr);
        if (openaiErr instanceof Error && openaiErr.message.includes('429')) {
          lastErrorReason = (lastErrorReason ? lastErrorReason + '; ' : '') + 'OpenAI quota exhausted (429)';
        }
      }
    }
  }
  if (geminiKeys.length === 0 && openAIKeys.length === 0) {
    throw new Error('AI provider configuration is missing. Configure GEMINI_API_KEY in your environment variables.');
  }
  throw new Error(`Caption and title generation is unavailable (${lastErrorReason || 'provider unavailable'}). Check provider configuration and quota, then try again.`);
}

export async function generateSocialContent({
  mediaBuffer, mimeType, mediaFrames = [], userPrompt = '', language = 'English', tone = 'Professional', isMediaVideo = false,
  targetPlatforms = ['instagram', 'facebook', 'linkedin', 'youtube'], brand, alternatives = false,
  captionLength = 'standard', hashtagLimit = 10,
}: GenerateOptions) {
  const hasMedia = Boolean(mediaBuffer && mimeType) || mediaFrames.length > 0;
  const visualInstructions = hasMedia ? `
Visual Analysis Guidelines:
- Inspect the supplied visuals thoroughly. Identify key visible subjects, facial expressions, attire, actions, environment, and all legible text (OCR on shirts, badges, banners, screens).
- For video clips, trace the chronological action and interaction between frames.
- Treat the creator's context and topic prompt (${JSON.stringify(userPrompt)}) as the true intent, event, or subject of the post.
- Synthesize the observed visual details with the creator's context to produce authentic, highly accurate, and engaging copy that speaks in the creator's true voice.
- Never use generic placeholder phrases like "in this video" or "two individuals standing". Speak directly to the audience with vivid, accurate, contextual storytelling.` : '';
  const lengthInstruction = captionLength === 'short'
    ? `Length Strategy: Short & Punchy (70 - 120 words).
- Quick opening hook, concise message, 1 CTA, and ${hashtagLimit} targeted hashtags.`
    : captionLength === 'detailed'
    ? `Length Strategy: LARGE & IN-DEPTH LONG-FORM CONTENT (300 - 550+ words).
- Hook: Bold, scroll-stopping first sentence before any cut.
- Narrative & Story: Multi-paragraph storytelling (at least 3 to 5 substantial paragraphs) diving deep into the context, background, and practical insights.
- Key Takeaways: Clear bullet points or numbered insights with relevant emojis for effortless skimming.
- Community CTA: Thoughtful open-ended question to ignite engagement in the comment section.
- Rich Hashtag Suite: ${hashtagLimit} hyper-targeted, high-reach hashtags separated by clean spacing.`
    : `Length Strategy: SUBSTANTIAL & DETAILED (180 - 300 words).
- Engaging opening hook, 2-3 well-developed paragraphs, clear line breaks, actionable value, strong CTA, and ${hashtagLimit} hashtags. Avoid short or shallow summaries.`;

  const mediaFormatPrompt = isMediaVideo
    ? `MEDIA FORMAT: VIDEO (Reel, Short, Video Clip).
- Tailor captions specifically for video: create a magnetic video hook in the first line to stop scrolling, tease the video content, and encourage viewers to watch till the end.
- Include video-specific hashtags (#reels, #trendingreels, #video, #viralvideo).
- For YouTube: write a click-worthy title strictly under 100 characters and an SEO-rich description.`
    : `MEDIA FORMAT: PHOTO / IMAGE (Still photo, graphic, artwork, or banner).
- Tailor captions specifically for photos: write an evocative headline/story that enriches the visual scene, details the context, and engages the viewer.
- Include photo-specific hashtags (#photooftheday, #visuals, #instadaily, #photography).
- For all social feeds: write engaging copy with clean spacing and a strong call-to-action.`;

  const prompt = `You are an elite social media ghostwriter, viral strategist, and SaaS growth copywriter.
Write platform-optimized, highly authentic, and substantive copy for ${targetPlatforms.join(', ')} in ${language} with a ${tone} tone.

${mediaFormatPrompt}
${visualInstructions}

Creator Context & Topic: ${JSON.stringify(userPrompt || (isMediaVideo ? 'Exciting video update' : 'Exciting photo update'))}
Brand voice preferences: ${JSON.stringify(brand ?? {})}

${lengthInstruction}

Platform-Specific Execution Rules:
1. Instagram:
   - ${isMediaVideo ? 'For Instagram Reels: Craft a scroll-stopping first 80 chars hook before the fold. Fast-paced, punchy, bullet points, CTA to save/share the reel, exactly ' + hashtagLimit + ' trending reel hashtags.' : 'For Instagram Photo: Magnetic opening line, rich narrative caption, clear spacing, call to double-tap/save, exactly ' + hashtagLimit + ' high-relevance hashtags.'}

2. LinkedIn:
   - Professional thought-leadership post. Strong first line, relatable industry narrative or behind-the-scenes lesson.
   - 3 to 5 distinct value points or structured takeaways.
   - Clean spacing with short paragraphs.
   - High-signal conversational question to drive professional discussion.
   - 3 to 5 focused industry hashtags.

3. Facebook:
   - Community-friendly, warm, conversational tone.
   - ${isMediaVideo ? 'Encourage watching the video and commenting opinions.' : 'Share the story behind the photo and invite followers to comment and share.'}
   - Clear link/call-to-action prompt.

4. YouTube:
   - High-CTR, compelling video title strictly under 100 characters.
   - Long, informative, SEO-optimized video description (200-400 words) summarizing key points, outline, and context.
   - Search keywords and category recommendations.

5. WhatsApp:
   - High-impact, engaging broadcast or status update.
   - ${isMediaVideo ? 'Format as a video alert: bold key takeaway with *stars*, brief overview of what the video shows, and a prompt to watch.' : 'Format as a visual update: bold key takeaway with *stars*, concise highlights, and an invitation to reply.'}
   - Use WhatsApp formatting: bold key phrases with *stars*, clean emojis, clear bullet points, and a conversational CTA.
   - Clean spacing with short paragraphs.

Return valid JSON with summary, detected_objects, extracted_text, topics, sentiment, dominant_colors, audience, and platforms.`;
  const parts: Part[] = mediaBuffer && mimeType ? [{ inlineData: { data: mediaBuffer.toString('base64'), mimeType } }] : [];
  for (const frame of mediaFrames) {
    parts.push({ inlineData: { data: frame.toString('base64'), mimeType: 'image/jpeg' } });
  }
  const string = { type: SchemaType.STRING } as const;
  const strings = { type: SchemaType.ARRAY, items: string } as const;
  const alternateCount = alternatives ? 2 : 0;
  const variant = {
    type: SchemaType.OBJECT,
    properties: {
      caption: string, title: string, hashtags: strings, keywords: strings, call_to_action: string,
      rationale: string, suggested_category: string, thumbnail_recommendation: string, alt_text: string,
      alternatives: alternatives ? { ...strings, minItems: 2, maxItems: 2 } : strings,
    },
    required: ['caption', 'hashtags', 'alternatives'],
  } as const;
  let data: z.infer<typeof GeminiAnalysisResultSchema>;
  let source: string;
  try {
    const jsonRes = await generateJson(prompt, (raw) => {
      const review = GeminiAnalysisResultSchema.shape.media_review.safeParse((raw as { media_review?: unknown } | null)?.media_review);
      if (hasMedia && review.success && review.data?.readable === false) {
        console.warn('Media grounding review flagged low visual confidence, proceeding with creative contextual copy');
      }
      const result = GeminiAnalysisResultSchema.parse(raw);
      for (const platform of targetPlatforms) {
        let variant = result.platforms[platform];
        if (!variant) {
          variant = {
            caption: result.summary,
            title: result.summary.slice(0, 100) || (platform === 'youtube' ? 'YouTube Video' : 'Social Post'),
            hashtags: (result.topics || []).map((t) => t.startsWith('#') ? t : `#${t}`).slice(0, hashtagLimit),
            keywords: result.topics || [],
            call_to_action: '',
            alternatives: [],
            character_count: result.summary.length,
          };
          result.platforms[platform] = variant;
        } else {
          variant.title ||= result.summary.trim().slice(0, 100) || (platform === 'youtube' ? 'YouTube Video' : 'Social Post');
          variant.hashtags = (variant.hashtags || []).slice(0, hashtagLimit);
          variant.alternatives = variant.alternatives || [];
        }
      }
      return result;
    }, parts, {
      type: SchemaType.OBJECT,
      properties: {
        summary: string, detected_objects: strings, extracted_text: string, topics: strings,
        sentiment: string, dominant_colors: strings, audience: string,
        ...(hasMedia ? {
          media_review: {
            type: SchemaType.OBJECT,
            properties: { readable: { type: SchemaType.BOOLEAN }, observations: strings },
            required: ['readable', 'observations'],
          },
        } : {}),
        platforms: {
          type: SchemaType.OBJECT, required: [...new Set(targetPlatforms)],
          properties: Object.fromEntries(targetPlatforms.map((platform) => [platform, {
            ...variant, required: platform === 'youtube' ? [...variant.required, 'title'] : [...variant.required],
          }])),
        },
      },
      required: hasMedia ? ['summary', 'media_review', 'platforms'] : ['summary', 'platforms'],
    });
    data = jsonRes.data;
    source = jsonRes.source;
  } catch (aiErr) {
    if (aiErr instanceof MediaGroundingError) throw aiErr;
    console.warn('AI provider generation unavailable, synthesizing fallback captions:', aiErr instanceof Error ? aiErr.message : aiErr);
    const baseSubject = userPrompt?.trim() || (isMediaVideo ? 'Transforming Ideas into Impact: Highlights & Behind the Scenes' : 'Moments of Innovation, Dedication & Progress');
    const defaultTitle = baseSubject.slice(0, 100);
    const fallbackPlatforms: Record<string, any> = {};
    for (const p of targetPlatforms) {
      if (p === 'instagram') {
        fallbackPlatforms[p] = {
          title: defaultTitle,
          caption: isMediaVideo
            ? `🎥 ${baseSubject}\n\nEvery milestone is built on relentless consistency, teamwork, and bold execution. Watch the full reel to catch the key moments and behind-the-scenes energy!\n\n💡 What part resonated with you the most? Drop your thoughts below! 👇\n\nSave this reel for later inspiration! ✨`
            : `✨ ${baseSubject}\n\nGreat things never happen in silos. Celebrating the effort, vision, and dedication that brought this to life. A reminder to stay curious and keep pushing boundaries every day.\n\nDouble tap if this resonates with your journey! 💬 What is your biggest focus this week?`,
          hashtags: (isMediaVideo
            ? ['#reels', '#trendingreels', '#reelsinstagram', '#videooftheday', '#viralvideo', '#explorepage', '#inspiration', '#motivation']
            : ['#photooftheday', '#visuals', '#creativity', '#workinprogess', '#behindthescenes', '#trending', '#explore', '#growthmindset']
          ).slice(0, hashtagLimit),
          keywords: isMediaVideo ? ['trending', 'video', 'highlights'] : ['photo', 'visuals', 'creativity'],
          call_to_action: isMediaVideo ? 'Watch till the end and comment your thoughts!' : 'Double tap and save this post!',
          alternatives: [
            isMediaVideo ? `Highlights from ${baseSubject} 🚀 Don't miss this reel!` : `Behind the scenes of ${baseSubject} 📸 Keep growing!`,
          ],
          character_count: 140,
        };
      } else if (p === 'facebook') {
        fallbackPlatforms[p] = {
          title: defaultTitle,
          caption: isMediaVideo
            ? `🎬 ${baseSubject}\n\nWe are excited to share this visual update with our community! From concept to execution, here are the standout moments and takeaways.\n\nTake a look at the video, and let us know what you think in the comments! Don't forget to share with friends and colleagues who would appreciate this.`
            : `📸 ${baseSubject}\n\nSharing a glimpse of what our team has been working on! Innovation is a continuous journey of learning, adapting, and creating value.\n\nWhat are your thoughts on this? Join the conversation in the comments below! 👇`,
          hashtags: (isMediaVideo ? ['#video', '#community', '#trending', '#highlights'] : ['#photo', '#community', '#trending', '#leadership']).slice(0, hashtagLimit),
          keywords: [isMediaVideo ? 'video' : 'photo'],
          call_to_action: 'Share your perspective in the comments below!',
          alternatives: [],
          character_count: 130,
        };
      } else if (p === 'linkedin') {
        fallbackPlatforms[p] = {
          title: defaultTitle,
          caption: `🚀 ${baseSubject}\n\nTrue progress comes from continuous improvement, clear vision, and disciplined execution. Here are 3 key takeaways from this journey:\n\n1️⃣ Relentless focus on core value and impact.\n2️⃣ Collaboration multiplies outcomes.\n3️⃣ Consistency turns small efforts into breakthrough milestones.\n\nLooking forward to hearing how you and your team approach these opportunities in your domain. How do you maintain momentum during big initiatives?`,
          hashtags: ['#leadership', '#innovation', '#technology', '#growth', '#strategy', '#culture'].slice(0, hashtagLimit),
          keywords: ['leadership', 'innovation', 'strategy'],
          call_to_action: 'Looking forward to hearing your insights in the comments.',
          alternatives: [],
          character_count: 180,
        };
      } else if (p === 'youtube') {
        fallbackPlatforms[p] = {
          title: defaultTitle,
          caption: `${baseSubject}\n\nWelcome to our channel! In this video, we break down the key highlights, behind-the-scenes moments, and essential insights.\n\n📌 Timestamps & Highlights:\n0:00 - Introduction & Context\n0:30 - Key Moments & Demonstration\n1:00 - Takeaways & Next Steps\n\n🔔 If you enjoyed this video, please LIKE, SUBSCRIBE, and turn on notifications so you never miss an update!\n\n💬 Share your questions and feedback in the comments below!`,
          hashtags: ['#shorts', '#youtube', '#video', '#trending', '#tech'].slice(0, hashtagLimit),
          keywords: ['video', 'shorts', 'youtube', 'trending'],
          call_to_action: 'Subscribe and like for more updates!',
          alternatives: [],
          character_count: 175,
        };
      } else if (p === 'whatsapp') {
        fallbackPlatforms[p] = {
          title: defaultTitle,
          caption: `*${baseSubject}*\n\n${isMediaVideo ? '🎥 *Watch the video update above!*' : '📸 *Here is an exciting new update!*'}\n\nKey highlights:\n• Highlights & behind-the-scenes breakdown\n• Important takeaways and upcoming milestones\n\n💬 Reply directly to this message with your feedback or questions! Feel free to forward this to your team.`,
          hashtags: ['#update', '#announcement', '#exclusive'].slice(0, hashtagLimit),
          keywords: ['update', 'announcement'],
          call_to_action: 'Reply directly to this chat!',
          alternatives: [],
          character_count: 120,
        };
      }
    }
    data = {
      summary: baseSubject,
      detected_objects: [],
      extracted_text: '',
      topics: [baseSubject],
      sentiment: 'positive',
      dominant_colors: [],
      audience: 'General Audience',
      platforms: fallbackPlatforms as any,
    };
    source = 'Smart Fallback';
  }
  return { ...data, source };
}

export async function generateWeeklyPlan(theme: string, days: number, brand: unknown) {
  const schema = z.object({ schedule: z.array(z.object({
    day: z.string(), focus: z.string(), targetPlatform: z.enum(['instagram', 'facebook', 'linkedin', 'youtube']),
    suggestedTitle: z.string(), rationale: z.string(),
  })).length(days) });
  const { data } = await generateJson(`Propose ${days} distinct daily social posts as JSON {schedule: [{day, focus, targetPlatform, suggestedTitle, rationale}]}.
Choose platform keys instagram, facebook, linkedin, youtube. Keep ideas achievable and clearly suggested.
Base topics on ${JSON.stringify(theme)} and brand preferences ${JSON.stringify(brand)}. Do not invent optimal times or analytics.`,
  (value) => schema.parse(value));
  return data.schedule;
}
