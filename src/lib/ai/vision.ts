/**
 * Vision AI - Extract Content from Images
 *
 * Uses Claude's vision capabilities to extract text and understand
 * content from homework photos, vocab lists, etc.
 */

import { getAnthropicClient } from './client'

export interface ExtractedContent {
  contentType: 'vocabulary' | 'math' | 'history' | 'science' | 'general'
  items: string[] // Individual items (vocab words, math problems, facts, etc.)
  rawText: string // Full extracted text for reference
}

/**
 * Extract content from an image using Claude Vision
 *
 * @param imageBase64 - Base64 encoded image data
 * @param mediaType - Image MIME type (image/jpeg, image/png, etc.)
 * @returns Extracted and categorized content
 */
export async function extractContentFromImage(
  imageBase64: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
): Promise<ExtractedContent> {
  const client = getAnthropicClient()

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `Analyze this image and extract educational content for creating quiz questions.

1. First, determine what type of content this is:
   - "vocabulary" - word lists, spelling words, vocabulary terms
   - "math" - math problems, equations, number exercises
   - "history" - historical facts, dates, events
   - "science" - scientific concepts, facts, processes
   - "general" - other educational content

2. Extract individual items that could become quiz questions:
   - For vocabulary: extract each word and its definition if present
   - For math: extract each problem or concept
   - For history/science: extract key facts, dates, or concepts
   - Keep items concise but complete

3. Also provide the full raw text you can read from the image.

Respond in this exact JSON format:
{
  "contentType": "vocabulary|math|history|science|general",
  "items": ["item1", "item2", ...],
  "rawText": "full text from image"
}

Only respond with valid JSON, no other text.`,
          },
        ],
      },
    ],
  })

  // Parse the response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from vision API')
  }

  try {
    const result = JSON.parse(textContent.text) as ExtractedContent
    return result
  } catch {
    // If JSON parsing fails, try to extract useful info anyway
    return {
      contentType: 'general',
      items: [textContent.text],
      rawText: textContent.text,
    }
  }
}
