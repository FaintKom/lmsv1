#!/usr/bin/env bash
# Screenshot Studio — third-party editor for store screenshots (MIT, browser-local).
# Cloned on demand into a git-ignored folder; its code is not vendored here.
# Port 3100 because it is a Next.js app too and would otherwise fight our
# frontend for 3000.
set -euo pipefail

REPO="https://github.com/mitrio78/AppStore-screenshots-editor.git"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/tools/screenshot-studio"

[ -d "$DIR" ] || git clone --depth 1 "$REPO" "$DIR"
cd "$DIR"
[ -d node_modules ] || npm install

exec npm run dev -- -p 3100
