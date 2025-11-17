import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface Conversation {
  id: string;
  username: string;
  lastMessage: string;
  unreadCount: number;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  read: boolean;
}

const Messages = () => {
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    getCurrentUser();
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
      markMessagesAsRead(selectedUser);
    }
  }, [selectedUser]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("private_messages")
      .select(`
        *,
        sender:sender_id(username),
        receiver:receiver_id(username)
      `)
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    // Group by conversation partner
    const convMap = new Map<string, Conversation>();
    data?.forEach((msg: any) => {
      const partnerId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
      const partnerName = msg.sender_id === user.id ? msg.receiver.username : msg.sender.username;
      
      if (!convMap.has(partnerId)) {
        convMap.set(partnerId, {
          id: partnerId,
          username: partnerName,
          lastMessage: msg.message,
          unreadCount: msg.receiver_id === user.id && !msg.read ? 1 : 0,
        });
      } else {
        const conv = convMap.get(partnerId)!;
        if (msg.receiver_id === user.id && !msg.read) {
          conv.unreadCount++;
        }
      }
    });

    setConversations(Array.from(convMap.values()));
  };

  const fetchMessages = async (partnerId: string) => {
    if (!currentUserId) return;

    const { data, error } = await supabase
      .from("private_messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    setMessages(data || []);
  };

  const markMessagesAsRead = async (partnerId: string) => {
    if (!currentUserId) return;

    await supabase
      .from("private_messages")
      .update({ read: true })
      .eq("receiver_id", currentUserId)
      .eq("sender_id", partnerId)
      .eq("read", false);

    fetchConversations();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("private_messages").insert({
        sender_id: currentUserId,
        receiver_id: selectedUser,
        message: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
      fetchMessages(selectedUser);
      fetchConversations();
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

  return (
    <Layout>
      <div className="grid gap-6 md:grid-cols-3 h-[calc(100vh-12rem)]">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-18rem)]">
              {conversations.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No conversations yet
                </p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => setSelectedUser(conv.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedUser === conv.id
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {conv.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{conv.username}</p>
                            {conv.unreadCount > 0 && (
                              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-1">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {conv.lastMessage}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle>
              {selectedUser
                ? conversations.find((c) => c.id === selectedUser)?.username
                : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            {selectedUser ? (
              <>
                <ScrollArea className="flex-1 pr-4">
                  <div className="space-y-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.sender_id === currentUserId
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            msg.sender_id === currentUserId
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent"
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {format(new Date(msg.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="flex gap-2 mt-4">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                  />
                  <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Messages;
