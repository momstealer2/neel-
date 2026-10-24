import { auth, db } from './firebase-init.js';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Login attempt limiting
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

function getLockoutKey(email) {
  return `merssh_customer_lockout_${email.toLowerCase()}`;
}

function getAttemptsKey(email) {
  return `merssh_customer_attempts_${email.toLowerCase()}`;
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

// Elements
const authContainer = document.getElementById('customerAuthContainer');
const authTabs = document.querySelectorAll('.auth-tab');
const authTabContents = document.querySelectorAll('.auth-tab-content');
const signUpForm = document.getElementById('signUpForm');
const signInForm = document.getElementById('signInForm');
const signUpBtn = signUpForm?.querySelector('button[type="submit"]');
const signInBtn = signInForm?.querySelector('button[type="submit"]');
const signUpError = document.getElementById('signUpError');
const signInError = document.getElementById('signInError');

// 2FA Elements
const twoFAModal = document.getElementById('customer2FAModal');
const twoFAEmailDisplay = document.getElementById('customer2FAEmail');
const sendCustomer2FABtn = document.getElementById('sendCustomer2FACode');
const sendCustomer2FAMsg = document.getElementById('sendCustomer2FAMsg');
const customer2FACodeWrap = document.getElementById('customer2FACodeWrap');
const customer2FACodeInput = document.getElementById('customer2FACodeInput');
const verifyCustomer2FABtn = document.getElementById('verifyCustomer2FACode');
const customer2FAVerifyMsg = document.getElementById('customer2FAVerifyMsg');

let pendingUser = null;
let pendingEmail = null;

// Tab switching
authTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    authTabs.forEach(t => { 
      t.classList.remove('active'); 
      t.style.background = 'transparent'; 
      t.style.color = 'var(--muted)'; 
    });
    authTabContents.forEach(tc => tc.style.display = 'none');
    tab.classList.add('active');
    tab.style.background = 'var(--ink)';
    tab.style.color = 'white';
    const tabContent = document.getElementById(tab.dataset.tab + 'Tab');
    if (tabContent) tabContent.style.display = 'block';
    if (signUpError) { signUpError.textContent = ''; signUpError.style.color = 'var(--danger)'; }
    if (signInError) { signInError.textContent = ''; signInError.style.color = 'var(--danger)'; }
  });
});

// Sign Up
if (signUpForm) {
  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!signUpError) return;
    signUpError.textContent = '';
    signUpError.style.color = 'var(--danger)';
    
    const email = document.getElementById('signUpEmail').value.trim();
    const password = document.getElementById('signUpPassword').value;
    const confirmPassword = document.getElementById('signUpConfirmPassword').value;
    const fullName = document.getElementById('signUpName').value.trim();
    const phone = document.getElementById('signUpPhone').value.trim();
    const enable2FA = document.getElementById('enable2FAOnSignup')?.checked || false;
    
    if (!fullName) {
      signUpError.textContent = 'Please enter your full name.';
      return;
    }
    if (!phone) {
      signUpError.textContent = 'Please enter your mobile number.';
      return;
    }
    
    if (password !== confirmPassword) {
      signUpError.textContent = 'Passwords do not match.';
      return;
    }
    
    if (password.length < 6) {
      signUpError.textContent = 'Password must be at least 6 characters.';
      return;
    }
    
    if (signUpBtn) {
      signUpBtn.disabled = true;
      signUpBtn.textContent = 'Creating account...';
    }
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create user profile in Firestore with all necessary info
      await setDoc(doc(db, 'users', email.toLowerCase()), {
        fullName,
        email: email.toLowerCase(),
        phone,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        twoFactorAuth: {
          enabled: enable2FA,
          verified: false,
          email: email.toLowerCase()
        },
        authMethod: 'email',
        profileComplete: true
      });
      
      // Send email verification
      await sendEmailVerification(user);
      
      signUpError.textContent = 'Account created successfully! Please verify your email. You can now log in.';
      signUpError.style.color = 'var(--success)';
      signUpForm.reset();
      if (document.getElementById('enable2FAOnSignup')) document.getElementById('enable2FAOnSignup').checked = false;
      // Switch to sign in tab
      setTimeout(() => {
        document.querySelectorAll('.auth-tab').forEach(t => { t.classList.remove('active'); t.style.background = 'transparent'; t.style.color = 'var(--muted)'; });
        document.querySelectorAll('.auth-tab-content').forEach(tc => tc.style.display = 'none');
        const loginTab = document.querySelector('.auth-tab[data-tab="signIn"]');
        if (loginTab) { loginTab.classList.add('active'); loginTab.style.background = 'var(--ink)'; loginTab.style.color = 'white'; }
        const loginContent = document.getElementById('signInTab');
        if (loginContent) loginContent.style.display = 'block';
        document.getElementById('signInEmail').value = email;
      }, 1800);
    } catch (error) {
      signUpError.style.color = 'var(--danger)';
      if (error.code === 'auth/email-already-in-use') {
        signUpError.textContent = 'Email already in use. Please log in instead.';
      } else if (error.code === 'auth/invalid-email') {
        signUpError.textContent = 'Invalid email address.';
      } else if (error.code === 'auth/weak-password') {
        signUpError.textContent = 'Password is too weak.';
      } else {
        signUpError.textContent = error.message;
      }
    } finally {
      if (signUpBtn) {
        signUpBtn.disabled = false;
        signUpBtn.textContent = 'Sign up';
      }
    }
  });
}

