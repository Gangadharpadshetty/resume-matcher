import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function extractJsonLdJobPosting(html: string): string | null {
  // Look for JSON-LD structured data (most job boards include this)
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const jobData = Array.isArray(data)
        ? data.find((d: any) => d["@type"] === "JobPosting")
        : data["@type"] === "JobPosting" ? data : null;

      if (jobData) {
        const parts: string[] = [];
        if (jobData.title) parts.push(`Job Title: ${jobData.title}`);
        if (jobData.hiringOrganization?.name) parts.push(`Company: ${jobData.hiringOrganization.name}`);
        if (jobData.jobLocation) {
          const loc = Array.isArray(jobData.jobLocation) ? jobData.jobLocation[0] : jobData.jobLocation;
          if (loc?.address) {
            const addr = loc.address;
            parts.push(`Location: ${[addr.addressLocality, addr.addressRegion, addr.addressCountry].filter(Boolean).join(", ")}`);
          }
        }
        if (jobData.employmentType) parts.push(`Type: ${Array.isArray(jobData.employmentType) ? jobData.employmentType.join(", ") : jobData.employmentType}`);
        if (jobData.description) {
          // Strip HTML from description
          let desc = jobData.description
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/?(p|div|h[1-6]|li|tr|section|ul|ol)[^>]*>/gi, "\n")
            .replace(/<[^>]+>/g, " ")
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
            .replace(/&#\d+;/g, "")
            .replace(/[ \t]+/g, " ")
            .replace(/\n\s*\n/g, "\n\n")
            .trim();
          parts.push(`\nJob Description:\n${desc}`);
        }
        if (jobData.qualifications || jobData.skills) {
          const q = jobData.qualifications || jobData.skills;
          parts.push(`\nQualifications:\n${typeof q === "string" ? q : JSON.stringify(q)}`);
        }
        if (jobData.responsibilities) {
          parts.push(`\nResponsibilities:\n${typeof jobData.responsibilities === "string" ? jobData.responsibilities : JSON.stringify(jobData.responsibilities)}`);
        }
        return parts.join("\n");
      }
    } catch {
      // Invalid JSON, continue
    }
  }
  return null;
}

function extractFromMeta(html: string): string {
  const parts: string[] = [];
  // og:title
  const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) parts.push(`Job Title: ${titleMatch[1].trim()}`);

  // og:description
  const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch) parts.push(`Summary: ${descMatch[1].trim()}`);

  return parts.join("\n");
}

function extractFromHtml(html: string): string {
  let text = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<header[\s\S]*?<\/header>/gi, "")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");

  text = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|li|tr|section|article)[^>]*>/gi, "\n")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
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
    .replace(/&#\d+;/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .replace(/^\s+|\s+$/gm, "")
    .trim();

  return text;
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

    // Strategy 2: Meta tags + HTML fallback
    if (!text || text.length < 100) {
      const meta = extractFromMeta(html);
      const body = extractFromHtml(html);
      text = meta ? `${meta}\n\n${body}` : body;
      source = "html";
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
