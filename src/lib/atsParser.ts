// ATS Keyword Extraction & Scoring Logic — Enhanced with fuzzy matching & synonyms

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
  'also','well','using','used','use','work','working','able','ensure',
  'strong','experience','required','preferred','requirements','responsibilities',
  'looking','role','join','team','company','opportunity','position',
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
  companyName: string | null;
}

// Synonym map for fuzzy matching
const SYNONYM_MAP: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript'],
  'typescript': ['ts'],
  'python': ['py'],
  'kubernetes': ['k8s'],
  'postgresql': ['postgres', 'psql'],
  'mongodb': ['mongo'],
  'elasticsearch': ['elastic', 'es'],
  'continuous integration': ['ci', 'ci/cd'],
  'continuous deployment': ['cd', 'ci/cd'],
  'machine learning': ['ml', 'deep learning', 'dl'],
  'artificial intelligence': ['ai'],
  'natural language processing': ['nlp'],
  'amazon web services': ['aws'],
  'google cloud platform': ['gcp'],
  'microsoft azure': ['azure'],
  'react': ['reactjs', 'react.js'],
  'node': ['nodejs', 'node.js'],
  'next.js': ['nextjs'],
  'vue': ['vuejs', 'vue.js'],
  'angular': ['angularjs'],
  'rest': ['restful', 'rest api', 'restful api'],
  'graphql': ['graph ql'],
  'docker': ['containerization', 'containerized'],
  'agile': ['scrum', 'kanban', 'sprint'],
  'devops': ['sre', 'site reliability'],
  'microservices': ['micro services', 'service oriented'],
  'sql': ['mysql', 'postgresql', 'sqlite'],
  'nosql': ['mongodb', 'dynamodb', 'cassandra', 'redis'],
};

