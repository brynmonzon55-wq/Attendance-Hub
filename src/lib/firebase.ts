import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyACkvCHry2GvoWJie4ZJM_Z5HgfgUQh2DU",
  authDomain: "my-attendance-hub-project.firebaseapp.com",
  projectId: "my-attendance-hub-project",
  storageBucket: "my-attendance-hub-project.firebasestorage.app",
  messagingSenderId: "120358794691",
  appId: "1:120358794691:web:9c25a9bf3b1f29ff80f976"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore (default database)
export const db = getFirestore(app);

// Real Firebase Authentication - passwords are hashed & managed by Firebase,
// never stored in or synced from Firestore.
export const auth = getAuth(app);

// The Firebase Auth client SDK signs you in as whatever account you just
// created. That's a problem when a TEACHER creates a STUDENT account from
// the dashboard - we don't want that to log the teacher out. To work around
// this without needing a backend/Cloud Function, we spin up a short-lived
// secondary Firebase App instance just for the account-creation call, then
// tear it down. The teacher's own session (on the primary `auth`) is never
// touched.
export async function createUserWithoutSigningIn(email: string, password: string) {
  const secondaryApp = initializeApp(firebaseConfig, `secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;
    await signOut(secondaryAuth);
    return uid;
  } finally {
    // Clean up the temporary app instance
    const instance = getApps().find((a) => a.name === secondaryApp.name);
    if (instance) {
      await deleteApp(instance);
    }
  }
}

// Synthetic email used since this app logs in with a "Student/Teacher ID"
// rather than a real email address. Firebase Auth requires an email format.
export function idToAuthEmail(id: string): string {
  return `${id.trim().toLowerCase()}@attendance-hub.local`;
}