// Sign In
if (signInForm) {
  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!signInError) return;
    signInError.textContent = '';
    signInError.style.color = 'var(--danger)';
    
    const email = document.getElementById('signInEmail').value.trim();
    const password = document.getElementById('signInPassword').value;
    if (!email || !password) {
      signInError.textContent = 'Please enter your email and password.';
      return;
    }
    pendingEmail = email.toLowerCase();
    
    // Check lockout
    const lockoutCheck = checkLockout(email);
    if (lockoutCheck.locked) {
      signInError.textContent = `Too many failed attempts. Try again in ${lockoutCheck.remaining} minute(s).`;
      if (signInBtn) signInBtn.disabled = true;
      return;
    }
    
    if (signInBtn) {
      signInBtn.disabled = true;
      signInBtn.textContent = 'Signing in...';
    }
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if user has 2FA enabled
      const userDoc = await getDoc(doc(db, 'users', pendingEmail));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.twoFactorAuth?.enabled && userData.twoFactorAuth?.verified) {
      // Require 2FA
      pendingUser = user;
      clearAttempts(email);
      if (twoFAEmailDisplay) twoFAEmailDisplay.textContent = userData.twoFactorAuth.email || email;
      if (twoFAModal) {
        twoFAModal.style.display = 'flex';
        twoFAModal.classList.add('active');
      }
      if (signInBtn) {
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign In';
      }
      return;
    }
      }
      
      clearAttempts(email);
      // Redirect or reload
      window.location.reload();
    } catch (error) {
      const result = recordFailedAttempt(email);
      if (result.locked) {
        signInError.textContent = `Too many failed attempts (5/5). Account locked for 30 minutes.`;
      } else {
        signInError.textContent = `Invalid credentials. ${result.attemptsLeft} attempt(s) remaining before 30 min lockout.`;
      }
    } finally {
      if (signInBtn && !pendingUser) {
        signInBtn.disabled = false;
        signInBtn.textContent = 'Sign In';
      }
    }
  });
}

// 2FA for customer login
const MAX_2FA_LOGIN_ATTEMPTS = 5;
const TWO_FA_LOGIN_LOCKOUT = 30 * 60 * 1000;

function get2FALoginLockKey(email) { return `merssh_cust_2fa_lock_${email.toLowerCase()}`; }
function get2FALoginAttemptsKey(email) { return `merssh_cust_2fa_attempts_${email.toLowerCase()}`; }
function check2FALoginLock(email) {
  const data = localStorage.getItem(get2FALoginLockKey(email));
  if (!data) return { locked: false };
  const parsed = JSON.parse(data);
  if (Date.now() < parsed.until) {
    return { locked: true, remaining: Math.ceil((parsed.until - Date.now()) / 60000) };
  }
  localStorage.removeItem(get2FALoginLockKey(email));
  localStorage.removeItem(get2FALoginAttemptsKey(email));
  return { locked: false };
}
function record2FALoginAttempt(email) {
  const key = get2FALoginAttemptsKey(email);
  let attempts = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, attempts.toString());
  if (attempts >= MAX_2FA_LOGIN_ATTEMPTS) {
    localStorage.setItem(get2FALoginLockKey(email), JSON.stringify({ until: Date.now() + TWO_FA_LOGIN_LOCKOUT }));
    return { locked: true };
  }
  return { locked: false, left: MAX_2FA_LOGIN_ATTEMPTS - attempts };
}
function clear2FALoginAttempts(email) {
  localStorage.removeItem(get2FALoginAttemptsKey(email));
  localStorage.removeItem(get2FALoginLockKey(email));
}

if (sendCustomer2FABtn) {
  sendCustomer2FABtn.addEventListener('click', async () => {
    if (!pendingEmail) return;
    const lock = check2FALoginLock(pendingEmail);
    if (lock.locked) {
      if (sendCustomer2FAMsg) {
        sendCustomer2FAMsg.textContent = `Too many attempts. Try again in ${lock.remaining} minute(s).`;
        sendCustomer2FAMsg.style.color = 'var(--danger)';
      }
      return;
    }
    
    sendCustomer2FABtn.disabled = true;
    sendCustomer2FABtn.textContent = 'Sending...';
    if (sendCustomer2FAMsg) sendCustomer2FAMsg.textContent = '';
    
    try {
      const code = String(Math.floor(100000 + Math.random() * 900000));
      await updateDoc(doc(db, 'users', pendingEmail), {
        'twoFactorAuth.loginCode': code,
        'twoFactorAuth.loginCodeExpiry': Date.now() + 5 * 60 * 1000
      });
      
      clear2FALoginAttempts(pendingEmail);
      if (sendCustomer2FAMsg) {
        sendCustomer2FAMsg.textContent = 'Code sent to your email.';
        sendCustomer2FAMsg.style.color = 'var(--success)';
      }
      alert(`DEMO: Your login 2FA code is: ${code}`);
      if (customer2FACodeWrap) customer2FACodeWrap.style.display = 'flex';
    } catch (error) {
      if (sendCustomer2FAMsg) {
        sendCustomer2FAMsg.textContent = 'Error sending code.';
        sendCustomer2FAMsg.style.color = 'var(--danger)';
      }
    }
    
    sendCustomer2FABtn.disabled = false;
    sendCustomer2FABtn.textContent = 'Send Code';
  });
}

