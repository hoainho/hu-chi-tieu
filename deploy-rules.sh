#!/bin/bash

# Deploy Firestore Rules to Firebase
# This script deploys only the Firestore security rules without deploying the entire app

echo "🔐 Deploying Firestore Security Rules..."
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI is not installed."
    echo "Please install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null
then
    echo "❌ You are not logged in to Firebase."
    echo "Please login with: firebase login"
    exit 1
fi

# Deploy only Firestore rules
echo "📤 Deploying Firestore rules..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Firestore rules deployed successfully!"
    echo ""
    echo "📋 Using SIMPLIFIED GENERIC PATTERN:"
    echo "  ✅ All collections with 'ownerId' are automatically secured"
    echo "  ✅ No need to update rules when adding new features!"
    echo ""
    echo "🎯 Covered collections:"
    echo "  - transactions, incomes, spendingSources"
    echo "  - savingsGoals, savingsGoalTransactions"
    echo "  - categories, assets, investments, budgets"
    echo "  - ANY new collection with 'ownerId' field"
    echo ""
    echo "🔐 Security:"
    echo "  - Users can only access their own data"
    echo "  - Partners can access shared data (if coupleId exists)"
    echo "  - No unauthorized access possible"
    echo ""
    echo "🎉 You can now use all features without permission errors!"
else
    echo ""
    echo "❌ Failed to deploy Firestore rules."
    echo "Please check the error messages above."
    exit 1
fi
