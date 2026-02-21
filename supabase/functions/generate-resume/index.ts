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

    const systemPrompt = `You are a senior professional resume writer with 15+ years of recruiting experience. You understand what hiring managers actually look for and write resumes that feel authentic, confident, and human — not robotic or over-optimized.

## CORE PRINCIPLES
1. **SINGLE PAGE** — Must fit one page. Use 10pt or 11pt font, 0.4–0.5in margins, compact spacing.
2. **SOUND HUMAN** — Write like a real person, not an AI. Avoid buzzword stuffing. Every sentence should feel natural and conversational yet professional.
3. **PRESERVE TRUTH** — Keep the candidate's real name, contact info, companies, degrees, and dates. Never fabricate. You may rephrase and strengthen language.
4. **OUTPUT** — Return ONLY compilable LaTeX code. No markdown fences, no commentary.

## WRITING STYLE
- Use clear, direct language. "Built a dashboard that reduced reporting time by 40%" beats "Spearheaded the architecting of a revolutionary analytics paradigm."
- Vary your action verbs naturally — don't start every bullet with "Spearheaded" or "Architected."
- Include real numbers when the original resume has them. Don't invent metrics.
- Keep bullet points to 1–2 lines each. Be specific, not vague.
- The summary should read like a confident elevator pitch, not a keyword dump.

## KEYWORD INTEGRATION
- Incorporate missing keywords where they genuinely fit — in skills, bullet points, or summary.
- Don't force keywords where they sound unnatural. A hiring manager will notice.
- Match the job description's terminology in the skills section.
- Prioritize the most important missing keywords over trying to fit all of them.

## STRUCTURE
1. **Name & Contact** — Clean header, single line
2. **Professional Summary** — 2–3 sentences that tell the candidate's story and connect it to the target role
3. **Skills** — Organized by category, matching JD terminology, comma-separated (not bulleted)
4. **Experience** — Reverse chronological, 3–5 bullets per role focusing on impact and outcomes
5. **Education** — Compact, at the bottom
6. **Projects** (if relevant) — Brief highlights of standout work

## LaTeX RULES
- Use ONLY: geometry, enumitem, hyperref, fontenc, inputenc, titlesec, xcolor
- Do NOT use fontspec, fontawesome, lmodern, or any XeTeX/LuaTeX package
- Do NOT use \\usepackage{titlespacing} — use \\titlespacing* from titlesec instead
- Must compile with pdflatex
- Start with \\documentclass, end with \\end{document}`;

    const userPrompt = `Here is the candidate's current resume:
${resumeText}

Here is the job they're applying for:
${jobDescription}

Keywords already present: ${matchedKeywords.slice(0, 20).join(', ')}
Keywords to incorporate naturally: ${missingKeywords.slice(0, 25).join(', ')}

Rewrite this resume to sound professional, authentic, and compelling for this specific role. The goal is for the hiring manager to read it and think "I want to interview this person." Keep it real — no exaggeration, no buzzword overload. Just a clean, strong resume that gets callbacks.`;

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
