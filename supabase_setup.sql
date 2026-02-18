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

-- Profiles: Users can only see/edit their own profile
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Files: Users can only manage their own files
CREATE POLICY "Users can manage own files" ON public.files FOR ALL USING (auth.uid() = user_id);

-- Comments: Users can see all comments, but only delete their own (or if they own the file)
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Activity: Users can only see their own activity
CREATE POLICY "Users can view own activity" ON public.activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own activity" ON public.activity FOR INSERT WITH CHECK (auth.uid() = user_id);
