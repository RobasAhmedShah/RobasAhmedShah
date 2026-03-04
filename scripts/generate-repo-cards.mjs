import fs from "node:fs/promises";
import path from "node:path";

const OWNER = process.env.OWNER || "RobasAhmedShah";
const REPOS = (process.env.REPOS || "").split(",").map(s => s.trim()).filter(Boolean);
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) { console.error("Missing GITHUB_TOKEN"); process.exit(1); }
if (!REPOS.length) { console.error("Missing REPOS (comma separated)"); process.exit(1); }

const outDir = path.resolve("assets/cards");
await fs.mkdir(outDir, { recursive: true });

async function gh(url) {
  const res = await fetch(`https://api.github.com${url}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "profile-repo-cards",
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${url} → ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

function x(s = "") {
  return String(s)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function trunc(s, max) {
  s = String(s || "");
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

// Language → accent colour (extend as needed)
const LANG_COLOR = {
  JavaScript: "#F7DF1E", TypeScript: "#3178C6", Python: "#3572A5",
  Rust:       "#DEA584", Go:         "#00ADD8", Java:       "#B07219",
  "C++":      "#F34B7D", C:          "#555555", Ruby:       "#701516",
  Swift:      "#F05138", Kotlin:     "#A97BFF", HTML:       "#E34C26",
  CSS:        "#563D7C", Shell:      "#89E051", Dockerfile: "#384D54",
};

// Tiny SVG icon paths (24-px viewBox)
const ICONS = {
  repo:   "M3 3h18a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm5 4v2h8V7H8zm0 4v2h8v-2H8zm0 4v2h5v-2H8z",
  star:   "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  fork:   "M6 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm12 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM6 18a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm0-2a4 4 0 0 0-4 4 4 4 0 0 0 4 4 4 4 0 0 0 4-4V8.83A4 4 0 0 0 18 6a4 4 0 0 0-4-4 4 4 0 0 0-4 4 4 4 0 0 0 2.17 3.56V12a2 2 0 0 1-2 2H6z",
  commit: "M12 2a5 5 0 0 1 5 5 5 5 0 0 1-5 5 5 5 0 0 1-5-5 5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3zM2 13h8.1a6 6 0 0 0 3.8 0H22v2H2v-2z",
};

function icon(id, ox, oy, size = 14, color = "#6B7280") {
  const scale = size / 24;
  return `<g transform="translate(${ox},${oy}) scale(${scale})"><path d="${ICONS[id]}" fill="${color}"/></g>`;
}

function timeAgo(iso) {
  if (!iso) return "";
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)                          return `${sec}s ago`;
  if (sec < 3600)                        return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)                       return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 30)                  return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 86400 * 365)                 return `${Math.floor(sec / (86400 * 30))}mo ago`;
  return `${Math.floor(sec / (86400 * 365))}y ago`;
}

function cardSvg({ repo, description, language, lastCommit, commitDate, stars, forks, updatedAt }) {
  const W = 580, H = 190, P = 22;
  const accentColor = LANG_COLOR[language] || "#7C3AED";
  const name = trunc(repo, 44);
  const desc = trunc(description || "No description provided.", 88);
  const commit = trunc(lastCommit || "No commits yet", 72);
  const lang = trunc(language || "Unknown", 18);
  const ago = timeAgo(commitDate);

  // Format updated date
  let dateStr = "";
  if (updatedAt) {
    const d = new Date(updatedAt);
    dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  // Stats row measurements
  const starsStr = stars >= 1000 ? (stars / 1000).toFixed(1) + "k" : String(stars ?? 0);
  const forksStr = forks >= 1000 ? (forks / 1000).toFixed(1) + "k" : String(forks ?? 0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     role="img" aria-label="${x(repo)} repository card">
  <defs>
    <!-- Card background gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#0F1117"/>
      <stop offset="100%" stop-color="#161B27"/>
    </linearGradient>
    <!-- Top accent bar -->
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="${accentColor}" stop-opacity="0.9"/>
      <stop offset="60%"  stop-color="${accentColor}" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </linearGradient>
    <!-- Glow behind repo name -->
    <radialGradient id="glow" cx="0" cy="0.5" r="0.6">
      <stop offset="0%"   stop-color="${accentColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
    </radialGradient>
    <!-- Divider fade -->
    <linearGradient id="div" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%"   stop-color="#374151"/>
      <stop offset="100%" stop-color="#374151" stop-opacity="0"/>
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
    </filter>
    <clipPath id="clip"><rect width="${W}" height="${H}" rx="18"/></clipPath>
  </defs>

  <!-- Card body -->
  <rect width="${W}" height="${H}" rx="18" fill="url(#bg)" stroke="#1F2937" stroke-width="1" filter="url(#shadow)"/>

  <!-- Subtle glow wash top-left -->
  <rect width="${W}" height="${H}" rx="18" fill="url(#glow)" clip-path="url(#clip)"/>

  <!-- Accent bar (top edge, tapers to transparent) -->
  <rect x="0" y="0" width="${W}" height="3.5" rx="18" fill="url(#bar)" clip-path="url(#clip)"/>

  <!-- Repo icon + name -->
  ${icon("repo", P, 26, 16, accentColor)}
  <text x="${P + 22}" y="40" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="19" font-weight="700" fill="#F9FAFB">${x(name)}</text>

  <!-- Description -->
  <text x="${P}" y="66" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="13" fill="#9CA3AF">${x(desc)}</text>

  <!-- Divider -->
  <rect x="${P}" y="80" width="${W - P * 2}" height="1" fill="url(#div)"/>

  <!-- Last commit row -->
  ${icon("commit", P, 88, 13, "#6B7280")}
  <text x="${P + 18}" y="100" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="12" fill="#6B7280">latest commit</text>
  ${ago ? `<text x="${W - P}" y="100" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="12" fill="#4B5563" text-anchor="end">${x(ago)}</text>` : ""}
  <text x="${P}" y="120" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace"
        font-size="13" font-weight="500" fill="#D1D5DB">${x(commit)}</text>

  <!-- Divider 2 -->
  <rect x="${P}" y="134" width="${W - P * 2}" height="1" fill="url(#div)"/>

  <!-- Footer row: language dot + name | stars | forks | updated -->
  <!-- Language badge -->
  <circle cx="${P + 5}" cy="156" r="5" fill="${accentColor}"/>
  <text x="${P + 15}" y="160" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="12" fill="#D1D5DB">${x(lang)}</text>

  <!-- Stars -->
  ${icon("star", P + 115, 146, 13, "#FBBF24")}
  <text x="${P + 130}" y="160" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="12" fill="#D1D5DB">${x(starsStr)}</text>

  <!-- Forks -->
  ${icon("fork", P + 168, 146, 13, "#60A5FA")}
  <text x="${P + 183}" y="160" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="12" fill="#D1D5DB">${x(forksStr)}</text>

  <!-- Updated date (right-aligned) -->
  <text x="${W - P}" y="160" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
        font-size="11" fill="#4B5563" text-anchor="end">updated ${x(dateStr)}</text>
</svg>`;
}

for (const repo of REPOS) {
  const [r, commits] = await Promise.all([
    gh(`/repos/${OWNER}/${repo}`),
    gh(`/repos/${OWNER}/${repo}/commits?per_page=1`),
  ]);

  const svg = cardSvg({
    repo,
    description:    r.description ?? "",
    language:       r.language ?? "",
    lastCommit:     commits?.[0]?.commit?.message?.split("\n")[0] ?? "",
    commitDate:     commits?.[0]?.commit?.author?.date ?? commits?.[0]?.commit?.committer?.date ?? "",
    stars:          r.stargazers_count ?? 0,
    forks:          r.forks_count ?? 0,
    updatedAt:      r.updated_at ?? "",
  });

  const file = path.join(outDir, `${repo}.svg`);
  await fs.writeFile(file, svg, "utf8");
  console.log(`✓  ${file}`);
}
