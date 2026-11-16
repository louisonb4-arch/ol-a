#!/usr/bin/env bash
# Construit les fichiers minifiés et met à jour le numéro de version (cache).
set -euo pipefail
cd "$(dirname "$0")"
V=$(date +%s)
python3 - <<'PY'
wm=open('tools/wordmark.d').read().strip()
s=open('js/main.src.js').read().replace("'__WM__'", repr(wm))
open('js/main.build.js','w').write(s)
PY
npx --yes esbuild@0.24.0 js/main.build.js --minify --target=es2020 --outfile=js/main.min.js --log-level=warning
rm js/main.build.js
npx --yes esbuild@0.24.0 css/styles.css --minify --outfile=css/styles.min.css --log-level=warning
for f in index.html mentions-legales.html 404.html; do
  sed -i.bak -E "s/(styles\.min\.css|main\.min\.js)\?v=[0-9]+/\1?v=$V/g" "$f" && rm -f "$f.bak"
done
echo "OK · version $V · css $(wc -c < css/styles.min.css) o · js $(wc -c < js/main.min.js) o"
