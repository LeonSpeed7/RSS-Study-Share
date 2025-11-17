-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- Create secure policy for chat_messages
-- Only authenticated users can view chat messages
CREATE POLICY "Authenticated users can view chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Create secure policy for profiles
-- Only authenticated users can view profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Update private_messages policies to be more explicit
DROP POLICY IF EXISTS "Users can view their messages" ON public.private_messages;

CREATE POLICY "Users can view their own messages"
  ON public.private_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Update note_ratings to require authentication
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.note_ratings;

CREATE POLICY "Authenticated users can view ratings"
  ON public.note_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Update notes policy to require authentication
DROP POLICY IF EXISTS "Anyone can view notes" ON public.notes;

CREATE POLICY "Authenticated users can view notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

-- Update schools, classes, clubs to require authentication
DROP POLICY IF EXISTS "Anyone can view schools" ON public.schools;
DROP POLICY IF EXISTS "Anyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Anyone can view clubs" ON public.clubs;

CREATE POLICY "Authenticated users can view schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can view clubs"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (true);