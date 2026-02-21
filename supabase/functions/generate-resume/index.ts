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

    const systemPrompt = `You are an elite ATS resume strategist, career coach, and LaTeX typesetting expert. Your mission: craft a SINGLE-PAGE resume so powerful the interviewer is ready to hire on sight.

## ABSOLUTE RULES
1. **SINGLE PAGE ONLY** — The resume MUST fit on exactly ONE page. Use tight margins (0.4in–0.5in), compact spacing, and concise language. Never exceed one page.
2. **PRESERVE IDENTITY** — Keep the candidate's REAL full name as the header. Keep real contact info (email, phone, LinkedIn, location) exactly as provided.
3. **NO FABRICATION** — Never invent experience, companies, degrees, or certifications. Only rephrase, reframe, and optimize what exists.
4. Return ONLY compilable LaTeX code starting with \\documentclass and ending with \\end{document}. No markdown fences, no explanations.

## MULTI-STRATEGY OPTIMIZATION (apply ALL simultaneously)

### Strategy 1: Keyword Saturation
- Weave EVERY missing keyword naturally into bullet points, summary, and skills
- Use exact phrases from the job description (not synonyms) for ATS matching
- Place high-priority keywords in the top third of the resume

### Strategy 2: Impact-First Bullet Points
- Lead every bullet with a strong action verb (Spearheaded, Architected, Drove, Optimized, Delivered)
- Follow the CAR formula: Challenge → Action → Result
- Include quantified metrics: percentages, dollar amounts, team sizes, time saved
- If no metrics exist, frame impact qualitatively (e.g., "across 3 product lines")

### Strategy 3: Strategic Section Ordering
- Name & Contact (header, compact single line)
- Professional Summary (3 lines max — mirror the job title, years of experience, and top 3-4 skills from JD)
- Core Competencies / Technical Skills (single block, keyword-dense, matching JD terminology exactly)
- Professional Experience (reverse chronological, 3-5 bullets per role, most recent role gets most space)
- Education & Certifications (compact, at bottom)

### Strategy 4: Power Positioning
- Summary must read like the candidate was BORN for this specific role
- First bullet of each role should be the most impressive achievement
- Skills section must mirror the exact technology/skill names from the job description
- Use industry-specific terminology that signals deep domain expertise

### Strategy 5: LaTeX Optimization for Single Page
- Use \\documentclass[10pt]{article} or [11pt] depending on content volume
- Margins: \\usepackage[top=0.4in,bottom=0.4in,left=0.5in,right=0.5in]{geometry}
- Minimal vertical spacing: \\setlength{\\parskip}{0pt}, tight itemsep
- Use \\titlespacing* from the titlesec package to compress section headers
- Skills as inline comma-separated list, NOT itemized
- No decorative elements — every pixel serves content

## OUTPUT FORMAT
Complete, compilable LaTeX using ONLY these packages: geometry, enumitem, hyperref, fontenc, inputenc, titlesec, xcolor.
CRITICAL RESTRICTIONS:
- Do NOT use fontspec, fontawesome, fontawesome5, lmodern, or any font package that requires XeTeX/LuaTeX.
- Do NOT use \\usepackage{titlespacing} — titlespacing is NOT a real package. Use \\titlespacing* from the titlesec package instead.
- The code MUST compile with pdflatex (NOT xelatex or lualatex).
- Start with \\documentclass, end with \\end{document}.`;

    const userPrompt = `ORIGINAL RESUME:
${resumeText}

TARGET JOB DESCRIPTION:
${jobDescription}

MATCHED KEYWORDS (preserve these): ${matchedKeywords.slice(0, 20).join(', ')}

MISSING KEYWORDS (MUST incorporate ALL): ${missingKeywords.slice(0, 30).join(', ')}

Apply all 5 optimization strategies simultaneously. Create a SINGLE-PAGE LaTeX resume that makes the interviewer think "this is exactly who we need." The candidate's real name must be the header. Every line must earn its place on the page.`;

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

    // Sanitize: remove packages incompatible with pdflatex
    latexCode = latexCode.replace(/\\usepackage\{fontspec\}\n?/g, "");
    latexCode = latexCode.replace(/\\usepackage\{fontawesome5?\}\n?/g, "");
    latexCode = latexCode.replace(/\\usepackage\{titlespacing\}\n?/g, "");
    latexCode = latexCode.replace(/\\usepackage\[?[^\]]*\]?\{lmodern\}\n?/g, "");
    // Remove any \setmainfont or \setsansfont commands (fontspec-only)
    latexCode = latexCode.replace(/\\set(main|sans|mono)font\{[^}]*\}\n?/g, "");

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
