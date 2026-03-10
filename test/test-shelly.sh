#!/bin/bash
# Quick Test Script for Shelly BitBucket Integration + Phase 2 Features
# Run this to test all new features

set -e  # Exit on error

echo "🧪 Shelly Testing Script"
echo "========================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track test results
failed=0
passed=0

# Test 1: Check Shelly is installed
echo -e "${BLUE}Test 1: Checking Shelly installation...${NC}"
if command -v shelly &> /dev/null; then
    echo -e "${GREEN}✅ Shelly is installed${NC}"
    shelly --version
    ((passed++))
else
    echo -e "${RED}❌ Shelly not found. Make sure it's built:${NC}"
    echo "   cd <shelly-repo-directory>"
    echo "   npm run build"
    echo "   npm link  # or add to PATH"
    ((failed++))
    exit 1
fi
echo ""

# Test 2: Check BitBucket commands exist
echo -e "${BLUE}Test 2: Checking BitBucket commands...${NC}"
if shelly bb --help &> /dev/null; then
    echo -e "${GREEN}✅ 'shelly bb' command exists${NC}"
    ((passed++))
else
    echo -e "${RED}❌ BitBucket command not found${NC}"
    ((failed++))
fi

if shelly bitbucket --help &> /dev/null; then
    echo -e "${GREEN}✅ 'shelly bitbucket' command exists${NC}"
    ((passed++))
else
    echo -e "${RED}❌ BitBucket command not found${NC}"
    ((failed++))
fi
echo ""

# Test 3: Check organize command has --ci option
echo -e "${BLUE}Test 3: Checking organize command --ci option...${NC}"
if shelly organize --help | grep -q "\-\-ci"; then
    echo -e "${GREEN}✅ '--ci' option exists in organize command${NC}"
    ((passed++))
else
    echo -e "${RED}❌ '--ci' option not found${NC}"
    ((failed++))
fi
echo ""

# Test 4: Create a test project
echo -e "${BLUE}Test 4: Creating test project...${NC}"
TEST_DIR="/tmp/shelly-test-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Initialize a basic npm project
cat > package.json <<EOF
{
  "name": "@juspay/test-project",
  "version": "1.0.0",
  "description": "Test project for Shelly",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Test\""
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "prettier": "^3.0.0"
  }
}
EOF

# Initialize git
git init
git config user.name "Test User"
git config user.email "test@juspay.in"

# Add a BitBucket remote (fake)
git remote add origin "git@bitbucket.juspay.net:BZ/test-project.git"

echo -e "${GREEN}✅ Test project created at: $TEST_DIR${NC}"
echo ""

# Test 5: Test Jenkinsfile generation
echo -e "${BLUE}Test 5: Testing Jenkinsfile generation...${NC}"
echo -e "${YELLOW}Running: shelly organize --ci jenkins --force${NC}"

# Run organize with jenkins
if shelly organize --ci jenkins --force; then
    echo -e "${GREEN}✅ Organize command completed${NC}"
    ((passed++))

    # Check if Jenkinsfile was created
    if [ -f "Jenkinsfile" ]; then
        echo -e "${GREEN}✅ Jenkinsfile created${NC}"
        ((passed++))

        # Check if variables were replaced
        if grep -q "test-project" Jenkinsfile && ! grep -q "{{projectName}}" Jenkinsfile; then
            echo -e "${GREEN}✅ Variables replaced in Jenkinsfile${NC}"
            ((passed++))
        else
            echo -e "${RED}❌ Variables not replaced correctly${NC}"
            ((failed++))
        fi
    else
        echo -e "${RED}❌ Jenkinsfile not created${NC}"
        ((failed++))
    fi
else
    echo -e "${RED}❌ Organize command failed${NC}"
    ((failed++))
fi
echo ""

# Test 6: Show what was created
echo -e "${BLUE}Test 6: Checking created files...${NC}"
echo "Files created in test project:"
ls -la | grep -v "^\." | tail -n +2
echo ""

# Test 7: Check Jenkinsfile content
if [ -f "Jenkinsfile" ]; then
    echo -e "${BLUE}Test 7: Jenkinsfile content sample...${NC}"
    echo "First 20 lines of Jenkinsfile:"
    head -n 20 Jenkinsfile
    echo ""
fi

# Summary
echo ""
echo "================================"
echo "📊 Test Results Summary"
echo "================================"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED!${NC}"
    echo ""
    echo "Test project location: $TEST_DIR"
    echo ""
    echo "Next steps:"
    echo "1. Review the generated files in: $TEST_DIR"
    echo "2. Check Jenkinsfile has correct values"
    echo "3. Test with a real BitBucket repo (see MANUAL_TESTING.md)"
    echo ""
    echo "To clean up:"
    echo "   rm -rf $TEST_DIR"
    echo ""
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Test project location: $TEST_DIR"
    echo ""
    echo "Review the output above for details on failures."
    echo ""
    echo "To clean up:"
    echo "   rm -rf $TEST_DIR"
    echo ""
    exit 1
fi
