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
2.  Click **"Get started"**.
3.  Go to the **Sign-in method** tab.
4.  Select **Email/Password** from the list of providers.
5.  **Enable** the Email/Password provider and click **Save**.
6.  Now, go to the **Settings** tab (next to "Sign-in method").
7.  Under the **Authorized domains** section, click **Add domain**.
8.  Add the domain where you are running the application (e.g., `localhost` if running locally). **If you are running this in Google AI Studio, you must add `aistudio.google.com`**.
9.  Click **Add**. This step is crucial and resolves the `auth/configuration-not-found` error.

### Step 3: Create a Firestore Database
1.  In the **Build** section, click **Firestore Database**.
2.  Click **"Create database"**.
3.  Start in **Production mode**. This is crucial for a multi-user app. Click **Next**.
4.  Choose a Firestore location (e.g., `us-central`). Click **Enable**.

### Step 4: Set Firestore Security Rules
1.  Go to the **Rules** tab within your Firestore Database section.
2.  **Replace** the default rules with the following rules. These are essential for securing user data.
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Users can only read/write their own profile
        match /users/{userId} {
          allow read, write: if request.auth.uid == userId;
        }

        // Allow creating/reading invites
        match /invites/{inviteId} {
            allow read: if request.auth != null;
            allow create: if request.auth.uid == request.resource.data.fromUserId;
            allow delete: if request.auth.uid == resource.data.fromUserId;
        }
        
        // Rules for shared collections
        function isPartOfCouple(coupleId) {
          return exists(/databases/$(database)/documents/couples/$(coupleId)) &&
                 request.auth.uid in get(/databases/$(database)/documents/couples/$(coupleId)).data.members;
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