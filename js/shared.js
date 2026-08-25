/* ==========================================================================
   on2cook — shared helpers
   Single JSON file (data/case-studies.json) drives both index.html and
   case-study.html. Swap that file for a Google Sheet–synced one (see
   scripts/sheet_to_json.py + .github/workflows/sync-sheet.yml) and both
   pages update automatically — no HTML edits required.
   ========================================================================== */

const DATA_URL = "data/case-studies.json";
const SHEET_CONFIG_URL = "data/sheet-config.json";

/**
 * Load the case studies dataset. Tries, in order:
 *   1. Live fetch straight from the published Google Sheet CSVs, if
 *      data/sheet-config.json has both URLs filled in — this is what
 *      makes editing the sheet show up immediately on refresh.
 *   2. The local data/case-studies.json fallback (kept fresh by the
 *      GitHub Action, or hand-edited) if live mode isn't configured,
 *      or if the live fetch fails for any reason (offline, sheet made
 *      private, network hiccup, etc.) — the site never goes down over
 *      this, it just quietly serves the last known-good copy.
 */
async function loadCaseStudyData() {
  try {
    const configRes = await fetch(SHEET_CONFIG_URL, { cache: "no-store" });
    if (configRes.ok) {
      const config = await configRes.json();
      if (config.caseStudiesCsvUrl && config.settingsCsvUrl) {
        try {
          return await loadFromGoogleSheets(config.caseStudiesCsvUrl, config.settingsCsvUrl);
        } catch (liveErr) {
          console.warn("Live Google Sheet fetch failed, falling back to data/case-studies.json:", liveErr);
        }
      }
    }
  } catch (configErr) {
    // sheet-config.json missing/unreadable — fall through to static JSON.
  }

  const res = await fetch(DATA_URL, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}: ${res.status}`);
  return res.json();
}

async function loadFromGoogleSheets(caseStudiesCsvUrl, settingsCsvUrl) {
  const bust = `${caseStudiesCsvUrl.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const bust2 = `${settingsCsvUrl.includes("?") ? "&" : "?"}_=${Date.now()}`;
  const [caseRes, settingsRes] = await Promise.all([
    fetch(caseStudiesCsvUrl + bust, { cache: "no-store" }),
    fetch(settingsCsvUrl + bust2, { cache: "no-store" }),
  ]);
  if (!caseRes.ok) throw new Error(`Case studies sheet fetch failed: ${caseRes.status}`);
  if (!settingsRes.ok) throw new Error(`Settings sheet fetch failed: ${settingsRes.status}`);

  const [caseRows, settingsRows] = await Promise.all([
    caseRes.text().then(parseCSV),
    settingsRes.text().then(parseCSV),
  ]);

  const caseStudies = caseRows
    .filter((row) => (row.slug || "").trim())
    .map(sheetRowToCaseStudy);

  const meta = settingsRowsToMeta(settingsRows);

  return { meta, caseStudies };
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, embedded
 *  commas/newlines, and "" as an escaped quote. Returns an array of
 *  row objects keyed by the header row. Good enough for a Google
 *  Sheets CSV export, which is exactly what this is fed. */
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      pushField();
    } else if (c === "\n") {
      pushField(); pushRow();
    } else if (c === "\r") {
      // skip; \n (handled above) or end-of-text follows
    } else {
      field += c;
    }
  }
  if (field.length || row.length) { pushField(); pushRow(); }

  const rows2 = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (!rows2.length) return [];
  const headers = rows2[0].map((h) => h.trim());
  return rows2.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

/** True if a sheet cell means "skip" (blank or an explicit skip keyword). */
function sheetIsBlank(val) {
  const v = (val || "").trim().toLowerCase();
  return v === "" || v === "none" || v === "n/a" || v === "skip";
}
function splitPoints(raw) {
  return (raw || "").split("|").map((s) => s.trim()).filter(Boolean);
}

/** Mirrors scripts/sheet_to_json.py's row_to_case_study() — keep the two
 *  in sync if you ever add a column. */
function sheetRowToCaseStudy(row) {
  const g = (key, def = "") => (row[key] || "").trim() || def;
  const stats = [];
  for (let i = 1; i <= 4; i++) {
    const value = g(`stat${i}_value`);
    const label = g(`stat${i}_label`);
    if (value || label) stats.push({ value, label });
  }
  return {
    slug: g("slug"),
    category: g("category"),
    imageSide: g("imageSide", "right"),
    title: g("title"),
    cardTitlePlain: g("cardTitlePlain"),
    cardTitleHighlight: g("cardTitleHighlight"),
    cardExcerpt: g("cardExcerpt"),
    cardImage: g("cardImage"),
    heroImage: g("heroImage"),
    snapshot: {
      description: g("snapshot_description"),
      facts: [
        { label: "Industry", value: g("snapshot_industry") },
        { label: "Locations", value: g("snapshot_locations") },
        { label: "Founded", value: g("snapshot_founded") },
        { label: "Region", value: g("snapshot_region") },
      ],
    },
    challenge: {
      title: g("challenge_title"),
      description: g("challenge_description"),
      points: splitPoints(g("challenge_points")),
    },
    solution: {
      title: g("solution_title", "Switching to"),
      titleHighlight: g("solution_titleHighlight", "on2cook"),
      description: g("solution_description"),
      points: splitPoints(g("solution_points")),
      image: g("solution_image"),
    },
    impact: { stats },
    results: {
      title: g("results_title", "The Results"),
      description: g("results_description"),
      points: splitPoints(g("results_points")),
      image: g("results_image"),
    },
    quote: { text: g("quote_text"), author: g("quote_author") },
  };
}

