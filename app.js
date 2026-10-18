Import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  getDatabase,
  ref,
  push,
  onChildAdded,
  onChildRemoved,
  onChildChanged,
  update,
  remove,
  onValue,
  onDisconnect,
  set,
  get
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.log("SW registration failed: ", err);
    });
  });
}

const firebaseConfig = {
  apiKey: "AIzaSyAF7j3fuI1PHTW2sUgcRYjQo8J5hwwV4mM",
  authDomain: "my-store-75b70.firebaseapp.com",
  databaseURL: "https://my-store-75b70-default-rtdb.firebaseio.com",
  projectId: "my-store-75b70",
  storageBucket: "my-store-75b70.firebasestorage.app",
  messagingSenderId: "762773021655",
  appId: "1:762773021655:web:ce1490aab54115d549e192",
  measurementId: "G-CT3FQN4BBK"
};

const MASTER_ADMIN_EMAIL = "ahmedmamdouh333388@gmail.com";
const TRANSFER_NUMBER = "01214563781";
const WHATSAPP_NUMBER = "201225428692";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

const $ = (id) => document.getElementById(id);

const loginScreen = $("login-screen");
const splashScreen = $("splash-screen");
const storeScreen = $("store-screen");
const authErrorMsg = $("auth-error-msg");
const settingsTriggerBtn = $("settings-trigger-btn");
const settingsPopupMenu = $("settings-popup-menu");
const adminAddProductBtn = $("admin-add-product-btn");
const adminProductFormBox = $("admin-product-form-box");
const productsGridContainer = $("products-grid-container");
const purchaseModal = $("purchase-modal");
const customConfirmModal = $("custom-confirm-modal");
const toastRegion = $("toast-region");
const chatPanel = $("chat-panel");
const chatMessagesArea = $("chat-messages-area");
const chatInputField = $("chat-input-field");
const chatLinkField = $("chat-link-field");
const chatSendBtn = $("chat-send-btn");
const chatComposeBox = $("chat-compose-box");
const userChatReadonly = $("user-chat-readonly");
const adminChatToggleBox = $("admin-chat-toggle-box");
const toggleChatPermissionCheckbox = $("toggle-chat-permission-checkbox");
const onlineCountEl = $("online-count");
const adminViewOnlineBtn = $("admin-view-online-btn");
const onlineUsersModal = $("online-users-modal");
const onlineUsersList = $("online-users-list");
const adminSettingsSection = $("admin-settings-section");
const newAdminEmailInput = $("new-admin-email");
const addAdminBtn = $("add-admin-btn");
const adminsListContainer = $("admins-list-container");
const bannedUserEmailInput = $("banned-user-email");
const banUserBtn = $("ban-user-btn");
const bannedListContainer = $("banned-list-container");

// تشغيل/إيقاف الصوت يدعماً للزر الدائري
const storeBgAudio = $("store-bg-audio");
const musicToggleBtn = $("music-toggle-btn");

musicToggleBtn.addEventListener("click", () => {
  if (storeBgAudio.paused) {
    storeBgAudio.play().then(() => {
      musicToggleBtn.classList.add("playing");
      musicToggleBtn.title = "إيقاف الصوت";
      toast("تم تشغيل الموسيقى 🎵");
    }).catch((err) => {
      console.error("Audio playback error:", err);
      toast("تعذر تشغيل الملف الصوتي.", true);
    });
  } else {
    storeBgAudio.pause();
    musicToggleBtn.classList.remove("playing");
    musicToggleBtn.title = "تشغيل الصوت";
    toast("تم إيقاف الموسيقى.");
  }
});

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;
let confirmCallback = null;
let chatAllowedForUsers = true;
let dynamicAdmins = new Set([MASTER_ADMIN_EMAIL]);
let bannedUsers = new Set();
let activeOnlineUsersMap = new Map();

const productDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم King Store."
  )}`;

function isAdmin() {
  if (!currentUser || !currentUser.email) return false;
  const email = currentUser.email.trim().toLowerCase();
  return email === MASTER_ADMIN_EMAIL.trim().toLowerCase() || dynamicAdmins.has(email);
}

function isBanned(email) {
  if (!email) return false;
  return bannedUsers.has(email.trim().toLowerCase());
}

function toast(message, isError = false) {
  const item = document.createElement("div");
  item.className = `toast${isError ? " error" : ""}`;
  item.textContent = message;
  toastRegion.appendChild(item);
  window.setTimeout(() => item.remove(), 3600);
}

function setFormMessage(message, isError = false) {
  const el = $("product-form-message");
  el.textContent = message;
  el.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function openSettings() {
  settingsPopupMenu.classList.toggle("active");
}

function showCustomConfirm(title, text, onYes) {
  $("confirm-title").textContent = title;
  $("confirm-text").textContent = text;
  confirmCallback = onYes;
  customConfirmModal.classList.add("active");
}

$("confirm-no-btn").addEventListener("click", () => {
  customConfirmModal.classList.remove("active");
  confirmCallback = null;
});

$("confirm-yes-btn").addEventListener("click", () => {
  customConfirmModal.classList.remove("active");
  if (confirmCallback) confirmCallback();
  confirmCallback = null;
});

async function handleGoogleLogin() {
  authErrorMsg.textContent = "";
  const btn = $("google-login-btn");
  btn.disabled = true;

  try {
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;
    
    const bannedSnap = await get(ref(db, `banned_users`));
    let isUserBanned = false;
    if (bannedSnap.exists()) {
      bannedSnap.forEach((child) => {
        if (child.val().email && child.val().email.trim().toLowerCase() === email.trim().toLowerCase()) {
          isUserBanned = true;
        }
      });
    }

    if (isUserBanned) {
      await signOut(auth);
      authErrorMsg.textContent = "عذراً، هذا الحساب محظور من دخول المتجر.";
      return;
    }

    currentUser = result.user;
  } catch (error) {
    console.error("Login Error:", error);
    if (error.code === 'auth/popup-blocked') {
      authErrorMsg.textContent = "تم حظر النافذة المنبثقة. يرجى السماح بها.";
    } else if (error.code === 'auth/popup-closed-by-user') {
      authErrorMsg.textContent = "تم إغلاق النافذة قبل اكتمال التسجيل.";
    } else {
      authErrorMsg.textContent = `تعذر تسجيل الدخول: ${error.message || error.code}`;
    }
  } finally {
    btn.disabled = false;
  }
}

$("google-login-btn").addEventListener("click", handleGoogleLogin);

onValue(ref(db, "admins"), (snapshot) => {
  dynamicAdmins = new Set([MASTER_ADMIN_EMAIL]);
  adminsListContainer.innerHTML = "";
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const email = child.val().email;
      if (email) {
        dynamicAdmins.add(email.trim().toLowerCase());
        renderAdminItem(child.key, email);
      }
    });
  }
  applyAdminPrivileges();
});

onValue(ref(db, "banned_users"), (snapshot) => {
  bannedUsers = new Set();
  bannedListContainer.innerHTML = "";
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const email = child.val().email;
      if (email) {
        bannedUsers.add(email.trim().toLowerCase());
        renderBannedItem(child.key, email);
      }
    });
  }
  if (currentUser && isBanned(currentUser.email)) {
    signOut(auth);
    toast("تم حظرك من الموقع.", true);
  }
});

function renderAdminItem(id, email) {
  const row = document.createElement("div");
  row.className = "admin-subitem";
  row.innerHTML = `<span>${email}</span>${email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase() ? `<button data-remove-admin="${id}"><i class="fa-solid fa-trash"></i></button>` : '<small>الرئيسي</small>'}`;
  adminsListContainer.appendChild(row);
}

function renderBannedItem(id, email) {
  const row = document.createElement("div");
  row.className = "admin-subitem";
  row.innerHTML = `<span>${email}</span><button data-unban="${id}"><i class="fa-solid fa-lock-open"></i> رفع الحظر</button>`;
  bannedListContainer.appendChild(row);
}

addAdminBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = newAdminEmailInput.value.trim().toLowerCase();
  if (!email || !email.includes("@")) return toast("أدخل بريداً صحيحاً.", true);
  try {
    await push(ref(db, "admins"), { email });
    newAdminEmailInput.value = "";
    toast("تمت إضافة المشرف بنجاح.");
  } catch {
    toast("تعذر إضافة المشرف.", true);
  }
});

banUserBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = bannedUserEmailInput.value.trim().toLowerCase();
  if (!email || !email.includes("@")) return toast("أدخل بريداً صحيحاً للحظر.", true);
  if (email === MASTER_ADMIN_EMAIL.toLowerCase()) return toast("لا يمكنك حظر المشرف الرئيسي!", true);
  try {
    await push(ref(db, "banned_users"), { email });
    bannedUserEmailInput.value = "";
    toast("تم حظر المستخدم بنجاح.");
  } catch {
    toast("تعذر حظر المستخدم.", true);
  }
});

adminsListContainer.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-remove-admin]");
  if (!btn || !isAdmin()) return;
  try {
    await remove(ref(db, `admins/${btn.dataset.removeAdmin}`));
    toast("تم إزالة المشرف بنجاح.");
  } catch {
    toast("تعذر إزالة المشرف.", true);
  }
});

bannedListContainer.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-unban]");
  if (!btn || !isAdmin()) return;
  try {
    await remove(ref(db, `banned_users/${btn.dataset.unban}`));
    toast("تم رفع الحظر عن المستخدم.");
  } catch {
    toast("تعذر رفع الحظر.", true);
  }
});

const chatPermissionRef = ref(db, "settings/chatAllowedForUsers");
onValue(chatPermissionRef, (snapshot) => {
  if (snapshot.exists()) {
    chatAllowedForUsers = snapshot.val();
  } else {
    set(chatPermissionRef, true);
    chatAllowedForUsers = true;
  }
  updateChatUIState();
});

toggleChatPermissionCheckbox.addEventListener("change", async () => {
  if (!isAdmin()) return;
  const newState = toggleChatPermissionCheckbox.checked;
  try {
    await set(chatPermissionRef, newState);
    toast(newState ? "تم السماح للمستخدمين بالكتابة." : "تم تعطيل الكتابة للمستخدمين.");
  } catch (error) {
    console.error("Permission error:", error);
    toggleChatPermissionCheckbox.checked = !newState;
    toast("تعذر تغيير الإذن.", true);
  }
});

const connectedRef = ref(db, ".info/connected");
const onlineUsersRef = ref(db, "online_users");

onValue(connectedRef, (snap) => {
  if (snap.val() === true && currentUser) {
    if (isBanned(currentUser.email)) {
      signOut(auth);
      return;
    }
    const userPresenceRef = push(onlineUsersRef);
    onDisconnect(userPresenceRef).remove();
    set(userPresenceRef, {
      onlineAt: Date.now(),
      email: currentUser.email || currentUser.displayName || "مستخدم مسجل"
    });
  }
});

onValue(onlineUsersRef, (snapshot) => {
  activeOnlineUsersMap.clear();
  let count = 0;
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      count++;
      activeOnlineUsersMap.set(child.key, child.val().email);
    });
  }
  if (onlineCountEl) {
    onlineCountEl.textContent = Math.max(1, count);
  }
  renderOnlineUsersModalList();
});

function renderOnlineUsersModalList() {
  if (!onlineUsersList) return;
  onlineUsersList.innerHTML = "";
  
  if (activeOnlineUsersMap.size === 0) {
    onlineUsersList.innerHTML = '<div class="empty-chat">لا يوجد مستخدمون متصلون حالياً.</div>';
    return;
  }

  activeOnlineUsersMap.forEach((email) => {
    const cleanEmail = email || "مستخدم مسجل";
    const row = document.createElement("div");
    row.className = "online-user-row";
    
    let actionsMarkup = "";
    if (isAdmin() && cleanEmail.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase()) {
      actionsMarkup = `
        <div class="online-user-actions">
          <button class="btn-inline-action btn-inline-admin" data-make-admin="${escapeHtml(cleanEmail)}">إشراف</button>
          <button class="btn-inline-action btn-inline-ban" data-ban-direct="${escapeHtml(cleanEmail)}">حظر</button>
        </div>
      `;
    }

    row.innerHTML = `
      <div class="online-user-info">
        <i class="fa-solid fa-circle" style="color:#22c55e;font-size:7px;"></i>
        <span>${escapeHtml(cleanEmail)}</span>
      </div>
      ${actionsMarkup}
    `;
    onlineUsersList.appendChild(row);
  });
}

onlineUsersModal.addEventListener("click", async (e) => {
  if (!isAdmin()) return;
  
  const banBtn = e.target.closest("[data-ban-direct]");
  const adminBtn = e.target.closest("[data-make-admin]");

  if (banBtn) {
    const emailToBan = banBtn.dataset.banDirect.trim().toLowerCase();
    showCustomConfirm("حظر مستخدم", `هل أنت متأكد من حظر المستخدم (${emailToBan})؟`, async () => {
      try {
        await push(ref(db, "banned_users"), { email: emailToBan });
        toast("تم حظر المستخدم بنجاح.");
      } catch {
        toast("تعذر حظر المستخدم.", true);
      }
    });
  }

  if (adminBtn) {
    const emailToAdmin = adminBtn.dataset.makeAdmin.trim().toLowerCase();
    showCustomConfirm("تعيين مشرف", `هل أنت متأكد من ترقية (${emailToAdmin}) إلى مشرف؟`, async () => {
      try {
        await push(ref(db, "admins"), { email: emailToAdmin });
        toast("تمت إضافة المشرف بنجاح.");
      } catch {
        toast("تعذر تعيين المشرف.", true);
      }
    });
  }
});

adminViewOnlineBtn.addEventListener("click", () => {
  if (!isAdmin()) return;
  onlineUsersModal.classList.add("active");
});

$("close-online-modal").addEventListener("click", () => {
  onlineUsersModal.classList.remove("active");
});

onlineUsersModal.addEventListener("click", (e) => {
  if (e.target === onlineUsersModal) onlineUsersModal.classList.remove("active");
});

settingsTriggerBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  openSettings();
});

settingsPopupMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  settingsPopupMenu.classList.remove("active");
});

$("menu-logout-trigger").addEventListener("click", async () => {
  try {
    settingsPopupMenu.classList.remove("active");
    await signOut(auth);
    toast("تم تسجيل الخروج.");
  } catch {
    toast("تعذر تسجيل الخروج.", true);
  }
});

$("language-toggle").addEventListener("click", () => {
  const root = $("html-root");
  const english = root.lang !== "en";

  root.lang = english ? "en" : "ar";
  root.dir = english ? "ltr" : "rtl";

  toast(english ? "تم تغيير اتجاه الصفحة." : "تم الرجوع للعرض العربي.");
  settingsPopupMenu.classList.remove("active");
});

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.className = button.dataset.theme;
    localStorage.setItem("king_store_theme", button.dataset.theme);
    settingsPopupMenu.classList.remove("active");
  });
});

const savedTheme = localStorage.getItem("king_store_theme");
if (savedTheme && /^theme-(blue|violet|mint|gold)$/.test(savedTheme)) {
  document.body.className = savedTheme;
  }
