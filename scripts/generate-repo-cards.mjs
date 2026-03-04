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

function timeAgo(iso) {
  if (!iso) return "";
  const sec = Math.floor((Date.now() - new Date(iso)) / 1000);
  if (sec < 60)             return `${sec}s ago`;
  if (sec < 3600)           return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400)          return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 86400 * 30)     return `${Math.floor(sec / 86400)}d ago`;
  if (sec < 86400 * 365)    return `${Math.floor(sec / (86400 * 30))}mo ago`;
  return `${Math.floor(sec / (86400 * 365))}y ago`;
}

const LANG_COLOR = {
  JavaScript: "#F7DF1E", TypeScript: "#3178C6", Python: "#3572A5",
  Rust:       "#DEA584", Go:         "#00ADD8", Java:   "#B07219",
  "C++":      "#F34B7D", C:          "#A8A8A8", Ruby:   "#CC342D",
  Swift:      "#F05138", Kotlin:     "#A97BFF", HTML:   "#E34C26",
  CSS:        "#6264A7", Shell:      "#89E051",
};

function cardSvg({ repo, description, language, lastCommit, commitDate, stars, forks }) {
  const W = 540, H = 200;
  const accent = LANG_COLOR[language] || "#A78BFA";

  const name    = trunc(repo, 38);
  const desc    = trunc(description || "No description provided.", 72);
  const commit  = trunc(lastCommit  || "No commits yet", 60);
  const lang    = trunc(language    || "Unknown", 16);
  const ago     = timeAgo(commitDate);
  const starsStr = stars >= 1000 ? (stars / 1000).toFixed(1) + "k" : String(stars ?? 0);
  const forksStr = forks >= 1000 ? (forks / 1000).toFixed(1) + "k" : String(forks ?? 0);

  // Dynamic calculations for the 3D footer and buttons
  const pillW = ago ? ago.length * 6.5 + 24 : 0;
  const pillX = W - 30 - pillW;
  const textX = pillX + pillW / 2;

  const dot1X = 38 + lang.length * 7 + 10;
  const dot2X = 38 + lang.length * 7 + 20;
  const starIconX = 38 + lang.length * 7 + 34;
  const starTextX = 38 + lang.length * 7 + 48;
  const forkIconX = starTextX + String(starsStr).length * 7 + 16;
  const forkTextX = forkIconX + 14;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${x(repo)} repository card">
  <defs>
    <!-- ── Physical Lighting & Materials ── -->
    <linearGradient id="metalBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#343842"/>
      <stop offset="100%" stop-color="#21242B"/>
    </linearGradient>

    <linearGradient id="edgeBevel" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.25"/>
      <stop offset="30%" stop-color="#FFFFFF" stop-opacity="0.05"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.8"/>
    </linearGradient>

    <!-- Accent piece material (dynamically adapts to language color) -->
    <linearGradient id="accentMetal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.3"/>
      <stop offset="50%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.4"/>
    </linearGradient>

    <linearGradient id="troughBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#121419"/>
      <stop offset="100%" stop-color="#1B1E25"/>
    </linearGradient>

    <linearGradient id="buttonBase" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3A3F4A"/>
      <stop offset="100%" stop-color="#282B33"/>
    </linearGradient>

    <!-- Glass LED -->
    <radialGradient id="glassLED" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="40%" stop-color="${accent}"/>
      <stop offset="80%" stop-color="${accent}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.6"/>
    </radialGradient>

    <!-- ── Realistic Drop Shadows ── -->
    <filter id="physicalShadow" x="-10%" y="-10%" width="120%" height="130%">
      <feDropShadow dx="0" dy="16" stdDeviation="20" flood-color="#000" flood-opacity="0.45"/>
      <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity="0.3"/>
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
    </filter>

    <filter id="buttonShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity="0.6"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.8"/>
    </filter>

    <!-- Inner shadow/glow for the LED to make it emit light -->
    <filter id="ledGlow">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.7"/>
    </filter>

    <clipPath id="cardClip">
      <rect width="${W}" height="${H}" rx="20"/>
    </clipPath>
  </defs>

  <!-- ── Base Card Entity ── -->
  <rect width="${W}" height="${H}" rx="20" fill="#21242B" filter="url(#physicalShadow)"/>
  
  <g clip-path="url(#cardClip)">
    <rect width="${W}" height="${H}" fill="url(#metalBase)"/>

    <!-- 3D Beveled Edge -->
    <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="19" fill="none" stroke="url(#edgeBevel)" stroke-width="2"/>
    
    <!-- Very soft inner glow to round out the surface -->
    <rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="18" fill="none" stroke="#FFFFFF" stroke-opacity="0.04" stroke-width="1"/>

    <!-- ══════════════════════════════════════ 
         SECTION 1 — Header (Repo Name & Desc) 
         ══════════════════════════════════════ -->
    <rect x="-2" y="23" width="7" height="38" rx="2" fill="#0A0C0F"/>
    <rect x="0" y="24" width="4" height="36" rx="2" fill="url(#accentMetal)"/>
    <rect x="0" y="24" width="1" height="36" fill="#FFFFFF" opacity="0.6"/>
    <rect x="3" y="24" width="1" height="36" fill="#000000" opacity="0.4"/>

    <!-- Repo Name -->
    <text x="22" y="49" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="22" font-weight="800" fill="#000000" opacity="0.8">${x(name)}</text>
    <text x="22" y="47" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="22" font-weight="800" fill="#FFFFFF" opacity="0.3">${x(name)}</text>
    <text x="22" y="48" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="22" font-weight="800" fill="#F0F2F5">${x(name)}</text>

    <!-- Description -->
    <text x="22" y="69" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="13" fill="#FFFFFF" opacity="0.15">${x(desc)}</text>
    <text x="22" y="68" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="13" fill="#8892A3">${x(desc)}</text>


    <!-- ══════════════════════════════════════ 
         SECTION 2 — Recessed Trough (Commit) 
         ══════════════════════════════════════ -->
    <rect x="18" y="86" width="${W - 36}" height="62" rx="10" fill="url(#troughBase)"/>

    <path d="M 18 138 L 18 96 C 18 90.5 22.5 86 28 86 L ${W - 28} 86" fill="none" stroke="#000000" stroke-width="3" opacity="0.7"/>
    <path d="M 18 138 L 18 96 C 18 90.5 22.5 86 28 86 L ${W - 28} 86" fill="none" stroke="#000000" stroke-width="1" opacity="0.9"/>
    
    <path d="M 18 138 C 18 143.5 22.5 148 28 148 L ${W - 28} 148 C ${W - 22.5} 148 ${W - 18} 143.5 ${W - 18} 138 L ${W - 18} 86" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.15"/>

    <text x="32" y="105" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="10" font-weight="700" fill="#000000" opacity="0.8" letter-spacing="0.1em">LAST COMMIT</text>
    <text x="32" y="104" font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="10" font-weight="700" fill="#5A6375" letter-spacing="0.1em">LAST COMMIT</text>

    ${ago ? `
    <!-- Commit "since" pill -->
    <rect x="${pillX}" y="91" width="${pillW}" height="18" rx="9" fill="#000" filter="url(#buttonShadow)"/>
    <rect x="${pillX}" y="91" width="${pillW}" height="18" rx="9" fill="url(#buttonBase)"/>
    <rect x="${pillX + 1}" y="92" width="${pillW - 2}" height="16" rx="8" fill="none" stroke="#FFFFFF" stroke-opacity="0.15" stroke-width="1"/>
    <rect x="${pillX + 1}" y="92" width="${pillW - 2}" height="16" rx="8" fill="none" stroke="#000000" stroke-opacity="0.4" stroke-width="1"/>
    
    <text x="${textX}" y="104.5" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace" font-size="10" font-weight="600" fill="#000000" text-anchor="middle" opacity="0.7">${x(ago)}</text>
    <text x="${textX}" y="103.5" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace" font-size="10" font-weight="600" fill="${accent}" text-anchor="middle">${x(ago)}</text>
    ` : ""}

    <!-- Etched Divider -->
    <rect x="30" y="114" width="${W - 60}" height="1" fill="#000000" opacity="0.8"/>
    <rect x="30" y="115" width="${W - 60}" height="1" fill="#FFFFFF" opacity="0.08"/>

    <!-- Commit message -->
    <text x="32" y="134" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace" font-size="13" fill="#000000" opacity="0.9">${x(commit)}</text>
    <text x="32" y="133" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace" font-size="13" fill="#A8B4C9">${x(commit)}</text>


    <!-- ══════════════════════════════════════ 
         SECTION 3 — Footer Stats Row 
         ══════════════════════════════════════ -->
    <circle cx="26" cy="172" r="5" fill="url(#glassLED)" filter="url(#ledGlow)"/>
    <path d="M 23 169 A 3 3 0 0 1 28 170 A 3.5 3.5 0 0 0 23 169 Z" fill="#FFFFFF" opacity="0.9"/>
    <path d="M 24 175 A 4 4 0 0 0 29 174 A 4.5 4.5 0 0 1 24 175 Z" fill="#FFFFFF" opacity="0.3"/>

    <!-- Footer Text: Debossed (stamped into metal) -->
    <g font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="12" fill="#FFFFFF" opacity="0.15">
      <text x="38" y="177">${x(lang)}</text>
      <text x="${starIconX}" y="177" font-size="11">★</text>
      <text x="${starTextX}" y="177">${x(starsStr)}</text>
      <text x="${forkIconX}" y="177" font-size="11">⑂</text>
      <text x="${forkTextX}" y="177">${x(forksStr)}</text>
    </g>
    
    <g font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial" font-size="12" fill="#8892A3">
      <text x="38" y="176">${x(lang)}</text>
      <text x="${starIconX}" y="176" font-size="11" fill="#6B7485">★</text>
      <text x="${starTextX}" y="176">${x(starsStr)}</text>
      <text x="${forkIconX}" y="176" font-size="11" fill="#6B7485">⑂</text>
      <text x="${forkTextX}" y="176">${x(forksStr)}</text>
    </g>

    <!-- Physical drilled separator dots -->
    <circle cx="${dot1X}" cy="172" r="2" fill="#FFFFFF" opacity="0.15"/>
    <circle cx="${dot2X}" cy="172" r="2" fill="#FFFFFF" opacity="0.15"/>
    <circle cx="${dot1X}" cy="171" r="2" fill="#0A0C0F"/>
    <circle cx="${dot2X}" cy="171" r="2" fill="#0A0C0F"/>

    <!-- Owner slug -->
    <text x="${W - 18}" y="177" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace" font-size="11" fill="#FFFFFF" text-anchor="end" opacity="0.1">${x(OWNER)}/${x(repo)}</text>
    <text x="${W - 18}" y="176" font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace" font-size="11" fill="#4B5263" text-anchor="end">${x(OWNER)}/${x(repo)}</text>
  </g>
</svg>`;
}

for (const repo of REPOS) {
  const [r, commits] = await Promise.all([
    gh(`/repos/${OWNER}/${repo}`),
    gh(`/repos/${OWNER}/${repo}/commits?per_page=1`),
  ]);

  const svg = cardSvg({
    repo,
    description: r.description ?? "",
    language:    r.language ?? "",
    lastCommit:  commits?.[0]?.commit?.message?.split("\n")[0] ?? "",
    commitDate:  commits?.[0]?.commit?.author?.date ?? commits?.[0]?.commit?.committer?.date ?? "",
    stars:       r.stargazers_count ?? 0,
    forks:       r.forks_count ?? 0,
  });

  const file = path.join(outDir, `${repo}.svg`);
  await fs.writeFile(file, svg, "utf8");
  console.log(`✓  ${file}`);
}
