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
    let { latexCode } = await req.json();
    if (!latexCode) throw new Error("No LaTeX code provided");

    // Sanitize: remove packages incompatible with pdflatex
    latexCode = latexCode.replace(/\\usepackage\{fontspec\}\n?/g, "");
    latexCode = latexCode.replace(/\\usepackage\{fontawesome5?\}\n?/g, "");
    latexCode = latexCode.replace(/\\usepackage\{titlespacing\}\n?/g, "");
    latexCode = latexCode.replace(/\\set(main|sans|mono)font\{[^}]*\}\n?/g, "");

    // Fix missing \begin{document}
    if (!latexCode.includes("\\begin{document}")) {
      latexCode = latexCode.replace(/(\\begin\{center\})/, "\\begin{document}\n$1");
    }

    // Fix \resumeItem with 2 args: \resumeItem{text1}{text2} -> \resumeItem{text1 -- text2}
    latexCode = latexCode.replace(/\\resumeItem\{([^}]*)\}\{([^}]*)\}/g, "\\resumeItem{$1 -- $2}");

    // Fix \resumeSubheading with only 2 args (missing 3rd and 4th)
    // Pattern: \resumeSubheading{A}{B}\n followed by \resumeItem (no 3rd/4th brace group)
    latexCode = latexCode.replace(
      /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\s*\n(\s*\\resumeItem)/g,
      "\\resumeSubheading{$1}{$2}{}{}\n$3"
    );

    // Fix bare \resumeItemListStart not inside \resumeSubHeadingListStart
    // Replace with plain \begin{itemize} if it appears right after \section
    latexCode = latexCode.replace(
      /\\section\{([^}]*)\}\s*\n\\resumeItemListStart/g,
      "\\section{$1}\n\\begin{itemize}[leftmargin=0.15in, label={}]"
    );
    // And matching end
    let sectionFixCount = 0;
    latexCode = latexCode.replace(
      /\\section\{([^}]*)\}\s*\n\\begin\{itemize\}\[leftmargin=0\.15in, label=\{\}\]/g,
      (match) => { sectionFixCount++; return match; }
    );

    // Ensure \end{document} exists
    if (!latexCode.includes("\\end{document}")) {
      latexCode += "\n\\end{document}";
    }

    // Use YtoTech LaTeX API to compile to PDF
    const response = await fetch("https://latex.ytotech.com/builds/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compiler: "pdflatex",
        resources: [
          {
            main: true,
            content: latexCode,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("LaTeX compilation error:", response.status, errText);
      throw new Error("LaTeX compilation failed. Please check your LaTeX code for errors.");
    }

    const pdfBuffer = await response.arrayBuffer();

    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=optimized-resume.pdf",
      },
    });
  } catch (error) {
    console.error("Error in compile-latex:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
