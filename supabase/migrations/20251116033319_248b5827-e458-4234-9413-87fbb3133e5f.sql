-- Fix foreign key relationships to use profiles table instead of auth.users

-- Drop existing foreign keys on notes table
ALTER TABLE public.notes
DROP CONSTRAINT IF EXISTS notes_user_id_fkey;

-- Drop existing foreign keys on chat_messages table
ALTER TABLE public.chat_messages
DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Add new foreign keys referencing profiles table
ALTER TABLE public.notes
ADD CONSTRAINT notes_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.chat_messages
ADD CONSTRAINT chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;