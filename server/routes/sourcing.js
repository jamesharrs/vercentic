/**
 * server/routes/sourcing.js — Sourcing Hub backend
 * Federated search: Google Custom Search, Apollo.io, GitHub + AI profile extraction
 * Agent-accessible via POST /api/sourcing/agent-search
 */
const express = require("express");
const router  = express.Router();
const { query, insert, update } = require("../db/init");
const { v4: uuidv4 } = require("uuid");
const https   = require("https");
const http    = require("http");

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function fetchUrl(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { headers: opts.headers || {}, timeout: 8000 }, (res) => {
      let body = "";
      res.on("data", d => body += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body, json: JSON.parse(body) }); }
        catch   { resolve({ status: res.statusCode, body, json: null }); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
  });
}

function postJson(url, payload, headers = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const u    = new URL(url);
    const lib  = u.protocol === "https:" ? https : http;
    const opts = {
      hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80),
      path: u.pathname + u.search, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), ...headers },
      timeout: 12000,
    };
    const req = lib.request(opts, (res) => {
      let b = "";
      res.on("data", d => b += d);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, json: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, json: null, raw: b }); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    req.write(body); req.end();
  });
}

// ── AI helpers ────────────────────────────────────────────────────────────────
async function callClaude(prompt, maxTokens = 600) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await postJson("https://api.anthropic.com/v1/messages", {
      model: "claude-sonnet-4-5-20251022", max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }, { "x-api-key": apiKey, "anthropic-version": "2023-06-01" });
    return res.json?.content?.[0]?.text || null;
  } catch (e) { console.error("[sourcing] Claude error:", e.message); return null; }
}

async function extractProfileWithAI(rawText, sourceUrl) {
  const txt = await callClaude(`Extract candidate profile from this text. Return ONLY valid JSON, no markdown:
{
  "first_name":null,"last_name":null,"email":null,"phone":null,
  "current_title":null,"current_company":null,"location":null,
  "summary":null,"skills":[],"years_experience":null,
  "linkedin_url":null,"github_url":null
}
Source: ${sourceUrl || "unknown"}
Text: ${rawText.slice(0, 3000)}`);
  if (!txt) return null;
  try { return JSON.parse(txt.replace(/```json|```/g, "").trim()); } catch { return null; }
}

async function buildSearchQueries(naturalQuery) {
  const q = naturalQuery.toLowerCase();

  // Reliable keyword extraction — no AI dependency
  const techWords = ["react","vue","angular","node","python","java","typescript","javascript","go","rust","kubernetes","aws","gcp","azure","docker","sql","postgres","mongodb","redis","graphql","flutter","swift","kotlin","devops","ml","ai","data"];
  const skills = techWords.filter(t => q.includes(t));

  const titleWords = [];
  if (q.includes("senior") || q.includes("sr ")) titleWords.push("Senior");
  if (q.includes("junior") || q.includes("jr ")) titleWords.push("Junior");
  if (q.includes("lead") || q.includes("principal")) titleWords.push("Lead");
  if (q.includes("manager")) titleWords.push("Manager");
  if (q.includes("director")) titleWords.push("Director");
  if (q.includes("engineer") || q.includes("developer")) titleWords.push("Engineer");
  if (q.includes("designer") || q.includes("ux") || q.includes("ui")) titleWords.push("Designer");
  if (q.includes("product manager")) titleWords.push("Product Manager");
  if (q.includes("data scientist")) titleWords.push("Data Scientist");
  if (q.includes("devops")) titleWords.push("DevOps");

  const locationWords = ["london","new york","dubai","singapore","berlin","toronto","sydney","amsterdam","paris","tokyo","new delhi","mumbai","bangalore","hong kong","shanghai"];
  const locations = locationWords.filter(l => q.includes(l));

  const stopWords = new Set(["the","and","or","with","for","of","in","at","to","a","an","years","year","global","remote","experience","background","looking","search","find","strong","good","great","excellent"]);
  const keywords = naturalQuery.split(/[\s,;+]+/).map(w=>w.toLowerCase().replace(/[^\w]/g,"")).filter(w=>w.length>2 && !stopWords.has(w) && !/^\d+$/.test(w));

  // GitHub user search works best with simple terms — NOT boolean operators
  const githubQuery = [...new Set([...skills.slice(0,3)])].join(" ") || keywords.slice(0,3).join(" ") || naturalQuery.split(",")[0].trim();

  // Google X-ray
  const googleQuery = `(site:linkedin.com/in OR site:github.com) ${titleWords.slice(0,2).join(" ")} ${skills.slice(0,4).join(" ")} ${locations[0]||""}`.trim();

  // Apollo people search
  const apolloQuery = { q: keywords.slice(0,5).join(" ") || naturalQuery, person_titles: titleWords.slice(0,2), person_locations: locations };

  // Try AI to improve (non-blocking, only use if it extracts skills/titles)
  try {
    const txt = await callClaude(`Convert this recruiting search into optimised queries. Return ONLY valid JSON, no markdown:
{"google":"site:linkedin.com/in boolean search","apollo":{"q":"keywords","person_titles":["Title"],"person_locations":["City"]},"github":"react typescript","keywords":["kw1"],"titles":["Senior Engineer"],"skills":["React","TypeScript"]}
Search: "${naturalQuery}"`, 500);
    if (txt) {
      const parsed = JSON.parse(txt.replace(/```json|```/g,"").trim());
      if (parsed.skills?.length > 0 || parsed.titles?.length > 0) return parsed;
    }
  } catch { /* use manual queries below */ }

  return { google: googleQuery, apollo: apolloQuery, github: githubQuery, keywords, titles: titleWords, skills };
}