if (verifyCustomer2FABtn) {
  verifyCustomer2FABtn.addEventListener('click', async () => {
    if (!pendingEmail) return;
    const lock = check2FALoginLock(pendingEmail);
    if (lock.locked) {
      if (customer2FAVerifyMsg) {
        customer2FAVerifyMsg.textContent = `Too many failed attempts. Try again in ${lock.remaining} minute(s).`;
        customer2FAVerifyMsg.style.color = 'var(--danger)';
      }
      return;
    }
    
    const code = customer2FACodeInput.value.trim();
    if (code.length !== 6) {
      if (customer2FAVerifyMsg) {
        customer2FAVerifyMsg.textContent = 'Enter 6-digit code.';
        customer2FAVerifyMsg.style.color = 'var(--danger)';
      }
      return;
    }
    
    verifyCustomer2FABtn.disabled = true;
    verifyCustomer2FABtn.textContent = 'Verifying...';
    
    try {
      const userDoc = await getDoc(doc(db, 'users', pendingEmail));
      const userData = userDoc.data();
      
      if (Date.now() > (userData.twoFactorAuth.loginCodeExpiry || 0)) {
        if (customer2FAVerifyMsg) {
          customer2FAVerifyMsg.textContent = 'Code expired. Request new code.';
          customer2FAVerifyMsg.style.color = 'var(--danger)';
        }
        verifyCustomer2FABtn.disabled = false;
        verifyCustomer2FABtn.textContent = 'Verify & Sign In';
        return;
      }
      
      if (code === userData.twoFactorAuth.loginCode) {
        clear2FALoginAttempts(pendingEmail);
        await updateDoc(doc(db, 'users', pendingEmail), {
          'twoFactorAuth.loginCode': null,
          'twoFactorAuth.loginCodeExpiry': null
        });
        window.location.reload();
      } else {
        const res = record2FALoginAttempt(pendingEmail);
        if (res.locked) {
          if (customer2FAVerifyMsg) {
            customer2FAVerifyMsg.textContent = 'Too many failed attempts. Locked for 30 minutes.';
            customer2FAVerifyMsg.style.color = 'var(--danger)';
          }
        } else {
          if (customer2FAVerifyMsg) {
            customer2FAVerifyMsg.textContent = `Invalid code. ${res.left} attempt(s) remaining.`;
            customer2FAVerifyMsg.style.color = 'var(--danger)';
          }
        }
      }
    } catch (error) {
      if (customer2FAVerifyMsg) {
        customer2FAVerifyMsg.textContent = 'Error verifying.';
        customer2FAVerifyMsg.style.color = 'var(--danger)';
      }
    }
    
    verifyCustomer2FABtn.disabled = false;
    verifyCustomer2FABtn.textContent = 'Verify & Sign In';
  });
}

// Google Sign In
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

const googleSignInBtn = document.getElementById('googleSignInBtn');
const googleSignUpBtn = document.getElementById('googleSignUpBtn');

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', async () => {
    googleSignInBtn.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      window.location.reload();
    } catch (error) {
      alert('Google sign in failed. Please try again.');
    } finally {
      googleSignInBtn.disabled = false;
    }
  });
}
if (googleSignUpBtn) {
  googleSignUpBtn.addEventListener('click', async () => {
    googleSignUpBtn.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      await setDoc(doc(db, 'users', user.email.toLowerCase()), {
        fullName: user.displayName || '',
        email: user.email.toLowerCase(),
        phone: user.phoneNumber || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        twoFactorAuth: { enabled: false, verified: false, email: user.email.toLowerCase() },
        authMethod: 'google',
        profileComplete: true
      }, { merge: true });
      window.location.reload();
    } catch (error) {
      alert('Google sign up failed. Please try again.');
    } finally {
      googleSignUpBtn.disabled = false;
    }
  });
}

// Email input lockout check
const signInEmailInput = document.getElementById('signInEmail');
if (signInEmailInput) {
  signInEmailInput.addEventListener('input', () => {
    const email = signInEmailInput.value.trim();
    if (!email) {
      if (signInError) signInError.textContent = '';
      if (signInBtn) signInBtn.disabled = false;
      return;
    }
    const lockoutCheck = checkLockout(email);
    if (lockoutCheck.locked) {
      if (signInError) {
        signInError.textContent = `Account locked. Try again in ${lockoutCheck.remaining} minute(s).`;
        signInError.style.color = 'var(--danger)';
      }
      if (signInBtn) signInBtn.disabled = true;
    } else {
      if (signInError) signInError.textContent = '';
      if (signInBtn) signInBtn.disabled = false;
    }
  });
}
