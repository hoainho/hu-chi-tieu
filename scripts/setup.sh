#!/bin/bash

# Hủ Tài Chính Cặp Đôi - Setup Script
# This script sets up the development environment

set -e

echo "🚀 Setting up Hủ Tài Chính Cặp Đôi..."

# Check Node.js version
echo "📋 Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ Node.js 18+ is required. Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "🔧 Installing Firebase CLI..."
    npm install -g firebase-tools
fi
echo "✅ Firebase CLI installed"

# Setup Firebase Functions
echo "🔧 Setting up Firebase Functions..."
cd functions
npm install
npm run build
cd ..

# Check Firebase login status
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list &> /dev/null; then
    echo "⚠️  Please login to Firebase:"
    firebase login
fi

# Initialize Firebase (if not already done)
if [ ! -f ".firebaserc" ]; then
    echo "🔧 Initializing Firebase project..."
    echo "Please select your Firebase project when prompted."
    firebase init
fi

# Deploy Firestore rules and indexes
echo "🗄️  Deploying Firestore rules and indexes..."
firebase deploy --only firestore:rules,firestore:indexes

# Deploy Cloud Functions
echo "☁️  Deploying Cloud Functions..."
firebase deploy --only functions

echo ""
echo "🎉 Setup completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Update Firebase configuration in src/services/firebase.ts"
echo "2. Run 'npm run dev' to start development server"
echo "3. Visit http://localhost:5173 to see your app"
echo ""
echo "📚 Documentation:"
echo "- README_COMPLETE.md - Complete documentation"
echo "- FIRESTORE_SETUP.md - Firestore setup guide"
echo ""
echo "🔧 Useful commands:"
echo "- npm run dev          # Start development server"
echo "- npm run build        # Build for production"
echo "- firebase deploy      # Deploy to production"
echo "- firebase emulators:start  # Start local emulators"
echo ""
