import fs from "node:fs/promises";
import path from "node:path";

const OWNER = process.env.OWNER || "RobasAhmedShah";
const REPOS = (process.env.REPOS || "").split(",").map(s => s.trim()).filter(Boolean);
const TOKEN = process.env.GITHUB_TOKEN;

if (!TOKEN) {
  console.error("Missing GITHUB_TOKEN");
  process.exit(1);
}
if (!REPOS.length) {
  console.error("Missing REPOS (comma separated)");
  process.exit(1);
}

const outDir = path.resolve("assets/cards");
await fs.mkdir(outDir, { recursive: true });

async function gh(url) {
  const res = await fetch(`https://api.github.com${url}`, {
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "profile-repo-cards"
    }
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${url} failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

function escapeXml(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function truncate(s, max) {
  s = String(s || "");
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + "…";
}

function cardSvg({ repo, description, language, lastCommit }) {
  // Dark theme tuned for GitHub dark mode background.
  const w = 560;
  const h = 155;
  const pad = 18;

  const name = truncate(repo, 42);
  const desc = truncate(description || "", 92);
  const commit = truncate(lastCommit || "", 78);
  const lang = truncate(language || "", 18);

  // Simple gradient accent bar.
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${escapeXml(repo)} card">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7C3AED"/>
      <stop offset="50%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#22C55E"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>

  <rect x="0" y="0" width="${w}" height="${h}" rx="16" fill="#0D1117" stroke="#1F2937" filter="url(#shadow)"/>
  <rect x="0" y="0" width="${w}" height="4" rx="16" fill="url(#g)"/>

  <g font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" fill="#E5E7EB">
    <text x="${pad}" y="38" font-size="22" font-weight="700">${escapeXml(name)}</text>

    <text x="${pad}" y="64" font-size="13" fill="#9CA3AF">${escapeXml(desc)}</text>

    <g>
      <text x="${pad}" y="98" font-size="12" fill="#9CA3AF">Last commit</text>
      <text x="${pad}" y="118" font-size="14" font-weight="600">${escapeXml(commit || "No commits found")}</text>
    </g>

    <g>
      <rect x="${pad}" y="128" width="${Math.max(70, 10 + lang.length * 7)}" height="18" rx="9" fill="#111827" stroke="#1F2937"/>
      <text x="${pad + 10}" y="141" font-size="12" fill="#D1D5DB">${escapeXml(lang || "Unknown")}</text>
    </g>

    <g>
      <text x="${w - pad}" y="141" font-size="12" fill="#6B7280" text-anchor="end">github.com/${escapeXml(OWNER)}/${escapeXml(repo)}</text>
    </g>
  </g>
</svg>`;
}

for (const repo of REPOS) {
  const r = await gh(`/repos/${OWNER}/${repo}`);
  const commits = await gh(`/repos/${OWNER}/${repo}/commits?per_page=1`);
  const lastCommit = commits?.[0]?.commit?.message ? commits[0].commit.message.split("\n")[0] : "";
  const svg = cardSvg({
    repo,
    description: r.description || "",
    language: r.language || r?.primary_language || "",
    lastCommit,
  });

  const file = path.join(outDir, `${repo}.svg`);
  await fs.writeFile(file, svg, "utf8");
  console.log(`wrote ${file}`);
}
