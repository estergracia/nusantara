// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { enableIndexedDbPersistence, getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBqwcE0I-ytcu4y0R1VbmMLDbpIiIbqz3w",
  authDomain: "nusantara-8d492.firebaseapp.com",
  projectId: "nusantara-8d492",
  storageBucket: "nusantara-8d492.firebasestorage.app",
  messagingSenderId: "366511657292",
  appId: "1:366511657292:web:8f84ba2beaba9a0f41bfe9",
  measurementId: "G-HRYZX4L079"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

export async function enableOfflinePersistence() {
  try {
    await enableIndexedDbPersistence(db);
  } catch (err) {
    console.warn("Firestore persistence not enabled:", err?.code || err);
  }
}