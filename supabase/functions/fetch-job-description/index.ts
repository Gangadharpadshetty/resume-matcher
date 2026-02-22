import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&bull;/g, "•")
    .replace(/&hellip;/g, "…")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-zA-Z]+;/g, " ");
}

function stripHtmlToText(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  // Convert structural elements to newlines
  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|blockquote|dd|dt)>/gi, "\n")
    .replace(/<(p|div|h[1-6]|section|article|blockquote)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/?(ul|ol|dl|table|tbody|thead)[^>]*>/gi, "\n");

  // Remove all remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  text = decodeEntities(text);

  // Clean whitespace
  text = text
    .replace(/[ \t]+/g, " ")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();

  return text;
}

function extractJsonLdJobPosting(html: string): string | null {
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      let data = JSON.parse(match[1]);
      // Handle @graph arrays
      if (data["@graph"]) data = data["@graph"];
      const items = Array.isArray(data) ? data : [data];
      const jobData = items.find((d: any) => d["@type"] === "JobPosting");

      if (jobData) {
        const parts: string[] = [];
        if (jobData.title) parts.push(`Job Title: ${jobData.title}`);
        if (jobData.hiringOrganization?.name) parts.push(`Company: ${jobData.hiringOrganization.name}`);
        if (jobData.jobLocation) {
          const locs = Array.isArray(jobData.jobLocation) ? jobData.jobLocation : [jobData.jobLocation];
          const locStrings = locs.map((loc: any) => {
            if (loc?.address) {
              const a = loc.address;
              return [a.addressLocality, a.addressRegion, a.addressCountry].filter(Boolean).join(", ");
            }
            return loc?.name || "";
          }).filter(Boolean);
          if (locStrings.length) parts.push(`Location: ${locStrings.join(" | ")}`);
        }
        if (jobData.employmentType) {
          const et = Array.isArray(jobData.employmentType) ? jobData.employmentType.join(", ") : jobData.employmentType;
          parts.push(`Type: ${et}`);
        }
        if (jobData.description) {
          parts.push(`\nJob Description:\n${stripHtmlToText(jobData.description)}`);
        }
        if (jobData.qualifications) {
          const q = typeof jobData.qualifications === "string" ? stripHtmlToText(jobData.qualifications) : JSON.stringify(jobData.qualifications);
          parts.push(`\nQualifications:\n${q}`);
        }
        if (jobData.responsibilities) {
          const r = typeof jobData.responsibilities === "string" ? stripHtmlToText(jobData.responsibilities) : JSON.stringify(jobData.responsibilities);
          parts.push(`\nResponsibilities:\n${r}`);
        }
        if (jobData.skills) {
          const s = typeof jobData.skills === "string" ? stripHtmlToText(jobData.skills) : JSON.stringify(jobData.skills);
          parts.push(`\nSkills:\n${s}`);
        }
        const result = parts.join("\n");
        if (result.length > 100) return result;
      }
    } catch {
      // Invalid JSON, continue
    }
  }
  return null;
}

function extractMainContent(html: string): string {
  // Try to find main content area
  const mainMatch = html.match(/<main[\s\S]*?<\/main>/i)
    || html.match(/<article[\s\S]*?<\/article>/i)
    || html.match(/<div[^>]*class="[^"]*(?:job|posting|description|content|details)[^"]*"[^>]*>[\s\S]*?<\/div>/i);

  const content = mainMatch ? mainMatch[0] : html;

  // Remove nav, header, footer, sidebar from the content
  let cleaned = content
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside[\s\S]*?<\/aside>/gi, "");

  return stripHtmlToText(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) throw new Error("No URL provided");

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error("Invalid URL provided");
    }

    console.log("Fetching job description from:", parsedUrl.href);

    const response = await fetch(parsedUrl.href, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Strategy 1: JSON-LD structured data (best quality)
    let text = extractJsonLdJobPosting(html);
    let source = "json-ld";

    // Strategy 2: Extract main content area
    if (!text || text.length < 100) {
      text = extractMainContent(html);
      source = "html-main";
    }

    if (text.length > 15000) {
      text = text.substring(0, 15000) + "\n\n[Content truncated]";
    }

    if (text.length < 50) {
      throw new Error("Could not extract meaningful content from the URL. The page may require JavaScript to load. Try copying and pasting the job description directly.");
    }

    console.log(`Extracted ${text.length} characters via ${source}`);

    return new Response(
      JSON.stringify({ success: true, text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching job description:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed to fetch job description" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
