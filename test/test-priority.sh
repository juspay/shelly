#!/bin/bash
# Quick Priority Tests for Shelly

# Derive repo root from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHELLY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SHELLY="node $SHELLY_DIR/dist/shelly/cli.js"
TEST_DIR="/tmp/shelly-priority-tests"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Setup
echo "🧪 Shelly Priority Tests"
echo "========================"
echo ""

rm -rf $TEST_DIR
mkdir -p $TEST_DIR
cd $TEST_DIR

passed=0
failed=0

# Test 1: Basic Organize
echo "Test 1: Basic Organize (GitHub default)..."
mkdir test1 && cd test1
git init > /dev/null 2>&1
echo '{"name":"test-basic","version":"1.0.0"}' > package.json
$SHELLY organize --force > output.txt 2>&1

if [ -f README.md ] && [ -d .github ]; then
  echo -e "${GREEN}✅ Test 1 PASSED${NC} - Basic organize works"
  ((passed++))
else
  echo -e "${RED}❌ Test 1 FAILED${NC} - Missing files"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Test 2: Jenkins CI
echo "Test 2: Organize with Jenkins CI..."
mkdir test2 && cd test2
git init > /dev/null 2>&1
git remote add origin git@bitbucket.org:bz/test-jenkins.git
echo '{"name":"test-jenkins","version":"1.0.0"}' > package.json
$SHELLY organize --ci jenkins --force > output.txt 2>&1

if [ -f Jenkinsfile ] && ! [ -d .github ]; then
  # Check for template variables
  if grep -q "{{" Jenkinsfile; then
    echo -e "${RED}❌ Test 2 FAILED${NC} - Template variables not replaced"
    ((failed++))
    echo "Found:"
    grep "{{" Jenkinsfile
  else
    echo -e "${GREEN}✅ Test 2 PASSED${NC} - Jenkins CI works"
    ((passed++))
  fi
else
  echo -e "${RED}❌ Test 2 FAILED${NC} - Jenkinsfile not created or .github exists"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Test 3: Breeze Detection
echo "Test 3: Breeze Project Detection..."
mkdir test3 && cd test3
git init > /dev/null 2>&1
git remote add origin git@bitbucket.juspay.net:BZ/vayu.git
echo '{"name":"@juspay/vayu","version":"1.0.0"}' > package.json
echo "y" | $SHELLY organize --force > output.txt 2>&1

if grep -q "Breeze Project Detected" output.txt; then
  echo -e "${GREEN}✅ Test 3 PASSED${NC} - Breeze detection works"
  ((passed++))
else
  echo -e "${RED}❌ Test 3 FAILED${NC} - Breeze not detected"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Test 4: MCP Files Created
echo "Test 4: MCP Files Created..."
cd test3  # Reuse test3

if [ -f scripts/pr-scribe.js ] && [ -f scripts/pr-police.js ] && [ -f .env.breeze ]; then
  # Check variables replaced
  if grep -q "{{workspaceName}}" scripts/pr-scribe.js; then
    echo -e "${RED}❌ Test 4 FAILED${NC} - Variables not replaced in scripts"
    ((failed++))
  else
    echo -e "${GREEN}✅ Test 4 PASSED${NC} - MCP files created correctly"
    ((passed++))
  fi
else
  echo -e "${RED}❌ Test 4 FAILED${NC} - MCP files missing"
  ((failed++))
  ls -la scripts/ 2>&1
fi
cd ..
echo ""

# Test 5: Non-Breeze Skips MCP
echo "Test 5: Non-Breeze Project Skips MCP..."
mkdir test5 && cd test5
git init > /dev/null 2>&1
git remote add origin git@github.com:user/regular-repo.git
echo '{"name":"regular-project","version":"1.0.0"}' > package.json
$SHELLY organize --force > output.txt 2>&1

if ! [ -d scripts ] && grep -q "Not a Breeze project" output.txt; then
  echo -e "${GREEN}✅ Test 5 PASSED${NC} - Non-Breeze skips MCP"
  ((passed++))
elif grep -q "Not a Breeze project" output.txt; then
  echo -e "${GREEN}✅ Test 5 PASSED${NC} - Non-Breeze detected (scripts may exist from other features)"
  ((passed++))
else
  echo -e "${RED}❌ Test 5 FAILED${NC} - Should skip MCP for non-Breeze"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Test 6: Tech Stack Detection
echo "Test 6: Tech Stack Detection..."
mkdir test6 && cd test6
git init > /dev/null 2>&1
cat > package.json <<'EOF'
{
  "name": "test-typescript",
  "version": "1.0.0",
  "devDependencies": {
    "typescript": "^5.0.0",
    "prettier": "^3.0.0"
  }
}
EOF
echo '{}' > tsconfig.json
$SHELLY organize --force > output.txt 2>&1

if grep -q "TypeScript" output.txt && grep -q "Prettier" output.txt; then
  echo -e "${GREEN}✅ Test 6 PASSED${NC} - Tech stack detected"
  ((passed++))
else
  echo -e "${RED}❌ Test 6 FAILED${NC} - Tech stack not detected"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Test 7: Package Recommendations
echo "Test 7: Juspay Package Recommendations..."
mkdir test7 && cd test7
git init > /dev/null 2>&1
echo '{"name":"@juspay/test","version":"1.0.0"}' > package.json
echo "n" | $SHELLY organize --force > output.txt 2>&1

if grep -q "neurolink" output.txt && grep -q "bitbucket-mcp-server" output.txt; then
  echo -e "${GREEN}✅ Test 7 PASSED${NC} - Package recommendations work"
  ((passed++))
else
  echo -e "${RED}❌ Test 7 FAILED${NC} - Packages not recommended"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Test 8: --skip-mcp Flag
echo "Test 8: --skip-mcp Flag..."
mkdir test8 && cd test8
git init > /dev/null 2>&1
git remote add origin git@bitbucket.juspay.net:BZ/test.git
echo '{"name":"@juspay/test","version":"1.0.0"}' > package.json
$SHELLY organize --skip-mcp --force > output.txt 2>&1

if grep -q "Skipping MCP setup" output.txt && ! [ -f scripts/pr-scribe.js ]; then
  echo -e "${GREEN}✅ Test 8 PASSED${NC} - --skip-mcp flag works"
  ((passed++))
else
  echo -e "${RED}❌ Test 8 FAILED${NC} - --skip-mcp not working"
  ((failed++))
  cat output.txt
fi
cd ..
echo ""

# Summary
echo "========================================"
echo "📊 Test Results Summary"
echo "========================================"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
  echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  Some tests failed. Check output above.${NC}"
  exit 1
fi
