-- First, let's see what policies exist and drop them all
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- Now create secure policies for chat_messages
CREATE POLICY "Authenticated users can view chat messages"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create chat messages"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Secure policies for profiles
CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Secure policies for private_messages
CREATE POLICY "Users can view their own messages"
  ON public.private_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.private_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON public.private_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id);

-- Secure policies for note_ratings
CREATE POLICY "Authenticated users can view ratings"
  ON public.note_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can rate notes"
  ON public.note_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their ratings"
  ON public.note_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Secure policies for notes
CREATE POLICY "Authenticated users can view notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Secure policies for schools
CREATE POLICY "Authenticated users can view schools"
  ON public.schools FOR SELECT
  TO authenticated
  USING (true);

-- Secure policies for classes
CREATE POLICY "Authenticated users can view classes"
  ON public.classes FOR SELECT
  TO authenticated
  USING (true);

-- Secure policies for clubs
CREATE POLICY "Authenticated users can view clubs"
  ON public.clubs FOR SELECT
  TO authenticated
  USING (true);