/**
 * Accessibility audit — axe-core driven, per role, at three viewports.
 *
 * Runs real WCAG 2.0/2.1/2.2 A + AA rule sets against the running app and
 * reports violations. Logs in through the UI so the stored auth shape is always
 * whatever the app itself writes.
 *
 * Prereqs: frontend on :3007, backend on :8021, public/axe.min.js served.
 *   node scripts/a11y-audit.js
 */
const fs = require("fs");
const path = require("path");

// puppeteer and axe-core are devDependencies of the frontend package, so resolve
// them from there rather than from this script's own directory.
const FE_MODULES = path.join(__dirname, "..", "edusmartai-frontend", "node_modules");
const puppeteer = require(path.join(FE_MODULES, "puppeteer"));

const BASE = process.env.A11Y_BASE || "http://127.0.0.1:3007";
const AXE = path.join(FE_MODULES, "axe-core", "axe.min.js");
const AXE_SRC = fs.readFileSync(AXE, "utf8");

const VIEWPORTS = [
  { name: "360", width: 360, height: 760 },
  { name: "768", width: 768, height: 1024 },
  { name: "1440", width: 1440, height: 900 },
];

const ACCOUNTS = {
  admin: { email: "admin@edu.com", password: "admin123" },
  lecturer: { email: "dr.salem@edu.com", password: "lecturer123" },
  student: { email: "ahmed@edu.com", password: "student123" },
};

// Representative page per role (plus the unauthenticated login screen).
const TARGETS = [
  { label: "Login", role: null, url: "/login" },
  { label: "Admin dashboard", role: "admin", url: "/admin" },
  { label: "Admin students", role: "admin", url: "/admin/students" },
  { label: "Lecturer dashboard", role: "lecturer", url: "/lecturer" },
  { label: "Student dashboard", role: "student", url: "/student" },
  { label: "Student quiz", role: "student", url: "/student/quizzes/1" },
];

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(page, role) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.removeItem("edusmart_auth"));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  const { email, password } = ACCOUNTS[role];
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.all([
    page.click('button[type="submit"]'),
    sleep(3500),
  ]);
}

async function audit(page) {
  await page.evaluate(AXE_SRC);
  return page.evaluate(async (tags) => {
    const res = await window.axe.run(document, { runOnly: { type: "tag", values: tags } });
    return res.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      nodes: v.nodes.length,
      help: v.help,
      target: (v.nodes[0] && v.nodes[0].target && v.nodes[0].target[0]) || "",
    }));
  }, WCAG_TAGS);
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const summary = [];
  let total = 0;

  for (const target of TARGETS) {
    const page = await browser.newPage();
    try {
      if (target.role) await login(page, target.role);

      for (const vp of VIEWPORTS) {
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(BASE + target.url, { waitUntil: "networkidle2" });
        await sleep(1200);

        let violations = [];
        try {
          violations = await audit(page);
        } catch (e) {
          violations = [{ id: "AUDIT_ERROR", impact: "n/a", nodes: 0, help: String(e.message).slice(0, 90), target: "" }];
        }

        total += violations.reduce((s, v) => s + v.nodes, 0);
        summary.push({ page: target.label, vp: vp.name, violations });
        const head = `${target.label} @${vp.name}`.padEnd(34);
        if (!violations.length) {
          console.log(`${head} OK  (0 violations)`);
        } else {
          console.log(`${head} ${violations.length} rule(s):`);
          violations.forEach((v) =>
            console.log(`    - [${v.impact}] ${v.id} x${v.nodes} :: ${v.help}\n        ${v.target}`)
          );
        }
      }
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Aggregate by rule so fixes can be prioritised.
  const byRule = {};
  summary.forEach((s) =>
    s.violations.forEach((v) => {
      byRule[v.id] = byRule[v.id] || { impact: v.impact, nodes: 0, help: v.help };
      byRule[v.id].nodes += v.nodes;
    })
  );
  console.log("\n=== AGGREGATE BY RULE ===");
  const rules = Object.entries(byRule).sort((a, b) => b[1].nodes - a[1].nodes);
  if (!rules.length) console.log("no violations");
  rules.forEach(([id, r]) => console.log(`  [${r.impact}] ${id}: ${r.nodes} node(s) — ${r.help}`));
  console.log(`\nTOTAL violating nodes: ${total}`);
})();
