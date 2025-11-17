import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Download, Calendar, User, Send, Star, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Note {
  id: string;
  title: string;
  description: string;
  class_name: string;
  subject: string;
  file_url: string;
  file_name: string;
  note_type: string;
  rating_sum: number;
  rating_count: number;
  user_id: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    full_name: string;
  };
}

interface ChatMessage {
  id: string;
  message: string;
  created_at: string;
  profiles: {
    username: string;
  };
  user_id: string;
}

const NoteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [note, setNote] = useState<Note | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messagesEndRef, setMessagesEndRef] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchNote();
    fetchMessages();
    getCurrentUser();
    fetchUserRating();

    // Subscribe to realtime chat messages
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `note_id=eq.${id}`
        },
        async (payload) => {
          // Fetch the new message with profile data
          const { data: newMsg } = await supabase
            .from("chat_messages")
            .select(`
              *,
              profiles (
                username
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMsg) {
            setMessages(prev => [...prev, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchNote = async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select(`
          *,
          profiles (
            id,
            username,
            full_name
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      setNote(data);
    } catch (error) {
      console.error("Error fetching note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_messages")
        .select(`
          *,
          profiles (
            username
          )
        `)
        .eq("note_id", id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        note_id: id,
        user_id: currentUserId,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const fetchUserRating = async () => {
    if (!currentUserId) return;
    
    const { data } = await supabase
      .from("note_ratings")
      .select("rating")
      .eq("note_id", id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    
    if (data) {
      setUserRating(data.rating);
    }
  };

  const handleRating = async (rating: number) => {
    if (!currentUserId) return;

    try {
      const { error } = await supabase
        .from("note_ratings")
        .upsert({
          note_id: id,
          user_id: currentUserId,
          rating,
        });

      if (error) throw error;

      setUserRating(rating);
      fetchNote();
      
      toast({
        title: "Rating submitted",
        description: "Thank you for your feedback!",
      });
    } catch (error: any) {
      toast({
        title: "Failed to submit rating",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (note?.file_url) {
      window.open(note.file_url, "_blank");
    }
  };

  const startPrivateChat = () => {
    if (note?.profiles?.id) {
      navigate(`/messages?user=${note.profiles.id}`);
    }
  };

  const getAverageRating = () => {
    if (!note || note.rating_count === 0) return 0;
    return (note.rating_sum / note.rating_count).toFixed(1);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Loading note...</div>
      </Layout>
    );
  }

  if (!note) {
    return (
      <Layout>
        <div className="text-center py-12 text-muted-foreground">Note not found</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-2">{note.title}</CardTitle>
                  <CardDescription className="text-base">
                    {note.description || "No description provided"}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Badge>{note.subject}</Badge>
                <Badge variant="outline">{note.class_name}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>
                      Uploaded by{" "}
                      <button
                        onClick={startPrivateChat}
                        className="font-medium hover:underline text-primary"
                      >
                        {note.profiles?.username}
                      </button>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startPrivateChat}
                      className="h-7"
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Message
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(note.created_at), "MMM d, yyyy")}
                  </div>
                </div>

                {note.rating_count > 0 && (
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">{getAverageRating()}</span>
                    <span className="text-sm text-muted-foreground">
                      ({note.rating_count} {note.rating_count === 1 ? "rating" : "ratings"})
                    </span>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-medium">Rate this note:</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        onClick={() => handleRating(rating)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating <= userRating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-gray-300"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <Button onClick={handleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download {note.file_name}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <CardTitle>Discussion</CardTitle>
              </div>
              <CardDescription>Chat with other students about this note</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
                    <p className="text-muted-foreground/70 text-xs">Start the conversation!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isCurrentUser = msg.user_id === currentUserId;
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                        >
                          {!isCurrentUser && (
                            <Avatar className="w-8 h-8 flex-shrink-0">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {msg.profiles?.username?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`flex-1 max-w-[80%] ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
                            <div className={`flex items-baseline gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                              <span className="text-xs font-medium text-foreground">
                                {isCurrentUser ? 'You' : msg.profiles?.username}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(msg.created_at), "h:mm a")}
                              </span>
                            </div>
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isCurrentUser
                                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                                  : 'bg-muted rounded-bl-sm'
                              }`}
                            >
                              <p className="text-sm break-words">{msg.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={setMessagesEndRef} />
                  </>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  disabled={isSending || !currentUserId}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isSending || !newMessage.trim() || !currentUserId}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default NoteDetail;
