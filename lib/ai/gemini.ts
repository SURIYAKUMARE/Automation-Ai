import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { z } from 'zod';
import { GeminiAnalysisResult, SupportedLanguage, SupportedTone } from '@/types';

// Zod schema for structured output validation
export const GeminiPlatformContentSchema = z.object({
  caption: z.string().min(1),
  title: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  call_to_action: z.string().default(''),
  character_count: z.number().default(0),
  estimated_read_time_seconds: z.number().optional(),
});

export const GeminiAnalysisResultSchema = z.object({
  summary: z.string().min(1),
  detected_objects: z.array(z.string()).default([]),
  extracted_text: z.string().optional().default(''),
  topics: z.array(z.string()).default([]),
  sentiment: z.enum(['positive', 'neutral', 'inspirational', 'urgent', 'informative']).default('positive'),
  dominant_colors: z.array(z.string()).default([]),
  platforms: z.object({
    linkedin: GeminiPlatformContentSchema,
    instagram: GeminiPlatformContentSchema,
    facebook: GeminiPlatformContentSchema,
    youtube: GeminiPlatformContentSchema.optional(),
  }),
});

interface GenerateCaptionsOptions {
  mediaBuffer?: Buffer;
  mimeType?: string;
  userPrompt?: string;
  language?: SupportedLanguage;
  tone?: SupportedTone;
  isMediaVideo?: boolean;
}

export async function generateSocialContentWithGemini({
  mediaBuffer,
  mimeType,
  userPrompt = '',
  language = 'English',
  tone = 'Professional',
  isMediaVideo = false,
}: GenerateCaptionsOptions): Promise<GeminiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.includes('DevelopmentMockKey')) {
    // Generate clean, high-precision editorial content without emojis
    return generateCleanEditorialContent(userPrompt, language, tone, isMediaVideo);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  });

  const promptParts: (string | Part)[] = [];

  // Google Stitch Design System Editorial Prompt (Strictly NO EMOJIS, High Editorial Precision)
  const systemPrompt = `
You are the Lead Editorial AI for SocialSync AI, operating under the Google Stitch Enterprise Design System.
Your task is to analyze visual media and generate highly articulate, platform-tailored publishing content for LinkedIn, Instagram, Facebook, and YouTube.

EDITORIAL STYLE REQUIREMENTS (GOOGLE STITCH SPECIFICATION):
1. ABSOLUTELY ZERO EMOJIS. Do not include any unicode emojis or emoticon symbols in any generated field (no rockets, no fire, no sparkles, no pointing fingers).
2. Maintain high editorial clarity, intellectual rigor, and razor-sharp typographic hierarchy.
3. Use clean unicode bullets (• or ▸) and line breaks for structure.
4. **LINKEDIN**:
   - Opening line: High-impact thesis statement or contrarian business observation.
   - Core body: Analytical breakdown of the topic, framework, or architectural milestone depicted.
   - Actionable takeaways in concise bulleted form.
   - Concluding invitation to intellectual discourse or debate.
   - 3 to 5 targeted industry hashtags at the bottom.
5. **INSTAGRAM**:
   - Clean, aesthetic, typographic caption focused on visual narrative and design clarity.
   - Clean line spacing without decorative symbols.
   - Explicit call to action: "Save this post for reference." or "Join the conversation in the comments."
   - 6 to 10 relevant topic tags.
6. **FACEBOOK**:
   - Community-focused, thorough, readable narrative detailing the engineering or initiative context.
   - Articulate call to action inviting thoughts and shares.
7. **YOUTUBE**:
   - Informative, high-relevance title (under 70 characters).
   - Structured video description including chapter breakdowns ([00:00] Overview, [02:15] Deep Dive, [05:00] Implementation), reference links placeholder, and search tags.

LANGUAGE & TONE:
- Language: ${language} (English, Tamil in authentic script, or Tanglish in Latin script).
- Tone: ${tone}.
- User Context: "${userPrompt.replace(/"/g, "'")}"

You MUST respond strictly with a valid JSON object matching this schema:
{
  "summary": "Precise visual and thematic summary",
  "detected_objects": ["object1", "object2"],
  "extracted_text": "Extracted text or title from media",
  "topics": ["topic1", "topic2"],
  "sentiment": "positive" | "neutral" | "inspirational" | "urgent" | "informative",
  "dominant_colors": ["#hex1", "#hex2"],
  "platforms": {
    "linkedin": {
      "caption": "Full analytical LinkedIn post with line breaks",
      "hashtags": ["#Tag1", "#Tag2"],
      "call_to_action": "Closing discussion prompt",
      "character_count": 0
    },
    "instagram": {
      "caption": "Clean editorial Instagram caption without emojis",
      "hashtags": ["#Tag1", "#Tag2"],
      "call_to_action": "Closing call to action",
      "character_count": 0
    },
    "facebook": {
      "caption": "Articulate community post",
      "hashtags": ["#Tag1", "#Tag2"],
      "call_to_action": "Closing community CTA",
      "character_count": 0
    },
    "youtube": {
      "title": "Clear informative video title",
      "caption": "Structured video description with chapters",
      "hashtags": ["#Tag1", "#Tag2"],
      "call_to_action": "Subscribe and comment",
      "character_count": 0
    }
  }
}
`;

  promptParts.push(systemPrompt);

  if (mediaBuffer && mimeType) {
    promptParts.push({
      inlineData: {
        data: mediaBuffer.toString('base64'),
        mimeType: mimeType,
      },
    });
  }

  const result = await model.generateContent(promptParts);
  const responseText = result.response.text();

  try {
    const rawJson = JSON.parse(responseText);
    if (rawJson.platforms) {
      for (const p of ['linkedin', 'instagram', 'facebook', 'youtube'] as const) {
        if (rawJson.platforms[p]) {
          rawJson.platforms[p].character_count = rawJson.platforms[p].caption?.length || 0;
        }
      }
    }
    const validated = GeminiAnalysisResultSchema.parse(rawJson);
    return validated;
  } catch (err: any) {
    console.error('Gemini structured response parsing error:', err);
    return generateCleanEditorialContent(userPrompt, language, tone, isMediaVideo);
  }
}

