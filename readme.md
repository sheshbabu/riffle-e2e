# riffle-e2e

End-to-end tests for [riffle](../riffle) using Playwright. `topology.md` lists every feature and which test covers it.

## Setup

Needs Go, esbuild, exiftool, ffmpeg and Node, the same as riffle itself.

```bash
npm install
npx playwright install chromium
```

## Running

```bash
make test           # headless
make test-headed    # watch the browser
make stress         # run each test 5 times to catch flaky ones
make heal           # stress run, then ask Claude to fix what failed
make visual         # screenshot suite; on a diff, ask Claude to judge it
make visual-update  # record new screenshot baselines
make photos         # regenerate the fixture photos
make report         # open the last HTML report
```

## How a run works

- `start.sh` builds the bundle and a binary from `../riffle` (override with `RIFFLE_DIR`) into `.riffle/` (override with `RIFFLE_RUN_DIR`), then starts it on port 8092 (override with `RIFFLE_E2E_PORT`). It gets fresh `import/`, `library/`, `thumbnails/` and `export/` folders and an empty database in `data/`. Server logs go to `.riffle/riffle.log`.
- The import folder starts as a copy of `fixtures/photos`: ten photos and a video with fixed EXIF dates, cameras and GPS, a two-frame burst, an exact duplicate and a PNG with no EXIF. `fixtures/make-photos.sh` regenerates them.
- `fixtures/geonames` is a five-city GeoNames extract, so riffle's offline reverse geocoding fills in cities and countries.
- `TZ` is pinned to UTC, since riffle reads EXIF times without an offset in the server's timezone.
- The `setup` project imports the fixtures through the Import page. The `desktop` project runs the specs against that library.
- All specs share one library, so tests run one at a time. Setup data goes through the API (`helpers/api.js`); the UI is driven only for the feature under test.

## Visual suite

- `VISUAL=1` swaps the functional project for the visual ones. `visual/seed.setup.js` gives the imported library a fixed curation state, albums, tags, burst data and one export.
- riffle is dark-only and has no mobile layout, so one desktop project covers it. Baselines are recorded on macOS.
- Run-time dates in the import and export tables, and the file dates and paths in the lightbox details, are masked.