// ── Source adapters ───────────────────────────────────────────────────────────
async function searchGoogle(q, limit = 10) {
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const cx     = process.env.GOOGLE_SEARCH_CX;
  if (!apiKey || !cx) return { source: "google", candidates: [], configured: false };
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(q)}&num=${Math.min(limit, 10)}`;
    const res = await fetchUrl(url);
    if (!res.json?.items) return { source: "google", candidates: [] };
    const candidates = await Promise.all(res.json.items.slice(0, limit).map(async (item) => {
      const snippet  = item.snippet || "";
      const person   = item.pagemap?.person?.[0] || {};
      const profile  = await extractProfileWithAI(snippet + " " + JSON.stringify(person), item.link);
      return {
        id: `google_${Buffer.from(item.link).toString("base64").slice(0, 16)}`,
        source: "google", source_label: "Web",
        name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : item.title?.split(" - ")[0] || "Unknown",
        title: profile?.current_title || person.jobtitle || null,
        company: profile?.current_company || null, location: profile?.location || null,
        skills: profile?.skills || [], summary: snippet,
        profile_url: item.link, email: profile?.email || null,
        linkedin_url: item.link.includes("linkedin.com") ? item.link : profile?.linkedin_url || null,
        github_url:   item.link.includes("github.com")   ? item.link : profile?.github_url   || null,
        match_score: null,
      };
    }));
    return { source: "google", candidates, total: res.json.searchInformation?.totalResults };
  } catch (e) { return { source: "google", candidates: [], error: e.message }; }
}

async function searchApollo(params, limit = 10) {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return { source: "apollo", candidates: [], configured: false };
  try {
    const res = await postJson("https://api.apollo.io/v1/mixed_people/search", {
      api_key: apiKey,
      q_keywords: params.q || "",
      person_titles: params.person_titles || [],
      person_locations: params.person_locations || [],
      page: 1, per_page: limit,
    });
    if (!res.json?.people) return { source: "apollo", candidates: [] };
    return {
      source: "apollo",
      candidates: res.json.people.map(p => ({
        id: `apollo_${p.id}`, source: "apollo", source_label: "Apollo",
        name: [p.first_name, p.last_name].filter(Boolean).join(" "),
        title: p.title, company: p.organization?.name,
        location: [p.city, p.state, p.country].filter(Boolean).join(", "),
        skills: [], summary: p.headline || null,
        profile_url: p.linkedin_url || null, email: p.email || null,
        linkedin_url: p.linkedin_url || null, photo_url: p.photo_url,
        match_score: null,
      })),
      total: res.json.pagination?.total_entries,
    };
  } catch (e) { return { source: "apollo", candidates: [], error: e.message }; }
}

async function searchGitHub(q, limit = 8) {
  try {
    const headers = { "User-Agent": "Vercentic-SourcingHub/1.0", "Accept": "application/vnd.github.v3+json" };
    if (process.env.GITHUB_TOKEN) headers["Authorization"] = `token ${process.env.GITHUB_TOKEN}`;

    // Fetch extra to account for filtering — type:user in query ensures only individual accounts
    const searchQ = `${q} type:user`;
    const fetchLimit = Math.min(limit * 3, 30);
    const res = await fetchUrl(`https://api.github.com/search/users?q=${encodeURIComponent(searchQ)}&per_page=${fetchLimit}`, { headers });
    if (!res.json?.items) return { source: "github", candidates: [] };

    // Filter: only User type (not Organization), exclude obvious bots/projects
    const botPatterns = /bot|[.-]io$|[.-]org$|project|community|official|team|group|labs|open-?source|inc\b|corp\b|llc\b/i;
    const userItems = res.json.items.filter(u => u.type === "User" && !botPatterns.test(u.login));

    // Fetch profiles for top results — stop early once we have enough valid people
    const candidates = [];
    for (const u of userItems.slice(0, Math.min(limit * 2, 15))) {
      if (candidates.length >= limit) break;
      let prof = {};
      try { const pd = await fetchUrl(`https://api.github.com/users/${u.login}`, { headers }); prof = pd.json || {}; } catch {}

      // Skip accounts that look like bots, orgs or projects based on profile data
      if (prof.type === "Organization") continue;
      if (!prof.name && !prof.bio) continue; // Skip accounts with no identity info

      // Must have at least a bio or public repos suggesting a developer
      if ((prof.public_repos || 0) === 0 && !prof.bio) continue;

      candidates.push({
        id: `github_${u.id}`, source: "github", source_label: "GitHub",
        name: prof.name || u.login,
        title: prof.bio ? prof.bio.split(/[.\n]/)[0].slice(0, 80) : "Developer",
        company: prof.company ? prof.company.replace(/^@/, "") : null,
        location: prof.location || null,
        skills: [],
        summary: prof.bio || null,
        profile_url: u.html_url,
        email: prof.email || null,
        github_url: u.html_url,
        photo_url: u.avatar_url,
        match_score: null,
      });
    }

    return { source: "github", candidates, total: res.json.total_count };
  } catch (e) { return { source: "github", candidates: [], error: e.message }; }
}

