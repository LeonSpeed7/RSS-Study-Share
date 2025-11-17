import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, Star } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Layout from "@/components/Layout";

interface Note {
  id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  file_name: string;
  file_url: string;
  note_type: string;
  rating_sum: number;
  rating_count: number;
  created_at: string;
  profiles: {
    username: string;
    full_name: string;
  };
}

const Browse = () => {
  const navigate = useNavigate();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [noteTypeFilter, setNoteTypeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotes();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notes'
        },
        async (payload) => {
          // Fetch the new note with profile data immediately
          const { data: newNote } = await supabase
            .from("notes")
            .select(`
              *,
              profiles (
                username,
                full_name
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newNote) {
            // Add the new note to the top of the list
            setNotes(prev => [newNote, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          profiles (
            username,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredNotes = notes.filter(
    (note) =>
      (note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.subject.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (noteTypeFilter === "all" || note.note_type === noteTypeFilter)
  );

  const getAverageRating = (note: Note) => {
    if (note.rating_count === 0) return 0;
    return (note.rating_sum / note.rating_count).toFixed(1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2">Browse Notes</h1>
          <p className="text-muted-foreground">
            Discover and download notes shared by fellow students
          </p>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, class, or subject..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={noteTypeFilter} onValueChange={setNoteTypeFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="lecture">Lecture Notes</SelectItem>
              <SelectItem value="lab">Lab Notes</SelectItem>
              <SelectItem value="assignment">Assignment</SelectItem>
              <SelectItem value="exam">Exam Material</SelectItem>
              <SelectItem value="project">Project</SelectItem>
              <SelectItem value="study_guide">Study Guide</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {searchQuery ? "No notes found matching your search" : "No notes available yet"}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredNotes.map((note) => (
              <Card
                key={note.id}
                className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                onClick={() => window.open(note.file_url, '_blank')}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="flex gap-2">
                      <Badge variant="secondary">{note.subject}</Badge>
                    </div>
                  </div>
                  <CardTitle className="line-clamp-1">{note.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {note.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Badge variant="outline">{note.class_name}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">By {note.profiles?.username || "Unknown"}</span>
                      {note.rating_count > 0 && (
                        <div className="flex items-center gap-1 text-yellow-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="text-sm font-medium">{getAverageRating(note)}</span>
                          <span className="text-xs text-muted-foreground">({note.rating_count})</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">
                        {format(new Date(note.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Browse;
