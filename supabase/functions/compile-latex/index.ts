import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Known-good Jake's Resume preamble — guaranteed to compile with pdflatex
const KNOWN_GOOD_PREAMBLE = `\\documentclass[letterpaper,10pt]{article}

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
`;

function extractDocumentBody(latexCode: string): string {
  // Try to extract content between \begin{document} and \end{document}
  const beginMatch = latexCode.indexOf("\\begin{document}");
  const endMatch = latexCode.indexOf("\\end{document}");

  let body: string;
  if (beginMatch !== -1 && endMatch !== -1 && endMatch > beginMatch) {
    body = latexCode.substring(beginMatch + "\\begin{document}".length, endMatch).trim();
  } else if (beginMatch !== -1) {
    body = latexCode.substring(beginMatch + "\\begin{document}".length).trim();
  } else {
    // No markers found — treat entire input as body
    body = latexCode.trim();
  }

  return body;
}

function sanitizeBody(body: string): string {
  // Remove stray markdown artifacts
  body = body.replace(/^```[\s\S]*?```$/gm, "");
  body = body.replace(/```latex\n?/gi, "");
  body = body.replace(/```\n?/g, "");
  body = body.replace(/^###\s+/gm, "");
  body = body.replace(/\*\*([^*]+)\*\*/g, "$1");

  // Remove any \documentclass, \usepackage, \newcommand, \renewcommand lines that leaked into body
  body = body.replace(/\\documentclass[^\n]*\n?/g, "");
  body = body.replace(/\\usepackage[^\n]*\n?/g, "");
  body = body.replace(/\\newcommand[^\n]*\n?/g, "");
  body = body.replace(/\\renewcommand[^\n]*\n?/g, "");
  body = body.replace(/\\addtolength[^\n]*\n?/g, "");
  body = body.replace(/\\setlength[^\n]*\n?/g, "");
  body = body.replace(/\\urlstyle[^\n]*\n?/g, "");
  body = body.replace(/\\raggedbottom\n?/g, "");
  body = body.replace(/\\raggedright\n?/g, "");
  body = body.replace(/\\titleformat[^\n]*\n?/g, "");
  body = body.replace(/\\set(main|sans|mono)font\{[^}]*\}\n?/g, "");

  // Fix \resumeItem with 2 args: \resumeItem{text1}{text2} -> \resumeItem{text1 -- text2}
  body = body.replace(/\\resumeItem\{([^}]*)\}\{([^}]*)\}/g, "\\resumeItem{$1 -- $2}");

  // Fix \resumeSubheading with only 2 args (add empty 3rd and 4th)
  body = body.replace(
    /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\s*\n(\s*\\resumeItem)/g,
    "\\resumeSubheading{$1}{$2}{}{}\n$3"
  );

  // Remove any stray \begin{document} or \end{document} that may remain
  body = body.replace(/\\begin\{document\}/g, "");
  body = body.replace(/\\end\{document\}/g, "");

  return body.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { latexCode } = await req.json();
    if (!latexCode) throw new Error("No LaTeX code provided");

    // Step 1: Extract only the document body
    const rawBody = extractDocumentBody(latexCode);

    // Step 2: Sanitize the body
    const cleanBody = sanitizeBody(rawBody);

    // Step 3: Assemble with known-good preamble
    const finalLatex = `${KNOWN_GOOD_PREAMBLE}\n\\begin{document}\n${cleanBody}\n\\end{document}`;

    console.log("Final LaTeX (first 1000 chars):", finalLatex.substring(0, 1000));

    // Step 4: Compile via YtoTech
    const response = await fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "pdflatex",
        resources: [{ main: true, content: finalLatex }],
      }),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errText = await response.text();
      console.error("YtoTech response status:", response.status);
      console.error("YtoTech response (first 500 chars):", errText.substring(0, 500));

      let errorDetail = errText.substring(0, 500);

      // Try to parse as JSON for structured error info
      try {
        const errJson = JSON.parse(errText);
        if (errJson?.logs) {
          const logLines = errJson.logs.split("\n").filter((l: string) =>
            l.startsWith("!") || l.includes("Emergency stop") || l.includes("Undefined control sequence")
          );
          if (logLines.length > 0) {
            errorDetail = logLines.slice(0, 8).join("\n");
          }
        }
        if (errJson?.log_files) {
          const mainLog = errJson.log_files["__main_document__.log"] || errJson.log_files["output.log"] || "";
          const logLines = mainLog.split("\n").filter((l: string) =>
            l.startsWith("!") || l.includes("Emergency stop") || l.includes("Undefined control sequence")
          );
          if (logLines.length > 0) {
            errorDetail = logLines.slice(0, 8).join("\n");
          }
        }
      } catch (_) {
        // errText is not JSON, use raw text
      }

      throw new Error(`LaTeX compilation failed: ${errorDetail}`);
    }

    // Check if the response is actually a PDF
    if (contentType.includes("application/pdf")) {
      const pdfBuffer = await response.arrayBuffer();
      return new Response(pdfBuffer, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/pdf",
          "Content-Disposition": "attachment; filename=optimized-resume.pdf",
        },
      });
    }

    // If not PDF, YtoTech may return JSON with logs even on 200
    const respText = await response.text();
    console.error("YtoTech returned non-PDF (first 500 chars):", respText.substring(0, 500));
    throw new Error(`LaTeX compilation returned non-PDF response: ${respText.substring(0, 300)}`);

  } catch (error) {
    console.error("Error in compile-latex:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
