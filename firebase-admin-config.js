// Firebase Admin SDK Configuration
require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
// You can either use service account key file or environment variables
let firebaseApp;

try {
    // Option 1: Using environment variables (recommended for production)
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            }),
            databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
        });
        console.log('✅ Firebase Admin initialized with environment variables');
    }
    // Option 2: Using service account key file (for local development)
    else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
        const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
        });
        console.log('✅ Firebase Admin initialized with service account file');
    }
    // Option 3: Dev mode - use application default credentials with database URL
    else if (process.env.FIREBASE_DATABASE_URL) {
        // For dev mode: Initialize without credentials but with database URL
        // This works if Firebase allows unauthenticated admin SDK access (not recommended for production)
        console.warn('⚠️  Initializing Firebase Admin in LIMITED mode (no credentials)');
        console.warn('⚠️  Server-side validation will be DISABLED. Using client-side Firebase only.');
        // Don't initialize admin SDK - rely on client SDK instead
        firebaseApp = null;
    }
    else {
        console.warn('⚠️  Firebase Admin not configured - set environment variables or service account path');
        firebaseApp = null;
    }
} catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    firebaseApp = null;
}

// Export Firebase Admin instances
const db = firebaseApp ? admin.database() : null;
const auth = firebaseApp ? admin.auth() : null;

module.exports = {
    admin,
    db,
    auth,
    isConfigured: !!firebaseApp
};
