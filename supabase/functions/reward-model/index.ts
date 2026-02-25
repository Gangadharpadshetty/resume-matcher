import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * REWARD MODEL — Multi-dimensional scoring function for generated resumes
 * 
 * R(resume) = w₁·S_keyword + w₂·S_bullet + w₃·S_format + w₄·S_user
 * 
 * Where:
 *   S_keyword = |matched ∩ JD_keywords| / |JD_keywords|  (Jaccard-like coverage)
 *   S_bullet  = Σ(has_metric + has_verb + is_concise) / (3 × num_bullets)
 *   S_format  = compilation_success × structural_checks
 *   S_user    = user_rating / 5 (normalized)
 * 
 * Weights: w₁=0.35, w₂=0.25, w₃=0.15, w₄=0.25
 */

// Strong action verbs that indicate quality bullets
const STRONG_VERBS = new Set([
  "engineered", "architected", "optimized", "reduced", "scaled", "deployed",
  "implemented", "migrated", "designed", "built", "automated", "streamlined",
  "integrated", "refactored", "containerized", "spearheaded", "led", "drove",
  "accelerated", "improved", "increased", "decreased", "eliminated", "launched",
  "developed", "created", "established", "transformed", "modernized"
]);

// Metric patterns
const METRIC_PATTERNS = [
  /\d+%/,           // percentages
  /\d+ms/,          // milliseconds
  /\d+x/i,          // multipliers
  /p\d{2}/,         // percentiles (p50, p90, p99)
  /\d+k\+?/i,       // thousands
  /\d+m\+?/i,       // millions
  /\d+\s*(rps|qps|tps)/i, // throughput
  /\$[\d,]+/,       // dollar amounts
  /\d+\s*(users?|requests?|queries|records|documents)/i,
];

function computeKeywordCoverage(latexCode: string, matchedKeywords: string[], missingKeywords: string[]): number {
  const totalKeywords = matchedKeywords.length + missingKeywords.length;
  if (totalKeywords === 0) return 0;
  
  const latexLower = latexCode.toLowerCase();
  let found = matchedKeywords.length; // already matched
  
  // Check how many "missing" keywords were actually integrated
  for (const kw of missingKeywords) {
    if (latexLower.includes(kw.toLowerCase())) {
      found++;
    }
  }
  
  return Math.min(found / totalKeywords, 1.0);
}

function computeBulletQuality(latexCode: string): number {
  // Extract \resumeItem{...} content
  const bulletRegex = /\\resumeItem\{([^}]+)\}/g;
  const bullets: string[] = [];
  let match;
  while ((match = bulletRegex.exec(latexCode)) !== null) {
    bullets.push(match[1]);
  }
  
  if (bullets.length === 0) return 0;
  
  let totalScore = 0;
  
  for (const bullet of bullets) {
    let bulletScore = 0;
    const words = bullet.toLowerCase().split(/\s+/);
    
    // 1. Starts with strong action verb? (0 or 1)
    const firstWord = words[0]?.replace(/[^a-z]/g, "");
    if (STRONG_VERBS.has(firstWord)) bulletScore += 1;
    
    // 2. Contains quantified metrics? (0 or 1)
    const hasMetric = METRIC_PATTERNS.some(p => p.test(bullet));
    if (hasMetric) bulletScore += 1;
    
    // 3. Is concise? (1-2 lines ≈ under 180 chars) (0 or 1)
    if (bullet.length <= 180 && bullet.length >= 30) bulletScore += 1;
    
    totalScore += bulletScore / 3; // normalize per bullet
  }
  
  return totalScore / bullets.length;
}

