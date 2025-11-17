import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Calendar, School } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  school_name: string | null;
}

interface Note {
  id: string;
  title: string;
  class_name: string;
  subject: string;
  created_at: string;
  file_url: string;
  is_public: boolean;
}

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canView, setCanView] = useState(false);

  useEffect(() => {
    if (userId) {
      checkAccess();
      fetchProfile();
      fetchUserNotes();
    }
  }, [userId]);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setCanView(true);
    } catch (error) {
      console.error("Error checking access:", error);
      navigate("/");
    }
  };

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Failed to load profile",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchUserNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !canView) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Profile not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarFallback className="text-2xl">
                  {profile.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-2xl">{profile.username}</CardTitle>
                {profile.full_name && (
                  <CardDescription>{profile.full_name}</CardDescription>
                )}
                {profile.school_name && (
                  <div className="flex items-center gap-2 mt-2">
                    <School className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{profile.school_name}</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          {profile.bio && (
            <CardContent>
              <p className="text-muted-foreground">{profile.bio}</p>
            </CardContent>
          )}
        </Card>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Public Notes ({notes.length})</h2>
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No public notes shared yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
                <Card 
                  key={note.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/note/${note.id}`)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(note.created_at), "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{note.class_name}</Badge>
                      <Badge variant="secondary">{note.subject}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default UserProfile;
