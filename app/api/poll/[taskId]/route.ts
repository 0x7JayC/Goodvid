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

    // ── Completed ─────────────────────────────────────────────────────────
    if (status === 'completed') {
      // Seedance returns the video URL in unsigned_urls[0]
      const cdnUrl: string | undefined = orResult.unsigned_urls?.[0]

      if (!cdnUrl) {
        // Status says completed but no URL yet — keep polling
        return NextResponse.json({ status: 'processing' } satisfies PollResponseBody)
      }

      // Try to store in Supabase Storage — non-fatal, fall back to CDN URL
      let finalVideoUrl = cdnUrl

      try {
        const supabase = createServiceClient()
        const videoRes = await fetch(cdnUrl)

        if (videoRes.ok) {
          const buffer = Buffer.from(await videoRes.arrayBuffer())
          const fileName = `${taskId}.mp4`

          const { error: uploadError } = await supabase.storage
            .from('generated-videos')
            .upload(fileName, buffer, { contentType: 'video/mp4', upsert: true })

          if (!uploadError) {
            const { data: publicData } = supabase.storage
              .from('generated-videos')
              .getPublicUrl(fileName)
            finalVideoUrl = publicData.publicUrl

            // Update DB row — best effort
            await supabase
              .from('generations')
              .update({
                status: 'completed',
                output_video_url: finalVideoUrl,
                completed_at: new Date().toISOString(),
              })
              .eq('task_id', taskId)
              .maybeSingle()
          } else {
            console.warn('Supabase storage upload failed — using CDN URL:', uploadError.message)
          }
        }
      } catch (storageErr) {
        console.warn('Storage step failed — using CDN URL directly:', storageErr)
      }

      return NextResponse.json({
        status: 'completed',
        videoUrl: finalVideoUrl,
      } satisfies PollResponseBody)
    }

    // ── Failed ─────────────────────────────────────────────────────────────
    if (status === 'failed') {
      try {
        const supabase = createServiceClient()
        await supabase
          .from('generations')
          .update({ status: 'failed', error_message: orResult.error ?? 'Generation failed' })
          .eq('task_id', taskId)
          .maybeSingle()
      } catch { /* best effort */ }

      return NextResponse.json({
        status: 'failed',
        error: orResult.error ?? 'Generation failed',
      } satisfies PollResponseBody)
    }

    // ── Still running ──────────────────────────────────────────────────────
    return NextResponse.json({ status } satisfies PollResponseBody)
  } catch (err) {
    console.error('Poll error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
