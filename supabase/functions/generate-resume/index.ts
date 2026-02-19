import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, jobDescription, missingKeywords, matchedKeywords } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert ATS resume writer and LaTeX expert. Your task is to rewrite and optimize a resume using LaTeX to maximize ATS compatibility with a specific job description.

Rules:
1. Generate COMPLETE, compilable LaTeX code using standard packages (geometry, enumitem, hyperref, fontenc, inputenc, titlesec, xcolor).
2. Naturally incorporate ALL missing keywords from the job description into the resume content.
3. Keep all factual information accurate — only rephrase, don't fabricate experience.
4. Use clean, ATS-friendly formatting (no tables for main content, no columns for skills/contact).
5. Return ONLY the LaTeX code, starting with \\documentclass and ending with \\end{document}. No explanation, no markdown code blocks.
6. Use \\textbf, \\textit for emphasis. Use itemize for bullet points.
7. Section headers: Summary, Experience, Skills, Education, Certifications (if applicable).
8. Make bullet points achievement-oriented with metrics where possible.`;

    const userPrompt = `ORIGINAL RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

CURRENTLY MATCHED KEYWORDS (keep these): ${matchedKeywords.slice(0, 20).join(', ')}

MISSING KEYWORDS TO ADD NATURALLY: ${missingKeywords.slice(0, 30).join(', ')}

Rewrite this resume in LaTeX, incorporating the missing keywords naturally throughout the content to maximize ATS score. Make it professional and compelling.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Usage credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let latexCode = data.choices?.[0]?.message?.content ?? "";

    // Strip markdown code fences if present
    latexCode = latexCode.replace(/^```latex\n?/i, "").replace(/^```\n?/i, "").replace(/\n?```$/i, "").trim();

    return new Response(
      JSON.stringify({ latexCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-resume:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
