-- Add report email to club settings
ALTER TABLE club_settings
  ADD COLUMN IF NOT EXISTS report_email TEXT,
  ADD COLUMN IF NOT EXISTS daily_report_enabled  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS weekly_report_enabled BOOLEAN NOT NULL DEFAULT true;

-- Enable pg_cron and pg_net extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Grant cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Daily report — every night at 3:00 AM UTC
SELECT cron.schedule(
  'nightly-daily-report',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url     := 'https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/send-nightly-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8"}'::jsonb,
      body    := '{"type":"daily"}'::jsonb
    );
  $$
);

-- Weekly report — every Sunday at 3:30 AM UTC (covers Mon–Sun)
SELECT cron.schedule(
  'weekly-report-sunday',
  '30 3 * * 0',
  $$
    SELECT net.http_post(
      url     := 'https://fwinnniiugjfmpkgybyu.supabase.co/functions/v1/send-nightly-report',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ3aW5ubmlpdWdqZm1wa2d5Ynl1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MTg0NDYsImV4cCI6MjA4OTI5NDQ0Nn0.wwr4xUM5fBGTVr2WGYtLVA_h48MhIRLiheIDQZh9ru8"}'::jsonb,
      body    := '{"type":"weekly"}'::jsonb
    );
  $$
);