/** Mirrors scripts/sheet_to_json.py's settings_rows_to_meta() — a
 *  key/value "Site Settings" tab, merged over sensible defaults so a
 *  half-filled-in sheet never breaks the page. */
function settingsRowsToMeta(rows) {
  const get = (key) => {
    const hit = rows.find((r) => (r.key || "").trim() === key);
    return hit ? (hit.value || "").trim() : "";
  };
  const orDefault = (key, def) => { const v = get(key); return v || def; };

  const meta = {
    pageTitle: orDefault("page_title", "Case studies"),
    pageTitleHighlight: orDefault("page_title_highlight", "studies"),
    pageSubtitle: orDefault("page_subtitle", "Real kitchens. Real results. See how businesses are transforming their operations and growing with {brand}."),
    brand: orDefault("brand", "on2cook"),
    ctaBand: {
      titlePlain: orDefault("cta_title_plain", "Ready to write your"),
      titleItalic: orDefault("cta_title_italic", "success story?"),
      subtitle: orDefault("cta_subtitle", "Join 1000+ businesses transforming their kitchens with on2cook."),
      buttonText: orDefault("cta_button_text", "Book a Demo"),
      buttonUrl: orDefault("cta_button_url", "https://on2cook.com/#book_a_demo"),
    },
    siteUrl: get("site_url"),
    tagline: orDefault("tagline", "Intelligent cooking solutions for modern kitchens."),
    contact: {
      email: get("contact_email"),
      phone: get("contact_phone"),
      location: get("contact_location"),
    },
    socialLinks: [],
    privacyUrl: get("privacy_url"),
    termsUrl: get("terms_url"),
  };

  const platforms = ["facebook", "instagram", "linkedin", "youtube", "twitter"];
  platforms.forEach((p) => {
    const url = get(`social_${p}_url`);
    if (url) meta.socialLinks.push({ platform: p, url });
  });

  return meta;
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
        <a class="btn btn--white" href="${escapeAttr(c.buttonUrl || "https://on2cook.com/#book_a_demo")}">
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

/** Turns safe **bold** markers into <strong>, e.g. "World's **FASTEST**
 *  Cooking Device" — the text is HTML-escaped first, so this can't be
 *  used to inject markup, only to bold a word from the sheet. */
function boldMarkup(str) {
  return escapeHtml(str).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/**
 * Populate the nav and footer from meta so nothing on the page points nowhere:
 * - a nav "visit site" link only appears if meta.siteUrl is set
 * - the "Book a Demo" buttons all point at meta.ctaBand.buttonUrl
 * - footer contact list only shows fields that have a value
 * - social icons only render for platforms actually listed in meta.socialLinks
 * - Privacy/Terms links only appear if meta.privacyUrl / meta.termsUrl are set
 */
function renderChrome(meta) {
  const demoUrl = (meta.ctaBand && meta.ctaBand.buttonUrl) || "https://on2cook.com/#book_a_demo";
  document.querySelectorAll("[data-demo-cta]").forEach((el) => { el.href = demoUrl; });

  const siteLinkSlot = document.getElementById("navSiteLink");
  if (siteLinkSlot) {
    if (meta.siteUrl) {
      siteLinkSlot.innerHTML = `<a href="${escapeAttr(meta.siteUrl)}" target="_blank" rel="noopener">on2cook.com</a>`;
    } else {
      siteLinkSlot.remove();
    }
  }

  const tagline = document.getElementById("footerTagline");
  if (tagline && meta.tagline) tagline.innerHTML = boldMarkup(meta.tagline);

  const contactSlot = document.getElementById("footerContact");
  if (contactSlot) {
    const c = meta.contact || {};
    const rows = [];
    if (c.email) rows.push(`<li><a href="mailto:${escapeAttr(c.email)}">${escapeHtml(c.email)}</a></li>`);
    if (c.phone) rows.push(`<li><a href="tel:${escapeAttr(c.phone.replace(/\s+/g, ""))}">${escapeHtml(c.phone)}</a></li>`);
    if (c.location) rows.push(`<li>${escapeHtml(c.location)}</li>`);
    contactSlot.innerHTML = rows.join("");
    if (!rows.length) contactSlot.remove();
  }

  const socialSlot = document.getElementById("footerSocial");
  if (socialSlot) {
    const links = (meta.socialLinks || []).filter((s) => s.url && SOCIAL_ICONS[(s.platform || "").toLowerCase()]);
    if (links.length) {
      socialSlot.innerHTML = links.map((s) => {
        const key = s.platform.toLowerCase();
        return `<a class="footer-social-btn" href="${escapeAttr(s.url)}" aria-label="${escapeAttr(s.platform)}" target="_blank" rel="noopener">${SOCIAL_ICONS[key]}</a>`;
      }).join("");
    } else {
      socialSlot.closest(".footer-col")?.remove();
    }
  }

  const legalSlot = document.getElementById("footerLegalLinks");
  if (legalSlot) {
    const parts = [];
    if (meta.privacyUrl) parts.push(`<a href="${escapeAttr(meta.privacyUrl)}" target="_blank" rel="noopener">Privacy Policy</a>`);
    if (meta.termsUrl) parts.push(`<a href="${escapeAttr(meta.termsUrl)}" target="_blank" rel="noopener">Terms and Conditions</a>`);
    legalSlot.innerHTML = parts.join("<span>|</span>");
    if (!parts.length) legalSlot.remove();
  }
}
