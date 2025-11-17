-- Ensure realtime events for notes are guaranteed and include full row data
DO $$ BEGIN
  ALTER TABLE public.notes REPLICA IDENTITY FULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$
BEGIN
  -- Add table to realtime publication only if not already present
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;
  END IF;
END $$;