#!/bin/sh
# Builds riffle from ../riffle and runs it against empty folders, so a run never touches a real library.
set -e

# riffle reads EXIF times without an offset in the local timezone, so pin it for stable dates and file names.
export TZ=UTC

E2E_DIR=$(cd "$(dirname "$0")" && pwd)
RIFFLE_DIR=$(cd "${RIFFLE_DIR:-$E2E_DIR/../riffle}" && pwd)
RUN_DIR="${RIFFLE_RUN_DIR:-$E2E_DIR/.riffle}"

cd "$RIFFLE_DIR"
esbuild index.jsx --bundle --minify --outfile=assets/bundle.js --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --log-level=warning
go build -o "$RUN_DIR/riffle" .

rm -rf "$RUN_DIR/data" "$RUN_DIR/import" "$RUN_DIR/library" "$RUN_DIR/thumbnails" "$RUN_DIR/export"
mkdir -p "$RUN_DIR/data" "$RUN_DIR/library" "$RUN_DIR/thumbnails" "$RUN_DIR/export"
cp -R "$E2E_DIR/fixtures/photos" "$RUN_DIR/import"
# git doesn't keep modification times, and riffle dates the EXIF-less screenshot by it.
touch -t 202101150930 "$RUN_DIR/import/phone/screenshot.png"

# riffle reads the geonames files and its .env from the working directory.
cp -R "$E2E_DIR/fixtures/geonames" "$RUN_DIR/data/.geonames"
cd "$RUN_DIR/data"

export PORT="${RIFFLE_E2E_PORT:-8092}"
export DATA_FOLDER="$RUN_DIR/data"
export IMPORT_PATH="$RUN_DIR/import"
export LIBRARY_PATH="$RUN_DIR/library"
export THUMBNAILS_PATH="$RUN_DIR/thumbnails"
export EXPORT_PATH="$RUN_DIR/export"
unset DEV_MODE
exec "$RUN_DIR/riffle" >"$RUN_DIR/riffle.log" 2>&1
