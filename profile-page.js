(async () => {
  const STORAGE_KEY = "merssh-profile";
  const form = document.querySelector("#profile-form");
  const status = document.querySelector("#profile-status");
  const twoFAStatus = document.querySelector("#profile-2fa-status");
  const twoFABadge = document.querySelector("#profile-2fa-badge");
  const twoFATarget = document.querySelector("#profile-2fa-target");
  const twoFAAdminDisabled = document.querySelector("#2fa-admin-disabled");
  const twoFASetup = document.querySelector("#2fa-setup");
  const twoFANotVerified = document.querySelector("#2fa-not-verified");
  const twoFAVerified = document.querySelector("#2fa-verified");
  const send2faCodeBtn = document.querySelector("#send-2fa-code");
  const send2faMsg = document.querySelector("#send-2fa-msg");
  const codeInputWrap = document.querySelector("#2fa-code-input-wrap");
  const codeInput = document.querySelector("#2fa-code-input");
  const verify2faCodeBtn = document.querySelector("#verify-2fa-code");
  const resend2faCodeBtn = document.querySelector("#resend-2fa-code");
  const verify2faMsg = document.querySelector("#verify-2fa-msg");
  const verifiedAtEl = document.querySelector("#2fa-verified-at");
  const disable2faBtn = document.querySelector("#disable-2fa");
  const disable2faMsg = document.querySelector("#disable-2fa-msg");
  const ordersList = document.querySelector("#profile-orders-list");
  const ordersEmpty = document.querySelector("#profile-orders-empty");

  let currentUserEmail = null;
  let current2FAEmail = null;
  let current2FACode = null;
  let current2FACodeExpiry = null;
  let dbRef = null;
  let userDocRef = null;

  // 2FA login attempt limiting
  const MAX_2FA_ATTEMPTS = 5;
  const TWO_FA_LOCKOUT = 30 * 60 * 1000;
  function get2FALockKey(email) { return `merssh_2fa_lock_${email}`; }
  function get2FAAttemptsKey(email) { return `merssh_2fa_attempts_${email}`; }
  function check2FALock(email) {
    const data = localStorage.getItem(get2FALockKey(email));
    if (!data) return { locked: false };
    const parsed = JSON.parse(data);
    if (Date.now() < parsed.until) {
      return { locked: true, remaining: Math.ceil((parsed.until - Date.now()) / 60000) };
    }
    localStorage.removeItem(get2FALockKey(email));
    localStorage.removeItem(get2FAAttemptsKey(email));
    return { locked: false };
  }
  function record2FAAttempt(email) {
    const key = get2FAAttemptsKey(email);
    let attempts = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, attempts.toString());
    if (attempts >= MAX_2FA_ATTEMPTS) {
      localStorage.setItem(get2FALockKey(email), JSON.stringify({ until: Date.now() + TWO_FA_LOCKOUT }));
      return { locked: true };
    }
    return { locked: false, left: MAX_2FA_ATTEMPTS - attempts };
  }
  function clear2FAAttempts(email) {
    localStorage.removeItem(get2FAAttemptsKey(email));
    localStorage.removeItem(get2FALockKey(email));
  }

  if (!(form instanceof HTMLFormElement) || !(status instanceof HTMLElement)) return;

  // Load from localStorage first
  try {
    const savedProfile = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    if (savedProfile && typeof savedProfile === "object") {
      if (form.elements.namedItem("name")) form.elements.namedItem("name").value = typeof savedProfile.name === "string" ? savedProfile.name : "";
      if (form.elements.namedItem("email")) form.elements.namedItem("email").value = typeof savedProfile.email === "string" ? savedProfile.email : "";
      if (form.elements.namedItem("phone")) form.elements.namedItem("phone").value = typeof savedProfile.phone === "string" ? savedProfile.phone : "";
      if (form.elements.namedItem("address")) form.elements.namedItem("address").value = typeof savedProfile.address === "string" ? savedProfile.address : "";
      if (form.elements.namedItem("city")) form.elements.namedItem("city").value = typeof savedProfile.city === "string" ? savedProfile.city : "";
    }
  } catch (error) {
    status.textContent = "We couldn't load your saved details. Please check your browser storage settings.";
    console.error("Unable to load the saved profile.", error);
  }

  // Load from Firestore if available
  try {
    const { db, auth } = await import('./firebase-init.js');
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
    dbRef = db;
    
    // Hide auth section if logged in
    onAuthStateChanged(auth, (user) => {
      const authSection = document.getElementById('customerAuthContainer');
      const loginRequired = document.getElementById('profile-login-required');
      const profileContent = document.getElementById('profile-content');
      if (user && authSection) {
        authSection.style.display = 'none';
        if (loginRequired) loginRequired.style.display = 'none';
        if (profileContent) profileContent.style.display = 'block';
      } else if (!user && authSection) {
        authSection.style.display = 'block';
        if (loginRequired) loginRequired.style.display = 'block';
        if (profileContent) profileContent.style.display = 'none';
      }
    });
    
    const savedProfile = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    if (savedProfile.email) {
      currentUserEmail = savedProfile.email.toLowerCase();
      const userDoc = await getDoc(doc(db, 'users', currentUserEmail));
      userDocRef = doc(db, 'users', currentUserEmail);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (form.elements.namedItem("name") && !form.elements.namedItem("name").value) {
          form.elements.namedItem("name").value = userData.fullName || "";
        }
        if (form.elements.namedItem("email")) form.elements.namedItem("email").value = userData.email || savedProfile.email;
        if (form.elements.namedItem("phone")) form.elements.namedItem("phone").value = userData.phone || savedProfile.phone || "";
        if (form.elements.namedItem("address")) form.elements.namedItem("address").value = userData.address || savedProfile.address || "";
        if (form.elements.namedItem("city")) form.elements.namedItem("city").value = userData.city || savedProfile.city || "";
        
        current2FAEmail = userData.twoFactorAuth?.email || userData.email || currentUserEmail;
        
        // Show 2FA status
        if (twoFAStatus && twoFABadge && twoFATarget) {
          if (userData.twoFactorAuth?.enabled) {
            twoFAStatus.textContent = "Email 2FA is enabled for this account";
            twoFABadge.textContent = "ENABLED";
            twoFABadge.className = "status-badge status-confirmed";
            twoFABadge.style.display = "inline-block";
            twoFATarget.textContent = `Codes will be sent to: ${current2FAEmail}`;
            twoFATarget.style.display = "block";
            
            if (twoFAAdminDisabled) twoFAAdminDisabled.style.display = "none";
            if (twoFASetup) twoFASetup.style.display = "block";
            
            if (userData.twoFactorAuth?.verified) {
              if (twoFANotVerified) twoFANotVerified.style.display = "none";
              if (twoFAVerified) {
                twoFAVerified.style.display = "block";
                if (verifiedAtEl && userData.twoFactorAuth?.verifiedAt?.toDate) {
                  verifiedAtEl.textContent = `Verified on: ${userData.twoFactorAuth.verifiedAt.toDate().toLocaleString()}`;
                } else if (verifiedAtEl) {
                  verifiedAtEl.textContent = "Email 2FA verified";
                }
              }
            } else {
              if (twoFANotVerified) twoFANotVerified.style.display = "block";
              if (twoFAVerified) twoFAVerified.style.display = "none";
            }
          } else {
            twoFAStatus.textContent = "Email 2FA is not enabled";
            twoFABadge.textContent = "DISABLED";
            twoFABadge.className = "status-badge status-pending";
            twoFABadge.style.display = "inline-block";
            twoFATarget.style.display = "none";
            if (twoFAAdminDisabled) twoFAAdminDisabled.style.display = "block";
            if (twoFASetup) twoFASetup.style.display = "none";
          }
        }
      } else {
        if (twoFAStatus) twoFAStatus.textContent = "Profile not linked. Save your profile to sync.";
        if (twoFAAdminDisabled) twoFAAdminDisabled.style.display = "block";
      }
      
      // Load orders
      if (ordersList && ordersEmpty) {
        const { collection, getDocs, query, orderBy } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const ordersSnapshot = await getDocs(query(collection(db, 'orders'), orderBy('createdAt', 'desc')));
        let userOrders = [];
        ordersSnapshot.forEach(doc => {
          const order = doc.data();
          if (order.customer?.email?.toLowerCase() === savedProfile.email.toLowerCase()) {
            userOrders.push({ id: doc.id, ...order });
          }
        });
        
        if (userOrders.length === 0) {
          ordersEmpty.style.display = 'block';
        } else {
          ordersEmpty.style.display = 'none';
          const formatPrice = (amount) => new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          }).format(amount);
          
          userOrders.slice(0, 5).forEach(order => {
            const div = document.createElement('div');
            div.style.cssText = 'padding: 1rem; border: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;';
            const orderDateStr = order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A';
            const statusClass = `status-${order.status || 'pending'}`;
            div.innerHTML = `
              <div>
                <div style="font-weight: 500; margin-bottom: 0.25rem;">Order #${order.id.substring(0,8)}</div>
                <div style="font-size: 0.875rem; color: var(--muted);">${orderDateStr} • ${order.items?.length || 0} items • ${formatPrice(order.total || 0)}</div>
              </div>
              <span class="status-badge ${statusClass}">${order.status || 'pending'}</span>
            `;
            ordersList.appendChild(div);
          });
        }
      }
    } else {
      if (twoFAStatus) twoFAStatus.textContent = "Add your email to see 2FA status.";
      if (ordersEmpty) ordersEmpty.style.display = 'block';
    }
  } catch (error) {
    console.warn('Could not sync with Firestore:', error);
    if (twoFAStatus) twoFAStatus.textContent = "Unable to check 2FA status.";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const profile = {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim().toLowerCase(),
      phone: String(formData.get("phone") || "").trim(),
      address: String(formData.get("address") || "").trim(),
      city: String(formData.get("city") || "").trim(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      status.textContent = "Saving profile...";
      
      // Sync to Firestore
      try {
        const { db } = await import('./firebase-init.js');
        const { doc, setDoc, getDoc, Timestamp } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        dbRef = db;
        
        const userRef = doc(db, 'users', profile.email);
        const existingDoc = await getDoc(userRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : {};
        
        await setDoc(userRef, {
          fullName: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          city: profile.city,
          updatedAt: Timestamp.now(),
          createdAt: existingData.createdAt || Timestamp.now(),
          twoFactorAuth: existingData.twoFactorAuth || { enabled: false, verified: false }
        }, { merge: true });
        
        status.textContent = "Your profile has been saved and synced.";
        // Reload page to refresh 2FA UI
        setTimeout(() => location.reload(), 800);
      } catch (firestoreError) {
        console.warn('Firestore sync failed:', firestoreError);
        status.textContent = "Profile saved locally.";
      }
    } catch (error) {
      status.textContent = "We couldn't save your details. Please check your browser storage settings.";
      console.error("Unable to save the profile.", error);
    }
  });

  // Sign out button
  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign out';
  signOutBtn.className = 'btn-secondary signout-btn';
  signOutBtn.style.cssText = 'margin-top: 1rem; padding: 0.6rem 1rem;';
  signOutBtn.addEventListener('click', async () => {
    const { auth } = await import('./firebase-init.js');
    const { signOut } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js");
    await signOut(auth);
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  });
  const profileContent = document.getElementById('profile-content');
  if (profileContent) {
    const existingSignout = profileContent.querySelector('.signout-btn');
    if (existingSignout) existingSignout.remove();
    profileContent.appendChild(signOutBtn);
  }

  // 2FA Handlers
  if (send2faCodeBtn) {
    send2faCodeBtn.addEventListener('click', async () => {
      if (!currentUserEmail || !userDocRef) {
        send2faMsg.textContent = "Please save your profile first.";
        send2faMsg.style.color = "var(--danger)";
        return;
      }
      
      const lock = check2FALock(currentUserEmail);
      if (lock.locked) {
        send2faMsg.textContent = `Too many attempts. Try again in ${lock.remaining} minute(s).`;
        send2faMsg.style.color = "var(--danger)";
        return;
      }
      
      send2faCodeBtn.disabled = true;
      send2faCodeBtn.textContent = "Sending...";
      send2faMsg.textContent = "";
      
      try {
        const { getDoc, updateDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        if (!userData.twoFactorAuth?.enabled) {
          send2faMsg.textContent = "Email 2FA is not enabled by admin for this account.";
          send2faMsg.style.color = "var(--danger)";
          send2faCodeBtn.disabled = false;
          send2faCodeBtn.textContent = "Send Verification Code";
          return;
        }
        
        // Generate 6-digit code
        current2FACode = String(Math.floor(100000 + Math.random() * 900000));
        current2FACodeExpiry = Date.now() + 5 * 60 * 1000; // 5 minutes
        
        current2FAEmail = userData.twoFactorAuth.email || userData.email || currentUserEmail;
        
        // Store code temporarily (in real app, send via email service)
        await updateDoc(userDocRef, {
          'twoFactorAuth.pendingCode': current2FACode,
          'twoFactorAuth.codeExpiry': current2FACodeExpiry
        });
        
        clear2FAAttempts(currentUserEmail);
        send2faMsg.textContent = `Verification code sent to ${current2FAEmail}`;
        send2faMsg.style.color = "var(--success)";
        alert(`DEMO: Your 2FA verification code is: ${current2FACode}\n\n(This would be emailed in production)`);
        
        if (codeInputWrap) codeInputWrap.style.display = "flex";
        codeInput.value = "";
        codeInput.focus();
      } catch (error) {
        console.error(error);
        send2faMsg.textContent = "Error sending code. Please try again.";
        send2faMsg.style.color = "var(--danger)";
      }
      
      send2faCodeBtn.disabled = false;
      send2faCodeBtn.textContent = "Send Verification Code";
    });
  }
  
  if (verify2faCodeBtn) {
    verify2faCodeBtn.addEventListener('click', async () => {
      if (!currentUserEmail || !userDocRef) {
        verify2faMsg.textContent = "Please save your profile first.";
        verify2faMsg.style.color = "var(--danger)";
        return;
      }
      
      const lock = check2FALock(currentUserEmail);
      if (lock.locked) {
        verify2faMsg.textContent = `Too many failed attempts. Try again in ${lock.remaining} minute(s).`;
        verify2faMsg.style.color = "var(--danger)";
        return;
      }
      
      const enteredCode = codeInput.value.trim();
      if (enteredCode.length !== 6) {
        verify2faMsg.textContent = "Please enter a 6-digit code.";
        verify2faMsg.style.color = "var(--danger)";
        return;
      }
      
      verify2faCodeBtn.disabled = true;
      verify2faCodeBtn.textContent = "Verifying...";
      verify2faMsg.textContent = "";
      
      try {
        const { getDoc, updateDoc, Timestamp } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        
        if (Date.now() > (userData.twoFactorAuth.codeExpiry || 0)) {
          verify2faMsg.textContent = "Code has expired. Please request a new code.";
          verify2faMsg.style.color = "var(--danger)";
          verify2faCodeBtn.disabled = false;
          verify2faCodeBtn.textContent = "Verify Code";
          return;
        }
        
        if (enteredCode === userData.twoFactorAuth.pendingCode) {
          clear2FAAttempts(currentUserEmail);
          await updateDoc(userDocRef, {
            'twoFactorAuth.verified': true,
            'twoFactorAuth.verifiedAt': Timestamp.now(),
            'twoFactorAuth.pendingCode': null,
            'twoFactorAuth.codeExpiry': null
          });
          
          verify2faMsg.textContent = "Email 2FA verified successfully!";
          verify2faMsg.style.color = "var(--success)";
          
          setTimeout(() => location.reload(), 1000);
        } else {
          const res = record2FAAttempt(currentUserEmail);
          if (res.locked) {
            verify2faMsg.textContent = "Too many failed attempts. Locked for 30 minutes.";
          } else {
            verify2faMsg.textContent = `Invalid code. ${res.left} attempt(s) remaining.`;
          }
          verify2faMsg.style.color = "var(--danger)";
        }
      } catch (error) {
        console.error(error);
        verify2faMsg.textContent = "Error verifying code.";
        verify2faMsg.style.color = "var(--danger)";
      }
      
      verify2faCodeBtn.disabled = false;
      verify2faCodeBtn.textContent = "Verify Code";
    });
  }
  
  if (resend2faCodeBtn) {
    resend2faCodeBtn.addEventListener('click', () => {
      if (send2faCodeBtn) send2faCodeBtn.click();
    });
  }
  
  if (disable2faBtn) {
    disable2faBtn.addEventListener('click', async () => {
      if (!confirm("Are you sure you want to disable email 2FA? This will make your account less secure.")) return;
      
      disable2faBtn.disabled = true;
      disable2faBtn.textContent = "Disabling...";
      disable2faMsg.textContent = "";
      
      try {
        const { updateDoc } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
        await updateDoc(userDocRef, {
          'twoFactorAuth.verified': false,
          'twoFactorAuth.pendingCode': null,
          'twoFactorAuth.codeExpiry': null,
          'twoFactorAuth.verifiedAt': null
        });
        
        disable2faMsg.textContent = "Email 2FA has been disabled.";
        disable2faMsg.style.color = "var(--success)";
        setTimeout(() => location.reload(), 1000);
      } catch (error) {
        console.error(error);
        disable2faMsg.textContent = "Error disabling 2FA.";
        disable2faMsg.style.color = "var(--danger");
      }
      
      disable2faBtn.disabled = false;
      disable2faBtn.textContent = "Disable Email 2FA";
    });
  }
})();
