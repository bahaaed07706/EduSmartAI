/**
 * Responsive readiness audit.
 *
 * Checks the conditions that actually break a layout, measured in the page
 * rather than eyeballed from a screenshot:
 *
 *  - page-level horizontal overflow (scrollWidth > viewport)
 *  - individual elements protruding past the viewport, naming the culprit
 *  - touch targets below 24x24 CSS px (WCAG 2.2 SC 2.5.8, AA)
 *  - text clipped by a fixed height
 *  - whether mobile navigation is reachable below the md breakpoint
 *  - console and failed-network errors collected per page
 *
 * Credentials come from the environment. See scripts/.env.a11y.example.
 *
 *   node scripts/responsive-audit.js
 *   node scripts/responsive-audit.js --shots      # also write screenshots
 */
const fs = require("fs");
const path = require("path");

const FE_MODULES = path.join(__dirname, "..", "edusmartai-frontend", "node_modules");
const puppeteer = require(path.join(FE_MODULES, "puppeteer"));

const BASE = process.env.A11Y_BASE || "http://127.0.0.1:3007";
const SHOOT = process.argv.includes("--shots");
const SHOT_DIR = path.join(__dirname, "..", "docs", "screenshots");

const ACCOUNTS = {
  admin: { email: process.env.A11Y_ADMIN_EMAIL, password: process.env.A11Y_ADMIN_PASSWORD },
  lecturer: { email: process.env.A11Y_LECTURER_EMAIL, password: process.env.A11Y_LECTURER_PASSWORD },
  student: { email: process.env.A11Y_STUDENT_EMAIL, password: process.env.A11Y_STUDENT_PASSWORD },
};

const VIEWPORTS = [
  { name: "360", width: 360, height: 760, mobile: true },
  { name: "390", width: 390, height: 844, mobile: true },
  { name: "768", width: 768, height: 1024, mobile: false },
  { name: "1024", width: 1024, height: 768, mobile: false },
  { name: "1440", width: 1440, height: 900, mobile: false },
];

const TARGETS = [
  { label: "Login", role: null, url: "/login", shot: "mobile" },
  { label: "Admin dashboard", role: "admin", url: "/admin", shot: "all" },
  { label: "Admin students", role: "admin", url: "/admin/students", shot: "none" },
  { label: "Admin courses", role: "admin", url: "/admin/courses", shot: "none" },
  { label: "Lecturer dashboard", role: "lecturer", url: "/lecturer", shot: "all" },
  { label: "Lecturer courses", role: "lecturer", url: "/lecturer/courses", shot: "none" },
  { label: "Student dashboard", role: "student", url: "/student", shot: "all" },
  { label: "Student courses", role: "student", url: "/student/courses", shot: "none" },
  { label: "Student profile", role: "student", url: "/student/profile", shot: "none" },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function assertCredentials(roles) {
  const missing = [];
  for (const role of roles) {
    const k = role.toUpperCase();
    if (!ACCOUNTS[role] || !ACCOUNTS[role].email) missing.push(`A11Y_${k}_EMAIL`);
    if (!ACCOUNTS[role] || !ACCOUNTS[role].password) missing.push(`A11Y_${k}_PASSWORD`);
  }
  if (missing.length) {
    console.error("Missing environment variables:\n  " + missing.join("\n  "));
    console.error("\nSee scripts/.env.a11y.example.");
    process.exit(1);
  }
}

async function login(page, role) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.evaluate(() => localStorage.removeItem("edusmart_auth"));
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type('input[type="email"]', ACCOUNTS[role].email);
  await page.type('input[type="password"]', ACCOUNTS[role].password);
  await page.click('button[type="submit"]');
  await sleep(3500);
}

