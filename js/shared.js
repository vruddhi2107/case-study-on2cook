/* ==========================================================================
   on2cook — shared helpers
   Single JSON file (data/case-studies.json) drives both index.html and
   case-study.html. Swap that file for a Google Sheet–synced one (see
   scripts/sheet_to_json.py + .github/workflows/sync-sheet.yml) and both
   pages update automatically — no HTML edits required.
   ========================================================================== */

const DATA_URL = "data/case-studies.json";

/** Fetch + cache the case studies dataset for this page load. */
async function loadCaseStudyData() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  return res.json();
}

/** True if a sheet cell is meaningfully empty (blank, or the "skip" keywords). */
function isBlank(val) {
  if (val === null || val === undefined) return true;
  const v = String(val).trim().toLowerCase();
  return v === "" || v === "none" || v === "n/a" || v === "skip";
}

/** True if any of the given string values has real content. Used to decide
 *  whether a whole section should render at all — leave every field for a
 *  section blank in the sheet/JSON and that section is omitted entirely. */
function hasAny(...vals) {
  return vals.some((v) => {
    if (Array.isArray(v)) return v.length > 0;
    return !isBlank(v);
  });
}

/** Build the inner HTML for an image slot: real <img> if a URL is set,
 *  a branded placeholder if left blank, or null if explicitly skipped
 *  ("none" / "skip" in the sheet) — callers use null to drop the media
 *  column and let the text run full width instead. */
function mediaMarkup(url, alt, label) {
  const v = (url || "").trim();
  if (v.toLowerCase() === "none" || v.toLowerCase() === "skip") return null;
  if (v) {
    return `<img src="${escapeAttr(v)}" alt="${escapeAttr(alt || "")}" loading="lazy">`;
  }
  return `
    <div class="ph">
      <span class="ph__label">${escapeHtml(label || "Add image")}</span>
    </div>`;
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

function iconCheck() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12.5L9.5 17L19 7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}
function iconCross() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>`;
}
function iconArrow() {
  return `<svg viewBox="0 0 24 24" fill="none"><path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Fade + rise elements into view as the user scrolls. */
function initScrollReveal(selector = ".reveal, .card") {
  const els = document.querySelectorAll(selector);
  if (!("IntersectionObserver" in window) || !els.length) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: "0px 0px 150px 0px" }
  );
  els.forEach((el) => io.observe(el));

  // Safety net: if something is still hidden a couple of seconds after
  // load (slow layout, an observer that never fired, JS disabled on
  // revisit, etc.) just show it — the animation is a nicety, not a gate.
  window.setTimeout(() => {
    document.querySelectorAll(`${selector}`).forEach((el) => el.classList.add("is-visible"));
  }, 2500);
}

/** Render the shared CTA band using meta.ctaBand from the JSON. */
function renderCtaBand(meta) {
  const c = meta.ctaBand || {};
  return `
    <section class="cta-band">
      <div class="cta-band__inner">
        <h2>${escapeHtml(c.titlePlain || "Ready to write your")} <i>${escapeHtml(c.titleItalic || "success story?")}</i></h2>
        <p>${escapeHtml(c.subtitle || "")}</p>
        <a class="btn btn--white" href="${escapeAttr(c.buttonUrl || "#")}">
          ${escapeHtml(c.buttonText || "Book a Demo")} ${iconArrow()}
        </a>
      </div>
    </section>`;
}

/* Logo drop-in fallback (tries logo.svg -> logo.png -> text wordmark) lives
   as an inline <script> in each page's <head> — see index.html /
   case-study.html — not here, because the browser can fire the <img>'s
   onerror before this file finishes loading. Keep both copies in sync if
   you ever change the fallback behaviour. */

function setYear() {
  const el = document.getElementById("year");
  if (el) el.textContent = new Date().getFullYear();
}