/**
 * Clean, high-precision editorial content generator following Google Stitch principles.
 * Zero emojis, clean typography, articulate sentence structures.
 */
function generateCleanEditorialContent(
  prompt: string,
  language: SupportedLanguage,
  tone: SupportedTone,
  isVideo: boolean
): GeminiAnalysisResult {
  const context = prompt.trim() || 'Intelligent Multi-Platform Social Media Automation';
  const isTamil = language === 'Tamil';
  const isTanglish = language === 'Tanglish';

  const variation = Math.floor(Date.now() / 1000) % 3;

  let linkedinCaption = '';
  let instaCaption = '';
  let fbCaption = '';
  let ytTitle = '';
  let ytCaption = '';

  let linkedinTags = ['#SoftwareEngineering', '#Automation', '#Productivity', '#Architecture', '#SaaS'];
  let instaTags = ['#Technology', '#SoftwareDevelopment', '#DesignSystems', '#Engineering', '#ProductDesign'];
  let fbTags = ['#Technology', '#Community', '#SoftwareUpdate'];
  let ytTags = ['#SocialSyncAI', '#FullStackArchitecture', '#NextJS', '#EngineeringDemo'];

  if (isTanglish) {
    if (variation === 0) {
      linkedinCaption = `Multi-platform content distribution-la irukkura manual work-ah simplify panna oru comprehensive approach: ${context}.\n\nOvvoru platform-kum separate formatting panni time waste panradhuku badhila, centralized intelligent orchestration system use panradhu thaan smart workflow.\n\nKey Engineering Highlights:\n• Automated visual analysis and OCR extraction\n• Zero-password AES-256 token security\n• Real-time status diagnostics across all channels\n\nUnga team workflow-la idhu madhiri automation tools epdi impact create pannum? Share your perspective in the comments below.`;
      instaCaption = `Streamlining distribution with precision: ${context}.\n\nOne unified source asset transformed into platform-specific native presentations with zero manual overhead.\n\nHighlights:\n• Direct visual intelligence\n• Verified OAuth 2.0 publishing\n• Clean cross-platform consistency\n\nSave this post for your technical reference. Comments are open below.`;
      fbCaption = `Vanakkam. Namma latest technical milestone update: ${context}. Content distribution process-ah automated and reliable-ah maathuradhukaaga build pannirukom. Check out the details and let us know your valuable thoughts.`;
      ytTitle = `${context}: Architecture & Implementation Walkthrough`;
      ytCaption = `A thorough walkthrough detailing ${context} and how it automates cross-platform social media distribution.\n\nTimestamps:\n0:00 - Introduction & Motivation\n01:30 - Gemini Multimodal Integration\n03:45 - OAuth Adapter Architecture\n06:00 - Live Deployment & Results\n\nSubscribe for weekly technical deep dives.`;
    } else {
      linkedinCaption = `Consistency in content publishing is often blocked by operational friction.\n\nWith ${context}, we engineered an automated pipeline that eliminates repetitive formatting while preserving native platform standards.\n\nCore Capabilities:\n• Context-aware caption synthesis\n• Immediate and scheduled dispatch engines\n• Complete audit logs and attempt histories\n\nHow does your organization handle multi-channel publishing today?`;
      instaCaption = `Modernizing digital workflow management: ${context}.\n\nEngineered to replace fragmented publishing tools with a unified, secure control center.\n\nSave this post for reference and follow along for system updates.`;
      fbCaption = `Sharing our latest development progress on ${context}. Built to deliver reliable and secure social media distribution. Your feedback is welcome in the comments.`;
      ytTitle = `${context} — Complete Technical Overview`;
      ytCaption = `Comprehensive technical review of ${context}.\n\nChapters:\n0:00 - System Architecture\n02:00 - Database Isolation & RLS\n04:30 - Live Demonstration\n\nSubscribe for more engineering content.`;
    }
  } else if (isTamil) {
    linkedinCaption = `டிஜிட்டல் உள்ளடக்க விநியோகத்தில் ஒரு புதிய மைல்கல்: ${context}.\n\nஒரே நேரத்தில் பல்வேறு சமூக ஊடக தளங்களில் துல்லியமாகப் பதிவிடுவதை எளிதாக்கும் வகையில் இந்த தளம் வடிவமைக்கப்பட்டுள்ளது.\n\nமுக்கிய சிறப்பம்சங்கள்:\n• தானியங்கி காட்சி பகுப்பாய்வு மற்றும் உரை பிரித்தெடுத்தல்\n• மிக உயர்ந்த தரவு பாதுகாப்பு நெறிமுறைகள்\n• ஒவ்வொரு தளத்திற்கும் தனிப்பயனாக்கப்பட்ட வடிவமைப்பு\n\nஉங்கள் மேலான கருத்துக்களை கீழே பகிர்ந்து கொள்ளுங்கள்.`;
    instaCaption = `தொழில்நுட்ப முன்னேற்றம்: ${context}.\n\nபடைப்பாளர்களுக்கான நவீன மற்றும் பாதுகாப்பான பகிர்வு தீர்வு.\n\nஇந்த பதிவை எதிர்கால பயன்பாட்டிற்கு சேமித்து கொள்ளுங்கள். உங்கள் கருத்துக்களை கமெண்டில் தெரிவிக்கலாம்.`;
    fbCaption = `அனைவருக்கும் வணக்கம். எங்களின் புதிய முயற்சி குறித்த தகவல்: ${context}. பல தளங்களில் எளிதாகப் பதிவிடும் இந்த அமைப்பை நீங்கள் பார்வையிட்டு உங்கள் கருத்துக்களைத் தெரிவிக்க வேண்டுகிறோம்.`;
    ytTitle = `${context} — முழுமையான நேரடி தொழில்நுட்ப விளக்கம்`;
    ytCaption = `${context} எவ்வாறு செயல்படுகிறது என்பதன் நேரடி செய்முறை விளக்கம்.\n\nநேரக்குறிப்புகள்:\n0:00 - முன்னுரை\n01:45 - AI கட்டமைப்பு\n04:00 - செயல்முறை விளக்கம்\n\nபுதிய தகவல்களுக்கு Subscribe செய்யுங்கள்.`;
  } else {
    // Clean English
    if (variation === 0) {
      linkedinCaption = `Manual cross-platform distribution is one of the most persistent bottlenecks in modern digital operations.\n\nMost teams treat social publishing as a repetitive copy-paste task. The result is diluted reach, fragmented tone, and substantial time loss.\n\nWe engineered SocialSync AI to solve this root cause: ${context}.\n\nKey System Capabilities:\n• Multimodal visual OCR extracts textual and thematic context directly from uploaded media\n• Algorithmic adaptation generates platform-native structures for LinkedIn, YouTube, Instagram, and Facebook\n• Hardware-grade AES-256-GCM token encryption protects tenant OAuth credentials at rest\n• Independent execution engine handles both autonomous publishing and human-in-the-loop approvals\n\nHow does your team currently balance multi-channel reach with operational efficiency?\n\nLet us know your perspective in the comments below.`;
      instaCaption = `Precision in social distribution: ${context}.\n\nDesigned for teams requiring consistent, platform-native presentation without repetitive formatting.\n\nKey Attributes:\n• Automated multimodal media comprehension\n• Official OAuth 2.0 API integrations\n• Comprehensive audit and diagnostic tracking\n\nSave this post for your development references. Inquiries are welcomed in the comments.`;
      fbCaption = `Community Announcement: We are pleased to share our latest milestone with ${context}.\n\nDeveloped to streamline publishing workflows while ensuring full compliance with official platform standards. We invite you to review the architecture and share your thoughts.`;
      ytTitle = `${context}: System Architecture and Execution Pipeline`;
      ytCaption = `A comprehensive technical deep dive into ${context}, examining how multimodal AI and official platform APIs streamline cross-platform publishing.\n\nTimestamps:\n0:00 - Problem Overview & Architectural Goals\n01:30 - Multimodal Visual Understanding\n03:45 - Official OAuth 2.0 Adapters\n06:15 - Dual-Mode Publishing Engine\n08:00 - Performance & Diagnostics\n\nSubscribe to SocialSync AI for future engineering analyses.`;
    } else {
      linkedinCaption = `Effective distribution requires native respect for each platform's architectural nuances.\n\nA thought-leadership memo on LinkedIn requires analytical depth; Instagram relies on visual cohesion; YouTube demands high-relevance search metadata.\n\nWith ${context}, we created an intelligent orchestration layer that preserves context while tailoring execution.\n\nArchitecture Highlights:\n• Supabase 12-table PostgreSQL schema with strict Row Level Security (RLS)\n• Dedicated platform adapters for LinkedIn UGC, YouTube Data v3, Meta Content Publishing, and Facebook Pages\n• Transparent diagnostic logging with verified external post identifiers\n\nWhat is your organization's primary consideration when evaluating social automation systems?`;
      instaCaption = `System Overview: ${context}.\n\nTransforming single visual assets into synchronized, platform-compliant releases.\n\nArchitecture Highlights:\n• Multimodal visual analysis\n• Encrypted token storage at rest\n• Dual autonomous and manual approval workflows\n\nBookmark this post for reference. Technical discussion welcomed below.`;
      fbCaption = `We are pleased to introduce ${context}, designed to bring enterprise-grade reliability and security to multi-platform publishing.\n\nThank you for following our progress. Your feedback is greatly appreciated.`;
      ytTitle = `Building ${context} with Next.js 14 and Gemini Multimodal AI`;
      ytCaption = `Complete engineering breakdown of ${context}.\n\nChapters:\n0:00 - Introduction\n02:15 - Database & Storage Design\n04:45 - Multimodal Prompt Engineering\n07:30 - Publishing Engine & Security\n\nLeave your questions and feedback in the comments.`;
    }
  }

  return {
    summary: `System campaign for: ${context}`,
    detected_objects: ['Digital Banner', 'Typography Layout', 'System Graphic', 'Brand Identity'],
    extracted_text: prompt || 'SocialSync AI Multi-Platform Architecture',
    topics: ['System Architecture', 'Software Engineering', 'Enterprise SaaS', 'Automation'],
    sentiment: 'informative',
    dominant_colors: ['#4F46E5', '#1E293B', '#0B0F19'],
    platforms: {
      linkedin: {
        caption: linkedinCaption,
        hashtags: linkedinTags,
        call_to_action: 'Share your perspective in the comments below.',
        character_count: linkedinCaption.length,
      },
      instagram: {
        caption: instaCaption,
        hashtags: instaTags,
        call_to_action: 'Save this post for your technical reference.',
        character_count: instaCaption.length,
      },
      facebook: {
        caption: fbCaption,
        hashtags: fbTags,
        call_to_action: 'Join the conversation in the comments below.',
        character_count: fbCaption.length,
      },
      youtube: {
        title: ytTitle,
        caption: ytCaption,
        hashtags: ytTags,
        call_to_action: 'Subscribe for weekly technical architecture reviews.',
        character_count: ytCaption.length,
      },
    },
  };
}
