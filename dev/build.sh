#!/usr/bin/env bash
# Build Seven Suppers into self-contained HTML files:
#   seven-suppers.html  - standalone, open on any computer, no server needed
#   dev/artifact.html   - body-only variant for publishing as a claude.ai artifact
VERSION="0.2.1"
set -euo pipefail
cd "$(dirname "$0")/.."

if [ ! -d node_modules ]; then
  npm install --no-fund --no-audit
fi

npx esbuild dev/main.jsx --bundle --minify --jsx=automatic --outfile=dev/bundle.min.js --log-level=warning

node - <<'EOF'
const fs = require("fs");
// Escape any </script> inside JS string literals so inline embedding is safe
const js = fs.readFileSync("dev/bundle.min.js", "utf8").replace(/<\/script/gi, "<\\/script");

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Seven Suppers</title>
</head>
<body style="margin:0">
<div id="root"></div>
<script>${js}</script>
</body>
</html>
`;
fs.writeFileSync("seven-suppers.html", standalone);

const artifact = `<title>Seven Suppers</title>
<div id="root"></div>
<script>${js}</script>
`;
fs.writeFileSync("dev/artifact.html", artifact);

console.log("built seven-suppers.html and dev/artifact.html");
EOF

node dev/validate.mjs
node dev/xcheck.mjs
node dev/smoke.js
node dev/func-test.js
