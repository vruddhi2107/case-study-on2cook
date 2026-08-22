# on2cook — Case Studies

A two-page, JSON-driven case study section for on2cook:

- **`index.html`** — the case studies listing page (hero + alternating cards), matching your reference screenshot.
- **`case-study.html`** — one detail-page template (matching the Haldiram PDF layout) that renders **any** case study based on `?slug=...` in the URL.

Both pages read from **`data/case-studies.json`**. Add a new case study to that file (or to the connected Google Sheet — see below) and it appears on the listing page and gets its own detail page automatically. No HTML editing required, ever.

Brand tokens are locked to your palette only: `--red: #ff0000`, `--black: #000000`, `--white: #ffffff` (see `css/style.css` `:root`). Headings use **Montserrat**, body copy uses **DIN Next**, both self-hosted from `assets/fonts/`.

---

## 1. Preview it locally

Browsers block `fetch()` on `file://` pages, so serve the folder instead of double-clicking `index.html`:

```bash
cd on2cook-case-studies
python3 -m http.server 8080
# open http://localhost:8080
```

Or, if you use VS Code, the "Live Server" extension works too.

---

## 2. How the data is structured

Open `data/case-studies.json`. It has two top-level keys:

- **`meta`** — page hero title/subtitle, the bottom CTA band, and site chrome (nav/footer). Rarely changes; also stored separately in `data/meta.json` so the sheet-sync script can re-merge it. Notably:
  - `ctaBand.buttonUrl` — every "Book a Demo" button on the site (nav, footer CTA band) points here. Update this one field once your booking link/form is ready.
  - `siteUrl` — leave blank and the nav shows nothing extra; set it (e.g. `"https://www.on2cook.com"`) and a real "on2cook.com" link appears in the nav.
  - `contact` — `email` / `phone` / `location`; the footer only shows the ones you fill in.
  - `socialLinks` — an array like `[{"platform": "instagram", "url": "https://instagram.com/on2cook"}]`. Leave it as `[]` and no social icons render at all — there's nothing worse than a row of icons that don't go anywhere. Supported `platform` values: `facebook`, `instagram`, `linkedin`, `youtube`, `twitter`.
- **`caseStudies`** — an array, one object per case study. Key fields:

| Field | Used for |
|---|---|
| `slug` | URL: `case-study.html?slug=haldiram` — must be unique, URL-safe |
| `category` | Badge shown on card + detail hero (e.g. "Cafe", "QSR") |
| `imageSide` | `"left"` or `"right"` — which side the photo sits on in the listing card (alternates naturally if you set them manually) |
| `cardTitlePlain` / `cardTitleHighlight` | Two-part card headline, second part rendered in red |
| `cardExcerpt` | Card description |
| `cardImage` / `heroImage` | Photo URLs. **Leave blank** and a branded placeholder block renders instead — handy before real photography is ready |
| `snapshot` | "Client Snapshot" block: description + 4 facts (Industry / Locations / Founded / Region) |
| `challenge` | Title, description, red ✕ bullet list |
| `solution` | Title (+ highlighted word), description, green ✓ bullet list, image |
| `impact.stats` | Up to 4 big stat tiles (value + label) |
| `results` | Title, description, ✓ bullet list, image |
| `quote` | Optional pull-quote; the whole section is skipped automatically if `quote.text` is empty |

Just duplicate one of the existing objects in the array, change the values, give it a new unique `slug`, and it's live.

---

## 3. Dropping in your logo

Nav and footer both look for a real logo file first and only fall back to the styled text wordmark ("on2**cook**") if one isn't found. To use your own mark:

1. Export your logo (ideally SVG; PNG works too — use a transparent background, roughly 120–200px tall).
2. Save it as **`assets/images/logo.svg`** (or `logo.png`).
3. Refresh — it now shows in the nav and footer automatically, at every size. No code edits required.

If neither file exists, the page quietly shows the text wordmark instead, so the site never breaks or shows a broken-image icon.

---

## 4. Skipping a section or an image for a specific case study

Not every case study will have every section filled in, or a photo for every slot. Two conventions handle that, whether you're editing the Google Sheet or `data/case-studies.json` directly:

**To skip an entire section** (Client Snapshot, Challenge, Solution, Impact, Results, or the pull-quote) — leave *every* field belonging to that section blank. For example, to skip "The Impact" stat tiles for a case study, leave `stat1_value` through `stat4_label` empty in that row. The section header, spacing, and everything else for it disappears — the page just flows from the section before it straight to the one after.

