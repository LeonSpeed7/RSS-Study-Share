import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Search, Users, MessageCircle, Globe } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";

interface User {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
}

interface Message {
  id: string;
  message: string;
  created_at: string;
  sender_id: string;
  read: boolean;
}

interface GlobalMessage {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
  };
}

const Messages = () => {
  const { toast } = useToast();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [globalMessages, setGlobalMessages] = useState<GlobalMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [newGlobalMessage, setNewGlobalMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("direct");

  useEffect(() => {
    getCurrentUser();
    fetchAllUsers();
    fetchGlobalMessages();
  }, []);

  useEffect(() => {
    // Subscribe to global chat messages
    const channel = supabase
      .channel('global-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'global_chat_messages'
        },
        async (payload) => {
          const { data: newMsg } = await supabase
            .from("global_chat_messages")
            .select(`
              *,
              profiles (
                username
              )
            `)
            .eq("id", payload.new.id)
            .single();

          if (newMsg) {
            setGlobalMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser);
      markMessagesAsRead(selectedUser);
      
      // Subscribe to realtime messages
      const channel = supabase
        .channel(`private-messages-${selectedUser}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `sender_id=eq.${selectedUser}`
          },
          (payload) => {
            if (payload.new.receiver_id === currentUserId) {
              setMessages(prev => [...prev, payload.new as Message]);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUser, currentUserId]);

  useEffect(() => {
    const filtered = allUsers.filter(user =>
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchAllUsers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, full_name, bio")
      .neq("id", user.id)
      .order("username");

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }

    setAllUsers(data || []);
    setFilteredUsers(data || []);
  };

  const fetchGlobalMessages = async () => {
    const { data, error } = await supabase
      .from("global_chat_messages")
      .select(`
        *,
        profiles (
          username
        )
      `)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching global messages:", error);
      return;
    }

    setGlobalMessages(data || []);
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

  const handleSendGlobalMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGlobalMessage.trim() || !currentUserId) return;

    setIsSending(true);
    try {
      const { error } = await supabase.from("global_chat_messages").insert({
        user_id: currentUserId,
        message: newGlobalMessage.trim(),
      });

      if (error) throw error;

      setNewGlobalMessage("");
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

  const selectedUserData = allUsers.find(u => u.id === selectedUser);

  return (
    <Layout>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-6">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Global Chat
          </TabsTrigger>
          <TabsTrigger value="direct" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Direct Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-0">
          <Card className="h-[calc(100vh-16rem)] flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-primary" />
                <CardTitle>Global Chat</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-4">
              <ScrollArea className="flex-1 pr-4 mb-4">
                {globalMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Globe className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
                    <p className="text-muted-foreground/70 text-xs">Be the first to say hello!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {globalMessages.map((msg) => {
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
                  </div>
                )}
              </ScrollArea>
              <form onSubmit={handleSendGlobalMessage} className="flex gap-2 pt-2 border-t">
                <Input
                  placeholder="Type a message to everyone..."
                  value={newGlobalMessage}
                  onChange={(e) => setNewGlobalMessage(e.target.value)}
                  disabled={isSending || !currentUserId}
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isSending || !newGlobalMessage.trim() || !currentUserId}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="direct" className="mt-0">
          <div className="grid gap-6 md:grid-cols-3 h-[calc(100vh-16rem)]">
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <CardTitle>All Users</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <ScrollArea className="h-[calc(100vh-22rem)]">
              {filteredUsers.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No users found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUser(user.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedUser === user.id
                          ? "bg-accent"
                          : "hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{user.username}</p>
                          {user.full_name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.full_name}
                            </p>
                          )}
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
          <CardHeader className="pb-3">
            {selectedUserData ? (
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {selectedUserData.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedUserData.username}</CardTitle>
                  {selectedUserData.full_name && (
                    <p className="text-sm text-muted-foreground">{selectedUserData.full_name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-muted-foreground">Select a user to chat</CardTitle>
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-4">
            {selectedUser ? (
              <>
                <ScrollArea className="flex-1 pr-4 mb-4">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="w-12 h-12 text-muted-foreground/50 mb-3" />
                      <p className="text-muted-foreground text-sm font-medium">No messages yet</p>
                      <p className="text-muted-foreground/70 text-xs">Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg) => {
                        const isCurrentUser = msg.sender_id === currentUserId;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                                isCurrentUser
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted rounded-bl-sm"
                              }`}
                            >
                              <p className="text-sm break-words">{msg.message}</p>
                              <p className={`text-xs mt-1 ${
                                isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}>
                                {format(new Date(msg.created_at), "h:mm a")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t">
                  <Input
                    placeholder="Type your message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isSending || !newMessage.trim()}
                    className="flex-shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center">
                <div>
                  <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Start a conversation</p>
                  <p className="text-sm text-muted-foreground/70">
                    Select a user from the list to begin messaging
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
          </div>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default Messages;
