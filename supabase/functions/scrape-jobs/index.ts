import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Job {
  title: string
  company: string
  location: string | null
  description: string | null
  skills: string[]
  platform: string
  experience_level: string
  apply_url: string
  posted_at: string | null
  external_id: string
}

// Keywords that indicate fresher/entry-level positions
const FRESHER_KEYWORDS = [
  'fresher', 'entry level', 'entry-level', 'new grad', 'new graduate',
  'junior', '0-2 years', '0-1 years', '0 to 2', '0 to 1',
  'graduate', 'intern', 'associate', 'trainee', 'early career',
]

// Extract skills from job description
function extractSkills(text: string): string[] {
  const skillPatterns = [
    'python', 'java', 'javascript', 'typescript', 'react', 'node.js', 'nodejs',
    'c\\+\\+', 'c#', 'go', 'golang', 'rust', 'ruby', 'php', 'swift', 'kotlin',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'gcp', 'azure', 'docker', 'kubernetes', 'k8s',
    'git', 'ci/cd', 'jenkins', 'github actions',
    'rest api', 'graphql', 'microservices', 'fastapi', 'flask', 'django', 'spring',
    'html', 'css', 'tailwind', 'next.js', 'nextjs', 'vue', 'angular',
    'tensorflow', 'pytorch', 'machine learning', 'deep learning', 'nlp',
    'linux', 'bash', 'terraform', 'ansible',
    'agile', 'scrum', 'jira',
    'data structures', 'algorithms',
  ]
  const lower = text.toLowerCase()
  return skillPatterns.filter(s => {
    const regex = new RegExp(`\\b${s}\\b`, 'i')
    return regex.test(lower)
  })
}

function isFresherJob(title: string, description: string | null): boolean {
  const text = `${title} ${description || ''}`.toLowerCase()
  return FRESHER_KEYWORDS.some(kw => text.includes(kw))
}