**To skip a single image** without hiding the whole section — type **`none`** (or `skip`) into that image cell (`cardImage`, `heroImage`, `solution_image`, or `results_image`), instead of leaving it blank. This matters because *leaving an image cell blank* still shows a placeholder block (a deliberate visual cue that a photo is expected there but hasn't been added yet) — while typing `none` tells the page "there is intentionally no photo here," and that section's text simply runs full-width with no image column at all. Use whichever fits: blank while you're still sourcing the photo, `none` if that case study just won't have one.

| You want... | What to put in the cell |
|---|---|
| A real photo | Paste the image URL |
| "Photo coming later" placeholder | Leave blank |
| No image, ever, full-width text instead | Type `none` |
| Skip the whole section | Leave every field for that section blank |

---

## 5. Automating it from Google Sheets (optional, recommended)

Instead of hand-editing JSON, your team can fill in a spreadsheet and have GitHub Actions pull it in automatically.

### Step A — Create the sheet

Create a Google Sheet with **one row per case study** and these exact column headers in row 1:

```
slug, category, imageSide, title,
cardTitlePlain, cardTitleHighlight, cardExcerpt, cardImage, heroImage,
snapshot_description, snapshot_industry, snapshot_locations, snapshot_founded, snapshot_region,
challenge_title, challenge_description, challenge_points,
solution_title, solution_titleHighlight, solution_description, solution_points, solution_image,
stat1_value, stat1_label, stat2_value, stat2_label, stat3_value, stat3_label, stat4_value, stat4_label,
results_title, results_description, results_points, results_image,
quote_text, quote_author
```

- **`imageSide`**: type `left` or `right`.
- **List fields** (`challenge_points`, `solution_points`, `results_points`): separate bullets with a pipe `|`, e.g. `Faster prep|Less food waste|Higher throughput`.
- **`cardImage` / `heroImage` / `solution_image` / `results_image`**: paste a public image URL (e.g. an image hosted on your CDN, Google Drive "anyone with the link" direct link, or Unsplash). Leave blank for an automatic placeholder.
- Leave `slug` blank on a row to have it skipped (handy for draft rows).

### Step B — Publish the sheet as CSV

In Google Sheets: **File → Share → Publish to web** → choose the case-studies tab → format **Comma-separated values (.csv)** → **Publish**. Copy the link it gives you — it looks like:

```
https://docs.google.com/spreadsheets/d/e/2PACX-XXXXXXXX/pub?gid=0&single=true&output=csv
```

This link stays "live" — it always reflects the sheet's current contents.

### Step C — Wire it into GitHub

1. Push this project to a GitHub repo.
2. In the repo: **Settings → Secrets and variables → Actions → New repository secret**.
   - Name: `SHEET_CSV_URL`
   - Value: the publish link from Step B.
3. That's it. `.github/workflows/sync-sheet.yml` runs every 6 hours (and on demand via the **Actions** tab → "Run workflow"), regenerates `data/case-studies.json` from the sheet, and commits it back to the repo if anything changed. If you host the site on GitHub Pages / Vercel / Netlify pointed at this repo, the update ships automatically on the next deploy.

You can change the schedule by editing the `cron` line in that workflow file.

### Running the sync manually (no GitHub needed)

```bash
export SHEET_CSV_URL="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
python3 scripts/sheet_to_json.py
```

This overwrites `data/case-studies.json` with fresh data from the sheet, merged with `data/meta.json`.

---

## 6. Project structure

```
on2cook-case-studies/
├── index.html                  # listing page
├── case-study.html             # detail page template (?slug=...)
├── css/style.css                # all styling — brand tokens at the top
├── js/
│   ├── shared.js                 # fetch + render helpers used by both pages
│   ├── main.js                   # listing page logic
│   └── detail.js                 # detail page logic
├── data/
│   ├── case-studies.json        # LIVE DATA — edit directly or via sheet sync
│   └── meta.json                # hero/CTA copy, merged back in by the sync script
├── assets/fonts/                # Montserrat + DIN Next, self-hosted
├── scripts/sheet_to_json.py     # Google Sheet CSV → data/case-studies.json
└── .github/workflows/sync-sheet.yml   # scheduled + manual sync job
```

---

## 7. Notes

- Fonts are self-hosted (no Google Fonts CDN call) from the files you supplied, so the page keeps working offline and never substitutes a fallback font.
- Colors are restricted to the three brand values everywhere — greys you see are just black at reduced opacity, not new colors.
- Detail-page section direction (challenge/solution/results) mirrors the `imageSide` used on that case study's listing card, so clicking through feels visually connected.
- Add as many case studies as you like — the listing page and pagination ("Previous / Next" at the bottom of each detail page) update automatically.
- Nothing on the page links to nowhere: the old placeholder nav dropdowns (Solutions/Industries/Resources/About us) and the footer's Solutions/Resources/Company columns were removed since they didn't lead anywhere in this project. The footer's social icons only render for platforms you actually list in `meta.socialLinks`, and the nav's secondary link only appears once `meta.siteUrl` is set — see section 2 above.
#   c a s e - s t u d y - o n 2 c o o k  
 #   c a s e - s t u d y - o n 2 c o o k  
 