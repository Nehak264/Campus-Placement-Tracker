// ==========================================================================
// ATS Scoring Engine — Pure JS, no ML, no external API
// Compares a Job Description text with a Resume text and scores the match.
// ==========================================================================

// ── Stop-words to ignore during keyword extraction ──────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "is","are","was","were","be","been","being","have","has","had","do","does",
  "did","will","would","could","should","may","might","shall","can","need",
  "this","that","these","those","it","its","our","we","you","your","they",
  "their","he","she","him","her","us","them","from","by","as","up","down",
  "about","than","then","when","where","who","which","what","how","if",
  "not","no","nor","so","yet","both","either","neither","just","very",
  "also","plus","etc","eg","ie","via","per","any","all","each","every",
  "good","well","strong","excellent","must","required","preferred","looking",
  "open","eligible","above","below","least","most","more","less","one","two",
  "three","four","five","six","year","years","month","months","degree",
  "bachelor","master","phd","student","students","candidate","candidates",
  "company","role","position","job","work","team","department","office"
]);

// ── Keyword dictionary with categories and weights ──────────────────────────
// weight: 1-3 (1=common, 3=specific/valuable)
const KEYWORD_DB = [
  // ── Programming Languages ──
  { kw: "java",          cat: "Technical Skills", w: 2 },
  { kw: "python",        cat: "Technical Skills", w: 2 },
  { kw: "javascript",    cat: "Technical Skills", w: 2 },
  { kw: "typescript",    cat: "Technical Skills", w: 2 },
  { kw: "c++",           cat: "Technical Skills", w: 2 },
  { kw: "c#",            cat: "Technical Skills", w: 2 },
  { kw: "kotlin",        cat: "Technical Skills", w: 2 },
  { kw: "golang",        cat: "Technical Skills", w: 2 },
  { kw: "rust",          cat: "Technical Skills", w: 2 },
  { kw: "php",           cat: "Technical Skills", w: 1 },
  { kw: "ruby",          cat: "Technical Skills", w: 1 },
  { kw: "scala",         cat: "Technical Skills", w: 2 },

  // ── Frameworks & Libraries ──
  { kw: "spring boot",   cat: "Technical Skills", w: 3 },
  { kw: "spring",        cat: "Technical Skills", w: 2 },
  { kw: "react",         cat: "Technical Skills", w: 2 },
  { kw: "angular",       cat: "Technical Skills", w: 2 },
  { kw: "vue",           cat: "Technical Skills", w: 2 },
  { kw: "node",          cat: "Technical Skills", w: 2 },
  { kw: "nodejs",        cat: "Technical Skills", w: 2 },
  { kw: "django",        cat: "Technical Skills", w: 2 },
  { kw: "flask",         cat: "Technical Skills", w: 2 },
  { kw: "express",       cat: "Technical Skills", w: 2 },
  { kw: "hibernate",     cat: "Technical Skills", w: 2 },
  { kw: "jpa",           cat: "Technical Skills", w: 2 },
  { kw: "microservices", cat: "Technical Skills", w: 3 },
  { kw: "rest api",      cat: "Technical Skills", w: 2 },
  { kw: "rest apis",     cat: "Technical Skills", w: 2 },
  { kw: "restful",       cat: "Technical Skills", w: 2 },
  { kw: "graphql",       cat: "Technical Skills", w: 3 },
  { kw: "kafka",         cat: "Technical Skills", w: 3 },
  { kw: "rabbitmq",      cat: "Technical Skills", w: 3 },
  { kw: "tensorflow",    cat: "Technical Skills", w: 3 },
  { kw: "pytorch",       cat: "Technical Skills", w: 3 },

  // ── Databases ──
  { kw: "mysql",         cat: "Technical Skills", w: 2 },
  { kw: "postgresql",    cat: "Technical Skills", w: 2 },
  { kw: "mongodb",       cat: "Technical Skills", w: 2 },
  { kw: "redis",         cat: "Technical Skills", w: 2 },
  { kw: "sql",           cat: "Technical Skills", w: 2 },
  { kw: "nosql",         cat: "Technical Skills", w: 2 },
  { kw: "oracle",        cat: "Technical Skills", w: 2 },
  { kw: "cassandra",     cat: "Technical Skills", w: 3 },
  { kw: "elasticsearch", cat: "Technical Skills", w: 3 },
  { kw: "dbms",          cat: "Technical Skills", w: 1 },
  { kw: "database",      cat: "Technical Skills", w: 1 },

  // ── Core CS Concepts ──
  { kw: "data structures", cat: "Technical Skills", w: 2 },
  { kw: "algorithms",    cat: "Technical Skills", w: 2 },
  { kw: "dsa",           cat: "Technical Skills", w: 2 },
  { kw: "object oriented", cat: "Technical Skills", w: 2 },
  { kw: "oop",           cat: "Technical Skills", w: 2 },
  { kw: "system design", cat: "Technical Skills", w: 3 },
  { kw: "design patterns", cat: "Technical Skills", w: 3 },
  { kw: "multithreading", cat: "Technical Skills", w: 2 },
  { kw: "concurrency",   cat: "Technical Skills", w: 2 },
  { kw: "networking",    cat: "Technical Skills", w: 1 },
  { kw: "operating systems", cat: "Technical Skills", w: 1 },
  { kw: "compiler",      cat: "Technical Skills", w: 2 },
  { kw: "machine learning", cat: "Technical Skills", w: 3 },
  { kw: "deep learning", cat: "Technical Skills", w: 3 },
  { kw: "nlp",           cat: "Technical Skills", w: 3 },
  { kw: "computer vision", cat: "Technical Skills", w: 3 },

  // ── Web / Frontend ──
  { kw: "html",          cat: "Technical Skills", w: 1 },
  { kw: "css",           cat: "Technical Skills", w: 1 },
  { kw: "html5",         cat: "Technical Skills", w: 1 },
  { kw: "css3",          cat: "Technical Skills", w: 1 },
  { kw: "responsive design", cat: "Technical Skills", w: 2 },
  { kw: "bootstrap",     cat: "Technical Skills", w: 1 },
  { kw: "tailwind",      cat: "Technical Skills", w: 2 },
  { kw: "redux",         cat: "Technical Skills", w: 2 },
  { kw: "webpack",       cat: "Tools",            w: 1 },
  { kw: "vite",          cat: "Tools",            w: 1 },

  // ── Tools ──
  { kw: "git",           cat: "Tools", w: 2 },
  { kw: "github",        cat: "Tools", w: 1 },
  { kw: "gitlab",        cat: "Tools", w: 1 },
  { kw: "maven",         cat: "Tools", w: 2 },
  { kw: "gradle",        cat: "Tools", w: 2 },
  { kw: "docker",        cat: "Tools", w: 3 },
  { kw: "kubernetes",    cat: "Tools", w: 3 },
  { kw: "jenkins",       cat: "Tools", w: 2 },
  { kw: "ci/cd",         cat: "Tools", w: 3 },
  { kw: "cicd",          cat: "Tools", w: 3 },
  { kw: "aws",           cat: "Tools", w: 3 },
  { kw: "azure",         cat: "Tools", w: 3 },
  { kw: "gcp",           cat: "Tools", w: 3 },
  { kw: "cloud",         cat: "Tools", w: 2 },
  { kw: "linux",         cat: "Tools", w: 2 },
  { kw: "bash",          cat: "Tools", w: 2 },
  { kw: "postman",       cat: "Tools", w: 1 },
  { kw: "jira",          cat: "Tools", w: 1 },
  { kw: "confluence",    cat: "Tools", w: 1 },
  { kw: "terraform",     cat: "Tools", w: 3 },
  { kw: "ansible",       cat: "Tools", w: 2 },
  { kw: "sonarqube",     cat: "Tools", w: 2 },
  { kw: "intellij",      cat: "Tools", w: 1 },
  { kw: "eclipse",       cat: "Tools", w: 1 },
  { kw: "vs code",       cat: "Tools", w: 1 },

  // ── Soft Skills ──
  { kw: "communication",    cat: "Soft Skills", w: 2 },
  { kw: "teamwork",         cat: "Soft Skills", w: 2 },
  { kw: "collaboration",    cat: "Soft Skills", w: 2 },
  { kw: "leadership",       cat: "Soft Skills", w: 2 },
  { kw: "problem solving",  cat: "Soft Skills", w: 2 },
  { kw: "analytical",       cat: "Soft Skills", w: 2 },
  { kw: "critical thinking",cat: "Soft Skills", w: 2 },
  { kw: "agile",            cat: "Soft Skills", w: 2 },
  { kw: "scrum",            cat: "Soft Skills", w: 2 },
  { kw: "presentation",     cat: "Soft Skills", w: 1 },
  { kw: "interpersonal",    cat: "Soft Skills", w: 1 },
  { kw: "adaptable",        cat: "Soft Skills", w: 1 },
  { kw: "self motivated",   cat: "Soft Skills", w: 1 },
  { kw: "time management",  cat: "Soft Skills", w: 1 },
  { kw: "attention to detail", cat: "Soft Skills", w: 2 },
  { kw: "fast learner",     cat: "Soft Skills", w: 1 },
  { kw: "quick learner",    cat: "Soft Skills", w: 1 },
  { kw: "verbal",           cat: "Soft Skills", w: 1 },
  { kw: "written",          cat: "Soft Skills", w: 1 },

  // ── Aptitude / CS Theory ──
  { kw: "aptitude",         cat: "Aptitude", w: 1 },
  { kw: "reasoning",        cat: "Aptitude", w: 1 },
  { kw: "quantitative",     cat: "Aptitude", w: 1 },
  { kw: "logical",          cat: "Aptitude", w: 1 },
];

