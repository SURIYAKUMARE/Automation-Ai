const test = require('node:test');
const assert = require('node:assert');
const { z } = require('zod');

const PlatformContentSchema = z.object({
  caption: z.string().min(1),
  title: z.string().optional(),
  hashtags: z.array(z.string()).default([]),
  call_to_action: z.string().default(''),
});

const GeminiOutputSchema = z.object({
  summary: z.string(),
  detected_objects: z.array(z.string()),
  platforms: z.object({
    linkedin: PlatformContentSchema,
    instagram: PlatformContentSchema,
    facebook: PlatformContentSchema,
    youtube: PlatformContentSchema.optional(),
  }),
});

test('Validates Gemini Structured JSON Schema', () => {
  const sample = {
    summary: 'AI conference poster',
    detected_objects: ['Banner', 'Text'],
    platforms: {
      linkedin: {
        caption: 'Exciting announcement about AI conference!',
        hashtags: ['#AI', '#Tech'],
        call_to_action: 'Join us!',
      },
      instagram: {
        caption: 'Announcing our upcoming engineering session.',
        hashtags: ['#AIEvent'],
        call_to_action: 'Link in bio',
      },
      facebook: {
        caption: 'Join our upcoming community session.',
        hashtags: [],
        call_to_action: '',
      },
    },
  };

  const parsed = GeminiOutputSchema.safeParse(sample);
  assert.strictEqual(parsed.success, true);
});

test('Rejects Invalid Gemini Schema with Missing Caption', () => {
  const badSample = {
    summary: 'Test',
    detected_objects: [],
    platforms: {
      linkedin: {
        caption: '', // Violates min(1)
      },
    },
  };

  const parsed = GeminiOutputSchema.safeParse(badSample);
  assert.strictEqual(parsed.success, false);
});
