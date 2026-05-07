/**
 * POST /api/analyze  —  Model A
 *
 * Vision LLM reads reference images + brief description.
 * Outputs structured visual analysis for Model B (Director).
 *
 * Model: OPENROUTER_VISION_MODEL (e.g. google/gemini-flash-1.5)
 *        Kimi K2.6 is text-only — always use a dedicated vision model here.
 */

import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 60

export interface AnalyzeRequestBody {
  scene_brief: string
  character_image_base64?: string
  character_image_mime?: string
  environment_image_base64?: string
  environment_image_mime?: string
}

export interface AnalyzeResult {
  character_description: string
  environment_description: string
  scene_context: string
  visual_style_notes: string
  raw_analysis: string
}

const ANALYZE_SYSTEM = `You are a visual analyst for a film production team.
Observe the reference images carefully and extract precise details a director needs.

CHARACTER: describe physical appearance exactly — hair colour and style, skin tone,
clothing colours and textures, accessories, body language, emotional quality.
ENVIRONMENT: describe the location — architecture or landscape, lighting, time of day,
dominant colours, textures, spatial depth, overall atmosphere.
STORY POTENTIAL: what narrative does this character + environment combination suggest?

Return ONLY valid JSON. No markdown. No code fences.

{
  "character_description": "full appearance for video generation prompts",
  "environment_description": "full location description for video generation prompts",
  "scene_context": "1-2 sentences on the story this combination suggests",
  "visual_style_notes": "colour palette, lighting quality, texture feel observed",
  "raw_analysis": "3-4 sentence combined paragraph — handed directly to the Director AI"
}`

export async function POST(req: NextRequest) {
  try {
    const body: AnalyzeRequestBody = await req.json()
    const {
      scene_brief,
      character_image_base64,
      character_image_mime,
      environment_image_base64,
      environment_image_mime,
    } = body

    type ContentPart =
      | { type: 'text'; text: string }
      | { type: 'image_url'; image_url: { url: string } }

    const userContent: ContentPart[] = []

    if (character_image_base64 && character_image_mime) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${character_image_mime};base64,${character_image_base64}` },
      })
      userContent.push({ type: 'text', text: '[CHARACTER REFERENCE IMAGE]' })
    }

    if (environment_image_base64 && environment_image_mime) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${environment_image_mime};base64,${environment_image_base64}` },
      })
      userContent.push({ type: 'text', text: '[ENVIRONMENT / LOCATION REFERENCE IMAGE]' })
    }

    userContent.push({
      type: 'text',
      text: `User brief: "${scene_brief.trim()}"\n\nAnalyse the references and return your visual analysis as JSON now.`,
    })

    // Vision model required — Kimi K2.6 is text-only and cannot process images
    const model = process.env.OPENROUTER_VISION_MODEL ?? 'google/gemini-flash-1.5'

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Goodvid Analyze',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: ANALYZE_SYSTEM },
          { role: 'user', content: userContent },
        ],
        temperature: 0.4,
        max_tokens: 1200,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json(
        { error: `Model A failed (${res.status}): ${err}` },
        { status: 502 }
      )
    }

    const data = await res.json()
    const raw: string = data?.choices?.[0]?.message?.content ?? ''

    let result: AnalyzeResult
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
      result = JSON.parse(cleaned) as AnalyzeResult
    } catch {
      // Graceful fallback if model returns plain text instead of JSON
      result = {
        character_description: raw,
        environment_description: '',
        scene_context: scene_brief,
        visual_style_notes: '',
        raw_analysis: raw,
      }
    }

    return NextResponse.json(result)
  } catch (err) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
