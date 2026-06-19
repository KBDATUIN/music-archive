-- FLAGGED — Supabase Database Schema
-- Run this in your Supabase SQL Editor to create all required tables.

-- ============================================================
-- Entries (hardcoded seed data + approved submissions)
-- ============================================================
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  genres JSONB NOT NULL DEFAULT '[]',
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'allegation',
  outcome TEXT NOT NULL DEFAULT 'ongoing',
  sources JSONB NOT NULL DEFAULT '[]',
  image_urls JSONB DEFAULT '[]',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_hardcoded BOOLEAN DEFAULT FALSE
);

-- ============================================================
-- Pending submissions (from public form)
-- ============================================================
CREATE TABLE IF NOT EXISTS pending_submissions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  genres JSONB NOT NULL DEFAULT '[]',
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  status TEXT DEFAULT 'allegation',
  outcome TEXT DEFAULT 'ongoing',
  sources JSONB DEFAULT '[]',
  image_urls JSONB DEFAULT '[]',
  image_url TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  submitter_note TEXT,
  submission_status TEXT DEFAULT 'pending'
);

-- ============================================================
-- Comments (flat + threaded via parent_id)
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  text TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  session_id TEXT NOT NULL,
  image_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_entry_id ON comments(entry_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- ============================================================
-- Comment reactions (like/dislike per user per comment)
-- ============================================================
CREATE TABLE IF NOT EXISTS comment_reactions (
  comment_id TEXT REFERENCES comments(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (comment_id, session_id, type)
);

-- ============================================================
-- Entry engagement (like/dislike per user per entry)
-- ============================================================
CREATE TABLE IF NOT EXISTS entry_engagement (
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (entry_id, session_id, type)
);

-- ============================================================
-- Reports (user-flagged entries)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES entries(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT,
  session_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Storage bucket for entry/comment images
-- ============================================================
-- Run this in the Supabase Storage dashboard or via SQL:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('entry-images', 'entry-images', true);
--
-- Then create a policy to allow public reads:
-- CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'entry-images');
--
-- And a policy to allow anyone to upload:
-- CREATE POLICY "Public upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'entry-images');

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE entry_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Public read access for entries and comments
DROP POLICY IF EXISTS "Public read entries" ON entries;
CREATE POLICY "Public read entries" ON entries FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read comments" ON comments;
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read comment_reactions" ON comment_reactions;
CREATE POLICY "Public read comment_reactions" ON comment_reactions FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public read entry_engagement" ON entry_engagement;
CREATE POLICY "Public read entry_engagement" ON entry_engagement FOR SELECT USING (true);

-- Anyone can insert into pending_submissions, comments, reactions, engagement, reports
DROP POLICY IF EXISTS "Anyone can submit" ON pending_submissions;
CREATE POLICY "Anyone can submit" ON pending_submissions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can comment" ON comments;
CREATE POLICY "Anyone can comment" ON comments FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can react" ON comment_reactions;
CREATE POLICY "Anyone can react" ON comment_reactions FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can engage" ON entry_engagement;
CREATE POLICY "Anyone can engage" ON entry_engagement FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can report" ON reports;
CREATE POLICY "Anyone can report" ON reports FOR INSERT WITH CHECK (true);

-- Delete own comments (by session_id)
DROP POLICY IF EXISTS "Delete own comments" ON comments;
CREATE POLICY "Delete own comments" ON comments FOR DELETE USING (session_id = current_setting('app.session_id', true));
DROP POLICY IF EXISTS "Delete own reactions" ON comment_reactions;
CREATE POLICY "Delete own reactions" ON comment_reactions FOR DELETE USING (session_id = current_setting('app.session_id', true));
DROP POLICY IF EXISTS "Delete own engagement" ON entry_engagement;
CREATE POLICY "Delete own engagement" ON entry_engagement FOR DELETE USING (session_id = current_setting('app.session_id', true));