const SKILL_PATTERNS = [
  /\b(python|java|javascript|typescript|react|angular|vue|node|sql|mongodb|postgresql|aws|azure|gcp|docker|kubernetes|git|agile|scrum|machine learning|deep learning|nlp|tensorflow|pytorch|scikit|pandas|numpy|excel|tableau|power bi|figma|sketch|photoshop|illustrator|html|css|rest|graphql|microservices|ci\/cd|devops|jira|confluence|salesforce|sap|matlab|r\b|scala|kotlin|swift|c\+\+|c#|ruby|php|linux|bash|jenkins|terraform|ansible|spark|hadoop|kafka|redis|elasticsearch|spring|django|flask|express|next\.?js|tailwind|webpack|vite|jest|cypress|selenium|airflow|dbt|snowflake|databricks|looker|mixpanel|segment|amplitude|fastapi|celery|rabbitmq|dynamodb|supabase|firebase|vercel|netlify|heroku|nginx|apache|prometheus|grafana|datadog|sentry|oauth|jwt|websocket|grpc|protobuf)\b/gi,
];

const CERT_PATTERNS = [
  /\b(aws certified|google certified|microsoft certified|pmp|cissp|cpa|cfa|cma|six sigma|itil|comptia|ccna|ccnp|okr|scrum master|product owner|agile coach)\b/gi,
];

// Extract company name from job description
function extractCompanyName(jobDescription: string): string | null {
  // Common patterns: "at Company", "Company is", "join Company", "About Company"
  const patterns = [
    /(?:about|join|at)\s+([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\b/,
    /^([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+){0,2})\s+is\s+(?:a|an|the|looking)/m,
    /company:\s*([^\n,]+)/i,
    /employer:\s*([^\n,]+)/i,
    /organization:\s*([^\n,]+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = jobDescription.match(pattern);
    if (match?.[1]) {
      const name = match[1].trim();
      // Filter out generic words
      if (!['The', 'We', 'Our', 'This', 'Join', 'About'].includes(name) && name.length > 1) {
        return name;
      }
    }
  }
  return null;
}

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^a-z0-9\s\+#\.\/\-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));

  // Extract bigrams and trigrams for compound skills
  const tokens = text.toLowerCase().split(/\s+/);
  const bigrams: string[] = [];
  const trigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    const bg = `${tokens[i]} ${tokens[i + 1]}`.replace(/[^a-z0-9\s\/\-]/g, '').trim();
    if (bg.split(' ').every(w => !STOP_WORDS.has(w) && w.length > 1)) {
      bigrams.push(bg);
    }
    if (i < tokens.length - 2) {
      const tg = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`.replace(/[^a-z0-9\s\/\-]/g, '').trim();
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

// Check if keyword exists in text using synonyms and fuzzy matching
function keywordExistsInText(keyword: string, textLower: string): 'exact' | 'synonym' | 'partial' | 'none' {
  // Exact match
  if (textLower.includes(keyword)) return 'exact';
  
  // Synonym match
  for (const [canonical, synonyms] of Object.entries(SYNONYM_MAP)) {
    const allForms = [canonical, ...synonyms];
    if (allForms.includes(keyword)) {
      // Check if any synonym exists in text
      if (allForms.some(syn => textLower.includes(syn))) return 'synonym';
    }
  }
  
  // Stem/partial match (more aggressive)
  const stem = keyword.length > 5 ? keyword.slice(0, Math.max(4, keyword.length - 3)) : keyword;
  if (stem.length >= 4 && textLower.includes(stem)) return 'partial';
  
  // Plural/singular check
  if (keyword.endsWith('s') && textLower.includes(keyword.slice(0, -1))) return 'partial';
  if (!keyword.endsWith('s') && textLower.includes(keyword + 's')) return 'partial';
  
  // -ing/-ed/-tion forms
  if (keyword.endsWith('ing') && textLower.includes(keyword.slice(0, -3))) return 'partial';
  if (keyword.endsWith('tion') && textLower.includes(keyword.slice(0, -4))) return 'partial';
  
  return 'none';
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
  const resumeLower = resumeText.toLowerCase();
  const jdLower = jobDescription.toLowerCase();

  const matched: string[] = [];
  const missing: string[] = [];
  const partial: string[] = [];

  // Filter JD keywords to meaningful ones
  const importantJDKeywords = [...new Set(jdKeywords.filter(k => {
    if (k.length > 3) return true;
    if (SKILL_PATTERNS.some(p => p.test(k))) return true;
    return false;
  }))].slice(0, 80); // increased from 60

  for (const kw of importantJDKeywords) {
    const matchType = keywordExistsInText(kw, resumeLower);
    switch (matchType) {
      case 'exact':
      case 'synonym':
        matched.push(kw);
        break;
      case 'partial':
        partial.push(kw);
        break;
      case 'none':
        missing.push(kw);
        break;
    }
  }

  // Categorize
  const jdSkills = extractCategory(jdLower, SKILL_PATTERNS);
  const resumeSkills = extractCategory(resumeLower, SKILL_PATTERNS);
  const jdCerts = extractCategory(jdLower, CERT_PATTERNS);

  // Enhanced skill matching with synonyms
  const skillsMatched = jdSkills.filter(s => keywordExistsInText(s, resumeLower) !== 'none');
  const skillsMissing = jdSkills.filter(s => keywordExistsInText(s, resumeLower) === 'none');

  const breakdown = {
    skills: { matched: skillsMatched, missing: skillsMissing },
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

  // Improved score calculation
  const matchScore = matched.length / Math.max(importantJDKeywords.length, 1);
  const partialScore = (partial.length * 0.5) / Math.max(importantJDKeywords.length, 1);
  const skillBonus = skillsMatched.length / Math.max(jdSkills.length || 1, 1) * 0.2;
  const rawScore = Math.min(100, Math.round((matchScore + partialScore + skillBonus) * 100));

  // Extract company name
  const companyName = extractCompanyName(jobDescription);

  // Suggestions
  const suggestions: string[] = [];
  if (skillsMissing.length > 0) {
    suggestions.push(`Add these missing technical skills: ${skillsMissing.slice(0, 5).join(', ')}`);
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
  if (partial.length > 3) {
    suggestions.push(`Use exact phrasing for partially matched keywords: ${partial.slice(0, 4).join(', ')}`);
  }

  return {
    score: rawScore,
    matchedKeywords: matched,
    missingKeywords: missing,
    partialMatches: partial,
    totalJDKeywords: importantJDKeywords.length,
    breakdown,
    suggestions,
    companyName,
  };
}