/** Everything measured inside the page, in one pass. */
const probe = (viewportWidth, isMobile, expectNav) =>
  // eslint-disable-next-line no-undef
  ((vw, mobile, wantNav) => {
    const describe = (el) => {
      const id = el.id ? `#${el.id}` : "";
      const cls =
        typeof el.className === "string" && el.className
          ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
          : "";
      return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 90);
    };

    const doc = document.documentElement;
    const pageOverflow = Math.max(0, doc.scrollWidth - vw);

    // Elements sticking out past the right edge. Ignore anything inside a
    // deliberate horizontal scroller — that is a supported pattern for tables.
    const protruding = [];
    for (const el of document.querySelectorAll("body *")) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right <= vw + 1) continue;

      let scrollableAncestor = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        const ps = getComputedStyle(p);
        if (ps.overflowX === "auto" || ps.overflowX === "scroll") {
          scrollableAncestor = true;
          break;
        }
      }
      if (scrollableAncestor) continue;
      if (style.position === "fixed") continue;

      protruding.push({ el: describe(el), overflow: Math.round(r.right - vw) });
      if (protruding.length >= 6) break;
    }

    // WCAG 2.2 SC 2.5.8 Target Size (Minimum), AA: 24x24 CSS px.
    const smallTargets = [];
    if (mobile) {
      const interactive = document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]'
      );
      for (const el of interactive) {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.width >= 24 && r.height >= 24) continue;
        smallTargets.push({
          el: describe(el),
          size: `${Math.round(r.width)}x${Math.round(r.height)}`,
        });
        if (smallTargets.length >= 6) break;
      }
    }

    // Text cut off by a fixed height (not by an intentional ellipsis).
    const clipped = [];
    for (const el of document.querySelectorAll("p, h1, h2, h3, h4, span, td, th, label, li")) {
      if (!el.textContent || !el.textContent.trim()) continue;
      const style = getComputedStyle(el);
      if (style.overflow === "visible") continue;
      if (style.textOverflow === "ellipsis") continue;
      if (style.overflowY === "auto" || style.overflowY === "scroll") continue;
      if (el.scrollHeight > el.clientHeight + 2 && el.clientHeight > 0) {
        clipped.push({ el: describe(el), hidden: el.scrollHeight - el.clientHeight });
        if (clipped.length >= 5) break;
      }
    }

    // Below md, a visible nav trigger must exist — but only on pages that sit
    // inside the app shell. The login screen has no navigation by design.
    let navReachable = null;
    if (mobile && wantNav) {
      const trigger = document.querySelector('[aria-controls="mobile-nav"]');
      navReachable = !!(trigger && trigger.getBoundingClientRect().width > 0);
    }

    return { pageOverflow, protruding, smallTargets, clipped, navReachable };
  })(viewportWidth, isMobile, expectNav);

(async () => {
  assertCredentials([...new Set(TARGETS.map((t) => t.role).filter(Boolean))]);
  if (SHOOT) fs.mkdirSync(SHOT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: "new", args: ["--no-sandbox"] });
  const rows = [];
  let problems = 0;

  for (const target of TARGETS) {
    const page = await browser.newPage();
    const consoleErrors = [];
    const netErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 120));
    });
    page.on("response", (r) => {
      if (r.status() >= 400) netErrors.push(`${r.status()} ${r.url().split("/").slice(-2).join("/")}`);
    });

    try {
      if (target.role) await login(page, target.role);

      for (const vp of VIEWPORTS) {
        await page.setViewport({
          width: vp.width,
          height: vp.height,
          isMobile: vp.mobile,
          hasTouch: vp.mobile,
        });
        await page.goto(BASE + target.url, { waitUntil: "networkidle2" });
        await sleep(1000);

        // Only authenticated pages render the app shell that holds the nav.
        const r = await page.evaluate(probe, vp.width, vp.mobile, Boolean(target.role));
        const issues = [];
        if (r.pageOverflow > 0) issues.push(`page overflow +${r.pageOverflow}px`);
        r.protruding.forEach((p) => issues.push(`protrudes +${p.overflow}px: ${p.el}`));
        r.smallTargets.forEach((t) => issues.push(`target ${t.size}: ${t.el}`));
        r.clipped.forEach((c) => issues.push(`clipped ${c.hidden}px: ${c.el}`));
        if (r.navReachable === false) issues.push("no reachable mobile nav trigger");

        problems += issues.length;
        rows.push({ page: target.label, vp: vp.name, issues });

        const head = `${target.label} @${vp.name}`.padEnd(32);
        console.log(issues.length ? `${head} ${issues.length} issue(s)` : `${head} OK`);
        issues.forEach((i) => console.log(`    - ${i}`));

        const wantShot =
          SHOOT &&
          ((target.shot === "all" && ["390", "768", "1440"].includes(vp.name)) ||
            (target.shot === "mobile" && vp.name === "390"));
        if (wantShot) {
          const slug = target.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          await page.screenshot({
            path: path.join(SHOT_DIR, `${slug}-${vp.name}.png`),
            fullPage: false,
          });
        }
      }

      if (consoleErrors.length || netErrors.length) {
        console.log(`    ! ${target.label} console=${consoleErrors.length} network=${netErrors.length}`);
        [...new Set(consoleErrors)].slice(0, 3).forEach((e) => console.log(`        console: ${e}`));
        [...new Set(netErrors)].slice(0, 3).forEach((e) => console.log(`        network: ${e}`));
      }
    } finally {
      await page.close();
    }
  }

  await browser.close();

  console.log("\n=== SUMMARY ===");
  const byViewport = {};
  rows.forEach((r) => {
    byViewport[r.vp] = (byViewport[r.vp] || 0) + r.issues.length;
  });
  Object.entries(byViewport).forEach(([vp, n]) => console.log(`  ${vp}px: ${n} issue(s)`));
  console.log(`\nTOTAL: ${problems} issue(s) across ${rows.length} page/viewport combinations`);
  process.exit(problems > 0 ? 1 : 0);
})();
