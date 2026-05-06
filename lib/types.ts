export type GenerationType = 'text-to-video' | 'image-to-video'

export type GenerationStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type AspectRatio = '16:9' | '9:16' | '1:1'

export interface Generation {
  id: string
  user_id: string
  type: GenerationType
  prompt: string
  input_image_url: string | null
  output_video_url: string | null
  status: GenerationStatus
  error_message: string | null
  model: string
  duration: number
  aspect_ratio: AspectRatio
  task_id: string | null         // OpenRouter job ID for polling
  created_at: string
  completed_at: string | null
  metadata: Record<string, unknown>
}

// ─── OpenRouter Video API ──────────────────────────────────────────────────

export interface OpenRouterVideoRequest {
  model: string
  prompt: string
  image?: string          // base64 or public URL — only for image-to-video
  duration?: number       // seconds, model-dependent (typically 5 or 10)
  aspect_ratio?: AspectRatio
}

export interface OpenRouterVideoTaskResponse {
  id: string              // task_id to poll
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  created_at?: string
}

export interface OpenRouterVideoResultResponse {
  id: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  polling_url?: string
  unsigned_urls?: string[]   // video URL(s) when completed
  error?: string
}

// ─── API Route payloads ────────────────────────────────────────────────────

export interface GenerateRequestBody {
  type: GenerationType
  prompt: string
  imageBase64?: string     // client sends base64 for image-to-video
  imageMimeType?: string
  duration?: number
  aspectRatio?: AspectRatio
}

export interface GenerateResponseBody {
  generationId: string     // Supabase row ID
  taskId: string           // OpenRouter task ID
}

export interface PollResponseBody {
  status: GenerationStatus
  videoUrl?: string
  error?: string
}

// ─── Director Shot Sheet ───────────────────────────────────────────────────

export type ShotType = 'ECU' | 'CU' | 'MCU' | 'MS' | 'WS' | 'EWS' | 'OTS' | 'POV' | 'INSERT'

export type CameraMovement =
  | 'Static'
  | 'Slow push in'
  | 'Pull back'
  | 'Pan left'
  | 'Pan right'
  | 'Tilt up'
  | 'Tilt down'
  | 'Dolly forward'
  | 'Dolly backward'
  | 'Tracking shot'
  | 'Handheld'
  | 'Drone descend'
  | 'Drone ascend'
  | 'Orbit'

export interface Shot {
  number: number
  label: string               // e.g. "Cut 1 — Establishing"
  type: ShotType
  framing: string             // what the frame contains
  subject_position: string    // where the subject sits in frame
  camera_movement: CameraMovement | string
  lens_feel: string           // e.g. "24mm prime, handheld"
  lighting_mood: string       // e.g. "golden hour backlight, warm"
  emotion: string             // the feeling this shot delivers
  action: string              // what happens during this shot
  dialogue: string            // character spoken line for this cut
  voiceover: string           // narrator/voiceover line for this cut
  seedance_prompt: string     // ready-to-use Seedance prompt
  duration: number            // seconds
  aspect_ratio: AspectRatio
  cut_note: string            // how it connects to the next shot
}

export interface ShotSheet {
  scene_title: string
  scene_synopsis: string
  mood: string
  color_palette: string
  environment_fingerprint: string   // 1-line description of the location feel
  cinematography_notes: string[]    // bullet-point style notes on the overall visual approach
  mood_keywords: string[]           // e.g. ["fresh", "relaxed", "dreamy", "joyful"]
  voiceover_excerpt: string         // 2-3 sentence poetic voiceover/narration for the whole scene
  sound_notes: string               // ambient sound design description
  shots: Shot[]
}

// ─── Production Bible image generation ────────────────────────────────────────

export interface BibleRequestBody {
  shotSheet: ShotSheet
  character_image_base64?: string
  character_image_mime?: string
  environment_image_base64?: string
  environment_image_mime?: string
}

export interface BibleResponseBody {
  bibleImageUrl: string   // Supabase Storage public URL of the generated production bible
}

export interface DirectorRequestBody {
  scene_description: string
  character_image_base64?: string
  character_image_mime?: string
  environment_image_base64?: string
  environment_image_mime?: string
  mood?: string
  shot_count?: number         // 3–8
}

/** Extended form submission — includes UI preview URLs not sent to API */
export interface DirectorFormSubmission extends DirectorRequestBody {
  _characterPreviewUrl?: string
  _environmentPreviewUrl?: string
}

export interface DirectorResponseBody {
  shotSheet: ShotSheet
}

// ─── Storyboard image generation ──────────────────────────────────────────────

export interface StoryboardRequestBody {
  shots: Array<{
    number: number
    prompt: string
    shot_type: string
    lens_feel: string
    camera_movement: string
    lighting_mood: string
    aspect_ratio: AspectRatio
  }>
  // Reference images passed to GPT-5.4-image-2 for visual consistency
  character_image_base64?: string
  character_image_mime?: string
  environment_image_base64?: string
  environment_image_mime?: string
}

export interface StoryboardPanel {
  shotNumber: number
  imageUrl: string         // Supabase Storage public URL
}

export interface StoryboardResponseBody {
  panels: StoryboardPanel[]
  errors: Array<{ shotNumber: number; error: string }>
}

// ─── Single 15-second video ────────────────────────────────────────────────────

export interface VideoGenerateRequestBody {
  masterPrompt: string     // compiled from all shot descriptions
  duration: number         // 15
  aspectRatio: AspectRatio
}

export interface VideoGenerateResponseBody {
  generationId: string
  taskId: string
}
