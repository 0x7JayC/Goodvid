# Goodvid — AI Video Production App

## Project Purpose
Private-use AI video generation web app. Converts text prompts and images into short video clips using Seedance via OpenRouter. Jay-only access.

## Stack
| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript) |
| Styling | Tailwind CSS v3 |
| Database + Auth | Supabase |
| Storage | Supabase Storage |
| AI API | OpenRouter → Seedance |
| Hosting | Vercel |

## Directory Structure
```
/app                  → Next.js App Router pages + API routes
  /api/generate       → POST: submit video generation job
  /api/poll/[taskId]  → GET: poll job status from OpenRouter
  /api/director       → POST: generate shot sheet via vision LLM
  /api/storyboard     → POST: generate 4K panel images for each shot (flux via OpenRouter)
  /generate           → Generate page (text→video, image→video)
                        Accepts ?prompt=&duration=&aspectRatio= for pre-fill from Director
  /gallery            → Generation history
  /director           → Director Shot Sheet generator
/components           → Reusable React UI components
/lib
  /supabase           → Supabase client (client.ts) and server (server.ts)
  openrouter.ts       → OpenRouter API wrapper (video + text/vision)
  types.ts            → Shared TypeScript types
/supabase/migrations  → SQL migration files (run in Supabase dashboard)
```

## Director Feature
Full pipeline: references → shot sheet → 4K storyboard → 15s Seedance video.

Steps:
1. User uploads character ref + optional environment ref, describes scene
2. /api/director: vision LLM produces structured shot sheet JSON
3. /api/storyboard: generates one 4K image per shot (Flux via OpenRouter images API)
   — storyboard panels show actual rendered frames, not SVG diagrams
4. User reviews visual storyboard, edits nothing, clicks Generate
5. /api/generate: Seedance produces ONE 15-second video directly
   — master prompt compiled from shot sheet synopsis + ordered shot descriptions

Each shot contains:
- Shot type (ECU / CU / MCU / MS / WS / EWS / OTS / POV / INSERT)
- Subject framing and position
- Camera movement + lens feel + lighting
- Emotional intent
- Seedance-ready prompt
- Cut note

Models:
- OPENROUTER_TEXT_MODEL  → vision LLM for scene assist + shot sheet (moonshotai/kimi-k2.6)
- OPENROUTER_IMAGE_MODEL → image gen for production bible (openai/gpt-5.4-image-2)
- OPENROUTER_VIDEO_MODEL → Seedance for 15s final video (bytedance/seedance-2.0)

## Naming Conventions
- Files: kebab-case (`generate-form.tsx`, `video-card.tsx`)
- Components: PascalCase exports
- API routes: lowercase (`route.ts` in named folders)
- SQL tables: snake_case
- Env vars: `SCREAMING_SNAKE_CASE`

## Environment Variables (required)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
OPENROUTER_VIDEO_MODEL=bytedance/seedance-1-lite
OPENROUTER_TEXT_MODEL=anthropic/claude-sonnet-4-5
OPENROUTER_VISION_MODEL=anthropic/claude-sonnet-4-5
OPENROUTER_IMAGE_MODEL=black-forest-labs/flux-1.1-pro
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Design System
- Background: zinc-950 (#09090b)
- Surface: zinc-900 (#18181b)
- Border: zinc-800 (#27272a)
- Accent: blue-500 (#3b82f6)
- Text primary: zinc-50
- Text secondary: zinc-400
- Font: Geist (next/font/google)
- No purple/neon AI aesthetics

## Key Rules
1. Never commit real secrets. All keys via env vars only.
2. API routes only run server-side — never expose OPENROUTER_API_KEY to client.
3. All video files stored in Supabase Storage `generated-videos` bucket.
4. All input images stored in `input-images` bucket.
5. Poll interval: 3 seconds, max 5 minutes before timeout.
6. Feature additions: update this CLAUDE.md first, then implement.
