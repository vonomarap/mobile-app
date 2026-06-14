#!/usr/bin/env sh
set -eu

if [ "${1:-}" = "" ]; then
  echo "Usage: sh ./deploy-web.sh <firebase-project-id>"
  exit 1
fi

PROJECT_ID="$1"
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

cd "$ROOT_DIR"
npx expo export --platform web --clear

DIST_INDEX="$ROOT_DIR/dist/index.html"
if [ ! -s "$DIST_INDEX" ]; then
  echo "Waiting for Expo web export output: $DIST_INDEX"
  i=0
  while [ ! -s "$DIST_INDEX" ] && [ "$i" -lt 120 ]; do
    i=$((i + 1))
    sleep 1
  done
fi

if [ ! -s "$DIST_INDEX" ]; then
  echo "Error: Expo export did not create a ready file: $DIST_INDEX"
  exit 1
fi

if [ -f "$ROOT_DIR/assets/favicon.ico" ]; then
  cp "$ROOT_DIR/assets/favicon.ico" "$ROOT_DIR/dist/favicon.ico"
fi
if [ -f "$ROOT_DIR/assets/favicon.png" ]; then
  cp "$ROOT_DIR/assets/favicon.png" "$ROOT_DIR/dist/favicon.png"
fi
if [ -f "$ROOT_DIR/assets/pwa-192.png" ]; then
  cp "$ROOT_DIR/assets/pwa-192.png" "$ROOT_DIR/dist/pwa-192.png"
fi
if [ -f "$ROOT_DIR/assets/pwa-512.png" ]; then
  cp "$ROOT_DIR/assets/pwa-512.png" "$ROOT_DIR/dist/pwa-512.png"
fi
if [ -f "$ROOT_DIR/assets/apple-touch-icon.png" ]; then
  cp "$ROOT_DIR/assets/apple-touch-icon.png" "$ROOT_DIR/dist/apple-touch-icon.png"
fi
if [ -f "$ROOT_DIR/seo/site.webmanifest" ]; then
  cp "$ROOT_DIR/seo/site.webmanifest" "$ROOT_DIR/dist/site.webmanifest"
fi
if [ -f "$ROOT_DIR/seo/robots.txt" ]; then
  cp "$ROOT_DIR/seo/robots.txt" "$ROOT_DIR/dist/robots.txt"
fi
if [ -f "$ROOT_DIR/seo/sitemap.xml" ]; then
  cp "$ROOT_DIR/seo/sitemap.xml" "$ROOT_DIR/dist/sitemap.xml"
fi
if [ -f "$ROOT_DIR/seo/og-image.png" ]; then
  cp "$ROOT_DIR/seo/og-image.png" "$ROOT_DIR/dist/og-image.png"
fi
for f in "$ROOT_DIR/seo"/google*.html "$ROOT_DIR/seo"/yandex*.html; do
  if [ -f "$f" ]; then
    cp "$f" "$ROOT_DIR/dist/$(basename "$f")"
  fi
done

node "$ROOT_DIR/scripts/web/generate-og-images.mjs"
node "$ROOT_DIR/scripts/web/inject-seo.mjs"

firebase deploy --project "$PROJECT_ID" --only hosting:web

echo "Web deploy complete for project: $PROJECT_ID"
