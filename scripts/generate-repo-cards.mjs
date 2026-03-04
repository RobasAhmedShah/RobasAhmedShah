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
  const accentDim = accent + "33"; // 20% opacity hex

  const name    = trunc(repo, 38);
  const desc    = trunc(description || "No description provided.", 72);
  const commit  = trunc(lastCommit  || "No commits yet", 60);
  const lang    = trunc(language    || "Unknown", 16);
  const ago     = timeAgo(commitDate);
  const starsStr = stars >= 1000 ? (stars / 1000).toFixed(1) + "k" : String(stars ?? 0);
  const forksStr = forks >= 1000 ? (forks / 1000).toFixed(1) + "k" : String(forks ?? 0);

  // Skeuomorphic layered card — matte dark surface with physical lighting
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"
     role="img" aria-label="${x(repo)} repository card">
  <defs>

    <!-- ── Surface material ── -->
    <linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#23272F"/>
      <stop offset="100%" stop-color="#181B22"/>
    </linearGradient>

    <!-- Specular sheen: top-left light source -->
    <radialGradient id="sheen" cx="0.25" cy="0" r="0.9">
      <stop offset="0%"   stop-color="#FFFFFF" stop-opacity="0.055"/>
      <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Ambient occlusion: darkens all four corners -->
    <radialGradient id="ao" cx="0.5" cy="0.5" r="0.75">
      <stop offset="55%"  stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.32"/>
    </radialGradient>

    <!-- Accent glow pool behind name -->
    <radialGradient id="nameGlow" cx="0" cy="1" r="1">
      <stop offset="0%"   stop-color="${accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>

    <!-- Recessed panel gradient (inset trough for commit area) -->
    <linearGradient id="trough" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#0D0F14"/>
      <stop offset="100%" stop-color="#13161D"/>
    </linearGradient>

    <!-- Outer card shadow -->
    <filter id="cardShadow" x="-12%" y="-12%" width="124%" height="134%">
      <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#000" flood-opacity="0.65"/>
      <feDropShadow dx="0" dy="2"  stdDeviation="4"  flood-color="#000" flood-opacity="0.4"/>
    </filter>

    <!-- Soft inner glow for the trough -->
    <filter id="troughGlow">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>

    <!-- LED glow for language dot -->
    <filter id="led" x="-200%" y="-200%" width="500%" height="500%">
      <feGaussianBlur stdDeviation="3" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>

    <clipPath id="card"><rect width="${W}" height="${H}" rx="20"/></clipPath>
  </defs>

  <!-- ── Shadow layer ── -->
  <rect width="${W}" height="${H}" rx="20" fill="#181B22" filter="url(#cardShadow)"/>

  <!-- ── Card body ── -->
  <g clip-path="url(#card)">

    <!-- Base surface -->
    <rect width="${W}" height="${H}" fill="url(#surface)"/>

    <!-- Specular sheen (light from top-left) -->
    <rect width="${W}" height="${H}" fill="url(#sheen)"/>

    <!-- Ambient occlusion vignette -->
    <rect width="${W}" height="${H}" fill="url(#ao)"/>

    <!-- Accent glow pool -->
    <rect width="${W}" height="${H}" fill="url(#nameGlow)"/>

    <!-- ── Top highlight line (beveled edge illusion) ── -->
    <rect x="1" y="1" width="${W - 2}" height="1.5" rx="1" fill="#FFFFFF" opacity="0.09"/>

    <!-- ── Left edge highlight ── -->
    <rect x="1" y="1" width="1.5" height="${H - 2}" rx="1" fill="#FFFFFF" opacity="0.05"/>

    <!-- ── Bottom shadow line ── -->
    <rect x="0" y="${H - 2}" width="${W}" height="2" rx="1" fill="#000000" opacity="0.4"/>

    <!-- ══════════════════════════════════════
         SECTION 1 — Header (repo name + desc)
         ══════════════════════════════════════ -->

    <!-- Accent left notch -->
    <rect x="0" y="24" width="3.5" height="36" rx="2" fill="${accent}"/>
    <!-- Notch soft glow -->
    <rect x="0" y="24" width="18" height="36" fill="${accent}" opacity="0.07"/>

    <!-- Repo name — embossed effect (shadow layer + main text) -->
    <text x="22" y="48"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="20" font-weight="700" fill="#0D0F14" opacity="0.6"
          transform="translate(0,1)">${x(name)}</text>
    <text x="22" y="48"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="20" font-weight="700" fill="#F3F4F6">${x(name)}</text>

    <!-- Description -->
    <text x="22" y="68"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="12.5" fill="#5C6370" letter-spacing="0.01em">${x(desc)}</text>

    <!-- ══════════════════════════════════════
         SECTION 2 — Recessed commit trough
         ══════════════════════════════════════ -->

    <!-- Trough outer bevel (top shadow) -->
    <rect x="18" y="83" width="${W - 36}" height="62" rx="10" fill="#000" opacity="0.35"/>

    <!-- Trough body -->
    <rect x="18" y="84" width="${W - 36}" height="61" rx="9" fill="url(#trough)" stroke="#0A0C10" stroke-width="1"/>

    <!-- Trough inner top highlight (bottom edge of top bevel) -->
    <rect x="20" y="85" width="${W - 40}" height="1" rx="1" fill="#FFFFFF" opacity="0.04"/>

    <!-- Trough inner bottom light -->
    <rect x="20" y="${84 + 61 - 2}" width="${W - 40}" height="1.5" rx="1" fill="#FFFFFF" opacity="0.03"/>

    <!-- Commit label -->
    <text x="30" y="101"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="10" font-weight="600" fill="#3D4350"
          letter-spacing="0.08em">LAST COMMIT</text>

    <!-- Commit "since" pill -->
    ${ago ? `
    <rect x="${W - 30 - (ago.length * 6.5 + 12)}" y="90" width="${ago.length * 6.5 + 12}" height="15" rx="7.5"
          fill="${accentDim}" stroke="${accent}" stroke-width="0.75" stroke-opacity="0.5"/>
    <text x="${W - 30 - (ago.length * 6.5 + 12) / 2}" y="101"
          font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace"
          font-size="10" fill="${accent}" text-anchor="middle">${x(ago)}</text>
    ` : ""}

    <!-- Divider inside trough -->
    <rect x="28" y="108" width="${W - 56}" height="0.75" fill="#1E2128"/>

    <!-- Commit message -->
    <text x="30" y="130"
          font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace"
          font-size="13" fill="#8B95A6">${x(commit)}</text>

    <!-- ══════════════════════════════════════
         SECTION 3 — Footer stats row
         ══════════════════════════════════════ -->

    <!-- Language LED dot -->
    <circle cx="24" cy="169" r="4.5" fill="${accent}" opacity="0.9" filter="url(#led)"/>
    <circle cx="24" cy="169" r="2"   fill="#fff" opacity="0.5"/>

    <text x="34" y="174"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="12" fill="#5C6370">${x(lang)}</text>

    <!-- Separator dots -->
    <circle cx="${34 + lang.length * 7 + 8}" cy="170" r="1.5" fill="#2E3340"/>
    <circle cx="${34 + lang.length * 7 + 18}" cy="170" r="1.5" fill="#2E3340"/>

    <!-- Stars — etched look -->
    <text x="${34 + lang.length * 7 + 32}" y="174"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="11" fill="#4A5060">★</text>
    <text x="${34 + lang.length * 7 + 46}" y="174"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="12" fill="#5C6370">${x(starsStr)}</text>

    <!-- Forks -->
    <text x="${34 + lang.length * 7 + 76}" y="174"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="11" fill="#4A5060">⑂</text>
    <text x="${34 + lang.length * 7 + 90}" y="174"
          font-family="ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial"
          font-size="12" fill="#5C6370">${x(forksStr)}</text>

    <!-- Owner slug — right aligned, very subtle -->
    <text x="${W - 18}" y="174"
          font-family="ui-monospace,'Cascadia Code','Fira Code',Consolas,monospace"
          font-size="10.5" fill="#2E3340" text-anchor="end"
          letter-spacing="0.02em">${x(OWNER)}/${x(repo)}</text>

    <!-- ── Outer border (on top of everything) ── -->
    <rect width="${W}" height="${H}" rx="20" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.05"/>
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
