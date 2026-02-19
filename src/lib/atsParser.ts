// ATS Keyword Extraction & Scoring Logic

const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','need','must','am','that','this','these','those','it',
  'its','we','our','you','your','they','their','he','his','she','her',
  'i','me','my','us','as','if','so','then','than','when','while','where',
  'which','who','whom','what','how','all','any','each','every','both',
  'few','more','most','other','some','such','no','nor','not','only','own',
  'same','too','very','just','because','about','above','after','before',
  'between','into','through','during','include','including','etc',
]);

export interface ATSResult {
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  partialMatches: string[];
  totalJDKeywords: number;
  breakdown: {
    skills: { matched: string[]; missing: string[] };
    experience: { matched: string[]; missing: string[] };
    education: { matched: string[]; missing: string[] };
    certifications: { matched: string[]; missing: string[] };
  };
  suggestions: string[];
}

const SKILL_PATTERNS = [
  /\b(python|java|javascript|typescript|react|angular|vue|node|sql|mongodb|postgresql|aws|azure|gcp|docker|kubernetes|git|agile|scrum|machine learning|deep learning|nlp|tensorflow|pytorch|scikit|pandas|numpy|excel|tableau|power bi|figma|sketch|photoshop|illustrator|html|css|rest|graphql|microservices|ci\/cd|devops|jira|confluence|salesforce|sap|matlab|r\b|scala|kotlin|swift|c\+\+|c#|ruby|php|linux|bash|jenkins|terraform|ansible|spark|hadoop|kafka|redis|elasticsearch|spring|django|flask|express|next\.?js|tailwind|webpack|vite|jest|cypress|selenium|airflow|dbt|snowflake|databricks|looker|mixpanel|segment|amplitude)\b/gi,
];

const CERT_PATTERNS = [
  /\b(aws certified|google certified|microsoft certified|pmp|cissp|cpa|cfa|cma|six sigma|itil|comptia|ccna|ccnp|okr|scrum master|product owner|agile coach)\b/gi,
];

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s\+#\.\/]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Extract bigrams and trigrams for compound skills
  const tokens = text.toLowerCase().split(/\s+/);
  const bigrams: string[] = [];
  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = `${tokens[i]} ${tokens[i + 1]}`.replace(/[^a-z0-9\s]/g, '').trim();
    if (bg.split(' ').every(w => !STOP_WORDS.has(w) && w.length > 1)) {
      bigrams.push(bg);
    }
    if (i < tokens.length - 2) {
      const tg = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`.replace(/[^a-z0-9\s]/g, '').trim();
      if (tg.split(' ').every(w => !STOP_WORDS.has(w) && w.length > 1)) {
        trigrams.push(tg);
      }
    }
  }

  return [...new Set([...words, ...bigrams, ...trigrams])];
}

function extractCategory(text: string, patterns: RegExp[]): string[] {
  const matches: string[] = [];
  for (const pattern of patterns) {
    const found = text.matchAll(new RegExp(pattern.source, 'gi'));
    for (const m of found) {
      if (m[0]) matches.push(m[0].toLowerCase().trim());
    }
  }
  return [...new Set(matches)];
}

function getContextKeywords(text: string, section: 'experience' | 'education' | 'certifications'): string[] {
  const experienceWords = ['years', 'experience', 'worked', 'led', 'managed', 'built', 'developed', 'designed', 'implemented', 'delivered', 'collaborated'];
  const educationWords = ['bachelor', 'master', 'phd', 'degree', 'university', 'college', 'diploma', 'graduate', 'undergraduate', 'gpa', 'major', 'minor'];
  const certWords = ['certified', 'certification', 'certificate', 'license', 'credential', 'accredited'];
  
  const wordLists = {
    experience: experienceWords,
    education: educationWords,
    certifications: certWords,
  };
  
  return wordLists[section].filter(w => text.toLowerCase().includes(w));
}

export function analyzeResume(resumeText: string, jobDescription: string): ATSResult {
  const jdKeywords = extractKeywords(jobDescription);
  const resumeKeywords = extractKeywords(resumeText);
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jobDescription.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  // Filter JD keywords to meaningful ones (length > 3 or known skills)
  const importantJDKeywords = [...new Set(jdKeywords.filter(k => {
    if (k.length > 3) return true;
    if (SKILL_PATTERNS.some(p => p.test(k))) return true;
    return false;
  }))].slice(0, 60);

  for (const kw of importantJDKeywords) {
    if (resumeLower.includes(kw)) {
      matched.push(kw);
    } else {
      // Check partial stem match
      const stem = kw.slice(0, Math.max(4, kw.length - 3));
      if (resumeLower.includes(stem)) {
        partial.push(kw);
      } else {
        missing.push(kw);
      }
    }
  }

  // Categorize
  const jdSkills = extractCategory(jdLower, SKILL_PATTERNS);
  const resumeSkills = extractCategory(resumeLower, SKILL_PATTERNS);
  const jdCerts = extractCategory(jdLower, CERT_PATTERNS);
  const resumeCerts = extractCategory(resumeLower, CERT_PATTERNS);

  const breakdown = {
    skills: {
      matched: jdSkills.filter(s => resumeLower.includes(s)),
      missing: jdSkills.filter(s => !resumeLower.includes(s)),
    },
    experience: {
      matched: getContextKeywords(resumeText, 'experience'),
      missing: getContextKeywords(jdLower, 'experience').filter(w => !resumeLower.includes(w)),
    },
    education: {
      matched: getContextKeywords(resumeText, 'education'),
      missing: getContextKeywords(jdLower, 'education').filter(w => !resumeLower.includes(w)),
    },
    certifications: {
      matched: jdCerts.filter(c => resumeLower.includes(c)),
      missing: jdCerts.filter(c => !resumeLower.includes(c)),
    },
  };

  // Score calculation
  const matchScore = matched.length / Math.max(importantJDKeywords.length, 1);
  const partialScore = (partial.length * 0.5) / Math.max(importantJDKeywords.length, 1);
  const skillBonus = breakdown.skills.matched.length / Math.max(jdSkills.length || 1, 1) * 0.2;
  const rawScore = Math.min(100, Math.round((matchScore + partialScore + skillBonus) * 100));

  // Suggestions
  const suggestions: string[] = [];
  if (breakdown.skills.missing.length > 0) {
    suggestions.push(`Add these missing technical skills: ${breakdown.skills.missing.slice(0, 5).join(', ')}`);
  }
  if (missing.length > 5) {
    suggestions.push(`Include these job-critical keywords: ${missing.slice(0, 5).join(', ')}`);
  }
  if (!resumeLower.includes('quantif') && !resumeLower.includes('%') && !resumeLower.includes('$')) {
    suggestions.push('Quantify your achievements with metrics (%, $, numbers) to stand out');
  }
  if (breakdown.certifications.missing.length > 0) {
    suggestions.push(`Consider obtaining: ${breakdown.certifications.missing.slice(0, 3).join(', ')}`);
  }
  if (rawScore < 50) {
    suggestions.push('Tailor your resume summary to directly mirror the job description language');
  }

  return {
    score: rawScore,
    matchedKeywords: matched,
    missingKeywords: missing,
    partialMatches: partial,
    totalJDKeywords: importantJDKeywords.length,
    breakdown,
    suggestions,
  };
}
