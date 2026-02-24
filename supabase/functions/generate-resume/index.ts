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

## ROLE ALIGNMENT: BACKEND + AI ENGINEER
Align the resume for Backend and AI Engineer roles specifically. Weave in these domain-specific terms naturally:

### Distributed Systems
- Microservices architecture, service mesh, event-driven architecture, message queues (Kafka, RabbitMQ, SQS)
- Distributed caching (Redis, Memcached), sharding, replication, consensus protocols
- CAP theorem tradeoffs, eventual consistency, idempotency, circuit breakers, retry policies

### System Design
- Horizontal scaling, load balancing, rate limiting, API gateway, reverse proxy
- Database indexing, query optimization, connection pooling, read replicas
- Caching strategies (write-through, write-back, cache-aside), CDN, message brokers

### Observability & Monitoring
- Structured logging (ELK stack, Fluentd), distributed tracing (Jaeger, OpenTelemetry)
- Metrics collection (Prometheus, Grafana, Datadog), alerting, SLOs/SLIs/SLAs
- APM (Application Performance Monitoring), error tracking (Sentry), health checks

### Scalability Metrics
- Concurrent users, QPS (queries per second), RPS (requests per second)
- Load handling (peak traffic, auto-scaling), horizontal/vertical scaling
- Connection pool sizing, thread pool optimization, async processing

### DevOps & CI/CD
- CI/CD pipelines (GitHub Actions, Azure DevOps, Jenkins, GitLab CI)
- Infrastructure as Code (Terraform, CloudFormation, Pulumi)
- Container orchestration (Docker, Kubernetes, ECS), service discovery
- Blue-green deployments, canary releases, feature flags, rollback strategies

### Cloud Platforms
- AWS (EC2, S3, Lambda, RDS, SQS, SNS, EKS, DynamoDB, CloudWatch)
- GCP (Cloud Run, BigQuery, Pub/Sub, GKE, Cloud Functions)
- Azure (App Service, AKS, Cosmos DB, Azure Functions, Event Hubs)

### AI/ML Engineering
- LLM integration (OpenAI, Gemini, Claude), RAG pipelines, vector databases (Pinecone, Weaviate, pgvector)
- Model serving (TensorFlow Serving, TorchServe, Triton), ML pipelines (MLflow, Kubeflow)
- Embedding generation, semantic search, prompt engineering, fine-tuning
- Feature stores, A/B testing for models, model versioning

## PROJECT DESCRIPTIONS
- Rewrite project descriptions to sound production-grade, not academic
- Frame projects as if they were shipped to production with real users
- Include architecture decisions: "Designed event-driven microservices architecture using Kafka for async processing"
- Include scale: "Handles 50K+ daily requests" or "Processes 1M+ records"
- If the candidate has any AI/ML project, rewrite it to sound industry-level, e.g.:
  "Architected RAG pipeline using LangChain + pgvector, achieving 92% retrieval accuracy across 100K+ documents with sub-200ms p95 query latency"
- If no AI project exists, suggest adding one in the output as a comment

## PERFORMANCE METRICS TO WEAVE IN
When rewriting bullets, look for opportunities to add:
- API latency improvements (%, ms, p50/p90/p99)
- Query optimization results (execution time %)
- System throughput (RPS, QPS, concurrent users)
- Cost reduction (cloud spend %, infrastructure savings)
- Deployment frequency (daily deploys, MTTR reduction)
- Scale indicators (data volume, user count, request volume)
- Availability/reliability (uptime %, error rate reduction)
- Cache hit rates, connection pool utilization, error rates

## LaTeX FORMATTING (FAANG-LEVEL PRECISION)
- Use ONLY: geometry, enumitem, hyperref, fontenc, inputenc, titlesec, xcolor, tabularx
- Do NOT use fontspec, fontawesome, lmodern, or any XeTeX/LuaTeX package
- Do NOT use \\usepackage{titlespacing} — use \\titlespacing* from titlesec instead
- Must compile with pdflatex
- Start with \\documentclass[10pt]{article}, end with \\end{document}

### EXACT LAYOUT TEMPLATE
Use this precise structure for pixel-perfect FAANG formatting:

\\documentclass[10pt]{article}
\\usepackage[letterpaper,margin=0.45in,top=0.4in,bottom=0.4in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{tabularx}

% Tight spacing
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\pagestyle{empty}

% Section formatting — clean horizontal rules
\\titleformat{\\section}{\\vspace{-6pt}\\scshape\\large\\bfseries}{}{0em}{}[\\vspace{-4pt}\\titlerule\\vspace{-4pt}]
\\titlespacing*{\\section}{0pt}{6pt}{4pt}

% Tight bullet lists
\\setlist[itemize]{leftmargin=12pt,itemsep=1pt,parsep=0pt,topsep=2pt}

### HEADER FORMAT (single block, no table):
{\\centering
{\\LARGE\\bfseries CANDIDATE NAME}\\\\[3pt]
{\\small email@domain.com \\textbar\\ +1-XXX-XXX-XXXX \\textbar\\ \\href{https://linkedin.com/in/handle}{LinkedIn} \\textbar\\ \\href{https://github.com/handle}{GitHub}}\\\\
}

### SECTION ORDER (strictly follow):
1. Header (Name + Contact — single centered block)
2. Professional Summary (2-3 sentences, confident elevator pitch)
3. Technical Skills (categorized: Languages | Frameworks | Databases | Cloud/DevOps | Tools)
4. Experience (reverse chronological, 3-5 bullets each)
5. Projects (2-3 bullets each, production-grade descriptions)
6. Education (compact, bottom)

### EXPERIENCE FORMAT:
\\textbf{Job Title} \\hfill \\textbf{Start -- End}\\\\
\\textit{Company Name} \\hfill \\textit{Location}
\\begin{itemize}
  \\item Engineered X using Y, achieving Z metric improvement
\\end{itemize}

### SKILLS FORMAT (use tabularx for clean alignment):
\\begin{tabularx}{\\textwidth}{@{}l X@{}}
\\textbf{Languages:} & Python, Java, C++, JavaScript, TypeScript, SQL, Go \\\\
\\textbf{Frameworks:} & FastAPI, Spring Boot, React, Node.js, Django, Flask \\\\
\\textbf{Databases:} & PostgreSQL, MongoDB, Redis, DynamoDB, Elasticsearch \\\\
\\textbf{Cloud/DevOps:} & AWS, GCP, Docker, Kubernetes, Terraform, CI/CD, GitHub Actions \\\\
\\textbf{Tools:} & Git, Kafka, RabbitMQ, Prometheus, Grafana, Datadog, Sentry \\\\
\\end{tabularx}

### ALIGNMENT RULES:
- Job title and date MUST be on the same line using \\hfill
- Company and location MUST be on the same line using \\hfill
- All sections MUST use consistent spacing
- No orphan lines or widows — everything fits on ONE page
- Use \\vspace{-Xpt} aggressively to remove excess whitespace
- Skills section must use tabularx for clean column alignment
- Contact info must be centered, single line, pipe-separated
- Section headings must use \\titlerule for professional horizontal lines`;

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