// ── Stem normalizer ──────────────────────────────────────────────────────────
function stem(word) {
  return word
    .replace(/ings?$/, "")     // programming → programm, learning → learn
    .replace(/ed$/, "")        // experienced → experienc
    .replace(/ers?$/, "")      // developer → develop
    .replace(/tion$/, "t")     // communication → communicat
    .replace(/ies$/, "y")      // technologies → technology
    .replace(/ness$/, "")      // awareness
    .replace(/ly$/, "")        // quickly
    .replace(/s$/, "");        // skills → skill
}

// ── Normalize a chunk of text for matching ───────────────────────────────────
function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9/+ ]/g, " ")  // keep C++, C#, CI/CD
    .replace(/\s+/g, " ")
    .trim();
}

// ── Check if keyword is present in a normalized text ─────────────────────────
function matchesKeyword(kw, normalizedText) {
  // 1. Exact substring match
  if (normalizedText.includes(kw)) return true;
  // 2. Stem the kw and try again
  const kwStem = stem(kw);
  if (kwStem.length >= 4 && normalizedText.includes(kwStem)) return true;
  // 3. Word-by-word stem match for single-word kw
  if (!kw.includes(" ")) {
    const words = normalizedText.split(" ");
    return words.some((w) => stem(w) === kwStem && kwStem.length >= 4);
  }
  return false;
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * analyzeATS(jdText, resumeText)
 *
 * Returns:
 * {
 *   score: number (0-100),
 *   grade: "A" | "B" | "C" | "D",
 *   categories: { [catName]: { matched: string[], missing: string[], score: number } },
 *   matched: Array<{kw, cat, w}>,
 *   missing: Array<{kw, cat, w}>,        // sorted by weight desc
 *   suggestions: string[],               // improvement tips
 *   jdKeywordCount: number,
 * }
 */
export function analyzeATS(jdText, resumeText) {
  const jdNorm   = normalizeText(jdText   || "");
  const resNorm  = normalizeText(resumeText || "");

  // 1. Find which keywords from KEYWORD_DB appear in the JD
  const jdKeywords = KEYWORD_DB.filter((entry) => matchesKeyword(entry.kw, jdNorm));

  if (jdKeywords.length === 0) {
    return {
      score: 0,
      grade: "D",
      categories: {},
      matched: [],
      missing: [],
      suggestions: ["The JD text doesn't contain recognizable technical keywords. Try pasting the full JD."],
      jdKeywordCount: 0,
    };
  }

  // 2. For each JD keyword, check if it's in the resume
  const matched = [];
  const missing = [];

  for (const entry of jdKeywords) {
    if (resNorm && matchesKeyword(entry.kw, resNorm)) {
      matched.push(entry);
    } else {
      missing.push(entry);
    }
  }

  // 3. Score = weighted sum of matched / weighted sum of all JD keywords
  const totalWeight   = jdKeywords.reduce((s, e) => s + e.w, 0);
  const matchedWeight = matched.reduce((s, e) => s + e.w, 0);
  const score = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

  // 4. Grade
  const grade = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

  // 5. Per-category breakdown
  const catNames = [...new Set(jdKeywords.map((e) => e.cat))];
  const categories = {};
  for (const cat of catNames) {
    const catJd      = jdKeywords.filter((e) => e.cat === cat);
    const catMatched = matched.filter((e)   => e.cat === cat);
    const catMissing = missing.filter((e)   => e.cat === cat);
    const catW       = catJd.reduce((s, e) => s + e.w, 0);
    const catMatchW  = catMatched.reduce((s, e) => s + e.w, 0);
    categories[cat] = {
      matched: catMatched.map((e) => e.kw),
      missing: catMissing.map((e) => e.kw),
      score:   catW > 0 ? Math.round((catMatchW / catW) * 100) : 0,
    };
  }

  // 6. Sort missing by weight descending (most important first)
  missing.sort((a, b) => b.w - a.w);

  // 7. Suggestions
  const suggestions = buildSuggestions(missing, score, resumeText);

  return {
    score,
    grade,
    categories,
    matched,
    missing,
    suggestions,
    jdKeywordCount: jdKeywords.length,
  };
}

function buildSuggestions(missing, score, resumeText) {
  const tips = [];
  const hasMissing = (cat) => missing.some((e) => e.cat === cat);

  if (missing.length === 0) {
    tips.push("🎉 Excellent! Your resume covers all the keywords in this JD.");
    return tips;
  }

  // Top 3 missing keywords
  const top3 = missing.slice(0, 3).map((e) => `"${e.kw}"`).join(", ");
  tips.push(`Add the highest-impact missing keywords to your resume: ${top3}.`);

  // Category-specific advice
  if (hasMissing("Technical Skills")) {
    const techMissing = missing.filter((e) => e.cat === "Technical Skills").map((e) => e.kw);
    if (techMissing.some((k) => ["spring boot","microservices","system design"].includes(k))) {
      tips.push("Build a mini Spring Boot project (REST API + MySQL) and add it to your GitHub to demonstrate hands-on backend skills.");
    }
    if (techMissing.some((k) => ["react","angular","vue"].includes(k))) {
      tips.push("Add a frontend project (React/Angular) to your portfolio — even a simple CRUD app counts.");
    }
    if (techMissing.some((k) => ["machine learning","deep learning","tensorflow","pytorch"].includes(k))) {
      tips.push("Complete an ML course (Coursera/fast.ai) and showcase a small ML project with real datasets.");
    }
    if (techMissing.some((k) => ["data structures","algorithms","dsa"].includes(k))) {
      tips.push("Practice DSA on LeetCode / GeeksforGeeks — mention it in your resume under Skills or Projects.");
    }
  }

  if (hasMissing("Tools")) {
    const toolsMissing = missing.filter((e) => e.cat === "Tools").map((e) => e.kw);
    if (toolsMissing.some((k) => ["docker","kubernetes"].includes(k))) {
      tips.push("Learn Docker basics (containerise your existing projects) and mention Docker in your skills section.");
    }
    if (toolsMissing.some((k) => ["aws","azure","gcp","cloud"].includes(k))) {
      tips.push("Get a free-tier AWS account, deploy a project, and add 'AWS (EC2, S3)' to your resume.");
    }
    if (toolsMissing.some((k) => ["ci/cd","jenkins","cicd"].includes(k))) {
      tips.push("Set up a simple GitHub Actions CI pipeline for one of your projects and mention it.");
    }
    if (toolsMissing.includes("git")) {
      tips.push("Create a GitHub profile, push your projects, and add 'Git, GitHub' to your Skills section.");
    }
  }

  if (hasMissing("Soft Skills")) {
    tips.push("Highlight soft skills like communication, teamwork, and agile/scrum in your project descriptions or a dedicated Skills section.");
  }

  if (score < 40) {
    tips.push("Your resume matches fewer than 40% of the JD keywords. Consider tailoring your resume specifically for each application.");
  }

  if (!resumeText || resumeText.trim().length < 100) {
    tips.push("Resume text appears very short. Make sure your PDF was parsed correctly — try a text-based PDF rather than a scanned image.");
  }

  return tips;
}
