-- Drop existing profile view policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Create school-based profile visibility policy
-- Users can view:
-- 1. Their own profile
-- 2. Profiles from the same school
-- 3. Profiles without a school (for backwards compatibility during migration)
CREATE POLICY "Users can view profiles from same school"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id OR
    school_id IS NULL OR
    school_id IN (
      SELECT school_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Verify chat_messages policy is correct
-- Drop and recreate to ensure it's not cached
DROP POLICY IF EXISTS "Users can view messages for accessible notes" ON public.chat_messages;

-- Users can only view chat messages for notes they created or notes visible to them
CREATE POLICY "Users can view messages for their accessible notes"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    note_id IN (
      SELECT id FROM public.notes
      WHERE user_id = auth.uid()
      OR (
        -- Notes are accessible if user is in same school as note creator
        user_id IN (
          SELECT p.id FROM public.profiles p
          WHERE p.school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
          AND p.school_id IS NOT NULL
        )
      )
      OR (
        -- During migration period, if schools aren't set up yet, allow all
        (SELECT school_id FROM public.profiles WHERE id = auth.uid()) IS NULL
      )
    )
  );