function computeFormatCompliance(latexCode: string, compilationSuccess: boolean): number {
  let score = 0;
  const checks = 6;
  
  // 1. Has \begin{document} and \end{document}
  if (latexCode.includes("\\begin{document}") && latexCode.includes("\\end{document}")) score++;
  
  // 2. Uses correct template commands
  if (latexCode.includes("\\resumeSubheading")) score++;
  
  // 3. Has proper section structure
  const sections = ["Education", "Experience", "Projects", "Skills"].filter(s => 
    latexCode.includes(`\\section{${s}`) || latexCode.includes(`\\section{Technical ${s}`)
  );
  if (sections.length >= 3) score++;
  
  // 4. Uses itemize correctly
  if (latexCode.includes("\\resumeItemListStart") && latexCode.includes("\\resumeItemListEnd")) score++;
  
  // 5. Compilation success (worth double)
  if (compilationSuccess) score += 2;
  
  return score / checks;
}

function computeTotalReward(
  keywordScore: number,
  bulletScore: number,
  formatScore: number,
  userRating: number | null
): number {
  // R = w₁·S_keyword + w₂·S_bullet + w₃·S_format + w₄·S_user
  const w1 = 0.35, w2 = 0.25, w3 = 0.15, w4 = 0.25;
  
  const normalizedUserRating = userRating ? userRating / 5 : 0.5; // default to neutral
  
  return w1 * keywordScore + w2 * bulletScore + w3 * formatScore + w4 * normalizedUserRating;
}

/**
 * UCB1 Algorithm: Select strategy that maximizes:
 *   UCB(i) = X̄ᵢ + c × √(ln(N) / nᵢ)
 * 
 * Where:
 *   X̄ᵢ = average reward of strategy i
 *   N   = total selections across all strategies
 *   nᵢ  = times strategy i was selected
 *   c   = exploration constant (√2 ≈ 1.414)
 */
