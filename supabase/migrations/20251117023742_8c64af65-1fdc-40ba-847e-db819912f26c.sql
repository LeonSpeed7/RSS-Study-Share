-- Create global chat messages table
CREATE TABLE public.global_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for global chat
CREATE POLICY "Authenticated users can view global messages"
ON public.global_chat_messages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can send global messages"
ON public.global_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX idx_global_chat_messages_created_at ON public.global_chat_messages(created_at DESC);

-- Enable realtime for global chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.global_chat_messages;