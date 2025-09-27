# Personal Finance Dashboard - Setup Guide

This guide will walk you through setting up and running this React-based personal finance application.

---

## 1. Firebase Project Setup

This application uses Firebase Authentication and Firestore. You'll need to create a Firebase project and configure these services.

### Step 1: Create a Firebase Project
1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Click **"Add project"** and give your project a name (e.g., "my-finance-app").
3.  Follow the on-screen instructions. You can disable Google Analytics if you wish.

### Step 2: Enable Authentication & Authorize Domain
1.  In your project's dashboard, go to the **Build** section and click **Authentication**.

### Project Structure
```
├── components/
│   ├── accounts/           # Account management
│   ├── assets/            # Asset tracking
│   ├── dashboard/         # Enhanced dashboard
│   ├── envelopes/         # Envelope budgeting
│   ├── transactions/      # Multi-currency transactions
│   └── ui/               # Reusable UI components
├── context/              # React context providers
├── hooks/                # Custom hooks (currency, encryption)
├── services/             # Firebase & external API services
├── types/                # TypeScript definitions
├── utils/                # Utilities (encryption, formatters)
├── functions/            # Cloud Functions
└── firestore.rules       # Security rules
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase project with Firestore, Auth, Functions enabled
        }

        match /couples/{coupleId} {
            allow read: if isPartOfCouple(coupleId);
            allow update: if isPartOfCouple(coupleId); // For future features like shared budget
        }

        match /transactions/{transactionId} {
            // Allow read/write if it's a private transaction owned by the user
            allow read, write: if resource.data.ownerId == request.auth.uid;
            // Allow read/write if it's a shared transaction and user is part of the couple
            allow read, write: if resource.data.type == 'shared' && isPartOfCouple(resource.data.coupleId);
        }

        match /incomes/{incomeId} {
            allow read, write: if resource.data.ownerId == request.auth.uid;
            allow read, write: if resource.data.type == 'shared' && isPartOfCouple(resource.data.coupleId);
        }

         match /assets/{assetId} {
            allow read, write: if resource.data.ownerId == request.auth.uid;
            allow read, write: if resource.data.type == 'shared' && isPartOfCouple(resource.data.coupleId);
        }

        match /categories/{categoryId} {
            // Categories can only be read/written by their owner
            allow read, write: if request.resource.data.ownerId == request.auth.uid;
        }
      }
    }
    ```
3.  Click **Publish**.

### Step 5: Get Firebase Configuration
1.  Go to your Project Overview (click the gear icon ⚙️ and select **Project settings**).
2.  In the **"Your apps"** section, click the web icon (`</>`).
3.  Give your app a nickname and click **"Register app"**.
4.  Copy the `firebaseConfig` object provided.

---

## 2. Application Configuration

### Step 1: Update Firebase Config in the Code
1.  Open `services/firebase.ts`.
2.  **Replace the placeholder `firebaseConfig` object** with the one you copied.
3.  Save the file.

### Step 2: Install Dependencies
This application is set up to load dependencies from a CDN, so no `npm install` is needed.

---

## 3. Running the Application

Once you have configured `services/firebase.ts` with your project details, simply open the `index.html` file in a browser or use a simple web server. You can now create an account and start managing your finances!