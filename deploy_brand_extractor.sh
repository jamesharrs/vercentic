#!/bin/bash
# deploy_brand_extractor.sh
# Run from ~/projects/talentos
# Usage: bash deploy_brand_extractor.sh

set -e
echo "🎨 Deploying Brand Extractor enhancements..."
echo ""

# 1. Replace server route
if [ -f "brand_kits_new.js" ]; then
  cp brand_kits_new.js server/routes/brand_kits.js
  echo "✅ server/routes/brand_kits.js replaced"
else
  echo "❌ brand_kits_new.js not found in current directory"
  echo "   Save the brand_kits.js file as 'brand_kits_new.js' in ~/projects/talentos first"
  exit 1
fi

# 2. Patch Portals.jsx — Claude → Vercentic
echo ""
echo "📝 Patching Portals.jsx..."
node patch_brand_extractor.js

# 3. Restart server
echo ""
echo "🔄 Restarting server..."
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null || true
cd server && node index.js &
cd ..
sleep 2
echo "✅ Server restarted"

# 4. Check Vite
echo ""
echo "📦 Checking Vite..."
if lsof -ti:3000 >/dev/null 2>&1; then
  echo "  Vite already running — will hot-reload"
else
  cd client && npm run dev &
  cd ..
  echo "  Vite started"
fi

echo ""
echo "✅ All done! Changes:"
echo "   • Logo extraction: Clearbit API + Google favicon + JSON-LD + OG tags + HTML patterns"
echo "   • All 'Claude' references → 'Vercentic' in UI"
echo "   • Blocked site fallback now also fetches logo via Clearbit"
echo ""
echo "Test: Open Portals → Brand Extractor → paste any URL"
