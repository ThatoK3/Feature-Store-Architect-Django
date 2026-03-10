#!/bin/bash
# check-syntax.sh
# Run: bash scripts/check-syntax.sh  (from FeastArchitect/ root)
# Checks every JS module with `node --check` and reports pass/fail.

PASS=0; FAIL=0

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  FeastArchitect — JavaScript Syntax Check"
echo "═══════════════════════════════════════════════════════"
echo ""

check() {
  local f="$1"
  local out
  out=$(node --check "$f" 2>&1)
  if [ $? -ne 0 ]; then
    echo "❌  $f"
    echo "$out" | head -5 | sed 's/^/    /'
    FAIL=$((FAIL+1))
  else
    echo "✅  $f"
    PASS=$((PASS+1))
  fi
}

check static/FeastArchitect/js/modules/config.js
check static/FeastArchitect/js/modules/utils.js
check static/FeastArchitect/js/modules/api.js
check static/FeastArchitect/js/modules/canvas-renderer.js
check static/FeastArchitect/js/modules/node-manager.js
check static/FeastArchitect/js/modules/layout-manager.js
check static/FeastArchitect/js/modules/search-manager.js
check static/FeastArchitect/js/modules/ui-manager.js
check static/FeastArchitect/js/modules/code-generator.js
check static/FeastArchitect/js/modules/llm-helper.js
check static/FeastArchitect/js/modules/example-data.js
check static/FeastArchitect/js/modules/feast-diagram.js
check static/FeastArchitect/js/main.js

echo ""
echo "───────────────────────────────────────────────────────"
echo "  $PASS passed  |  $FAIL failed"
echo "───────────────────────────────────────────────────────"
echo ""

[ $FAIL -gt 0 ] && exit 1
exit 0
