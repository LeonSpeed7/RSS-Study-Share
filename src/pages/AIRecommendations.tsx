import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, FileText, Star, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Note {
  id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  note_type: string;
  rating_sum: number;
  rating_count: number;
  created_at: string;
  profiles: {
    username: string;
  };
}

const AIRecommendations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [lesson, setLesson] = useState("");
  const [subject, setSubject] = useState("");
  const [className, setClassName] = useState("");
  const [recommendations, setRecommendations] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use AI recommendations",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };
    checkAuth();
  }, [navigate, toast]);

  const handleGetRecommendations = async () => {
    if (!lesson.trim()) {
      toast({
        title: "Please enter a lesson topic",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-notes", {
        body: {
          lesson: lesson.trim(),
          subject: subject.trim() || null,
          className: className.trim() || null,
        },
      });

      if (error) throw error;

      setRecommendations(data.recommendations || []);

      if (!data.recommendations || data.recommendations.length === 0) {
        toast({
          title: "No recommendations found",
          description: "Try adjusting your search criteria",
        });
      }
    } catch (error: any) {
      console.error("Error getting recommendations:", error);
      toast({
        title: "Failed to get recommendations",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAverageRating = (note: Note) => {
    if (note.rating_count === 0) return 0;
    return (note.rating_sum / note.rating_count).toFixed(1);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            AI Note Recommendations
          </h1>
          <p className="text-muted-foreground">
            Get personalized note recommendations powered by AI
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>What are you studying?</CardTitle>
            <CardDescription>
              Tell us about your lesson and we'll find the best notes for you
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lesson Topic *</label>
              <Input
                placeholder="e.g., Photosynthesis, Calculus derivatives, World War II"
                value={lesson}
                onChange={(e) => setLesson(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject (optional)</label>
                <Input
                  placeholder="e.g., Biology, Mathematics"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Class (optional)</label>
                <Input
                  placeholder="e.g., Biology 101"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
            </div>

            <Button
              onClick={handleGetRecommendations}
              disabled={isLoading || !lesson.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Finding best notes...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Get AI Recommendations
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {recommendations.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Top Recommendations for You</h2>
            <div className="grid gap-4">
              {recommendations.map((note, index) => (
                <Card
                  key={note.id}
                  className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-1"
                  onClick={() => navigate(`/note/${note.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-primary" />
                            <Badge>{note.subject}</Badge>
                            <Badge variant="outline">{note.note_type}</Badge>
                          </div>
                          <CardTitle className="text-xl">{note.title}</CardTitle>
                          <CardDescription className="mt-2">
                            {note.description || "No description"}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline">{note.class_name}</Badge>
                        <span className="text-muted-foreground">
                          By {note.profiles?.username || "Unknown"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {note.rating_count > 0 && (
                          <div className="flex items-center gap-1 text-yellow-500">
                            <Star className="w-4 h-4 fill-current" />
                            <span className="font-medium">{getAverageRating(note)}</span>
                            <span className="text-xs text-muted-foreground">
                              ({note.rating_count})
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">
                            {format(new Date(note.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AIRecommendations;
