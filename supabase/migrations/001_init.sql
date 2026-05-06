-- ============================================================
-- Goodvid — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── generations table ────────────────────────────────────────
create table if not exists public.generations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  type            text not null check (type in ('text-to-video', 'image-to-video')),
  prompt          text not null,
  input_image_url text,
  output_video_url text,
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'completed', 'failed')),
  error_message   text,
  model           text not null default 'bytedance/seedance-1-lite',
  duration        integer not null default 5,
  aspect_ratio    text not null default '16:9'
                    check (aspect_ratio in ('16:9', '9:16', '1:1')),
  task_id         text,           -- OpenRouter async job ID
  created_at      timestamptz not null default now(),
  completed_at    timestamptz,
  metadata        jsonb not null default '{}'::jsonb
);

-- Index for fast user history queries
create index if not exists idx_generations_user_created
  on public.generations (user_id, created_at desc);

-- Index for polling by task_id
create index if not exists idx_generations_task_id
  on public.generations (task_id)
  where task_id is not null;

-- ── Row Level Security ────────────────────────────────────────
alter table public.generations enable row level security;

-- NOTE: This app is single-user / private use.
-- The service-role key (used in API routes) bypasses RLS entirely.
-- These policies protect the table if anon/user tokens are used.

-- Allow service role unrestricted access (already true, this is for clarity)
create policy "Service role full access"
  on public.generations
  for all
  to service_role
  using (true)
  with check (true);

-- ── Storage Buckets ───────────────────────────────────────────
-- Run these separately in Dashboard → Storage if they don't exist.

insert into storage.buckets (id, name, public)
  values ('input-images', 'input-images', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('generated-videos', 'generated-videos', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('storyboard-frames', 'storyboard-frames', true)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('production-bibles', 'production-bibles', true)
  on conflict (id) do nothing;

-- Storage policies for service role (API routes use service key)
create policy "Service role storage input-images"
  on storage.objects for all
  to service_role
  using (bucket_id = 'input-images')
  with check (bucket_id = 'input-images');

create policy "Service role storage generated-videos"
  on storage.objects for all
  to service_role
  using (bucket_id = 'generated-videos')
  with check (bucket_id = 'generated-videos');

create policy "Service role storage storyboard-frames"
  on storage.objects for all
  to service_role
  using (bucket_id = 'storyboard-frames')
  with check (bucket_id = 'storyboard-frames');

-- Public read for all buckets (so URLs are accessible in the browser)
create policy "Public read input-images"
  on storage.objects for select
  to anon
  using (bucket_id = 'input-images');

create policy "Public read generated-videos"
  on storage.objects for select
  to anon
  using (bucket_id = 'generated-videos');

create policy "Public read storyboard-frames"
  on storage.objects for select
  to anon
  using (bucket_id = 'storyboard-frames');

create policy "Service role storage production-bibles"
  on storage.objects for all
  to service_role
  using (bucket_id = 'production-bibles')
  with check (bucket_id = 'production-bibles');

create policy "Public read production-bibles"
  on storage.objects for select
  to anon
  using (bucket_id = 'production-bibles');
