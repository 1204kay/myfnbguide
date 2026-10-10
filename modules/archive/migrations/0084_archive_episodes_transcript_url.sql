-- The transcript an episode's host already made (podcast:transcript in the feed): read in place of transcribing.
ALTER TABLE archive_episodes ADD COLUMN IF NOT EXISTS transcript_url text;
