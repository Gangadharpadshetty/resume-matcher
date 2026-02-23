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

    const systemPrompt = `You are a Senior Engineering Manager with 10+ years of experience at FAANG-level companies. You have screened 10,000+ resumes for Software Engineering, Backend, and AI roles. You write resumes that get callbacks — authentic, confident, technically deep, and ATS-optimized.

## CORE PRINCIPLES
1. **SINGLE PAGE** — Must fit one page. Use 10pt or 11pt font, 0.4–0.5in margins, compact spacing.
2. **SOUND PRODUCTION-READY** — Write like a strong early-career engineer, NOT a student. Every bullet must demonstrate real engineering impact.
3. **PRESERVE TRUTH** — Keep the candidate's real name, contact info, companies, degrees, and dates. Never fabricate. You may rephrase, strengthen, and add reasonable metrics based on context.
4. **OUTPUT** — Return ONLY compilable LaTeX code. No markdown fences, no commentary.

## BULLET POINT RULES (STRICT)
- Every bullet MUST start with a strong action verb (Engineered, Architected, Optimized, Reduced, Scaled, Deployed, Implemented, Migrated, Designed, Built, Automated, Streamlined, Integrated, Refactored, Containerized)
- Every bullet MUST include measurable impact with specific metrics:
  - "Reduced API latency by 40% (p90: 200ms → 120ms)"
  - "Optimized PostgreSQL queries reducing execution time by 65%"
  - "Increased system throughput from 1K to 5K RPS"
  - "Reduced cloud infrastructure costs by 30% through right-sizing"
  - "Decreased deployment time from 45min to 8min via CI/CD pipeline optimization"
- Keep bullets to 1–2 lines max. Be specific, not vague.
- Apply STAR method implicitly (Situation→Task→Action→Result) without writing "STAR"
- NEVER use: "responsible for", "worked on", "helped with", "assisted in", "participated in", "involved in"
- NEVER use generic fluff: "team player", "fast learner", "passionate", "detail-oriented"

## KEYWORD INTEGRATION (ATS-OPTIMIZED)
- Integrate missing keywords where they genuinely fit — in skills, bullet points, or summary
- Use exact terminology from the job description (e.g., "microservices" not "small services")
- Include technical keywords naturally: REST APIs, GraphQL, FastAPI, PostgreSQL, MongoDB, Redis, Docker, Kubernetes, CI/CD, AWS/GCP/Azure, Terraform, Kafka, gRPC, LLM, RAG, vector databases
- Match the job description's terminology in the skills section
- Prioritize the most important missing keywords over trying to fit all of them
- Target 90%+ ATS keyword match score

## WRITING STYLE
- Sound confident and industry-ready, not academic
- Use clear, direct, technical language
- Vary action verbs naturally — don't repeat the same verb
- Include real numbers. If the original resume lacks metrics, infer reasonable ones from context (e.g., "Built API" → "Engineered RESTful API serving 10K+ daily requests with 99.9% uptime")
- The summary should read like a confident elevator pitch from someone who ships production code

## STRUCTURE
1. **Name & Contact** — Clean header, single line (name, email, phone, LinkedIn, GitHub)
2. **Professional Summary** — 2–3 sentences: who you are, what you do best, what value you bring. No generic fluff. Sound like an engineer who ships.
3. **Technical Skills** — Organized by category (Languages, Frameworks, Databases, Cloud/DevOps, Tools), matching JD terminology, comma-separated
4. **Experience** — Reverse chronological, 3–5 impact-driven bullets per role. Each bullet = Action Verb + Technical Detail + Measurable Outcome
5. **Projects** (if relevant) — 2–3 bullets each showing technical depth, architecture decisions, and scale
6. **Education** — Compact, at the bottom. Include relevant coursework only if early-career.

## PERFORMANCE METRICS TO WEAVE IN
When rewriting bullets, look for opportunities to add:
- API latency improvements (%, ms, p50/p90/p99)
- Query optimization results (execution time %)
- System throughput (RPS, QPS, concurrent users)
- Cost reduction (cloud spend %, infrastructure savings)
- Deployment frequency (daily deploys, MTTR reduction)
- Scale indicators (data volume, user count, request volume)
- Availability/reliability (uptime %, error rate reduction)

## LaTeX RULES
- Use ONLY: geometry, enumitem, hyperref, fontenc, inputenc, titlesec, xcolor
- Do NOT use fontspec, fontawesome, lmodern, or any XeTeX/LuaTeX package
- Do NOT use \\usepackage{titlespacing} — use \\titlespacing* from titlesec instead
- Must compile with pdflatex
- Start with \\documentclass, end with \\end{document}`;

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
- The hiring manager should think: "This person ships real software. Interview immediately."
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
