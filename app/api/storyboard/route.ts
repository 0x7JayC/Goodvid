/**
 * POST /api/storyboard
 *
 * Generates one cinematic storyboard frame per shot using GPT-5.4-image-2 via OpenRouter.
 * Character and environment reference images are passed as visual context so the
 * generated frames show the ACTUAL subject in the ACTUAL location.
 *
 * Uses multipart/form-data to pass reference images alongside the prompt.
 * All shots are generated in parallel.
 *
 * Results are stored in Supabase Storage `storyboard-frames` bucket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { StoryboardRequestBody, StoryboardResponseBody, StoryboardPanel } from '@/lib/types'

export const maxDuration = 120

function buildFramePrompt(shot: StoryboardRequestBody['shots'][number]): string {
  return [
    `Cinematic movie still frame for a professional film storyboard.`,
    `Shot type: ${shot.shot_type}.`,
    `Lens: ${shot.lens_feel}.`,
    `Camera: ${shot.camera_movement}.`,
    `Lighting: ${shot.lighting_mood}.`,
    shot.prompt,
    `Single composition frame, photorealistic, high-budget feature film quality, 4K.`,
    `No text, no watermarks, no subtitles, no UI elements.`,
  ].join(' ')
}

async function generateFrame(
  shot: StoryboardRequestBody['shots'][number],
  charBase64: string | undefined,
  charMime: string | undefined,
  envBase64: string | undefined,
  envMime: string | undefined
): Promise<string> {
  const model = process.env.OPENROUTER_IMAGE_MODEL ?? 'openai/gpt-5.4-image-2'
  const prompt = buildFramePrompt(shot)

  // Use multipart FormData to pass reference images for visual consistency
  const form = new FormData()
  form.set('model', model)
  form.set('prompt', prompt)
  form.set('n', '1')
  form.set('size', '1792x1024')   // 16:9 landscape — native GPT-5.4-image-2 size
  form.set('quality', 'high')

  // Attach character reference — model uses this to render the correct person
  if (charBase64 && charMime) {
    const buf = Buffer.from(charBase64, 'base64')
    const blob = new Blob([buf], { type: charMime })
    const ext = charMime.split('/')[1] ?? 'jpg'
    form.append('image[]', blob, `character_reference.${ext}`)
  }

  // Attach environment reference — model uses this to render the correct location
  if (envBase64 && envMime) {
    const buf = Buffer.from(envBase64, 'base64')
    const blob = new Blob([buf], { type: envMime })
    const ext = envMime.split('/')[1] ?? 'jpg'
    form.append('image[]', blob, `environment_reference.${ext}`)
  }

  const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'X-Title': 'Goodvid Storyboard',
      // Note: Do NOT set Content-Type — browser/Node sets it automatically with multipart boundary
    },
    body: form,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Image gen failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const item = data?.data?.[0]
  if (!item) throw new Error('Empty image response from GPT-5.4-image-2')

  // GPT-5.4-image-2 returns b64_json; URL is a fallback
  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item.url) return item.url

  throw new Error('No image data in response')
}

async function storeFrame(
  supabase: ReturnType<typeof createServiceClient>,
  imageData: string,
  fileName: string
): Promise<string> {
  let buffer: Buffer
  let contentType = 'image/png'

  if (imageData.startsWith('data:')) {
    const [header, b64] = imageData.split(',')
    contentType = header.replace('data:', '').replace(';base64', '')
    buffer = Buffer.from(b64, 'base64')
  } else {
    const r = await fetch(imageData)
    if (!r.ok) throw new Error(`Failed to fetch image: ${r.status}`)
    buffer = Buffer.from(await r.arrayBuffer())
    contentType = r.headers.get('content-type') ?? 'image/png'
  }

  const { error } = await supabase.storage
    .from('storyboard-frames')
    .upload(fileName, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from('storyboard-frames').getPublicUrl(fileName)
  return data.publicUrl
}

export async function POST(req: NextRequest) {
  try {
    const body: StoryboardRequestBody = await req.json()
    const {
      shots,
      character_image_base64,
      character_image_mime,
      environment_image_base64,
      environment_image_mime,
    } = body

    if (!shots?.length) {
      return NextResponse.json({ error: 'shots array is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const sessionId = Date.now().toString(36)

    const results = await Promise.allSettled(
      shots.map(async (shot) => {
        const imageData = await generateFrame(
          shot,
          character_image_base64,
          character_image_mime,
          environment_image_base64,
          environment_image_mime
        )
        const fileName = `${sessionId}-cut-${shot.number}.png`
        const publicUrl = await storeFrame(supabase, imageData, fileName)
        return { shotNumber: shot.number, imageUrl: publicUrl }
      })
    )

    const panels: StoryboardPanel[] = []
    const errors: Array<{ shotNumber: number; error: string }> = []

    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        panels.push(result.value)
      } else {
        console.error(`Shot ${shots[i].number} failed:`, result.reason)
        errors.push({ shotNumber: shots[i].number, error: String(result.reason) })
      }
    })

    return NextResponse.json({ panels, errors } satisfies StoryboardResponseBody)
  } catch (err) {
    console.error('Storyboard route error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
