-- Drop existing policies for notes bucket if they exist
DROP POLICY IF EXISTS "Users can upload notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own notes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own notes" ON storage.objects;
DROP POLICY IF EXISTS "Public notes are viewable by everyone" ON storage.objects;

-- Allow authenticated users to upload files to their own folder in notes bucket
CREATE POLICY "Users can upload notes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own notes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view public notes (where the note record is public)
CREATE POLICY "Public notes are viewable by everyone"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'notes'
  AND EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.file_url LIKE '%' || storage.objects.name || '%'
    AND notes.is_public = true
  )
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own notes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'notes' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);