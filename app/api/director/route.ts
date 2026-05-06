import { NextRequest, NextResponse } from 'next/server'
import type { DirectorRequestBody, DirectorResponseBody, ShotSheet } from '@/lib/types'

export const maxDuration = 120

const TARGET_SECONDS = 15

const buildDirectorSystem = (shotCount: number, durationPerShot: number) => `\
You are an experienced film director, cinematographer, and screenwriter.
Turn the scene description and reference images into a complete production shot sheet.

The sequence must total exactly ${TARGET_SECONDS} seconds: ${shotCount} shots × ${durationPerShot}s each.

Rules:
- Every shot must be cinematically purposeful. Never repeat the same shot type consecutively.
- Camera movement serves emotion: Push in = intimacy/tension. Pull back = isolation/reveal. Static = stillness.
- The seedance_prompt MUST be self-contained: subject appearance, exact action, framing, camera, lighting, atmosphere.
- dialogue: the character's spoken line for this shot. Under 10 words. First-person. Authentic.
- voiceover: narrator caption line. Under 12 words.
- voiceover_excerpt: 2-3 poetic, cinematic sentences of narration for the WHOLE scene. Sounds like a film trailer voice-over.
- sound_notes: describe the ambient/diegetic sound design for the scene (wind, footsteps, music, etc.).
- mood_keywords: 6-8 single adjective words (e.g. "wistful, free, nostalgic, contemplative").
- cinematography_notes: 4-5 bullet points on the visual approach (lens philosophy, color grade, movement style).
- environment_fingerprint: one vivid sentence describing the location's visual identity.

Return ONLY valid JSON. No markdown. No code fences.

Schema:
{
  "scene_title": "string",
  "scene_synopsis": "string — one sentence arc",
  "mood": "string — 2-3 adjectives",
  "color_palette": "string — e.g. dusty rose + warm taupe + sun-bleached ivory",
  "environment_fingerprint": "string",
  "voiceover_excerpt": "string — 2-3 poetic narration sentences for the whole scene",
  "sound_notes": "string — ambient and sound design description",
  "cinematography_notes": ["string", "string", "string", "string"],
  "mood_keywords": ["word1", "word2", "word3", "word4", "word5", "word6"],
  "shots": [
    {
      "number": 1,
      "label": "string — e.g. Cut 1 — Arrival",
      "type": "ECU|CU|MCU|MS|WS|EWS|OTS|POV|INSERT",
      "framing": "string",
      "subject_position": "string",
      "camera_movement": "string — e.g. Static | Dolly-in | Handheld | Track | Crane-up",
      "lens_feel": "string — e.g. 40mm anamorphic",
      "lighting_mood": "string",
      "emotion": "string",
      "action": "string",
      "dialogue": "string — under 10 words",
      "voiceover": "string — under 12 words",
      "seedance_prompt": "string",
      "duration": ${durationPerShot},
      "aspect_ratio": "16:9",
      "cut_note": "string"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const body: DirectorRequestBody = await req.json()
    const {
      scene_description,
      character_image_base64,
      character_image_mime,
      environment_image_base64,
      environment_image_mime,
      mood,
      shot_count = 5,
    } = body

    if (!scene_description?.trim()) {
      return NextResponse.json({ error: 'scene_description is required' }, { status: 400 })
    }

    const shotCount = Math.min(Math.max(shot_count, 3), 8)
    const durationPerShot = Math.round(TARGET_SECONDS / shotCount)

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }

    const userContent: ContentPart[] = []

    if (character_image_base64 && character_image_mime) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${character_image_mime};base64,${character_image_base64}` },
      })
      userContent.push({ type: 'text', text: '[CHARACTER REFERENCE — describe this person\'s exact appearance in every seedance_prompt]' })
    }

    if (environment_image_base64 && environment_image_mime) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${environment_image_mime};base64,${environment_image_base64}` },
      })
      userContent.push({ type: 'text', text: '[ENVIRONMENT REFERENCE — reflect this location in all shots and environment_fingerprint]' })
    }

    userContent.push({
      type: 'text',
      text: [
        `Scene: ${scene_description.trim()}`,
        mood ? `Mood direction: ${mood}` : '',
        `Total: ${TARGET_SECONDS}s across ${shotCount} shots (${durationPerShot}s each)`,
        '',
        'Generate the complete production shot sheet now.',
      ].filter(Boolean).join('\n'),
    })

    const model = process.env.OPENROUTER_VISION_MODEL ?? 'anthropic/claude-sonnet-4-5'

    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Goodvid Director',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: buildDirectorSystem(shotCount, durationPerShot) },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    })

    if (!orRes.ok) {
      const err = await orRes.text()
      return NextResponse.json({ error: `LLM call failed (${orRes.status}): ${err}` }, { status: 502 })
    }

    const orData = await orRes.json()
    const rawContent: string = orData?.choices?.[0]?.message?.content ?? ''

    let shotSheet: ShotSheet
    try {
      const cleaned = rawContent
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim()
      shotSheet = JSON.parse(cleaned) as ShotSheet
    } catch {
      console.error('Shot sheet parse error:', rawContent)
      return NextResponse.json(
        { error: 'LLM returned malformed JSON. Try again.', raw: rawContent },
        { status: 422 }
      )
    }

    const response: DirectorResponseBody = { shotSheet }
    return NextResponse.json(response)
  } catch (err) {
    console.error('Director error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
