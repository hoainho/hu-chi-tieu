#!/bin/bash

# Hủ Tài Chính Cặp Đôi - Production Deployment Script
# This script deploys the application to Firebase

set -e

echo "🚀 Deploying Hủ Tài Chính Cặp Đôi to production..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check Firebase login
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "❌ Please login to Firebase first:"
    echo "firebase login"
    exit 1
fi

# Get current project
current_project=$(firebase use --json | jq -r '.result.current // empty')
if [ -z "$current_project" ]; then
    echo "❌ No Firebase project selected. Please run:"
    echo "firebase use <project-id>"
    exit 1
fi

echo "📋 Deploying to project: $current_project"

# Confirm deployment
read -p "🤔 Are you sure you want to deploy to production? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

# Run tests
echo "🧪 Running tests..."
npm test -- --run --reporter=verbose

# Build the application
echo "🔨 Building application..."
npm run build

# Build Cloud Functions
echo "☁️  Building Cloud Functions..."
cd functions
npm run build
cd ..

# Deploy everything
echo "🚀 Deploying to Firebase..."

# Deploy in stages for better error handling
echo "📋 Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes

echo "☁️  Deploying Cloud Functions..."
firebase deploy --only functions

echo "🌐 Deploying web application..."
firebase deploy --only hosting

# Get hosting URL
hosting_url=$(firebase hosting:channel:list --json | jq -r '.result[] | select(.name == "live") | .url')
if [ -z "$hosting_url" ]; then
    hosting_url="https://$current_project.web.app"
fi

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Deployment Summary:"
echo "- Project: $current_project"
echo "- Hosting URL: $hosting_url"
echo "- Functions: Deployed"
echo "- Firestore Rules: Updated"
echo "- Indexes: Updated"
echo ""
echo "🔧 Post-deployment checklist:"
echo "1. ✅ Test the application at $hosting_url"
echo "2. ✅ Verify currency rates are updating (check Cloud Function logs)"
echo "3. ✅ Test user registration and login"
echo "4. ✅ Test multi-currency transactions"
echo "5. ✅ Test envelope budgeting"
echo "6. ✅ Test shared account functionality"
echo ""
echo "📊 Monitoring:"
echo "- Firebase Console: https://console.firebase.google.com/project/$current_project"
echo "- Function Logs: firebase functions:log"
echo "- Hosting Logs: firebase hosting:channel:list"
echo ""
