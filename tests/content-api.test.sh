#!/bin/bash
# Content API Integration Tests
# Tests both internal (/api/content) and external (/api/v1/content) endpoints
# Prerequisites: Server running on localhost:3000, database accessible

BASE_URL="http://localhost:3000"
API_TOKEN="lp_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
PASSED=0
FAILED=0
CONTENT_ID=""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name (status $actual)"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name (expected $expected, got $actual)"
    FAILED=$((FAILED + 1))
  fi
}

assert_contains() {
  local test_name="$1"
  local expected="$2"
  local body="$3"
  if echo "$body" | grep -qF "$expected"; then
    echo -e "${GREEN}✓ PASS${NC}: $test_name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗ FAIL${NC}: $test_name (response does not contain '$expected')"
    echo "  Response: $body"
    FAILED=$((FAILED + 1))
  fi
}

echo -e "${YELLOW}=== Content API Integration Tests ===${NC}"
echo ""

# ─────────────────────────────────────────
# INTERNAL API TESTS (/api/content)
# ─────────────────────────────────────────
echo -e "${YELLOW}--- Internal API (/api/content) ---${NC}"

# Test 1: Create content
echo ""
echo "Test: Create content via internal API"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/content" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin-session=test" \
  -d '{
    "title": "Test Content Title",
    "body": "This is the test content body for integration testing.",
    "mediaUrl": "https://example.com/image.jpg",
    "tags": ["test", "integration"],
    "platforms": ["LINKEDIN", "FACEBOOK"],
    "status": "DRAFT"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "POST /api/content - Create content" 201 "$HTTP_CODE"
assert_contains "Response has title" '"title"' "$BODY"
assert_contains "Response has id" '"id"' "$BODY"
assert_contains "Status is DRAFT" '"DRAFT"' "$BODY"

# Extract ID for later tests
CONTENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Created content ID: $CONTENT_ID"

# Test 2: Create content - missing required fields
echo ""
echo "Test: Create content with missing fields"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/content" \
  -H "Content-Type: application/json" \
  -d '{"title": ""}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "POST /api/content - Missing fields returns 400" 400 "$HTTP_CODE"
assert_contains "Error message present" '"error"' "$BODY"

# Test 3: Create content - invalid JSON
echo ""
echo "Test: Create content with invalid JSON"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/content" \
  -H "Content-Type: application/json" \
  -d 'not json')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "POST /api/content - Invalid JSON returns 400" 400 "$HTTP_CODE"

# Test 4: List all content
echo ""
echo "Test: List all content"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/content")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET /api/content - List content" 200 "$HTTP_CODE"
assert_contains "Response is array" '[' "$BODY"

