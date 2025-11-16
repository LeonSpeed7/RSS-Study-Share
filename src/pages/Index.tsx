import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, Users, Upload } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/browse");
      }
    };
    checkUser();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-hero">
      <nav className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-8 h-8 text-white" />
            <span className="text-2xl font-bold text-white">StudyShare</span>
          </div>
          <Button variant="secondary" onClick={() => navigate("/auth")}>
            Get Started
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight">
            Share Knowledge,
            <br />
            Succeed Together
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            A student-friendly platform for sharing and discovering notes across different classes. 
            Learn from your peers and contribute to the community.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="bg-accent hover:bg-accent/90">
              Join StudyShare
            </Button>
            <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-20">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <BookOpen className="w-12 h-12 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Browse Notes</h3>
              <p className="text-white/80">
                Access a vast library of student-shared notes across various subjects and classes
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <Upload className="w-12 h-12 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Share Your Work</h3>
              <p className="text-white/80">
                Upload your notes to help fellow students and build your academic portfolio
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 text-white">
              <Users className="w-12 h-12 mb-4 mx-auto" />
              <h3 className="text-xl font-semibold mb-2">Collaborate</h3>
              <p className="text-white/80">
                Chat with other students about notes and study materials in real-time
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
