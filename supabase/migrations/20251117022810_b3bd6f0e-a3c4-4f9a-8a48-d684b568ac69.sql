-- Fix infinite recursion in profiles RLS policies
-- Drop the duplicate/conflicting policies
DROP POLICY IF EXISTS "Users can view profiles from same school" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their school or own profile" ON public.profiles;

-- Create a single, simplified policy for viewing profiles
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id OR 
  school_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() 
    AND p.school_id = profiles.school_id
  )
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;