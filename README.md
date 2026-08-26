# On2Cook Case Studies — Google Sheets setup

The site can run entirely off two Google Sheet tabs — edit a cell, refresh the
page, see the change. No redeploy needed. This doc is the missing "section 5"
that `js/shared.js` and `scripts/sheet_to_json.py` reference in their comments.

## 1. Create the sheet

1. Create a new Google Sheet.
2. Rename **Sheet1** to `Case Studies`. Add a second tab named `Site Settings`.
3. Import the ready-made templates into each tab — they already contain your
   two live case studies (`haldiram`, `tazatable`) and current site settings,
   so the sheet starts out identical to what's on the site today:
   - `example-case-study-sheet.csv` → paste into the **Case Studies** tab
   - `example-site-settings-sheet.csv` → paste into the **Site Settings** tab

   (File → Import → Upload → "Replace current sheet", or just copy/paste
   the CSV contents in — either works.)

## 2. Editing content

**Case Studies tab** — one row per case study. Key columns:

| Column | What it controls |
|---|---|
| `category` | The pill/tag shown on the card and detail hero (e.g. "Cafe", "QSR") |
| `snapshot_industry` | The "Industry" fact in the Client Snapshot block |
| `snapshot_locations` | The "Locations" fact in the Client Snapshot block |
| `cta1_text` / `cta1_url` … `cta4_text` / `cta4_url` | Up to 4 custom CTA buttons on that case study's detail page. Leave all blank to use the default site-wide "Book a Demo" button instead. |

Everything else (challenge/solution/results/quote/stats/images) follows the
same pattern — see the header row for the full column list, and the comment
block at the top of `scripts/sheet_to_json.py` for the exact conventions
(the `|` separator for bullet lists, `none`/`skip` to omit an image, leaving
a whole section blank to hide it entirely, etc.).

**Site Settings tab** — one `key,value` row per setting: hero copy, the
default CTA button, contact info, social links, legal links.

Adding a new case study: add a new row with a unique `slug` — it appears on
the listing page and at `case-study.html?slug=your-slug` automatically.

## 3. Publish each tab as CSV

For **each** tab (Case Studies, then Site Settings):

1. File → Share → **Publish to web**
2. Under "Link", choose the specific tab (not "Entire Document")
3. Choose format **Comma-separated values (.csv)**
4. Click **Publish**, copy the link it gives you

You'll end up with two CSV links.

## 4. Wire the links into the site

Open `data/sheet-config.json` and fill in both URLs:

```json
{
  "caseStudiesCsvUrl": "<Case Studies tab CSV link>",
  "settingsCsvUrl": "<Site Settings tab CSV link>"
}
```

Deploy that one small change once. From then on, the live site fetches
straight from those two CSV links on every page load — editing the sheet is
enough, no further deploys required.

If `sheet-config.json` is left blank (or a fetch fails — sheet made private,
offline, etc.) the site quietly falls back to `data/case-studies.json`
instead, so it never goes down over this.

## 5. Optional: keep `data/case-studies.json` in sync too

`scripts/sheet_to_json.py` regenerates `data/case-studies.json` from the same
two CSV links — useful as a backup/fallback copy, or if you'd rather redeploy
on each edit instead of live-fetching. Run it locally with:

```bash
python3 scripts/sheet_to_json.py "<Case Studies CSV link>" "<Site Settings CSV link>"
```

or wire it into a scheduled GitHub Action using the `SHEET_CSV_URL` /
`SETTINGS_CSV_URL` env vars (see the script's docstring).

## Sharing access

"Publish to web" makes the data readable by anyone with the link (that's
what lets the site fetch it) — it does **not** make the sheet editable by
the public. Share **edit** access with your team the normal way (Share
button, invite by email) separately from the publish-to-web step above.