function computeUCB1(avgReward: number, totalSelections: number, timesSelected: number): number {
  if (timesSelected === 0) return Infinity; // explore unvisited arms first
  
  const explorationConstant = Math.SQRT2; // c = √2
  const exploitationTerm = avgReward;
  const explorationTerm = explorationConstant * Math.sqrt(Math.log(totalSelections) / timesSelected);
  
  return exploitationTerm + explorationTerm;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    // ACTION: compute_reward — Score a generated resume
    if (action === "compute_reward") {
      const { latexCode, matchedKeywords, missingKeywords, compilationSuccess, sessionId, strategyId } = params;
      
      const keywordScore = computeKeywordCoverage(latexCode, matchedKeywords || [], missingKeywords || []);
      const bulletScore = computeBulletQuality(latexCode);
      const formatScore = computeFormatCompliance(latexCode, compilationSuccess ?? true);
      const totalReward = computeTotalReward(keywordScore, bulletScore, formatScore, null);
      
      // Store feedback
      const { data: feedback, error } = await supabase.from("resume_feedback").insert({
        session_id: sessionId || crypto.randomUUID(),
        strategy_id: strategyId,
        keyword_coverage_score: keywordScore,
        bullet_quality_score: bulletScore,
        format_compliance_score: formatScore,
        compilation_success: compilationSuccess ?? true,
        total_reward: totalReward,
        matched_keywords: (matchedKeywords || []).length,
        total_keywords: (matchedKeywords || []).length + (missingKeywords || []).length,
        latex_line_count: latexCode.split("\n").length,
      }).select().single();

      // Update strategy stats if provided
      if (strategyId) {
        await updateStrategyStats(supabase, strategyId, totalReward);
      }

      return new Response(JSON.stringify({
        feedbackId: feedback?.id,
        scores: { keywordScore, bulletScore, formatScore, totalReward },
        breakdown: {
          keyword_coverage: `${(keywordScore * 100).toFixed(1)}%`,
          bullet_quality: `${(bulletScore * 100).toFixed(1)}%`,
          format_compliance: `${(formatScore * 100).toFixed(1)}%`,
          total_reward: `${(totalReward * 100).toFixed(1)}%`,
        }
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: submit_rating — User submits a 1-5 star rating
    if (action === "submit_rating") {
      const { feedbackId, rating } = params;
      
      // Get existing feedback
      const { data: existing } = await supabase.from("resume_feedback")
        .select("*").eq("id", feedbackId).single();
      
      if (!existing) throw new Error("Feedback not found");
      
      // Recompute total reward with user rating
      const newReward = computeTotalReward(
        existing.keyword_coverage_score,
        existing.bullet_quality_score,
        existing.format_compliance_score,
        rating
      );
      
      await supabase.from("resume_feedback").update({
        user_rating: rating,
        total_reward: newReward,
      }).eq("id", feedbackId);

      // Update strategy stats with new reward
      if (existing.strategy_id) {
        const rewardDelta = newReward - existing.total_reward;
        await updateStrategyStats(supabase, existing.strategy_id, rewardDelta);
      }

      return new Response(JSON.stringify({ success: true, newReward }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // ACTION: select_strategy — UCB1 selects the best strategy
    if (action === "select_strategy") {
      const { data: strategies } = await supabase.from("prompt_strategies")
        .select("*").eq("is_active", true);
      
      if (!strategies || strategies.length === 0) {
        return new Response(JSON.stringify({ strategy: null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const totalSelections = strategies.reduce((sum, s) => sum + s.times_selected, 0);
      
      let bestStrategy = strategies[0];
      let bestUCB = -Infinity;
      
      for (const strategy of strategies) {
        const ucb = computeUCB1(strategy.avg_reward, totalSelections + 1, strategy.times_selected);
        if (ucb > bestUCB) {
          bestUCB = ucb;
          bestStrategy = strategy;
        }
      }

      // Increment selection count
      await supabase.from("prompt_strategies").update({
        times_selected: bestStrategy.times_selected + 1,
        ucb_score: bestUCB,
      }).eq("id", bestStrategy.id);

      // Compute exploration rate: ε = unexplored / total
      const explorationRate = strategies.filter(s => s.times_selected < 3).length / strategies.length;

      return new Response(JSON.stringify({
        strategy: bestStrategy,
        ucbScore: bestUCB,
        explorationRate,
        totalSelections: totalSelections + 1,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ACTION: get_stats — Get RL optimization statistics
    if (action === "get_stats") {
      const { data: strategies } = await supabase.from("prompt_strategies")
        .select("*").eq("is_active", true).order("avg_reward", { ascending: false });
      
      const { data: recentFeedback } = await supabase.from("resume_feedback")
        .select("*").order("created_at", { ascending: false }).limit(50);
      
      const totalGenerations = strategies?.reduce((sum, s) => sum + s.times_selected, 0) || 0;
      const avgReward = recentFeedback && recentFeedback.length > 0
        ? recentFeedback.reduce((sum, f) => sum + f.total_reward, 0) / recentFeedback.length
        : 0;

      // Compute regret: Σ(best_reward - chosen_reward) over recent feedback
      const bestPossibleReward = strategies && strategies.length > 0 ? strategies[0].avg_reward : 0;
      const cumulativeRegret = recentFeedback
        ? recentFeedback.reduce((sum, f) => sum + Math.max(0, bestPossibleReward - f.total_reward), 0)
        : 0;

      return new Response(JSON.stringify({
        strategies,
        totalGenerations,
        avgReward,
        cumulativeRegret,
        recentFeedback: recentFeedback?.slice(0, 10),
        convergenceMetric: totalGenerations > 0 ? 1 - (cumulativeRegret / totalGenerations) : 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("Reward model error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateStrategyStats(supabase: any, strategyId: string, reward: number) {
  const { data: strategy } = await supabase.from("prompt_strategies")
    .select("*").eq("id", strategyId).single();
  
  if (!strategy) return;
  
  const newTotalRewards = strategy.total_rewards + reward;
  const newTimesSelected = strategy.times_selected;
  const newAvgReward = newTimesSelected > 0 ? newTotalRewards / newTimesSelected : 0;
  
  await supabase.from("prompt_strategies").update({
    total_rewards: newTotalRewards,
    avg_reward: newAvgReward,
  }).eq("id", strategyId);
}
