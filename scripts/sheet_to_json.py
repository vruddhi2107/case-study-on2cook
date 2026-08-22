#!/usr/bin/env python3
"""
Pull case study rows from a published Google Sheet (CSV export) and rebuild
data/case-studies.json — the single file both index.html and case-study.html
read from.

Usage:
    python3 scripts/sheet_to_json.py

Reads the sheet URL from the SHEET_CSV_URL environment variable (set as a
GitHub Actions secret / repo variable — see .github/workflows/sync-sheet.yml).
Falls back to --url if passed on the command line, for local testing.

How to get SHEET_CSV_URL:
    In Google Sheets: File -> Share -> Publish to web -> select the sheet
    tab -> Comma-separated values (.csv) -> Publish. Copy the generated
    link, it looks like:
    https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv

Sheet columns (one row per case study — see README.md for the full guide):
    slug, category, imageSide, title,
    cardTitlePlain, cardTitleHighlight, cardExcerpt, cardImage, heroImage,
    snapshot_description, snapshot_industry, snapshot_locations,
    snapshot_founded, snapshot_region,
    challenge_title, challenge_description, challenge_points,
    solution_title, solution_titleHighlight, solution_description,
    solution_points, solution_image,
    stat1_value, stat1_label, stat2_value, stat2_label,
    stat3_value, stat3_label, stat4_value, stat4_label,
    results_title, results_description, results_points, results_image,
    quote_text, quote_author

Multi-line list fields (challenge_points, solution_points, results_points)
use "|" as the separator between bullet points, e.g.:
    Faster prep|Less food waste|Higher throughput

Skipping content (see README.md section 4 for the full explanation):
    - Leave every field for a section blank -> that whole section
      (Client Snapshot / Challenge / Solution / Impact / Results / Quote)
      is omitted from the page entirely.
    - Leave an image cell blank -> a placeholder block renders (signals
      "photo pending").
    - Type "none" (or "skip") in an image cell -> no placeholder either;
      that section's text runs full-width instead.
"""

import csv
import io
import json
import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
META_FILE = DATA_DIR / "meta.json"
OUTPUT_FILE = DATA_DIR / "case-studies.json"


def fetch_csv(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "on2cook-sheet-sync/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8-sig")


def split_points(raw: str):
    if not raw:
        return []
    return [p.strip() for p in raw.split("|") if p.strip()]


def row_to_case_study(row: dict) -> dict:
    def g(key, default=""):
        return (row.get(key) or "").strip() or default

    stats = []
    for i in range(1, 5):
        value = g(f"stat{i}_value")
        label = g(f"stat{i}_label")
        if value or label:
            stats.append({"value": value, "label": label})

    return {
        "slug": g("slug"),
        "category": g("category"),
        "imageSide": g("imageSide", "right"),
        "title": g("title"),
        "cardTitlePlain": g("cardTitlePlain"),
        "cardTitleHighlight": g("cardTitleHighlight"),
        "cardExcerpt": g("cardExcerpt"),
        "cardImage": g("cardImage"),
        "heroImage": g("heroImage"),
        "snapshot": {
            "description": g("snapshot_description"),
            "facts": [
                {"label": "Industry", "value": g("snapshot_industry")},
                {"label": "Locations", "value": g("snapshot_locations")},
                {"label": "Founded", "value": g("snapshot_founded")},
                {"label": "Region", "value": g("snapshot_region")},
            ],
        },
        "challenge": {
            "title": g("challenge_title"),
            "description": g("challenge_description"),
            "points": split_points(g("challenge_points")),
        },
        "solution": {
            "title": g("solution_title", "Switching to"),
            "titleHighlight": g("solution_titleHighlight", "on2cook"),
            "description": g("solution_description"),
            "points": split_points(g("solution_points")),
            "image": g("solution_image"),
        },
        "impact": {"stats": stats},
        "results": {
            "title": g("results_title", "The Results"),
            "description": g("results_description"),
            "points": split_points(g("results_points")),
            "image": g("results_image"),
        },
        "quote": {
            "text": g("quote_text"),
            "author": g("quote_author"),
        },
    }


def main():
    url = os.environ.get("SHEET_CSV_URL")
    if len(sys.argv) > 1 and sys.argv[1]:
        url = sys.argv[1]

    if not url:
        print("ERROR: no sheet URL. Set SHEET_CSV_URL env var or pass it as an argument.", file=sys.stderr)
        sys.exit(1)

    print(f"Fetching sheet CSV...")
    csv_text = fetch_csv(url)
    reader = csv.DictReader(io.StringIO(csv_text))

    case_studies = []
    for row in reader:
        slug = (row.get("slug") or "").strip()
        if not slug:
            continue  # skip blank / placeholder rows
        case_studies.append(row_to_case_study(row))

    if not case_studies:
        print("ERROR: sheet produced zero case studies — refusing to overwrite existing data.", file=sys.stderr)
        sys.exit(1)

    meta = {}
    if META_FILE.exists():
        meta = json.loads(META_FILE.read_text()).get("meta", {})

    output = {"meta": meta, "caseStudies": case_studies}
    OUTPUT_FILE.write_text(json.dumps(output, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(case_studies)} case studies to {OUTPUT_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