/* ---- Social icon paths, keyed by lowercase platform name ---- */
const SOCIAL_ICONS = {
  facebook: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H9v3h2v7h3v-7h3l1-3h-4v-2c0-.6.4-1 1-1z"/></svg>`,
  instagram: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95C20.9 8.75 21 11.6 21 14.4V21h-4v-5.9c0-1.4-.03-3.2-1.95-3.2-1.95 0-2.25 1.5-2.25 3.1V21H9z"/></svg>`,
  youtube: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12s0-3.2-.4-4.6c-.24-.85-.9-1.5-1.75-1.74C18.4 5.3 12 5.3 12 5.3s-6.4 0-7.85.36c-.85.24-1.5.9-1.75 1.74C2 8.8 2 12 2 12s0 3.2.4 4.6c.25.85.9 1.5 1.75 1.74C5.6 18.7 12 18.7 12 18.7s6.4 0 7.85-.36c.85-.24 1.5-.9 1.75-1.74.4-1.4.4-4.6.4-4.6zM10 15V9l5.2 3z"/></svg>`,
  twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 5.9c-.7.3-1.4.5-2.2.6.8-.5 1.4-1.2 1.6-2.2-.7.4-1.6.8-2.4.9A3.7 3.7 0 0010.3 8.3a10.6 10.6 0 01-7.7-3.9 3.7 3.7 0 001.1 4.9c-.6 0-1.2-.2-1.7-.4v.1c0 1.8 1.3 3.3 3 3.7-.5.1-1.1.2-1.6.1.5 1.5 1.9 2.6 3.6 2.6A7.4 7.4 0 012 17.4a10.5 10.5 0 005.7 1.7c6.8 0 10.6-5.8 10.6-10.8v-.5c.7-.5 1.3-1.2 1.8-1.9z"/></svg>`,
};

/**
 * Populate the nav and footer from meta so nothing on the page points nowhere:
 * - a nav "visit site" link only appears if meta.siteUrl is set
 * - the "Book a Demo" buttons all point at meta.ctaBand.buttonUrl
 * - footer contact list only shows fields that have a value
 * - social icons only render for platforms actually listed in meta.socialLinks
 */
function renderChrome(meta) {
  const demoUrl = (meta.ctaBand && meta.ctaBand.buttonUrl) || "#";
  document.querySelectorAll("[data-demo-cta]").forEach((el) => { el.href = demoUrl; });

  const siteLinkSlot = document.getElementById("navSiteLink");
  if (siteLinkSlot) {
    if (meta.siteUrl) {
      siteLinkSlot.innerHTML = `<a href="${escapeAttr(meta.siteUrl)}">on2cook.com</a>`;
    } else {
      siteLinkSlot.remove();
    }
  }

  const tagline = document.getElementById("footerTagline");
  if (tagline && meta.tagline) tagline.textContent = meta.tagline;

  const contactSlot = document.getElementById("footerContact");
  if (contactSlot) {
    const c = meta.contact || {};
    const rows = [];
    if (c.email) rows.push(`<li><a href="mailto:${escapeAttr(c.email)}">${escapeHtml(c.email)}</a></li>`);
    if (c.phone) rows.push(`<li><a href="tel:${escapeAttr(c.phone.replace(/\s+/g, ""))}">${escapeHtml(c.phone)}</a></li>`);
    if (c.location) rows.push(`<li>${escapeHtml(c.location)}</li>`);
    contactSlot.innerHTML = rows.join("");
    if (!rows.length) contactSlot.closest(".footer__col")?.remove();
  }

  const socialSlot = document.getElementById("footerSocial");
  if (socialSlot) {
    const links = (meta.socialLinks || []).filter((s) => s.url && SOCIAL_ICONS[(s.platform || "").toLowerCase()]);
    if (links.length) {
      socialSlot.innerHTML = links.map((s) => {
        const key = s.platform.toLowerCase();
        return `<a href="${escapeAttr(s.url)}" aria-label="${escapeAttr(s.platform)}" target="_blank" rel="noopener">${SOCIAL_ICONS[key]}</a>`;
      }).join("");
    } else {
      socialSlot.remove();
    }
  }
}
