#!/usr/bin/env bash
# Build the Claude Desktop extension.
#
# The point of a .mcpb is that it installs on a double click, so it carries its
# own dependencies and asks for nothing to be present first. That is why this
# vendors node_modules rather than shelling out to npx at runtime.
#
#   bash desktop-extension/build.sh    ->  desktop-extension/midjourney-<version>.mcpb
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build="$root/desktop-extension/build"
version="$(node -p "require('$root/package.json').version")"

# The manifest version has to track package.json, or Claude Desktop reports one
# number while the server answers another.
node -e "
  const fs = require('fs');
  const p = '$root/desktop-extension/manifest.json';
  const m = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (m.version !== '$version') {
    m.version = '$version';
    fs.writeFileSync(p, JSON.stringify(m, null, 2) + '\n');
    console.log('manifest version -> $version');
  }
"

npm --prefix "$root" run build

rm -rf "$build"
mkdir -p "$build/server"
cp -R "$root/dist/." "$build/server/"
cp "$root/package.json" "$build/package.json"
cp "$root/desktop-extension/manifest.json" "$build/manifest.json"
cp "$root/README.md" "$root/LICENSE" "$build/"

# `index.js` reads the version from `../package.json`, so the copy above is load
# bearing and not just metadata.
npm --prefix "$build" install --omit=dev --silent --no-audit --no-fund

npx -y @anthropic-ai/mcpb@latest validate "$build/manifest.json"
npx -y @anthropic-ai/mcpb@latest pack "$build" "$root/desktop-extension/midjourney-$version.mcpb"

echo
echo "Built desktop-extension/midjourney-$version.mcpb"
