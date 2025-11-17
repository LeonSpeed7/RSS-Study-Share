-- Add school_name column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school_name TEXT;

-- Migrate existing data from schools table to profiles
UPDATE public.profiles p
SET school_name = s.name
FROM public.schools s
WHERE p.school_id = s.id AND p.school_name IS NULL;

-- Note: We're keeping school_id for backward compatibility but school_name is now the primary field