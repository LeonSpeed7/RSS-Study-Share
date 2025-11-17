-- Add note_type enum and update notes table
CREATE TYPE public.note_type AS ENUM ('lecture', 'lab', 'assignment', 'exam', 'project', 'study_guide', 'other');

ALTER TABLE public.notes ADD COLUMN note_type note_type DEFAULT 'other';
ALTER TABLE public.notes ADD COLUMN rating_sum integer DEFAULT 0;
ALTER TABLE public.notes ADD COLUMN rating_count integer DEFAULT 0;

-- Create schools table
CREATE TABLE public.schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schools"
  ON public.schools FOR SELECT
  USING (true);

-- Create classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  code text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(school_id, code)
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view classes"
  ON public.classes FOR SELECT
  USING (true);

-- Create clubs table
CREATE TABLE public.clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clubs"
  ON public.clubs FOR SELECT
  USING (true);

-- Update profiles to link to school
ALTER TABLE public.profiles ADD COLUMN school_id uuid REFERENCES public.schools(id);

-- Update notes to link to class
ALTER TABLE public.notes ADD COLUMN class_id uuid REFERENCES public.classes(id);

-- Create private messages table
CREATE TABLE public.private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their messages"
  ON public.private_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.private_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages"
  ON public.private_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Create note ratings table
CREATE TABLE public.note_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(note_id, user_id)
);

ALTER TABLE public.note_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON public.note_ratings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can rate notes"
  ON public.note_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their ratings"
  ON public.note_ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create function to update note ratings
CREATE OR REPLACE FUNCTION public.update_note_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.notes
  SET 
    rating_sum = (SELECT COALESCE(SUM(rating), 0) FROM public.note_ratings WHERE note_id = NEW.note_id),
    rating_count = (SELECT COUNT(*) FROM public.note_ratings WHERE note_id = NEW.note_id)
  WHERE id = NEW.note_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for rating updates
CREATE TRIGGER update_note_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.note_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_note_rating();