/**
 * POST /api/assist
 *
 * Analyzes the uploaded character and environment reference images using
 * a vision LLM, then returns a suggested scene description, mood, shot count,
 * and style notes — ready to pre-fill the Director form.
 *
 * This lets the user skip the blank textarea entirely: upload images, let AI
 * read them, review and adjust the suggestions, then generate the full shot sheet.
 */

import { NextRequest, NextResponse } from 'next/server'

const MOOD_OPTIONS = [
  'Warm & intimate',
  'Dramatic & tense',
  'Cold & isolated',
  'Playful & kinetic',
  'Mysterious & slow',
  'Epic & cinematic',
  'Raw & documentary',
]

const ASSIST_SYSTEM = `You are a creative film director and visual storyteller.
Your job is to look at reference images and suggest a compelling 15-second scene.

Analyze the images carefully:
- Character: appearance, clothing style, energy, emotional quality
- Environment: location feel, lighting, atmosphere, time of day
- Together: what story do these elements naturally suggest?

Rules:
- scene_description: 2-4 specific, cinematic sentences. Describe ACTIONS and MOVEMENTS, not just vibes.
  Write like you're briefing a camera operator — what does the character DO, WHERE, and HOW does it feel?
  Be specific. "She walks along the waterfront" is weak. "She stops mid-stride at the edge of the dock, turns toward the water, and lets the wind take her hair" is strong.
- mood: choose EXACTLY one from this list: ${MOOD_OPTIONS.map((m) => `"${m}"`).join(' | ')}
- shot_count: integer between 3 and 6 — based on how complex the scene feels
- style_notes: one sentence describing a specific visual or cinematic approach (lens choice, color grade, movement philosophy)

Return ONLY valid JSON. No markdown. No commentary.

Schema:
{
  "scene_description": "string",
  "mood": "string — exactly one of the provided options",
  "shot_count": 5,
  "style_notes": "string"
}`

export interface AssistRequestBody {
  character_image_base64?: string
  character_image_mime?: string
  environment_image_base64?: string
  environment_image_mime?: string
}

export interface AssistResponseBody {
  scene_description: string
  mood: string
  shot_count: number
  style_notes: string
}

export async function POST(req: NextRequest) {
  try {
    const body: AssistRequestBody = await req.json()
    const {
      character_image_base64,
      character_image_mime,
      environment_image_base64,
      environment_image_mime,
    } = body

    if (!character_image_base64 && !environment_image_base64) {
      return NextResponse.json(
        { error: 'At least one reference image is required' },
        { status: 400 }
      )
    }

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }

    const userContent: ContentPart[] = []

    if (character_image_base64 && character_image_mime) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${character_image_mime};base64,${character_image_base64}` },
      })
      userContent.push({ type: 'text', text: '[Character / Subject Reference]' })
    }

    if (environment_image_base64 && environment_image_mime) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${environment_image_mime};base64,${environment_image_base64}` },
      })
      userContent.push({ type: 'text', text: '[Environment / Location Reference]' })
    }

    userContent.push({
      type: 'text',
      text: 'Analyze these references and suggest a compelling scene. Return only JSON.',
    })

    const model = process.env.OPENROUTER_TEXT_MODEL ?? 'anthropic/claude-sonnet-4-5'

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Goodvid Scene Assist',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: ASSIST_SYSTEM },
          { role: 'user', content: userContent },
        ],
        temperature: 0.8,
        max_tokens: 600,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        { error: `LLM call failed (${res.status}): ${err}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const raw: string = data?.choices?.[0]?.message?.content ?? ''

    let suggestion: AssistResponseBody
    try {
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()
      suggestion = JSON.parse(cleaned) as AssistResponseBody
    } catch {
      console.error('Assist parse error:', raw)
      return NextResponse.json(
        { error: 'LLM returned malformed JSON. Try again.' },
        { status: 422 }
      )
    }

    return NextResponse.json(suggestion)
  } catch (err) {
    console.error('Assist error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