# Test 5: Get content by ID
echo ""
echo "Test: Get content by ID"
if [ -n "$CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/content/$CONTENT_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_status "GET /api/content/:id - Get single content" 200 "$HTTP_CODE"
  assert_contains "Has correct title" "Test Content Title" "$BODY"
fi

# Test 6: Get non-existent content
echo ""
echo "Test: Get non-existent content"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/content/00000000-0000-0000-0000-000000000000")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "GET /api/content/:id - Not found returns 404" 404 "$HTTP_CODE"

# Test 7: Update content
echo ""
echo "Test: Update content"
if [ -n "$CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/content/$CONTENT_ID" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Updated Test Title",
      "body": "Updated body content.",
      "status": "PUBLISHED",
      "platforms": ["LINKEDIN", "INSTAGRAM"]
    }')
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_status "PUT /api/content/:id - Update content" 200 "$HTTP_CODE"
  assert_contains "Title updated" "Updated Test Title" "$BODY"
  assert_contains "Status updated to PUBLISHED" '"PUBLISHED"' "$BODY"
fi

# Test 8: Update with empty title
echo ""
echo "Test: Update content with empty title"
if [ -n "$CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/content/$CONTENT_ID" \
    -H "Content-Type: application/json" \
    -d '{"title": "", "body": "valid body"}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  assert_status "PUT /api/content/:id - Empty title returns 400" 400 "$HTTP_CODE"
fi

# Test 9: Delete content
echo ""
echo "Test: Delete content"
if [ -n "$CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/content/$CONTENT_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  assert_status "DELETE /api/content/:id - Delete content" 200 "$HTTP_CODE"

  # Verify deleted
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/content/$CONTENT_ID")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  assert_status "GET /api/content/:id - Deleted content returns 404" 404 "$HTTP_CODE"
fi

# ─────────────────────────────────────────
# EXTERNAL API TESTS (/api/v1/content)
# ─────────────────────────────────────────
echo ""
echo -e "${YELLOW}--- External API (/api/v1/content) ---${NC}"

# Test 10: External API - No auth
echo ""
echo "Test: External API without auth"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/content" \
  -H "Content-Type: application/json" \
  -d '{"title": "test", "body": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "POST /api/v1/content - No auth returns 401" 401 "$HTTP_CODE"

# Test 11: External API - Invalid token
echo ""
echo "Test: External API with invalid token"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/content" \
  -H "Authorization: Bearer invalid-token" \
  -H "Content-Type: application/json" \
  -d '{"title": "test", "body": "test"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "POST /api/v1/content - Invalid token returns 401" 401 "$HTTP_CODE"

# Test 12: External API - Create content
echo ""
echo "Test: External API - Create content"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/content" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "External API Test Content",
    "body": "Content created through the external v1 API.",
    "tags": ["api", "external"],
    "platforms": ["TIKTOK", "INSTAGRAM"],
    "status": "DRAFT"
  }')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "POST /api/v1/content - Create with valid token" 201 "$HTTP_CODE"
assert_contains "Has title" "External API Test Content" "$BODY"

V1_CONTENT_ID=$(echo "$BODY" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "  Created v1 content ID: $V1_CONTENT_ID"

# Test 13: External API - Create with missing fields
echo ""
echo "Test: External API - Create with missing required fields"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/content" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Only title"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "POST /api/v1/content - Missing body returns 400" 400 "$HTTP_CODE"
assert_contains "Validation error" "Validation failed" "$BODY"

# Test 14: External API - Create with invalid platform
echo ""
echo "Test: External API - Create with invalid platform"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/content" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Test body", "platforms": ["TWITTER"]}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "POST /api/v1/content - Invalid platform returns 400" 400 "$HTTP_CODE"
assert_contains "Invalid platform error" "Invalid platform" "$BODY"

# Test 15: External API - Create with invalid status
echo ""
echo "Test: External API - Create with invalid status"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/content" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test", "body": "Test body", "status": "INVALID"}')
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "POST /api/v1/content - Invalid status returns 400" 400 "$HTTP_CODE"

# Test 16: External API - List content
echo ""
echo "Test: External API - List content"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/content" \
  -H "Authorization: Bearer $API_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET /api/v1/content - List with auth" 200 "$HTTP_CODE"
assert_contains "Response is array" '[' "$BODY"

# Test 17: External API - List without auth
echo ""
echo "Test: External API - List without auth"
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/content")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "GET /api/v1/content - List without auth returns 401" 401 "$HTTP_CODE"

# Test 18: External API - Get by ID
echo ""
echo "Test: External API - Get content by ID"
if [ -n "$V1_CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/content/$V1_CONTENT_ID" \
    -H "Authorization: Bearer $API_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_status "GET /api/v1/content/:id - Get single" 200 "$HTTP_CODE"
  assert_contains "Has correct title" "External API Test Content" "$BODY"
fi

# Test 19: External API - Update content
echo ""
echo "Test: External API - Update content"
if [ -n "$V1_CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/api/v1/content/$V1_CONTENT_ID" \
    -H "Authorization: Bearer $API_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title": "Updated via V1 API", "status": "PUBLISHED"}')
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_status "PUT /api/v1/content/:id - Update content" 200 "$HTTP_CODE"
  assert_contains "Title updated" "Updated via V1 API" "$BODY"
  assert_contains "Status updated" '"PUBLISHED"' "$BODY"
fi

# Test 20: External API - Delete content
echo ""
echo "Test: External API - Delete content"
if [ -n "$V1_CONTENT_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/v1/content/$V1_CONTENT_ID" \
    -H "Authorization: Bearer $API_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  assert_status "DELETE /api/v1/content/:id - Delete content" 200 "$HTTP_CODE"

  # Verify deleted
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/v1/content/$V1_CONTENT_ID" \
    -H "Authorization: Bearer $API_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  assert_status "GET /api/v1/content/:id - Deleted returns 404" 404 "$HTTP_CODE"
fi

# ─────────────────────────────────────────
# SUMMARY
# ─────────────────────────────────────────
echo ""
echo -e "${YELLOW}=== Test Summary ===${NC}"
TOTAL=$((PASSED + FAILED))
echo -e "Total: $TOTAL | ${GREEN}Passed: $PASSED${NC} | ${RED}Failed: $FAILED${NC}"

if [ "$FAILED" -gt 0 ]; then
  echo -e "${RED}Some tests failed!${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