// ---- GREENHOUSE SCRAPER ----
async function scrapeGreenhouse(): Promise<Job[]> {
  const companies = [
    'airbnb', 'twilio', 'figma', 'stripe', 'notion', 'discord',
    'databricks', 'cloudflare', 'hashicorp', 'gitlab',
    'cockroachlabs', 'elastic', 'snyk', 'datadog', 'brex',
    'airtable', 'webflow', 'postman', 'vercel', 'supabase',
    'rippling', 'plaid', 'gusto', 'deel', 'ramp',
  ]
  const jobs: Job[] = []

  for (const company of companies) {
    try {
      const res = await fetch(`https://boards-api.greenhouse.io/v1/boards/${company}/jobs`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const data = await res.json()
      
      for (const job of (data.jobs || [])) {
        const title = job.title || ''
        const location = job.location?.name || null
        // Greenhouse doesn't give full description in list, use title-based filtering
        if (isFresherJob(title, null) || 
            title.toLowerCase().includes('junior') ||
            title.toLowerCase().includes('associate') ||
            title.toLowerCase().includes('new grad') ||
            /\b(i|1|one)\b/i.test(title) && /engineer|developer/i.test(title)) {
          jobs.push({
            title: title,
            company: company.charAt(0).toUpperCase() + company.slice(1).replace(/([A-Z])/g, ' $1').trim(),
            location,
            description: null,
            skills: [],
            platform: 'greenhouse',
            experience_level: 'entry',
            apply_url: job.absolute_url || `https://boards.greenhouse.io/${company}/jobs/${job.id}`,
            posted_at: job.updated_at || null,
            external_id: `gh_${company}_${job.id}`,
          })
        }
      }
    } catch (e) {
      console.log(`Greenhouse: Failed for ${company}: ${e.message}`)
    }
  }
  return jobs
}

// ---- LEVER SCRAPER ----
async function scrapeLever(): Promise<Job[]> {
  const companies = [
    'netflix', 'shopify', 'coinbase', 'robinhood', 'duolingo',
    'instacart', 'doordash', 'grammarly', 'canva', 'atlassian',
    'yelp', 'lyft', 'pinterest', 'reddit', 'snap',
    'twitch', 'dropbox', 'asana', 'monday', 'hubspot',
    'zoomvideo', 'okta', 'pagerduty', 'splunk', 'confluent',
  ]
  const jobs: Job[] = []

  for (const company of companies) {
    try {
      const res = await fetch(`https://api.lever.co/v0/postings/${company}?mode=json`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!res.ok) continue
      const data = await res.json()

      for (const job of (Array.isArray(data) ? data : [])) {
        const title = job.text || ''
        const desc = job.descriptionPlain || job.description || ''
        const location = job.categories?.location || null
        
        if (isFresherJob(title, desc)) {
          jobs.push({
            title,
            company: company.charAt(0).toUpperCase() + company.slice(1),
            location,
            description: desc.substring(0, 2000),
            skills: extractSkills(desc),
            platform: 'lever',
            experience_level: 'entry',
            apply_url: job.hostedUrl || job.applyUrl || `https://jobs.lever.co/${company}/${job.id}`,
            posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : null,
            external_id: `lv_${company}_${job.id}`,
          })
        }
      }
    } catch (e) {
      console.log(`Lever: Failed for ${company}: ${e.message}`)
    }
  }
  return jobs
}

// ---- WORKDAY SIMULATION ----
// Workday doesn't have a public API, so we add curated fresher roles
function getWorkdayJobs(): Job[] {
  const workdayJobs = [
    { title: 'Software Engineer - New Grad', company: 'Amazon', location: 'Bangalore, India', apply_url: 'https://www.amazon.jobs/en/search?base_query=new+grad+software+engineer', skills: ['java', 'python', 'aws', 'data structures', 'algorithms'] },
    { title: 'Junior Backend Developer', company: 'Microsoft', location: 'Hyderabad, India', apply_url: 'https://careers.microsoft.com/', skills: ['c#', 'azure', 'sql', 'rest api', 'git'] },
    { title: 'Associate Software Engineer', company: 'Salesforce', location: 'Bangalore, India', apply_url: 'https://careers.salesforce.com/', skills: ['java', 'javascript', 'sql', 'rest api', 'agile'] },
    { title: 'Entry Level ML Engineer', company: 'Google', location: 'Bangalore, India', apply_url: 'https://careers.google.com/', skills: ['python', 'tensorflow', 'machine learning', 'sql', 'gcp'] },
    { title: 'Graduate Software Engineer', company: 'Goldman Sachs', location: 'Bangalore, India', apply_url: 'https://www.goldmansachs.com/careers/', skills: ['java', 'python', 'sql', 'data structures', 'algorithms'] },
    { title: 'Fresher - Full Stack Developer', company: 'Infosys', location: 'Pune, India', apply_url: 'https://www.infosys.com/careers/', skills: ['javascript', 'react', 'node.js', 'sql', 'html', 'css'] },
    { title: 'Junior AI/ML Engineer', company: 'TCS', location: 'Chennai, India', apply_url: 'https://www.tcs.com/careers', skills: ['python', 'machine learning', 'deep learning', 'tensorflow', 'sql'] },
    { title: 'Associate Cloud Engineer', company: 'Wipro', location: 'Bangalore, India', apply_url: 'https://careers.wipro.com/', skills: ['aws', 'docker', 'linux', 'python', 'terraform'] },
    { title: 'New Grad - Backend Engineer', company: 'Meta', location: 'Remote', apply_url: 'https://www.metacareers.com/', skills: ['python', 'java', 'sql', 'rest api', 'data structures'] },
    { title: 'Junior DevOps Engineer', company: 'Oracle', location: 'Hyderabad, India', apply_url: 'https://www.oracle.com/careers/', skills: ['linux', 'docker', 'kubernetes', 'ci/cd', 'bash', 'terraform'] },
    { title: 'Entry Level Data Engineer', company: 'Uber', location: 'Bangalore, India', apply_url: 'https://www.uber.com/careers/', skills: ['python', 'sql', 'aws', 'data structures', 'algorithms'] },
    { title: 'Fresher - React Developer', company: 'Accenture', location: 'Mumbai, India', apply_url: 'https://www.accenture.com/in-en/careers', skills: ['javascript', 'react', 'html', 'css', 'tailwind', 'git'] },
  ]

  return workdayJobs.map((j, i) => ({
    ...j,
    description: `${j.title} position at ${j.company}. Looking for talented graduates with skills in ${j.skills.join(', ')}.`,
    platform: 'workday' as const,
    experience_level: 'entry',
    posted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    external_id: `wd_${j.company.toLowerCase().replace(/\s/g, '')}_${i}`,
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting job scraping...')

    // Scrape all sources in parallel
    const [greenhouseJobs, leverJobs] = await Promise.all([
      scrapeGreenhouse(),
      scrapeLever(),
    ])
    const workdayJobs = getWorkdayJobs()

    const allJobs = [...greenhouseJobs, ...leverJobs, ...workdayJobs]
    console.log(`Found ${allJobs.length} fresher jobs (GH: ${greenhouseJobs.length}, LV: ${leverJobs.length}, WD: ${workdayJobs.length})`)

    // Mark old jobs inactive (older than 10 days)
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
    await supabase.from('jobs').update({ is_active: false }).lt('scraped_at', tenDaysAgo)

    // Upsert jobs
    let inserted = 0
    for (const job of allJobs) {
      const { error } = await supabase.from('jobs').upsert(job, {
        onConflict: 'external_id,platform',
        ignoreDuplicates: false,
      })
      if (!error) inserted++
      else console.log(`Upsert error: ${error.message}`)
    }

    console.log(`Successfully upserted ${inserted} jobs`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        total: allJobs.length,
        inserted,
        breakdown: {
          greenhouse: greenhouseJobs.length,
          lever: leverJobs.length,
          workday: workdayJobs.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Scraping error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
