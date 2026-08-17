-- Private, opt-in sensor replay collection for ML evaluation.
-- Raw replay payloads live in a private Storage bucket; this table stores only
-- review metadata and the object path. Exact location and absolute timestamps
-- are removed by the client before upload.

create table if not exists public.sensor_replay_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  replay_id text not null,
  storage_path text not null unique,
  schema_version smallint not null check (schema_version = 1),
  engine_version text not null,
  threshold_config_version text not null,
  event_label text not null check (event_label in (
    'crash',
    'pothole',
    'hard_braking',
    'phone_drop',
    'door_slam',
    'rough_road',
    'normal_driving',
    'other'
  )),
  label_source text not null default 'user' check (label_source in ('user', 'reviewer')),
  label_confidence smallint not null default 60 check (label_confidence between 0 and 100),
  review_status text not null default 'pending' check (review_status in ('pending', 'verified', 'rejected')),
  phone_placement text not null default 'unknown' check (phone_placement in (
    'mount', 'pocket', 'seat', 'cup_holder', 'unknown'
  )),
  vehicle_class text not null default 'unknown' check (vehicle_class in (
    'sedan', 'suv', 'pickup', 'van', 'truck', 'other', 'unknown'
  )),
  device_model text not null default 'unknown',
  sample_rate_hz double precision not null check (sample_rate_hz > 0 and sample_rate_hz <= 200),
  duration_ms integer not null check (duration_ms >= 0),
  sample_count integer not null check (sample_count > 0),
  consent_version text not null,
  contains_exact_location boolean not null default false check (contains_exact_location = false),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index if not exists sensor_replay_submissions_user_replay_uidx
  on public.sensor_replay_submissions (user_id, replay_id);

create index if not exists sensor_replay_submissions_user_created_idx
  on public.sensor_replay_submissions (user_id, created_at desc);
create index if not exists sensor_replay_submissions_review_queue_idx
  on public.sensor_replay_submissions (review_status, created_at)
  where review_status = 'pending';
create index if not exists sensor_replay_submissions_label_idx
  on public.sensor_replay_submissions (event_label, review_status);

alter table public.sensor_replay_submissions enable row level security;

drop policy if exists "sensor_replays_select_own" on public.sensor_replay_submissions;
create policy "sensor_replays_select_own"
  on public.sensor_replay_submissions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "sensor_replays_insert_own" on public.sensor_replay_submissions;
create policy "sensor_replays_insert_own"
  on public.sensor_replay_submissions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id and contains_exact_location = false);

drop policy if exists "sensor_replays_delete_own" on public.sensor_replay_submissions;
create policy "sensor_replays_delete_own"
  on public.sensor_replay_submissions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, delete on public.sensor_replay_submissions to authenticated;
revoke all on public.sensor_replay_submissions from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sensor-replays',
  'sensor-replays',
  false,
  10485760,
  array['application/json']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "sensor_replay_objects_insert_own" on storage.objects;
create policy "sensor_replay_objects_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'sensor-replays'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "sensor_replay_objects_select_own" on storage.objects;
create policy "sensor_replay_objects_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'sensor-replays'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "sensor_replay_objects_delete_own" on storage.objects;
create policy "sensor_replay_objects_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'sensor-replays'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
