import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCtlb57kP93BsljhENGTa3PqIUxtBu3iAU",
  authDomain: "attendance-hub-63224.firebaseapp.com",
  projectId: "attendance-hub-63224",
  storageBucket: "attendance-hub-63224.firebasestorage.app",
  messagingSenderId: "229603714382",
  appId: "1:229603714382:web:08d51076b38ee54998aa1f",
  measurementId: "G-L7991S8RGF"
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
