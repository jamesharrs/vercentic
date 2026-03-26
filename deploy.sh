#!/bin/bash
# Quick deployment script for Talentos components

echo "🚀 Deploying Vercentic components to GitHub..."

# Navigate to the repository
cd "$(dirname "$0")"

# Show what's being deployed
echo ""
echo "📦 Files to deploy:"
git status --short

# Add all files
git add .

# Show commit
echo ""
echo "✅ Creating commit..."
git commit -m "Add Vercentic components: Jobs table, Document management, and Company context-aware copilot system"

# Push to GitHub
echo ""
echo "⬆️  Pushing to GitHub (jamesharrs/talentos)..."
git push -u origin main

echo ""
echo "✨ Done! Check Vercel dashboard for automatic deployment."
echo "   If auto-deploy is enabled, your changes will be live in ~2 minutes."
