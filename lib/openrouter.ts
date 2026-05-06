/**
 * OpenRouter Video Generation API wrapper
 *
 * Seedance is an async video model.
 * Flow:
 *   1. POST /api/v1/videos → returns { id, status: "pending", polling_url }
 *   2. GET  /api/v1/videos/{id} → poll until status = "completed"
 *   3. Video URL is in unsigned_urls[0]
 *
 * Docs: https://openrouter.ai/docs/video
 */

import type {
  OpenRouterVideoRequest,
  OpenRouterVideoTaskResponse,
  OpenRouterVideoResultResponse,
} from './types'

const BASE_URL = 'https://openrouter.ai/api/v1'

function headers() {
  return {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    'X-Title': 'Goodvid',
  }
}

/**
 * Submit a video generation job.
 * Returns the OpenRouter task ID for polling.
 */
export async function submitVideoJob(
  req: OpenRouterVideoRequest
): Promise<OpenRouterVideoTaskResponse> {
  const body: Record<string, unknown> = {
    model: req.model,
    prompt: req.prompt,
  }

  if (req.duration) body.duration = req.duration
  if (req.aspect_ratio) body.aspect_ratio = req.aspect_ratio

  // For image-to-video: pass image as frame_images array
  if (req.image) {
    body.frame_images = [
      {
        type: 'image_url',
        image_url: { url: req.image },
        frame_type: 'first_frame',
      },
    ]
  }

  const res = await fetch(`${BASE_URL}/videos`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter submit failed (${res.status}): ${err}`)
  }

  return res.json() as Promise<OpenRouterVideoTaskResponse>
}

/**
 * Poll a single time for job result.
 * Call this from your /api/poll/[taskId] route.
 */
export async function pollVideoJob(
  taskId: string
): Promise<OpenRouterVideoResultResponse> {
  const res = await fetch(`${BASE_URL}/videos/${taskId}`, {
    method: 'GET',
    headers: headers(),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenRouter poll failed (${res.status}): ${err}`)
  }

  return res.json() as Promise<OpenRouterVideoResultResponse>
}

/**
 * Map OpenRouter status → our internal GenerationStatus
 */
export function mapStatus(
  orStatus: OpenRouterVideoResultResponse['status']
): 'pending' | 'processing' | 'completed' | 'failed' {
  switch (orStatus) {
    case 'completed':
      return 'completed'
    case 'failed':
      return 'failed'
    case 'in_progress':
      return 'processing'
    default:
      return 'pending'
  }
}
