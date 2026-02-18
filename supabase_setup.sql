-- Create profiles table (links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS public.files (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  size TEXT,
  type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  thumbnail TEXT,
  mime_type TEXT,
  storage_path TEXT NOT NULL
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id TEXT PRIMARY KEY,
  file_id TEXT REFERENCES public.files(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  user_name TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity table
CREATE TABLE IF NOT EXISTS public.activity (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  user_name TEXT,
  action TEXT NOT NULL,
  file_name TEXT,
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Setup Storage
-- Note: Run this in the SQL editor, then manually create a 'files' bucket in the dashboard
-- OR use the following to try and create it (if permissions allow)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Policies (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- Clean up existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own files" ON public.files;
DROP POLICY IF EXISTS "Users can insert own files" ON public.files;
DROP POLICY IF EXISTS "Users can view own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete own files" ON public.files;
DROP POLICY IF EXISTS "Users can update own files" ON public.files;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can view own activity" ON public.activity;
DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity;

-- Profiles: Users can only see/edit/insert their own profile
CREATE POLICY "profile_owner_policy" ON public.profiles
FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Files: Users can only manage their own files
CREATE POLICY "file_owner_policy" ON public.files
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Comments: Anyone can view, but only owners (or file owners) can delete
CREATE POLICY "comment_view_policy" ON public.comments FOR SELECT USING (true);
CREATE POLICY "comment_insert_policy" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comment_owner_delete_policy" ON public.comments FOR DELETE 
USING (
    auth.uid() = user_id OR 
    EXISTS (SELECT 1 FROM public.files WHERE id = file_id AND user_id = auth.uid())
);

-- Activity: Users can only manage their own activity
CREATE POLICY "activity_owner_policy" ON public.activity
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Storage Permissions (Crucial for the 'authenticated' role)
GRANT ALL ON TABLE storage.objects TO authenticated;
GRANT ALL ON TABLE storage.buckets TO authenticated;

-- Storage Policies for 'files' bucket
DROP POLICY IF EXISTS "Users can upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- Allow users to fully manage their own folder in storage
CREATE POLICY "storage_owner_policy"
ON storage.objects FOR ALL
USING ( bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text )
WITH CHECK ( bucket_id = 'files' AND (storage.foldername(name))[1] = auth.uid()::text );

-- Storage Policies for 'files' bucket
-- Allow users to upload files to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
