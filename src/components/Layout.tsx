import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";
import { Upload, User as UserIcon, GraduationCap, LogOut, MessageSquare, Sparkles } from "lucide-react";
import { NavLink } from "@/components/NavLink";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session && location.pathname !== "/auth") {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <GraduationCap className="w-8 h-8 text-primary" />
              <span className="text-xl font-bold">StudyShare</span>
            </button>
            
            <div className="flex items-center gap-4">
              <NavLink
                to="/ai-recommendations"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                activeClassName="bg-accent text-accent-foreground"
              >
                <Sparkles className="w-4 h-4" />
                AI Picks
              </NavLink>
              <NavLink
                to="/upload"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                activeClassName="bg-accent text-accent-foreground"
              >
                <Upload className="w-4 h-4" />
                Upload
              </NavLink>
              <NavLink
                to="/messages"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                activeClassName="bg-accent text-accent-foreground"
              >
                <MessageSquare className="w-4 h-4" />
                Messages
              </NavLink>
              <NavLink
                to="/"
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent"
                activeClassName="bg-accent text-accent-foreground"
              >
                <UserIcon className="w-4 h-4" />
                My Notes
              </NavLink>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
