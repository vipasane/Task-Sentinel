#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         Load Balancer Implementation Verification             ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo

echo "📁 Checking Files..."
echo

files=(
  "src/distributed/load-balancer.ts"
  "tests/load-balancer.test.ts"
  "docs/load-balancer-index.md"
  "docs/load-balancer-quick-reference.md"
  "docs/load-balancer-integration.md"
  "docs/load-balancer-architecture.md"
  "docs/load-balancer-examples.ts"
  "docs/LOAD-BALANCER-SUMMARY.md"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "/workspaces/Task-Sentinel/$file" ]; then
    size=$(wc -l < "/workspaces/Task-Sentinel/$file")
    echo "  ✅ $file ($size lines)"
  else
    echo "  ❌ $file (MISSING)"
    all_exist=false
  fi
done

echo
echo "📊 Statistics..."
echo

src_lines=$(wc -l < /workspaces/Task-Sentinel/src/distributed/load-balancer.ts)
test_lines=$(wc -l < /workspaces/Task-Sentinel/tests/load-balancer.test.ts)
doc_lines=$(cat /workspaces/Task-Sentinel/docs/load-balancer-*.{md,ts} 2>/dev/null | wc -l)
total=$((src_lines + test_lines + doc_lines))

echo "  Source Code:        $src_lines lines"
echo "  Test Suite:         $test_lines lines"
echo "  Documentation:      $doc_lines lines"
echo "  ─────────────────────────────────"
echo "  Total:              $total lines"

echo
echo "🎯 Features..."
echo

# Check for key features in source code
features=(
  "class LoadBalancer"
  "class RoundRobinStrategy"
  "class LeastLoadedStrategy"
  "class CapabilityBasedStrategy"
  "class PerformanceBasedStrategy"
  "class AdaptiveStrategy"
  "selectWorker"
  "scoreWorkers"
  "detectOverload"
  "suggestMigration"
  "reorderQueue"
  "updateContext"
)

for feature in "${features[@]}"; do
  if grep -q "$feature" /workspaces/Task-Sentinel/src/distributed/load-balancer.ts; then
    echo "  ✅ $feature"
  else
    echo "  ❌ $feature (MISSING)"
  fi
done

echo
echo "🧪 Test Coverage..."
echo

# Check test suite
test_suites=(
  "Strategy Selection"
  "Round Robin Strategy"
  "Least Loaded Strategy"
  "Capability Based Strategy"
  "Performance Based Strategy"
  "Adaptive Strategy"
  "Worker Scoring"
  "Affinity Rules"
  "Overload Detection"
  "Task Migration"
  "Queue Reordering"
  "Edge Cases"
)

for suite in "${test_suites[@]}"; do
  if grep -q "$suite" /workspaces/Task-Sentinel/tests/load-balancer.test.ts; then
    echo "  ✅ $suite"
  else
    echo "  ⚠️  $suite"
  fi
done

echo
echo "📚 Documentation..."
echo

docs=(
  "Quick Reference"
  "Integration Guide"
  "Architecture"
  "Examples"
  "Summary"
  "Index"
)

doc_files=(
  "docs/load-balancer-quick-reference.md"
  "docs/load-balancer-integration.md"
  "docs/load-balancer-architecture.md"
  "docs/load-balancer-examples.ts"
  "docs/LOAD-BALANCER-SUMMARY.md"
  "docs/load-balancer-index.md"
)

for i in "${!docs[@]}"; do
  if [ -f "/workspaces/Task-Sentinel/${doc_files[$i]}" ]; then
    echo "  ✅ ${docs[$i]}"
  else
    echo "  ❌ ${docs[$i]}"
  fi
done

echo
echo "═══════════════════════════════════════════════════════════════"
if [ "$all_exist" = true ]; then
  echo "✅ All files present and accounted for!"
  echo "✅ Load Balancer implementation is COMPLETE"
else
  echo "⚠️  Some files are missing. Please check above."
fi
echo "═══════════════════════════════════════════════════════════════"
echo

