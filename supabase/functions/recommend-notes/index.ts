import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lesson, subject, className } = await req.json();
    
    if (!lesson) {
      return new Response(
        JSON.stringify({ error: "Lesson topic is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !supabaseUrl || !supabaseKey) {
      throw new Error("Missing required environment variables");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header to identify the user
    const authHeader = req.headers.get("authorization");
    let userSchoolName = null;
    let notes: any[] = [];
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("school_name")
          .eq("id", user.id)
          .single();
        
        userSchoolName = profile?.school_name;
      }
    }

    // Filter by school if user has a school - prioritize same school notes
    if (userSchoolName) {
      // First get notes from same school
      let sameSchoolQuery = supabase
        .from("notes")
        .select(`
          id, 
          title, 
          description, 
          subject, 
          class_name, 
          rating_sum, 
          rating_count, 
          note_type, 
          file_url,
          user_id,
          profiles!inner(school_name)
        `)
        .eq("is_public", true)
        .eq("profiles.school_name", userSchoolName)
        .order("rating_count", { ascending: false })
        .limit(30);

      if (subject) {
        sameSchoolQuery = sameSchoolQuery.eq("subject", subject);
      }
      if (className) {
        sameSchoolQuery = sameSchoolQuery.eq("class_name", className);
      }

      const { data: sameSchoolNotes } = await sameSchoolQuery;

      // Then get other notes to fill up to 50
      let otherNotesQuery = supabase
        .from("notes")
        .select(`
          id, 
          title, 
          description, 
          subject, 
          class_name, 
          rating_sum, 
          rating_count, 
          note_type, 
          file_url,
          user_id,
          profiles!inner(school_name)
        `)
        .eq("is_public", true)
        .neq("profiles.school_name", userSchoolName)
        .order("rating_count", { ascending: false })
        .limit(20);

      if (subject) {
        otherNotesQuery = otherNotesQuery.eq("subject", subject);
      }
      if (className) {
        otherNotesQuery = otherNotesQuery.eq("class_name", className);
      }

      const { data: otherNotes } = await otherNotesQuery;

      // Combine: same school first, then others
      notes = [...(sameSchoolNotes || []), ...(otherNotes || [])];
    } else {
      // No school filter, get all notes
      let query = supabase
        .from("notes")
        .select(`
          id, 
          title, 
          description, 
          subject, 
          class_name, 
          rating_sum, 
          rating_count, 
          note_type, 
          file_url,
          user_id,
          profiles!inner(school_name)
        `)
        .eq("is_public", true)
        .order("rating_count", { ascending: false })
        .limit(50);

      if (subject) {
        query = query.eq("subject", subject);
      }
      if (className) {
        query = query.eq("class_name", className);
      }

      const { data: allNotes, error: notesError } = await query;
      
      if (notesError) {
        throw notesError;
      }
      
      notes = allNotes || [];
    }

    if (!notes || notes.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format notes for AI
    const notesContext = notes.map((note: any) => {
      const avgRating = note.rating_count > 0 
        ? (note.rating_sum / note.rating_count).toFixed(1)
        : "0";
      return `ID: ${note.id}
Title: ${note.title}
Description: ${note.description || "No description"}
Subject: ${note.subject}
Class: ${note.class_name}
Type: ${note.note_type}
Rating: ${avgRating}/5 (${note.rating_count} ratings)`;
    }).join("\n\n---\n\n");

    // Call Lovable AI
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an AI study assistant that recommends the best notes for students. 
Analyze the provided notes and recommend the TOP 3 most relevant notes for the given lesson topic.
Consider:
1. Relevance to the lesson topic
2. Note ratings and popularity
3. Note type (prefer study guides, lecture notes, and exam materials for learning)
4. Description quality and detail

Return ONLY a JSON array of exactly 3 note IDs in order of recommendation (best first).
Format: ["id1", "id2", "id3"]`
          },
          {
            role: "user",
            content: `Lesson topic: "${lesson}"
${subject ? `Subject: ${subject}` : ""}
${className ? `Class: ${className}` : ""}

Available notes:
${notesContext}

Recommend the top 3 notes for this lesson.`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the AI response
    let recommendedIds: string[];
    try {
      recommendedIds = JSON.parse(content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/\[.*\]/s);
      if (jsonMatch) {
        recommendedIds = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid AI response format");
      }
    }

    // Fetch full details of recommended notes
    const { data: recommendedNotes, error: recError } = await supabase
      .from("notes")
      .select(`
        *,
        profiles (
          username,
          full_name
        )
      `)
      .in("id", recommendedIds);

    if (recError) {
      throw recError;
    }

    // Sort by recommendation order
    const sortedNotes = recommendedIds
      .map(id => recommendedNotes?.find((note: any) => note.id === id))
      .filter(Boolean);

    return new Response(
      JSON.stringify({ recommendations: sortedNotes }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in recommend-notes function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
