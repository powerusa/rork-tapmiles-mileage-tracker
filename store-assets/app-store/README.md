# TapMiles App Store assets

The `v3.0` folder contains the English (U.S.) screenshot and listing package for TapMiles 3.0. Start with `v3.0/UPLOAD-GUIDE-PL.md`.

- 6 screenshots for iPhone medium, 1206 × 2622.
- 6 screenshots for iPhone large, 1320 × 2868.
- 6 screenshots for iPad 13-inch, 2064 × 2752.
- Existing icon, promotional header, visual previews, and listing copy.
- Original simulator captures and editable vector layouts.

Rebuild copy with `python3 scripts/write-app-store-metadata.py`.
Rebuild PNGs with `node scripts/render-app-store-assets.cjs` (requires `sharp` and Avenir Next; set `NODE_PATH` if using the bundled Codex runtime).

All demo data is fictional. No fabricated reviews, rankings, or unsupported app features are included.
