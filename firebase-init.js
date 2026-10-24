// Firebase initialization (ES module via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAfPuJD_fqtXdbAUJwz63H3-9rBcw-CFXE",
  authDomain: "merssh-22755.firebaseapp.com",
  projectId: "merssh-22755",
  storageBucket: "merssh-22755.firebasestorage.app",
  messagingSenderId: "794290487959",
  appId: "1:794290487959:web:0642baeee097282f751fd2",
  measurementId: "G-Z25LK5XNFR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // getAnalytics only works over https or http://localhost (not file://)
  console.warn("Firebase Analytics not initialized:", e);
}

export { app, auth, db, analytics };
