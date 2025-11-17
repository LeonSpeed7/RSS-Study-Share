import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Calendar, Edit2, Save, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Profile {
  username: string;
  full_name: string;
  bio: string;
  school_id: string | null;
  schools?: {
    name: string;
  };
}

interface School {
  id: string;
  name: string;
  code: string;
}

interface Note {
  id: string;
  title: string;
  class_name: string;
  class_id: string | null;
  subject: string;
  created_at: string;
  file_url: string;
  is_public: boolean;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<Profile>>({});

  useEffect(() => {
    fetchProfile();
    fetchUserNotes();
    fetchSchools();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          schools (
            name
          )
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const fetchSchools = async () => {
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          username: editedProfile.username,
          full_name: editedProfile.full_name,
          bio: editedProfile.bio,
          school_id: editedProfile.school_id,
        })
        .eq("id", user.id);

      if (error) throw error;

      setProfile(editedProfile as Profile);
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated",
      });
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditedProfile(profile || {});
    setIsEditing(false);
  };

  const fetchUserNotes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Loading profile...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-20 h-20">
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {(isEditing ? editedProfile : profile)?.username?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2 flex-1">
                  {isEditing ? (
                    <>
                      <Input
                        placeholder="Full Name"
                        value={editedProfile.full_name || ""}
                        onChange={(e) => setEditedProfile({ ...editedProfile, full_name: e.target.value })}
                        className="text-2xl font-bold h-auto py-1"
                      />
                      <Input
                        placeholder="Username"
                        value={editedProfile.username || ""}
                        onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                        className="text-lg"
                      />
                      <Textarea
                        placeholder="Bio"
                        value={editedProfile.bio || ""}
                        onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                        className="mt-2"
                      />
                      <div className="space-y-2 mt-2">
                        <label className="text-sm font-medium">School</label>
                        <Select
                          value={editedProfile.school_id || ""}
                          onValueChange={(value) => setEditedProfile({ ...editedProfile, school_id: value || null })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select your school (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No school</SelectItem>
                            {schools.map((school) => (
                              <SelectItem key={school.id} value={school.id}>
                                {school.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <CardTitle className="text-3xl">{profile?.full_name || "Unknown"}</CardTitle>
                      <CardDescription className="text-lg">@{profile?.username || "unknown"}</CardDescription>
                      {profile?.bio && <p className="mt-2 text-sm text-foreground">{profile.bio}</p>}
                      {profile?.schools && (
                        <Badge variant="outline" className="mt-2">
                          {profile.schools.name}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button onClick={handleSaveProfile} size="sm">
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6 text-sm">
              <div>
                <span className="font-semibold text-2xl">{notes.length}</span>
                <span className="text-muted-foreground ml-2">Notes Uploaded</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-4">My Uploads</h2>
          {notes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                You haven't uploaded any notes yet
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {notes.map((note) => (
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
                        <Badge variant={note.is_public ? "default" : "outline"}>
                          {note.is_public ? "Public" : "Private"}
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="line-clamp-1">{note.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <Badge variant="outline">{note.class_name}</Badge>
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
      </div>
    </Layout>
  );
};

export default Profile;
