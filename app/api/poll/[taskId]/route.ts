import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { pollVideoJob, mapStatus } from '@/lib/openrouter'
import type { PollResponseBody } from '@/lib/types'

export const maxDuration = 30

export async function GET(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params

  if (!taskId) {
    return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
  }

  try {
    const orResult = await pollVideoJob(taskId)
    const status = mapStatus(orResult.status)

    const supabase = createServiceClient()

    // ── If complete, download video from OpenRouter CDN → Supabase Storage ──
    const videoSourceUrl = orResult.unsigned_urls?.[0]
    if (status === 'completed' && videoSourceUrl) {
      const videoRes = await fetch(videoSourceUrl)
      if (!videoRes.ok) {
        throw new Error(`Failed to fetch generated video: ${videoRes.status}`)
      }

      const buffer = Buffer.from(await videoRes.arrayBuffer())
      const fileName = `${taskId}.mp4`

      const { error: uploadError } = await supabase.storage
        .from('generated-videos')
        .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true })

      if (uploadError) {
        console.error('Video storage upload error:', uploadError)
        throw new Error('Failed to store generated video')
      }

      const { data: publicUrl } = supabase.storage
        .from('generated-videos')
        .getPublicUrl(fileName)

      // Update DB row
      await supabase
        .from('generations')
        .update({
          status: 'completed',
          output_video_url: publicUrl.publicUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('task_id', taskId)

      const response: PollResponseBody = {
        status: 'completed',
        videoUrl: publicUrl.publicUrl,
      }
      return NextResponse.json(response)
    }

    // ── Failed ───────────────────────────────────────────────────────────────
    if (status === 'failed') {
      await supabase
        .from('generations')
        .update({
          status: 'failed',
          error_message: orResult.error ?? 'Generation failed',
        })
        .eq('task_id', taskId)

      const response: PollResponseBody = {
        status: 'failed',
        error: orResult.error ?? 'Generation failed',
      }
      return NextResponse.json(response)
    }

    // ── Still running ────────────────────────────────────────────────────────
    const response: PollResponseBody = { status }
    return NextResponse.json(response)
  } catch (err) {
    console.error('Poll error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