function scoreCandidate(c, { keywords = [], titles = [], skills = [] }) {
  let score = 40;
  const txt = `${c.name} ${c.title} ${c.company} ${c.summary} ${(c.skills || []).join(" ")}`.toLowerCase();
  keywords.forEach(k => { if (txt.includes(k.toLowerCase())) score += 5; });
  titles.forEach(t => { if ((c.title || "").toLowerCase().includes(t.toLowerCase())) score += 15; });
  skills.forEach(s => { if (txt.includes(s.toLowerCase())) score += 8; });
  return Math.min(score, 99);
}

function simulateResults(q, limit = 8) {
  const names  = ["Alex Johnson","Maria Chen","James Okafor","Priya Patel","Lars Eriksson","Fatima Al-Rashid","Tomás Rivera","Yuki Tanaka"];
  const titles = ["Senior Engineer","Product Manager","Marketing Director","Data Scientist","UX Designer","DevOps Lead","Frontend Developer","Solutions Architect"];
  const locs   = ["London, UK","New York, USA","Dubai, UAE","Singapore","Berlin, Germany","Toronto, Canada","Sydney, Australia","Amsterdam, NL"];
  const cos    = ["Accenture","Google","HSBC","McKinsey","Spotify","Revolut","Stripe","Shopify"];
  const skills = [["Python","ML","TensorFlow"],["React","TypeScript","Node"],["SQL","Tableau","dbt"],["Go","Kubernetes","AWS"]];
  return {
    source: "simulation", candidates: Array.from({ length: limit }, (_, i) => ({
      id: `sim_${uuidv4().slice(0, 8)}`, source: "simulation", source_label: "Preview",
      name: names[i % names.length], title: titles[i % titles.length],
      company: cos[i % cos.length], location: locs[i % locs.length],
      skills: skills[i % skills.length],
      summary: `Experienced ${titles[i % titles.length].toLowerCase()} with background matching your search.`,
      profile_url: "#", email: null, match_score: Math.round(55 + Math.random() * 40), simulated: true,
    })),
    simulated: true,
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/sourcing/search  — main federated search
router.post("/search", async (req, res) => {
  try {
    const { query: q, sources = ["google","apollo","github"], limit = 10, environment_id, job_id } = req.body;
    if (!q) return res.status(400).json({ error: "query required" });

    const queries  = await buildSearchQueries(q);
    const tasks    = [];
    if (sources.includes("google")) tasks.push(searchGoogle(queries.google || q, limit));
    if (sources.includes("apollo")) tasks.push(searchApollo(queries.apollo  || { q }, limit));
    if (sources.includes("github")) tasks.push(searchGitHub(queries.github  || q, limit));
    const results  = await Promise.all(tasks);

    const anyLive  = results.some(r => r.configured !== false && !r.error?.includes("not configured"));
    if (!anyLive)  return res.json({ query: q, parsed: queries, results: [simulateResults(q, 8)], simulation_mode: true });

    const scoring  = { keywords: queries.keywords || [], titles: queries.titles || [], skills: queries.skills || [] };
    results.forEach(r => {
      r.candidates = (r.candidates || []).map(c => ({ ...c, match_score: c.match_score ?? scoreCandidate(c, scoring) }));
      r.candidates.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
    });
    const total = results.reduce((s, r) => s + (r.candidates?.length || 0), 0);
    // If no real results at all, augment with simulation so UI is always useful
    const finalResults = total === 0
      ? [simulateResults(q, 6)]
      : results;
    const simMode = total === 0;
    if (job_id && environment_id) {
      insert("sourcing_searches", { id: uuidv4(), job_id, environment_id, query: q, sources_used: sources.join(","),
        total_results: total, created_at: new Date().toISOString() });
    }
    res.json({ query: q, parsed: queries, results: finalResults, total_candidates: total, simulation_mode: simMode });
  } catch (e) { console.error("[sourcing]", e); res.status(500).json({ error: e.message }); }
});

// POST /api/sourcing/agent-search — simplified endpoint for AI agent use
router.post("/agent-search", async (req, res) => {
  try {
    const { query: q, job_id, environment_id, limit = 5, sources = ["google","apollo","github"] } = req.body;
    if (!q) return res.status(400).json({ error: "query required" });
    const queries   = await buildSearchQueries(q);
    const tasks     = [];
    if (sources.includes("google")) tasks.push(searchGoogle(queries.google || q, limit));
    if (sources.includes("apollo")) tasks.push(searchApollo(queries.apollo  || { q }, limit));
    if (sources.includes("github")) tasks.push(searchGitHub(queries.github  || q, limit));
    const results   = await Promise.all(tasks);
    const anyLive   = results.some(r => r.configured !== false);
    const scoring   = { keywords: queries.keywords || [], titles: queries.titles || [], skills: queries.skills || [] };
    const all       = (anyLive ? results : [simulateResults(q, limit)]).flatMap(r => r.candidates || [])
      .map(c => ({ ...c, match_score: scoreCandidate(c, scoring) }))
      .sort((a, b) => b.match_score - a.match_score).slice(0, limit);
    res.json({ query: q, job_id, candidates: all, total: all.length, sources_searched: sources, simulation_mode: !anyLive });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/sourcing/import — create Person record from sourced candidate
router.post("/import", async (req, res) => {
  try {
    const { candidate, environment_id, job_id } = req.body;
    if (!candidate || !environment_id) return res.status(400).json({ error: "candidate and environment_id required" });
    const objs = query("objects", r => r.environment_id === environment_id && (r.slug === "people" || r.name === "People"));
    const peopleObj = objs[0]?.id;
    if (!peopleObj) return res.status(400).json({ error: "People object not found" });
    if (candidate.email) {
      const dup = query("records", r => r.environment_id === environment_id && r.object_id === peopleObj && r.data?.email === candidate.email);
      if (dup.length) return res.status(409).json({ error: "Candidate with this email already exists", existing_id: dup[0].id });
    }
    const id     = uuidv4();
    const nameParts = (candidate.name || "").split(" ");
    const record = {
      id, object_id: peopleObj, environment_id,
      data: {
        first_name:       candidate.first_name || nameParts[0] || "",
        last_name:        candidate.last_name  || nameParts.slice(1).join(" ") || "",
        email:            candidate.email || "",
        phone:            candidate.phone || "",
        current_title:    candidate.title || "",
        current_company:  candidate.company || "",
        location:         candidate.location || "",
        skills:           Array.isArray(candidate.skills) ? candidate.skills : [],
        summary:          candidate.summary || "",
        linkedin_url:     candidate.linkedin_url || candidate.profile_url || "",
        github_url:       candidate.github_url || "",
        source:           candidate.source_label || "Sourcing Hub",
        sourced_from_url: candidate.profile_url || "",
      },
      created_by: "sourcing_hub", created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    insert("records", record);
    insert("activity_log", { id: uuidv4(), record_id: id, object_id: peopleObj, environment_id,
      action: "sourced", message: `Imported via Sourcing Hub from ${candidate.source_label || "external source"}`,
      created_at: new Date().toISOString() });
    res.status(201).json({ record_id: id, record });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Alerts CRUD
router.get("/alerts",    (req, res) => {
  const { environment_id } = req.query;
  const rows = query("talent_alerts", r => !r.deleted && (!environment_id || r.environment_id === environment_id));
  res.json(rows);
});
router.post("/alerts",   (req, res) => {
  const { name, query: q, sources, schedule, job_id, environment_id } = req.body;
  if (!name || !q || !environment_id) return res.status(400).json({ error: "name, query, environment_id required" });
  const alert = { id: uuidv4(), name, query: q, sources: sources || ["google","apollo","github"],
    schedule: schedule || "daily", job_id: job_id || null, environment_id,
    status: "active", last_run: null, results_count: 0, created_at: new Date().toISOString() };
  insert("talent_alerts", alert);
  res.status(201).json(alert);
});
router.patch("/alerts/:id",  (req, res) => { try { update("talent_alerts", req.params.id, req.body); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });
router.delete("/alerts/:id", (req, res) => { try { update("talent_alerts", req.params.id, { deleted: true }); res.json({ ok: true }); } catch (e) { res.status(500).json({ error: e.message }); } });

// GET /api/sourcing/sources — source config status
router.get("/sources", (req, res) => {
  res.json([
    { id:"google", name:"Google Web Search", icon:"globe", category:"Open Web",
      configured: !!(process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX),
      env_keys: ["GOOGLE_SEARCH_API_KEY","GOOGLE_SEARCH_CX"], cost:"$5 / 1,000 queries",
      description:"X-ray search across LinkedIn, GitHub, portfolios and public CVs",
      setup_url:"https://developers.google.com/custom-search/v1/overview" },
    { id:"apollo", name:"Apollo.io", icon:"users", category:"Contact Database",
      configured: !!process.env.APOLLO_API_KEY,
      env_keys: ["APOLLO_API_KEY"], cost:"Free tier available",
      description:"260M+ global contacts — searchable by title, skills, company and location",
      setup_url:"https://app.apollo.io/settings/integrations/api" },
    { id:"github", name:"GitHub", icon:"code", category:"Developer Network",
      configured: true, env_keys: ["GITHUB_TOKEN"], cost:"Free (token recommended)",
      description:"100M+ developer profiles — search by language, location and activity",
      setup_url:"https://github.com/settings/tokens" },
    { id:"hunter", name:"Hunter.io", icon:"mail", category:"Email Finder",
      configured: !!process.env.HUNTER_API_KEY,
      env_keys: ["HUNTER_API_KEY"], cost:"Free: 25/month",
      description:"Find professional email addresses from names and company domains",
      setup_url:"https://hunter.io/api" },
  ]);
});

module.exports = router;
