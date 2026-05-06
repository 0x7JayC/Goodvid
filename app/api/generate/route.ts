import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { submitVideoJob } from '@/lib/openrouter'
import type { GenerateRequestBody, GenerateResponseBody } from '@/lib/types'

export const maxDuration = 60 // Vercel function timeout

export async function POST(req: NextRequest) {
  try {
    const body: GenerateRequestBody = await req.json()
    const { type, prompt, imageBase64, imageMimeType, duration = 5, aspectRatio = '16:9' } = body

    if (!prompt?.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (type === 'image-to-video' && !imageBase64) {
      return NextResponse.json({ error: 'Image is required for image-to-video' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const model = process.env.OPENROUTER_VIDEO_MODEL ?? 'bytedance/seedance-1-lite'

    // ── 1. Upload input image to Supabase Storage if provided ────────────────
    let inputImageUrl: string | null = null

    if (type === 'image-to-video' && imageBase64) {
      const mimeType = imageMimeType ?? 'image/jpeg'
      const ext = mimeType.split('/')[1] ?? 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const buffer = Buffer.from(imageBase64, 'base64')

      const { error: uploadError } = await supabase.storage
        .from('input-images')
        .upload(fileName, buffer, { contentType: mimeType, upsert: false })

      if (uploadError) {
        console.error('Image upload error:', uploadError)
        return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
      }

      const { data: publicUrl } = supabase.storage
        .from('input-images')
        .getPublicUrl(fileName)

      inputImageUrl = publicUrl.publicUrl
    }

    // ── 2. Create pending row in Supabase ────────────────────────────────────
    const { data: row, error: insertError } = await supabase
      .from('generations')
      .insert({
        type,
        prompt: prompt.trim(),
        input_image_url: inputImageUrl,
        status: 'pending',
        model,
        duration,
        aspect_ratio: aspectRatio,
      })
      .select('id')
      .single()

    if (insertError || !row) {
      console.error('DB insert error:', insertError)
      return NextResponse.json({ error: 'Failed to create job record' }, { status: 500 })
    }

    // ── 3. Submit to OpenRouter ───────────────────────────────────────────────
    let taskId: string

    try {
      const task = await submitVideoJob({
        model,
        prompt: prompt.trim(),
        image: inputImageUrl ?? undefined,
        duration,
        aspect_ratio: aspectRatio,
      })
      taskId = task.id
    } catch (err) {
      console.error('OpenRouter submit error:', err)

      await supabase
        .from('generations')
        .update({ status: 'failed', error_message: String(err) })
        .eq('id', row.id)

      return NextResponse.json({ error: String(err) }, { status: 502 })
    }

    // ── 4. Save task_id so client can poll ───────────────────────────────────
    await supabase
      .from('generations')
      .update({ task_id: taskId, status: 'processing' })
      .eq('id', row.id)

    const response: GenerateResponseBody = {
      generationId: row.id,
      taskId,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    console.error('Unhandled generate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
