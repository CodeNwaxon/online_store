import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: App;

if (!getApps().length) {
  // Firebase Admin SDK requires a service account to authenticate.
  // The private key is stored as a single-line string with escaped \n characters
  // in the environment variable. We need to convert them back to real newlines.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  try {
    adminApp = initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: privateKey,
      }),
    });
  } catch (error) {
    console.error('Firebase Admin initialization failed. If this is during a build, ensure env vars are set in production.', error);
    // Provide a dummy app just to allow the build to pass if keys are missing locally
    adminApp = initializeApp({ projectId: 'demo-project' }, 'demo-app');
  }
} else {
  adminApp = getApps()[0];
}

const adminDb = getFirestore(adminApp);

export { adminDb };
