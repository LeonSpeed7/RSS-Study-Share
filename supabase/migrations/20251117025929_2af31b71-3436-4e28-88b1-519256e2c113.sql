-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

-- Create a security definer function to check if users share the same school
CREATE OR REPLACE FUNCTION public.user_can_view_profile(_viewer_id uuid, _profile_id uuid, _profile_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _viewer_id = _profile_id OR
    _profile_school_id IS NULL OR
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = _viewer_id
        AND school_id = _profile_school_id
    )
  )
$$;

-- Create the new policy using the security definer function
CREATE POLICY "Users can view profiles"
ON public.profiles
FOR SELECT
USING (public.user_can_view_profile(auth.uid(), id, school_id));