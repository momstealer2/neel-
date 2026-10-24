import { auth, db } from './firebase-init.js';
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Timestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Admin emails - Add your admin email here
const ADMIN_EMAILS = [
  "admin@merssh.com",
  "johnwick395979@gmail.com"
]; // Update this with the email you created in Firebase Auth

// Elements
const authScreen = document.getElementById('authScreen');
const adminPanel = document.getElementById('adminPanel');
const loginForm = document.getElementById('loginForm');
const adminEmailInput = document.getElementById('adminEmail');
const adminPasswordInput = document.getElementById('adminPassword');
const authError = document.getElementById('authError');
const adminUserEmail = document.getElementById('adminUserEmail');
const logoutBtn = document.getElementById('logoutBtn');

const loginBtn = loginForm?.querySelector('button[type="submit"]');

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

let currentAttemptEmail = null;

function getLockoutKey(email) {
  return `merssh_admin_lockout_${email.toLowerCase()}`;
}

function getAttemptsKey(email) {
  return `merssh_admin_attempts_${email.toLowerCase()}`;
}

function checkLockout(email) {
  const key = getLockoutKey(email);
  const lockoutData = localStorage.getItem(key);
  if (!lockoutData) return { locked: false };
  
  const data = JSON.parse(lockoutData);
  if (Date.now() < data.until) {
    const remaining = Math.ceil((data.until - Date.now()) / 60000);
    return { locked: true, remaining };
  } else {
    localStorage.removeItem(key);
    localStorage.removeItem(getAttemptsKey(email));
    return { locked: false };
  }
}

function recordFailedAttempt(email) {
  const attemptsKey = getAttemptsKey(email);
  const lockoutKey = getLockoutKey(email);
  let attempts = parseInt(localStorage.getItem(attemptsKey) || '0') + 1;
  localStorage.setItem(attemptsKey, attempts.toString());
  
  if (attempts >= MAX_ATTEMPTS) {
    const until = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem(lockoutKey, JSON.stringify({ until, attempts }));
    return { locked: true, remaining: 30 };
  }
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - attempts };
}

function clearAttempts(email) {
  localStorage.removeItem(getAttemptsKey(email));
  localStorage.removeItem(getLockoutKey(email));
}

// Auth state
onAuthStateChanged(auth, (user) => {
  if (user) {
    const userEmail = user.email?.toLowerCase();
    const isAdmin = ADMIN_EMAILS.some(email => email.toLowerCase() === userEmail);
    if (isAdmin) {
      if (authScreen) authScreen.classList.add('hidden');
      if (adminPanel) adminPanel.classList.remove('hidden');
      if (adminUserEmail) adminUserEmail.textContent = user.email;
      // Trigger loading of data
      window.dispatchEvent(new Event('adminAuthReady'));
    } else {
      if (authError) authError.textContent = `Access denied. ${user.email} is not an admin account.`;
      setTimeout(() => signOut(auth), 1500);
    }
  } else {
    if (authScreen) authScreen.classList.remove('hidden');
    if (adminPanel) adminPanel.classList.add('hidden');
  }
});

// Login
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!authError) return;
    authError.textContent = '';
    
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;
    currentAttemptEmail = email;
    
    if (!email || !password) {
      authError.textContent = 'Please enter email and password.';
      return;
    }
    
    // Check lockout
    const lockoutCheck = checkLockout(email);
    if (lockoutCheck.locked) {
      authError.textContent = `Too many failed attempts. Try again in ${lockoutCheck.remaining} minute(s).`;
      if (loginBtn) loginBtn.disabled = true;
      return;
    }
    
    if (loginBtn) {
      loginBtn.disabled = true;
      loginBtn.textContent = 'Signing in...';
    }
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      clearAttempts(email);
    } catch (error) {
      console.error('Login error:', error.code, error.message);
      const result = recordFailedAttempt(email);
      if (result.locked) {
        authError.textContent = `Too many failed attempts (5/5). Account locked for 30 minutes.`;
      } else if (error.code === 'auth/user-not-found') {
        authError.textContent = `User not found. ${result.attemptsLeft} attempt(s) remaining.`;
      } else if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        authError.textContent = `Invalid credentials. ${result.attemptsLeft} attempt(s) remaining before 30 min lockout.`;
      } else if (error.code === 'auth/invalid-email') {
        authError.textContent = 'Invalid email address.';
      } else {
        authError.textContent = `Login failed: ${error.message}`;
      }
    } finally {
      if (loginBtn) {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
      }
    }
  });
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth);
  });
}

// Update UI for lockout on input
if (adminEmailInput) {
  adminEmailInput.addEventListener('input', () => {
    const email = adminEmailInput.value.trim();
    if (!email) {
      if (authError) authError.textContent = '';
      if (loginBtn) loginBtn.disabled = false;
      return;
    }
    const lockoutCheck = checkLockout(email);
    if (lockoutCheck.locked) {
      if (authError) authError.textContent = `Account locked. Try again in ${lockoutCheck.remaining} minute(s).`;
      if (loginBtn) loginBtn.disabled = true;
    } else {
      if (authError) authError.textContent = '';
      if (loginBtn) loginBtn.disabled = false;
    }
  });
}
