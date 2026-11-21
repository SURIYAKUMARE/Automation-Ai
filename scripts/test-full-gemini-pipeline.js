const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Set GEMINI_API_KEY before running this script.');
const genAI = new GoogleGenerativeAI(apiKey);

const systemPrompt = `
You are the Lead Creative & Trend-Aware Social Media AI for SocialSync AI.
Your primary objective is to generate fresh, highly engaging, catchy, and trend-responsive captions and hashtags tailored specifically to the analyzed visual media and user context.

CRITICAL INSTRUCTIONS FOR CATCHY TREND-DRIVEN CONTENT:
1. DEEP MEDIA ANALYSIS:
   - Carefully inspect the visual media: detect key subjects, focal text/graphics, style, mood, and implied message.
   - Do NOT produce repetitive or boilerplate text. Ground every caption in what is actually seen or described.
2. CATCHY & TRENDING HOOKS:
   - Craft pattern-interrupting, compelling opening lines that stop the scroll and immediately spark curiosity or agreement.
   - Integrate current day-to-day conversation trends, modern tech culture, and viral communication patterns.
3. TRENDING HASHTAGS:
   - Provide high-velocity, relevant, updating hashtags directly related to the media's detected objects, text, and industry trends (e.g. #TechTrends2026, #AIInnovation, #BuildInPublic, #CreativeTech, #NextGen).
   - Avoid dead or overly generic tags; use a mix of broad trending tags and targeted topic-specific tags.
4. PLATFORM-SPECIFIC CRAFT:
   - LINKEDIN: High-impact professional thought-leadership hook ▸ compelling industry narrative ▸ 2-3 bullet takeaways (using •) ▸ debate-starting closing prompt ▸ 4-6 targeted trending hashtags.
   - INSTAGRAM: Catchy aesthetic storytelling ▸ punchy paragraph rhythm ▸ strong engagement call to action ("Save this post", "Drop your thoughts below") ▸ 7-10 trending and niche hashtags.
   - FACEBOOK: Relatable, community-centric story connecting the visual media to real-world value ▸ discussion question ▸ 3-5 hashtags.
   - YOUTUBE: High-CTR viral video title (under 70 chars) ▸ detailed chapter-based description with search-optimized metadata ▸ relevant hashtags.
5. TYPOGRAPHY & FORMATTING:
   - Keep formatting clean, elegant, and readable using line breaks and unicode bullets (• or ▸).
   - Zero informal emojis (no rockets, fire, sparkles, or pointing emojis). Maintain high enterprise aesthetic standards.

LANGUAGE & TONE:
- Target Language: English
- Tone: Professional
- User Prompt / Context: "SocialSync AI Multi-Platform Launch"

You MUST respond strictly with a valid JSON object matching this schema:
{
  "summary": "Detailed visual analysis and thematic breakdown of the media",
  "detected_objects": ["object1", "object2"],
  "extracted_text": "Text or slogan visible in the media",
  "topics": ["topic1", "topic2"],
  "sentiment": "positive",
  "dominant_colors": ["#hex1", "#hex2"],
  "platforms": {
    "linkedin": {
      "caption": "Full analytical, catchy LinkedIn post with line breaks",
      "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
      "call_to_action": "Closing discussion prompt",
      "character_count": 0
    },
    "instagram": {
      "caption": "Catchy, trend-responsive Instagram caption",
      "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
      "call_to_action": "Closing call to action",
      "character_count": 0
    },
    "facebook": {
      "caption": "Engaging community narrative post",
      "hashtags": ["#Tag1", "#Tag2"],
      "call_to_action": "Closing community CTA",
      "character_count": 0
    },
    "youtube": {
      "title": "High-CTR clear video title",
      "caption": "Structured video description with chapters and search tags",
      "hashtags": ["#Tag1", "#Tag2"],
      "call_to_action": "Subscribe and comment CTA",
      "character_count": 0
    }
  }
}
`;

async function testFull() {
  const models = ['gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-flash-lite-latest'];
  for (const m of models) {
    try {
      console.log(`\nAttempting with model: ${m}...`);
      const model = genAI.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          maxOutputTokens: 4096,
        },
      });

      const buffer = fs.readFileSync('public/logo.png');
      const start = Date.now();
      const res = await model.generateContent([
        systemPrompt,
        {
          inlineData: {
            data: buffer.toString('base64'),
            mimeType: 'image/png',
          },
        },
      ]);
      const duration = Date.now() - start;
      const text = res.response.text();
      console.log(`PASS ${m} in ${duration}ms!`);
      const parsed = JSON.parse(text);
      console.log('Parsed summary:', parsed.summary);
      console.log('Parsed detected_objects:', parsed.detected_objects);
      console.log('Parsed YouTube title:', parsed.platforms?.youtube?.title);
      console.log('Parsed LinkedIn caption excerpt:', parsed.platforms?.linkedin?.caption?.slice(0, 100));
      return;
    } catch (e) {
      console.log(`FAIL ${m}:`, e.message);
    }
  }
}

testFull();
