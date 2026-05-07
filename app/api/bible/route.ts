/**
 * POST /api/bible
 *
 * Generates the COMPLETE production bible as a single high-resolution image
 * using GPT-5.4-image-2 via OpenRouter.
 *
 * The full document — all 4 sections including character reference layout,
 * environment + floor plan diagram, storyboard frames, and lighting/mood notes —
 * is rendered in one API call. The model uses the provided reference images
 * to draw the character and environment consistently across all storyboard frames.
 *
 * Output is stored in Supabase Storage `production-bibles` bucket.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import type { BibleRequestBody, BibleResponseBody, ShotSheet } from '@/lib/types'

export const maxDuration = 120

function buildBiblePrompt(shotSheet: ShotSheet): string {
  const durBreakdown = shotSheet.shots.map((s) => `${s.duration}s`).join(' + ')
  const totalSec = shotSheet.shots.reduce((n, s) => n + s.duration, 0)

  const shotLines = shotSheet.shots
    .map(
      (s) =>
        `Cut ${s.number} "${s.label}" | ${s.lens_feel} | ${s.duration}s | ${s.camera_movement.toUpperCase()} | ${s.type} — ${s.action} Dialogue: "${s.dialogue}" Voiceover: "${s.voiceover}"`
    )
    .join('\n')

  const floorPlanCuts = shotSheet.shots
    .map((s) => `Cut ${s.number}: ${s.camera_movement}`)
    .join(', ')

  return `Create a professional film pre-production reference sheet (production bible) as a single landscape document image.

Style: White or warm-cream background. Clean editorial typography. Thin ruled dividers between sections. Sharp, legible text. Looks like a premium commercial or fashion film shoot prep document printed on A3 paper. Professional, refined, cinematic quality.

Use the provided CHARACTER and ENVIRONMENT reference images throughout — especially inside the storyboard frames.

━━━ HEADER BAR (very top, thin strip) ━━━
"SHARED CHOICES" bold title on left. Then on the same line:
"Cut Count: ${shotSheet.shots.length}  |  Color Palette: ${shotSheet.color_palette}  |  Environment Fingerprint: ${shotSheet.environment_fingerprint}"
Small color swatches (filled squares) next to palette text. Right-aligned environment text. Thin border below.

━━━ SECTION 1 (left ~40%, upper half): CHARACTER + HERO PROP REFERENCE ━━━
Section header: "1  CHARACTER + HERO PROP REFERENCE"
Show the provided CHARACTER reference image displayed in multiple views arranged in a clean grid — front, 3/4, facial close-up, candid pose.
Below the character grid: a smaller "HERO PROP / ACCESSORY REFERENCE" area showing props or accessories suggested by the scene.
Bottom: COLOR PALETTE swatches with labels. CHARACTER NOTES bullet list:
• ${shotSheet.mood}
• ${shotSheet.color_palette}
• ${shotSheet.environment_fingerprint}

━━━ SECTION 2 (right ~60%, upper half): ENVIRONMENT / SET DESIGN ━━━
Section header: "2  ENVIRONMENT / SET DESIGN"
Show the provided ENVIRONMENT reference image prominently at the top of this section.
Below the environment photo: draw a clean, illustrated FLOOR PLAN – TOP DOWN diagram:
- Top-down bird's-eye architectural/map view of the filming location
- Camera icons (small camera symbols) at ${shotSheet.shots.length} positions labeled: ${floorPlanCuts}
- Subject/character icon (small human figure silhouette) with dashed arrow path showing movement
- Directional labels and camera type annotations
- Compass rose (N arrow) in corner
- Clean line-drawing style, minimal, like a filmmaker's shot map or architectural plan
Below the floor plan: a SIDE ELEVATION diagram for the most dramatic shot, showing camera height relative to subject.

━━━ SECTION 3 (full width): STORYBOARD ━━━
Section header: "3  STORYBOARD — ${totalSec} SECONDS TOTAL  (${durBreakdown})"
Render ${shotSheet.shots.length} cinematic film storyboard frames in a horizontal row.
Each frame uses the CHARACTER's appearance and the ENVIRONMENT from the references.
Each frame is labeled with its cut number in the top-left corner.

${shotLines}

Below each frame: technical spec line in small monospace: "lens | duration | CAMERA MOVEMENT | SHOT TYPE"
Below the spec line: 2-3 sentence action description paragraph.

━━━ VOICE-OVER / SOUND SECTION (full width strip below storyboard) ━━━
Three columns:
Left: "VOICE-OVER (NON-DIEGETIC)" with microphone icon — voice quality description: "${shotSheet.mood}, intimate"
Center: "VOICE-OVER TEXT EXCERPT" — the following text in elegant italic serif: "${shotSheet.voiceover_excerpt}"
Right: "SOUND DESIGN NOTES" with waveform icon — "${shotSheet.sound_notes}"

━━━ SECTION 4 (full width, bottom): LIGHTING / MOOD / STYLE NOTES ━━━
Section header: "4  LIGHTING / MOOD / STYLE NOTES"
Left side: 4 rendered lighting reference frames using scene imagery. Under each: bold lighting condition name + 2-line description.
Right side (two columns):
  "MOOD KEYWORDS": ${shotSheet.mood_keywords?.join('  •  ')}
  (rendered as elegant spaced text)
  "CINEMATOGRAPHY STYLE":
  ${shotSheet.cinematography_notes?.map((n) => `• ${n}`).join('\n  ')}

Overall: The document should look exactly like a professional high-end film pre-production bible. Impeccable typography, clean grid layout, all text fully legible, warm editorial feel. Every frame in the storyboard section must show the CHARACTER from the reference image in the ENVIRONMENT from the reference image.`
}

async function generateBibleImage(
  prompt: string,
  charBase64?: string,
  charMime?: string,
  envBase64?: string,
  envMime?: string,
): Promise<string> {
  const model = process.env.OPENROUTER_IMAGE_MODEL ?? 'openai/gpt-5.4-image-2'

  // gpt-5.4-image-2 requires multipart FormData with reference images.
  // Fallback models (flux, dall-e-3) accept JSON.
  const useMultipart = charBase64 || envBase64

  let res: Response

  if (useMultipart) {
    const form = new FormData()
    form.set('model', model)
    form.set('prompt', prompt)
    form.set('n', '1')
    form.set('size', '1792x1024')
    form.set('quality', 'high')

    if (charBase64 && charMime) {
      const buf = Buffer.from(charBase64, 'base64')
      form.append('image[]', new Blob([buf], { type: charMime }), `character.${charMime.split('/')[1] ?? 'jpg'}`)
    }
    if (envBase64 && envMime) {
      const buf = Buffer.from(envBase64, 'base64')
      form.append('image[]', new Blob([buf], { type: envMime }), `environment.${envMime.split('/')[1] ?? 'jpg'}`)
    }

    res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Goodvid Production Bible',
        // No Content-Type — browser/Node sets multipart boundary automatically
      },
      body: form,
    })
  } else {
    res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'Goodvid Production Bible',
      },
      body: JSON.stringify({ model, prompt, n: 1, size: '1792x1024', quality: 'high' }),
    })
  }

  if (!res.ok) {
    const text = await res.text()
    // Strip HTML error pages down to a readable message
    const err = text.startsWith('<') ? `HTTP ${res.status} from OpenRouter (check OPENROUTER_IMAGE_MODEL)` : text
    throw new Error(`Image gen failed (${res.status}): ${err}`)
  }

  const data = await res.json()
  const item = data?.data?.[0]
  if (!item) throw new Error('Empty response from image model')

  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`
  if (item.url) return item.url
  throw new Error('No image data in response')
}

async function storeBibleImage(
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
    .from('production-bibles')
    .upload(fileName, buffer, { contentType, upsert: true })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data } = supabase.storage.from('production-bibles').getPublicUrl(fileName)
  return data.publicUrl
}

export async function POST(req: NextRequest) {
  try {
    const body: BibleRequestBody = await req.json()
    const {
      shotSheet,
      character_image_base64,
      character_image_mime,
      environment_image_base64,
      environment_image_mime,
    } = body

    if (!shotSheet?.shots?.length) {
      return NextResponse.json({ error: 'shotSheet is required' }, { status: 400 })
    }

    const prompt = buildBiblePrompt(shotSheet)

    // Pass reference images so gpt-5.4-image-2 can render character + environment in storyboard frames
    const imageData = await generateBibleImage(
      prompt,
      character_image_base64,
      character_image_mime,
      environment_image_base64,
      environment_image_mime,
    )

    const supabase = createServiceClient()
    const fileName = `bible-${Date.now().toString(36)}-${shotSheet.shots.length}cuts.png`

    // Store in Supabase — non-fatal, fall back to raw data URL
    let bibleImageUrl = imageData
    try {
      bibleImageUrl = await storeBibleImage(supabase, imageData, fileName)
    } catch (storageErr) {
      console.warn('Supabase storage failed — returning raw image data:', storageErr)
    }

    return NextResponse.json({ bibleImageUrl } satisfies BibleResponseBody)
  } catch (err) {
    console.error('Bible generation error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
