import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_SYSTEM_PROMPT = `You are a Senior Engineering Manager with 10+ years of experience at FAANG-level companies. You have screened 10,000+ resumes for Software Engineering, Backend, and AI roles. You write resumes that get callbacks — authentic, confident, technically deep, and ATS-optimized.

## CORE PRINCIPLES
1. **SINGLE PAGE** — Must fit one page. Use 10pt or 11pt font, 0.4–0.5in margins, compact spacing.
2. **SOUND PRODUCTION-READY** — Write like a strong early-career engineer, NOT a student.
3. **PRESERVE TRUTH** — Keep the candidate's real name, contact info, companies, degrees, and dates. Never fabricate. You may rephrase, strengthen, and add reasonable metrics.
4. **OUTPUT** — Return ONLY compilable LaTeX code. No markdown fences, no commentary.

## BULLET POINT RULES (STRICT)
- Every bullet MUST start with a strong action verb (Engineered, Architected, Optimized, Reduced, Scaled, Deployed, Implemented, Migrated, Designed, Built, Automated, Streamlined, Integrated, Refactored, Containerized)
- Every bullet MUST include measurable impact with specific metrics
- Keep bullets to 1–2 lines max. Be specific, not vague.
- Apply STAR method implicitly
- NEVER use: "responsible for", "worked on", "helped with", "assisted in"

## KEYWORD INTEGRATION (ATS-OPTIMIZED)
- Integrate missing keywords where they genuinely fit
- Use exact terminology from the job description
- Target 90%+ ATS keyword match score

## LaTeX TEMPLATE — JAKE'S RESUME (FAANG STANDARD)
- Do NOT use fontspec, fontawesome, lmodern, or any XeTeX/LuaTeX package
- Must compile with pdflatex
- Start with \\documentclass, end with \\end{document}
- Output ONLY the LaTeX code

### EXACT PREAMBLE (copy verbatim):
\\documentclass[letterpaper,10pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage[english]{babel}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{tabularx}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-0.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule\\vspace{-5pt}]

\\newcommand{\\resumeItem}[1]{\\item\\small{#1 \\vspace{-2pt}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

### CRITICAL COMMAND RULES:
- \\resumeSubheading MUST have EXACTLY 4 brace groups: {A}{B}{C}{D}
- \\resumeItem MUST have EXACTLY 1 brace group: {text}
- \\resumeProjectHeading MUST have EXACTLY 2 brace groups
- Use \\resumeItemListStart and \\resumeItemListEnd to wrap bullets
- MUST fit single page`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeText, jobDescription, missingKeywords, matchedKeywords } = await req.json();
    const startTime = Date.now();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // --- UCB1 STRATEGY SELECTION ---
    // Use service role to read/update strategy stats
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let selectedStrategy: any = null;
    let strategyInstruction = "";

    try {
      // Fetch all active strategies
      const { data: strategies } = await supabase
        .from("prompt_strategies")
        .select("*")
        .eq("is_active", true);

      if (strategies && strategies.length > 0) {
        const totalSelections = strategies.reduce((sum: number, s: any) => sum + s.times_selected, 0);

        // UCB1: select arm with highest upper confidence bound
        // UCB(i) = X̄ᵢ + √2 × √(ln(N) / nᵢ)
        let bestUCB = -Infinity;
        for (const strategy of strategies) {
          let ucb: number;
          if (strategy.times_selected === 0) {
            ucb = Infinity; // explore unvisited arms first
          } else {
            const exploitation = strategy.avg_reward;
            const exploration = Math.SQRT2 * Math.sqrt(Math.log(totalSelections + 1) / strategy.times_selected);
            ucb = exploitation + exploration;
          }
          if (ucb > bestUCB) {
            bestUCB = ucb;
            selectedStrategy = strategy;
          }
        }

        if (selectedStrategy) {
          // Increment selection count
          await supabase.from("prompt_strategies").update({
            times_selected: selectedStrategy.times_selected + 1,
            ucb_score: bestUCB === Infinity ? 999 : bestUCB,
          }).eq("id", selectedStrategy.id);

          strategyInstruction = selectedStrategy.strategy_config?.instruction || "";
          console.log(`UCB1 selected strategy: ${selectedStrategy.name} (UCB=${bestUCB.toFixed(4)})`);
        }
      }
    } catch (e) {
      console.error("Strategy selection failed, using default:", e);
    }

    // Build the system prompt with the selected strategy's instruction
    const systemPrompt = `${BASE_SYSTEM_PROMPT}

## CURRENT OPTIMIZATION STRATEGY
${strategyInstruction || "Balanced approach: integrate keywords naturally while maintaining strong metrics and readability."}`;

    const userPrompt = `Here is the candidate's current resume:
${resumeText}

Here is the target job description:
${jobDescription}

Keywords already matched: ${matchedKeywords.slice(0, 20).join(', ')}
Critical missing keywords to integrate: ${missingKeywords.slice(0, 30).join(', ')}

TASK: Rewrite this resume as a FAANG-level engineering manager would optimize it.
- Convert every weak bullet into an impact-driven statement with metrics
- Make the candidate sound like a production engineer, not a student
- Integrate ALL critical missing keywords naturally
- Target 90%+ ATS score
- Use strong action verbs + technical depth + measurable outcomes
- Remove ALL fluff, generic phrases, and weak language.`;

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
    latexCode = latexCode.replace(/\\set(main|sans|mono)font\{[^}]*\}\n?/g, "");

    // Fix \resumeItem with 2 args
    latexCode = latexCode.replace(/\\resumeItem\{([^}]*)\}\{([^}]*)\}/g, "\\resumeItem{$1 -- $2}");
    
    // Ensure document structure
    if (!latexCode.includes("\\begin{document}")) {
      latexCode = latexCode.replace(/(\\begin\{center\})/, "\\begin{document}\n$1");
    }
    if (!latexCode.includes("\\end{document}")) {
      latexCode += "\n\\end{document}";
    }

    const generationTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        latexCode,
        strategyId: selectedStrategy?.id || null,
        strategyName: selectedStrategy?.name || "default",
        generationTimeMs: generationTime,
      }),
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
