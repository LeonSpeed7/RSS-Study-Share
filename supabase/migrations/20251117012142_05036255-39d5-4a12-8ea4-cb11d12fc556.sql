-- Drop the overly broad chat_messages policy
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;

-- Create more secure policy: users can only view messages for notes they can access
-- Since notes table allows all authenticated users to view, this ensures chat messages
-- follow the same access pattern as the notes they're attached to
CREATE POLICY "Users can view messages for accessible notes"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = chat_messages.note_id
    )
  );