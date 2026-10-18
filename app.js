

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

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
  set,
  get,
  onValue,
  onChildAdded,
  onChildRemoved,
  onChildChanged,
  onDisconnect,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

/* إعدادات Firebase */

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

const ADMIN_EMAIL = "ahmedmamdouh333388@gmail.com";
const TRANSFER_NUMBER = "01214563781";
const WHATSAPP_NUMBER = "201225428692";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/* تشغيل Firebase */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

/* اختصارات العناصر */

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
const toastRegion = $("toast-region");

const chatPanel = $("chat-panel");
const chatMessagesArea = $("chat-messages-area");
const chatInputField = $("chat-input-field");
const chatLinkField = $("chat-link-field");
const chatSendBtn = $("chat-send-btn");
const adminChatCompose = $("admin-chat-compose");
const userChatReadonly = $("user-chat-readonly");

const onlineUsersCount = $("online-users-count");
const onlineUsersEyeBtn = $("online-users-eye-btn");
const onlineUsersModal = $("online-users-modal");
const onlineUsersList = $("online-users-list");

const adminSettingsTools = $("admin-settings-tools");
const adminSettingsMessage = $("admin-settings-message");

const chatToggleWritingBtn = $("chat-toggle-writing-btn");
const chatClosedNotice = $("chat-closed-notice");

/* حالة التطبيق */

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;

let chatWritingEnabled = true;
let isOnline = false;
let authReady = false;
let userIsBanned = false;

const productDataById = new Map();
const adminUIDs = new Set();
const presenceConnections = new Map();

const productUnsubscribers = [];
const appUnsubscribers = [];

let userDirectoryCache = {};
let productsLoaded = false;
let chatHistoryLoaded = false;
let presenceInitialized = false;
let presenceConnectionRef = null;
let adminListReady = false;

/* مراجع قاعدة البيانات */

const adminsRef = ref(db, "admins");
const productsRef = ref(db, "products");
const messagesRef = ref(db, "messages");
const presenceRef = ref(db, "presence");
const chatSettingsRef = ref(db, "settings/chatWritingEnabled");

/* أدوات عامة */

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم King Store."
  )}`;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isPrimaryAdmin() {
  return Boolean(
    currentUser &&
    normalizeEmail(currentUser.email) === normalizeEmail(ADMIN_EMAIL)
  );
}

function isAdmin() {
  return Boolean(
    currentUser &&
    (isPrimaryAdmin() || adminUIDs.has(currentUser.uid))
  );
}

function toast(message, isError = false) {
  if (!toastRegion) return;

  const item = document.createElement("div");
  item.className = `toast${isError ? " error" : ""}`;
  item.textContent = String(message || "");

  toastRegion.appendChild(item);

  window.setTimeout(() => {
    item.remove();
  }, 3600);
}

function setFormMessage(message, isError = false) {
  const element = $("product-form-message");
  if (!element) return;

  element.textContent = message || "";
  element.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function setAdminSettingsMessage(message, isError = false) {
  if (!adminSettingsMessage) return;

  adminSettingsMessage.textContent = message || "";
  adminSettingsMessage.style.color =
    isError ? "var(--danger)" : "var(--muted)";
}

function setConnectionStatus(online) {
  const element = $("connection-status");
  if (!element) return;

  element.classList.toggle("offline", !online);

  element.innerHTML = online
    ? '<i class="fa-solid fa-circle"></i> متصل'
    : '<i class="fa-solid fa-circle"></i> غير متصل';
}

function openSettings() {
  settingsPopupMenu?.classList.toggle("active");
}

function showStoreScreen() {
  if (!currentUser || userIsBanned) return;

  loginScreen.style.display = "none";
  splashScreen.style.display = "none";
  storeScreen.style.display = "block";

  $("menu-user-img").src = currentUser.photoURL || "";

  $("menu-user-name").textContent =
    currentUser.displayName || "مستخدم King Store";

  $("menu-user-email").textContent = currentUser.email || "";

  applyAdminPrivileges();
}

/* تسجيل الدخول باستخدام Google */

async function handleGoogleLogin() {
  authErrorMsg.textContent = "جاري فتح نافذة تسجيل الدخول...";

  try {
    await signInWithPopup(auth, provider);
    authErrorMsg.textContent = "";
  } catch (error) {
    console.error("Login Error:", error);

    authErrorMsg.textContent =
      error.code === "auth/popup-closed-by-user"
        ? "تم إغلاق نافذة تسجيل الدخول."
        : `تعذر تسجيل الدخول: ${error.message || error.code}`;
  }
}

$("google-login-btn").addEventListener("click", handleGoogleLogin);

/* تحميل قائمة المشرفين */

const unsubscribeAdmins = onValue(
  adminsRef,
  (snapshot) => {
    adminUIDs.clear();

    if (snapshot.exists()) {
      snapshot.forEach((child) => {
        if (child.key) adminUIDs.add(child.key);
      });
    }

    adminListReady = true;

    if (currentUser && authReady) {
      applyAdminPrivileges();
    }
  },
  (error) => {
    console.error("Admins listener error:", error);
  }
);

appUnsubscribers.push(unsubscribeAdmins);

/* ملف المستخدم */

async function registerUserProfile(user) {
  const profileRef = ref(db, `userDirectory/${user.uid}`);

  await update(profileRef, {
    email: normalizeEmail(user.email),
    displayName: user.displayName || "مستخدم King Store",
    photoURL: user.photoURL || "",
    lastSeen: Date.now()
  });
}

/* التحقق من الحظر */

async function checkIfUserIsBanned(user) {
  const bannedRef = ref(db, `blockedUsers/${user.uid}`);
  const snapshot = await get(bannedRef);

  return snapshot.exists() && snapshot.val()?.blocked === true;
}

/* حالة الاتصال الفعلية */

async function startPresence(user) {
  const connectedRef = ref(db, ".info/connected");

  const unsubscribe = onValue(
    connectedRef,
    async (snapshot) => {
      isOnline = snapshot.val() === true;
      setConnectionStatus(isOnline);

      if (!isOnline) return;
      if (!currentUser || currentUser.uid !== user.uid) return;

      try {
        const connectionRef = push(
          ref(db, `presence/${user.uid}`)
        );

        const detailsRef = ref(
          db,
          `presenceDetails/${user.uid}/${connectionRef.key}`
        );

        await onDisconnect(connectionRef).remove();
        await onDisconnect(detailsRef).remove();

        await set(connectionRef, {
          connectedAt: Date.now()
        });

        await set(detailsRef, {
          email: normalizeEmail(user.email),
          displayName: user.displayName || "مستخدم King Store",
          photoURL: user.photoURL || "",
          connectedAt: Date.now()
        });

        presenceConnectionRef = connectionRef;

        presenceConnections.set(connectionRef.key, {
          connectionRef,
          detailsRef
        });
      } catch (error) {
        console.error("Presence setup error:", error);
      }
    },
    (error) => {
      console.error("Connection status error:", error);
      setConnectionStatus(false);
    }
  );

  appUnsubscribers.push(unsubscribe);
}

async function clearPresence() {
  const removals = [];

  presenceConnections.forEach(({ connectionRef, detailsRef }) => {
    removals.push(remove(connectionRef).catch(() => {}));
    removals.push(remove(detailsRef).catch(() => {}));
  });

  presenceConnections.clear();
  presenceConnectionRef = null;

  await Promise.all(removals);
}

/* عداد المتصلين */

const unsubscribePresence = onValue(
  presenceRef,
  (snapshot) => {
    const uniqueUIDs = new Set();

    snapshot.forEach((userSnapshot) => {
      if (userSnapshot.exists()) {
        uniqueUIDs.add(userSnapshot.key);
      }
    });

    if (onlineUsersCount) {
      onlineUsersCount.textContent = String(uniqueUIDs.size);
    }
  },
  (error) => {
    console.error("Presence listener error:", error);

    if (onlineUsersCount) {
      onlineUsersCount.textContent = "—";
    }
  }
);

appUnsubscribers.push(unsubscribePresence);

/* نافذة قائمة المتصلين */

onlineUsersEyeBtn?.addEventListener("click", async () => {
  if (!isAdmin()) {
    toast("هذه القائمة للمشرف فقط.", true);
    return;
  }

  onlineUsersModal?.classList.add("active");
  await loadOnlineUsers();
});

$("close-online-users-modal")?.addEventListener("click", () => {
  onlineUsersModal?.classList.remove("active");
});

onlineUsersModal?.addEventListener("click", (event) => {
  if (event.target === onlineUsersModal) {
    onlineUsersModal.classList.remove("active");
  }
});

async function loadOnlineUsers() {
  if (!isAdmin() || !onlineUsersList) return;

  onlineUsersList.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <strong>جاري تحميل المتصلين...</strong>
    </div>`;

  try {
    const [presenceSnapshot, detailsSnapshot] = await Promise.all([
      get(presenceRef),
      get(ref(db, "presenceDetails"))
    ]);

    if (!isAdmin()) return;

    const users = [];

    presenceSnapshot.forEach((userSnapshot) => {
      const uid = userSnapshot.key;
      if (!uid) return;

      const connections = detailsSnapshot.child(uid);
      if (!connections.exists()) return;

      let latest = null;

      connections.forEach((connection) => {
        const data = connection.val();

        if (
          !latest ||
          (data.connectedAt || 0) > (latest.connectedAt || 0)
        ) {
          latest = data;
        }
      });

      if (latest) {
        users.push({
          uid,
          email: latest.email || "بريد غير متاح",
          displayName: latest.displayName || "مستخدم"
        });
      }
    });

    onlineUsersList.replaceChildren();

    if (users.length === 0) {
      onlineUsersList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-user-slash"></i>
          <strong>لا يوجد مستخدمون متصلون حاليًا</strong>
        </div>`;
      return;
    }

    users.forEach((user) => {
      const row = document.createElement("div");
      row.className = "online-user-row";

      const avatar = document.createElement("div");
      avatar.className = "online-user-avatar";
      avatar.innerHTML = '<i class="fa-solid fa-user"></i>';

      const info = document.createElement("div");
      info.className = "online-user-info";

      const name = document.createElement("strong");
      name.textContent = user.displayName;

      const email = document.createElement("small");
      email.textContent = user.email;

      info.append(name, email);

      const state = document.createElement("span");
      state.className = "online-user-state";
      state.innerHTML = '<i class="fa-solid fa-circle"></i> متصل';

      row.append(avatar, info, state);
      onlineUsersList.appendChild(row);
    });
  } catch (error) {
    console.error("Loading online users failed:", error);

    onlineUsersList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <strong>تعذر تحميل المتصلين</strong>
        <span>راجع صلاحيات قاعدة بيانات Firebase.</span>
      </div>`;
  }
}

/* متابعة تسجيل الدخول والحظر */

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  authReady = true;
  userIsBanned = false;

  if (!user) {
    await clearPresence();

    if (loginScreen) loginScreen.style.display = "flex";
    if (splashScreen) splashScreen.style.display = "none";
    if (storeScreen) storeScreen.style.display = "none";

    settingsPopupMenu?.classList.remove("active");
    onlineUsersModal?.classList.remove("active");

    applyAdminPrivileges();
    sessionStorage.removeItem("king_splash_shown");
    return;
  }

  try {
    await registerUserProfile(user);
    userIsBanned = await checkIfUserIsBanned(user);
  } catch (error) {
    console.error("User initialization error:", error);
    toast("تعذر التحقق من حالة الحساب. أعد المحاولة.", true);
    return;
  }

  if (userIsBanned) {
    await clearPresence();

    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }

    loginScreen.style.display = "flex";
    storeScreen.style.display = "none";
    splashScreen.style.display = "none";

    authErrorMsg.textContent = "هذا الحساب محظور من استخدام المتجر.";
    return;
  }

  const alreadyShown = sessionStorage.getItem("king_splash_shown");

  if (!alreadyShown) {
    splashScreen.style.display = "flex";
    loginScreen.style.display = "none";
    storeScreen.style.display = "none";

    window.setTimeout(() => {
      if (!currentUser || userIsBanned) return;

      showStoreScreen();
      sessionStorage.setItem("king_splash_shown", "true");
    }, 700);
  } else {
    showStoreScreen();
  }

  await startPresence(user);
});
function applyAdminPrivileges() {
  const admin = isAdmin();

  if (adminAddProductBtn) {
    adminAddProductBtn.hidden = !admin;
    adminAddProductBtn.style.display = admin ? "" : "none";
  }

  if (adminProductFormBox) {
    adminProductFormBox.hidden = !admin;
    adminProductFormBox.style.display =
      admin && editingProductId !== null ? "" : "none";
  }

  if (adminSettingsTools) {
    adminSettingsTools.hidden = !admin;
    adminSettingsTools.style.display = admin ? "" : "none";
  }

  if (onlineUsersEyeBtn) {
    onlineUsersEyeBtn.hidden = !admin;
    onlineUsersEyeBtn.style.display = admin ? "" : "none";
  }

  if (chatToggleWritingBtn) {
    chatToggleWritingBtn.hidden = !admin;
    chatToggleWritingBtn.style.display = admin ? "" : "none";
  }

  updateChatWritingUI();
  renderAllProducts();
}

/* ---------- إظهار حالة الكتابة في الشات ---------- */

function updateChatWritingUI() {
  const admin = isAdmin();

  if (chatClosedNotice) {
    chatClosedNotice.hidden = chatWritingEnabled;
    chatClosedNotice.style.display =
      chatWritingEnabled ? "none" : "";
    chatClosedNotice.textContent =
      "الكتابة في الشات متوقفة حاليًا من الإدارة.";
  }

  if (chatToggleWritingBtn) {
    chatToggleWritingBtn.textContent = chatWritingEnabled
      ? "إيقاف الكتابة في الشات"
      : "تفعيل الكتابة في الشات";

    chatToggleWritingBtn.disabled = !admin;
  }

  if (adminChatCompose) {
    adminChatCompose.hidden = !admin;
    adminChatCompose.style.display = admin ? "" : "none";
  }

  if (userChatReadonly) {
    userChatReadonly.hidden = !chatWritingEnabled;
    userChatReadonly.style.display =
      chatWritingEnabled ? "none" : "";
  }

  const userCompose = $("user-chat-compose");

  if (userCompose) {
    userCompose.hidden = admin || !chatWritingEnabled;
    userCompose.style.display =
      !admin && chatWritingEnabled ? "" : "none";
  }

  if (chatInputField) {
    chatInputField.disabled = !admin && !chatWritingEnabled;
  }

  if (chatSendBtn) {
    chatSendBtn.disabled = !admin && !chatWritingEnabled;
  }
}

/* ---------- قائمة الإعدادات ---------- */

if (settingsTriggerBtn && settingsPopupMenu) {
  settingsTriggerBtn.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen =
      settingsPopupMenu.classList.toggle("show");

    settingsPopupMenu.hidden = !isOpen;
    settingsTriggerBtn.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });
}

document.addEventListener("click", (event) => {
  if (
    settingsPopupMenu &&
    settingsTriggerBtn &&
    !settingsPopupMenu.contains(event.target) &&
    !settingsTriggerBtn.contains(event.target)
  ) {
    settingsPopupMenu.classList.remove("show");
    settingsPopupMenu.hidden = true;
    settingsTriggerBtn.setAttribute("aria-expanded", "false");
  }
});

/* ---------- تسجيل الخروج ---------- */

const logoutButton =
  $("logout-btn") ||
  $("logout-button") ||
  $("sign-out-btn");

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    try {
      await clearPresence();
      await signOut(auth);
      showToast("تم تسجيل الخروج بنجاح", "success");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("تعذر تسجيل الخروج، حاول مرة أخرى", "error");
    }
  });
}

/* ---------- تغيير الألوان ---------- */

function applyTheme(themeName) {
  const allowedThemes = [
    "theme-blue",
    "theme-violet",
    "theme-mint",
    "theme-gold"
  ];

  if (!allowedThemes.includes(themeName)) {
    themeName = "theme-blue";
  }

  document.body.classList.remove(...allowedThemes);
  document.body.classList.add(themeName);
}

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.theme;
    applyTheme(theme);
  });
});

/* ---------- إضافة أدمن ---------- */

const addAdminButton =
  $("add-admin-btn") ||
  $("admin-add-admin-btn");

const adminEmailInput =
  $("admin-email-input") ||
  $("new-admin-email");

if (addAdminButton) {
  addAdminButton.addEventListener("click", async () => {
    if (!isAdmin()) {
      showToast("هذه الصلاحية للأدمن فقط", "error");
      return;
    }

    const email = adminEmailInput?.value
      ?.trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      showToast("اكتب بريدًا إلكترونيًا صحيحًا", "error");
      return;
    }

    try {
      const usersSnapshot = await get(ref(db, "users"));
      let targetUID = null;

      if (usersSnapshot.exists()) {
        usersSnapshot.forEach((child) => {
          const user = child.val();

          if (
            String(user?.email || "").toLowerCase() === email
          ) {
            targetUID = child.key;
          }
        });
      }

      if (!targetUID) {
        showToast(
          "المستخدم غير موجود. يجب أن يسجل الدخول مرة واحدة أولًا.",
          "error"
        );
        return;
      }

      await set(ref(db, `admins/${targetUID}`), true);

      if (adminEmailInput) {
        adminEmailInput.value = "";
      }

      showToast("تمت إضافة الأدمن بنجاح", "success");
    } catch (error) {
      console.error("Add admin error:", error);
      showToast(
        "تعذرت إضافة الأدمن. راجع صلاحيات Firebase.",
        "error"
      );
    }
  });
}

/* ---------- حظر وإلغاء حظر مستخدم ---------- */

const banUserButton =
  $("ban-user-btn") ||
  $("admin-ban-user-btn");

const banEmailInput =
  $("ban-user-email") ||
  $("ban-email-input");

const unbanUserButton =
  $("unban-user-btn") ||
  $("admin-unban-user-btn");

const unbanEmailInput =
  $("unban-user-email") ||
  $("unban-email-input");

async function setUserBanByEmail(emailValue, banned) {
  if (!isAdmin()) {
    showToast("هذه الصلاحية للأدمن فقط", "error");
    return;
  }

  const email = String(emailValue || "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    showToast("اكتب البريد الإلكتروني بشكل صحيح", "error");
    return;
  }

  try {
    const usersSnapshot = await get(ref(db, "users"));
    let targetUID = null;

    if (usersSnapshot.exists()) {
      usersSnapshot.forEach((child) => {
        const user = child.val();

        if (
          String(user?.email || "").toLowerCase() === email
        ) {
          targetUID = child.key;
        }
      });
    }

    if (!targetUID) {
      showToast("لم يتم العثور على هذا المستخدم", "error");
      return;
    }

    await set(ref(db, `bannedUsers/${targetUID}`), {
      banned,
      email,
      updatedAt: Date.now(),
      updatedBy: currentUser?.uid || null
    });

    showToast(
      banned
        ? "تم حظر المستخدم"
        : "تم إلغاء حظر المستخدم",
      "success"
    );
  } catch (error) {
    console.error("Ban management error:", error);
    showToast(
      "تعذر تنفيذ العملية. راجع قواعد Firebase.",
      "error"
    );
  }
}

if (banUserButton) {
  banUserButton.addEventListener("click", async () => {
    await setUserBanByEmail(
      banEmailInput?.value,
      true
    );

    if (banEmailInput) banEmailInput.value = "";
  });
}

if (unbanUserButton) {
  unbanUserButton.addEventListener("click", async () => {
    await setUserBanByEmail(
      unbanEmailInput?.value,
      false
    );

    if (unbanEmailInput) unbanEmailInput.value = "";
  });
}

/* ---------- نموذج إضافة وتعديل المنتجات ---------- */

const productForm =
  $("product-form") ||
  $("admin-product-form");

const productNameInput =
  $("product-name") ||
  $("product-title");

const productDescriptionInput =
  $("product-description");

const productPriceInput =
  $("product-price");

const productImageInput =
  $("product-image") ||
  $("product-image-input");

const productImageUrlInput =
  $("product-image-url");

const productCategoryInput =
  $("product-category");

const productSaveButton =
  $("product-save-btn") ||
  $("save-product-btn");

const productCancelButton =
  $("product-cancel-btn") ||
  $("cancel-product-edit");

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]
  );
}

function showToast(message, type = "info") {
  if (!toastRegion) {
    console.log(`[${type}] ${message}`);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "status");

  toastRegion.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}

function resetProductForm() {
  editingProductId = null;

  if (productForm) {
    productForm.reset();
  }

  if (adminProductFormBox) {
    adminProductFormBox.style.display = "none";
    adminProductFormBox.hidden = true;
  }

  if (productSaveButton) {
    productSaveButton.textContent = "حفظ المنتج";
    productSaveButton.disabled = false;
  }

  if (adminAddProductBtn) {
    adminAddProductBtn.hidden = !isAdmin();
  }
}

if (adminAddProductBtn) {
  adminAddProductBtn.addEventListener("click", () => {
    if (!isAdmin()) {
      showToast("غير مسموح لك بإضافة المنتجات", "error");
      return;
    }

    resetProductForm();

    if (adminProductFormBox) {
      adminProductFormBox.hidden = false;
      adminProductFormBox.style.display = "";
    }

    adminProductFormBox?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

if (productCancelButton) {
  productCancelButton.addEventListener(
    "click",
    resetProductForm
  );
}

if (productImageInput) {
  productImageInput.addEventListener("change", () => {
    const file = productImageInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("اختر ملف صورة صالحًا", "error");
      productImageInput.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showToast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "error");
      productImageInput.value = "";
      return;
    }
  });
}

/* ---------- رفع صورة المنتج ---------- */

async function uploadProductImage(file, productId) {
  if (!file) return "";

  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_TYPE");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const safeName = file.name
    .replace(/[^\w.-]/g, "_")
    .slice(0, 100);

  const imagePath =
    `products/${productId}/${Date.now()}_${safeName}`;

  const imageReference = storageRef(storage, imagePath);

  await uploadBytes(imageReference, file, {
    contentType: file.type
  });

  return await getDownloadURL(imageReference);
}

/* ---------- حفظ المنتج ---------- */

if (productForm) {
  productForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isAdmin()) {
      showToast("إضافة المنتجات متاحة للأدمن فقط", "error");
      return;
    }

    const name = productNameInput?.value?.trim() || "";
    const description =
      productDescriptionInput?.value?.trim() || "";

    const price = Number(productPriceInput?.value);

    const category =
      productCategoryInput?.value?.trim() || "عام";

    const selectedFile = productImageInput?.files?.[0] || null;

    const existingProduct = editingProductId
      ? productDataById.get(editingProductId)
      : null;

    const imageURLFromInput =
      productImageUrlInput?.value?.trim() || "";

    if (!name) {
      showToast("اكتب اسم المنتج أولًا", "error");
      productNameInput?.focus();
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      showToast("اكتب سعرًا صحيحًا للمنتج", "error");
      productPriceInput?.focus();
      return;
    }

    if (selectedFile && selectedFile.size > MAX_IMAGE_SIZE) {
      showToast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "error");
      return;
    }

    if (productSaveButton) {
      productSaveButton.disabled = true;
      productSaveButton.textContent = "جارٍ الحفظ...";
    }

    try {
      const productId =
        editingProductId || push(productsRef).key;

      if (!productId) {
        throw new Error("PRODUCT_ID_CREATION_FAILED");
      }

      let image = existingProduct?.image || "";

      if (selectedFile) {
        image = await uploadProductImage(
          selectedFile,
          productId
        );
      } else if (imageURLFromInput) {
        image = imageURLFromInput;
      }

      const productData = {
        name,
        description,
        price,
        category,
        image,
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid || null
      };

      if (!existingProduct) {
        productData.createdAt = Date.now();
        productData.createdBy = currentUser?.uid || null;
      }

      await set(
        ref(db, `products/${productId}`),
        productData
      );

      showToast(
        editingProductId
          ? "تم تحديث المنتج بنجاح"
          : "تمت إضافة المنتج بنجاح",
        "success"
      );

      resetProductForm();
    } catch (error) {
      console.error("Save product error:", error);

      if (error.message === "IMAGE_TOO_LARGE") {
        showToast("حجم الصورة يجب ألا يتجاوز 5 ميجابايت", "error");
      } else if (error.message === "INVALID_IMAGE_TYPE") {
        showToast("الملف المختار ليس صورة صالحة", "error");
      } else {
        showToast(
          "تعذر حفظ المنتج. تحقق من اتصال Firebase وصلاحياته.",
          "error"
        );
      }
    } finally {
      if (productSaveButton) {
        productSaveButton.disabled = false;
        productSaveButton.textContent = editingProductId
          ? "حفظ التعديلات"
          : "حفظ المنتج";
      }
    }
  });
}

/* ---------- استقبال المنتجات دون تكرار المستمعين ---------- */

function renderAllProducts() {
  if (!productsGridContainer) return;

  const products = Array.from(productDataById.entries());

  if (!products.length) {
    productsGridContainer.innerHTML =
      '<p class="empty-products">لا توجد منتجات متاحة حاليًا.</p>';
    return;
  }

  productsGridContainer.innerHTML = products
    .map(([id, product]) => renderProductCard(id, product))
    .join("");
}

function renderProductCard(id, product) {
  const safeId = escapeHtml(id);
  const name = escapeHtml(product.name || "منتج");
  const description = escapeHtml(product.description || "");
  const category = escapeHtml(product.category || "عام");
  const price = Number(product.price || 0);
  const image = String(product.image || "").trim();

  const imageMarkup = image
    ? `<img src="${escapeHtml(image)}" alt="${name}" loading="lazy" referrerpolicy="no-referrer">`
    : '<div class="product-image-placeholder">لا توجد صورة</div>';

  const adminControls = isAdmin()
    ? `
      <div class="product-admin-actions">
        <button type="button" class="btn-edit-product" data-action="edit" data-id="${safeId}">تعديل</button>
        <button type="button" class="btn-delete-product" data-action="delete" data-id="${safeId}">حذف</button>
      </div>
    `
    : "";

  return `
    <article class="product-card" data-product-id="${safeId}">
      <div class="product-image">${imageMarkup}</div>
      <div class="product-content">
        <span class="product-category">${category}</span>
        <h3 class="product-title">${name}</h3>
        <p class="product-description">${description}</p>
        <div class="product-price">${price.toLocaleString("ar-EG")} جنيه</div>
        <button type="button" class="btn-buy-product" data-action="buy" data-id="${safeId}">
          شراء المنتج
        </button>
        ${adminControls}
      </div>
    </article>
  `;
}

let productsListenerStarted = false;

function startProductsListener() {
  if (productsListenerStarted) return;
  productsListenerStarted = true;

  const unsubscribeAdded = onChildAdded(
    productsRef,
    (snapshot) => {
      productDataById.set(snapshot.key, snapshot.val() || {});
      productsLoaded = true;
      renderAllProducts();
    },
    (error) => {
      console.error("Products listener error:", error);
      showToast("تعذر تحميل المنتجات", "error");
    }
  );

  const unsubscribeChanged = onChildChanged(
    productsRef,
    (snapshot) => {
      productDataById.set(snapshot.key, snapshot.val() || {});
      renderAllProducts();
    },
    (error) => {
      console.error("Product update listener error:", error);
    }
  );

  const unsubscribeRemoved = onChildRemoved(
    productsRef,
    (snapshot) => {
      productDataById.delete(snapshot.key);
      renderAllProducts();
    },
    (error) => {
      console.error("Product removal listener error:", error);
    }
  );

  productUnsubscribers.push(
    unsubscribeAdded,
    unsubscribeChanged,
    unsubscribeRemoved
  );
}

startProductsListener();

/* ---------- تعديل وحذف المنتجات ---------- */

if (productsGridContainer) {
  productsGridContainer.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.dataset.action;
    const productId = button.dataset.id;

    if (!productId) return;

    const product = productDataById.get(productId);
    if (!product) {
      showToast("المنتج لم يعد متاحًا", "error");
      return;
    }

    if (action === "buy") {
      if (typeof openPurchaseModal === "function") {
        openPurchaseModal(productId, product);
      } else {
        showToast("نافذة الشراء غير جاهزة بعد", "error");
      }
      return;
    }

    if (!isAdmin()) {
      showToast("هذه العملية للأدمن فقط", "error");
      return;
    }

    if (action === "edit") {
      editingProductId = productId;

      if (productNameInput) {
        productNameInput.value = product.name || "";
      }

      if (productDescriptionInput) {
        productDescriptionInput.value =
          product.description || "";
      }

      if (productPriceInput) {
        productPriceInput.value = product.price ?? "";
      }

      if (productCategoryInput) {
        productCategoryInput.value =
          product.category || "";
      }

      if (productImageUrlInput) {
        productImageUrlInput.value = "";
      }

      if (productSaveButton) {
        productSaveButton.textContent = "حفظ التعديلات";
      }

      if (adminProductFormBox) {
        adminProductFormBox.hidden = false;
        adminProductFormBox.style.display = "";
        adminProductFormBox.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

      return;
    }

    if (action === "delete") {
      const confirmed = window.confirm(
        `هل أنت متأكد من حذف المنتج "${product.name || ""}"؟`
      );

      if (!confirmed) return;

      button.disabled = true;

      try {
        await remove(ref(db, `products/${productId}`));
        showToast("تم حذف المنتج", "success");
      } catch (error) {
        console.error("Delete product error:", error);
        showToast(
          "تعذر حذف المنتج. تحقق من صلاحيات Firebase.",
          "error"
        );
      } finally {
        button.disabled = false;
      }
    }
  });
}

/* ---------- نافذة شراء المنتج ---------- */

const purchaseProductName =
  $("purchase-product-name");

const purchaseProductPrice =
  $("purchase-product-price");

const purchaseBuyerName =
  $("purchase-buyer-name");

const purchaseBuyerPhone =
  $("purchase-buyer-phone");

const purchaseModalClose =
  $("purchase-modal-close") ||
  $("close-purchase-modal");

const purchaseCancelButton =
  $("purchase-cancel-btn");

const purchaseConfirmButton =
  $("purchase-confirm-btn");

const receiptImageInput =
  $("receipt-image-input") ||
  $("transfer-receipt-image");

const receiptUploadButton =
  $("receipt-upload-btn");

const TRANSFER_NUMBER = "01214563781";
const WHATSAPP_NUMBER = "201225428692";

function openPurchaseModal(productId, product) {
  if (!purchaseModal) {
    showToast("نافذة الشراء غير موجودة في HTML", "error");
    return;
  }

  currentPurchase = {
    id: productId,
    product
  };

  if (purchaseProductName) {
    purchaseProductName.textContent =
      product.name || "المنتج";
  }

  if (purchaseProductPrice) {
    purchaseProductPrice.textContent =
      `${Number(product.price || 0).toLocaleString("ar-EG")} جنيه`;
  }

  purchaseModal.hidden = false;
  purchaseModal.style.display = "flex";
  purchaseModal.setAttribute("aria-hidden", "false");
}

function closePurchaseModal() {
  if (!purchaseModal) return;

  purchaseModal.hidden = true;
  purchaseModal.style.display = "none";
  purchaseModal.setAttribute("aria-hidden", "true");

  currentPurchase = null;
}

if (purchaseModalClose) {
  purchaseModalClose.addEventListener(
    "click",
    closePurchaseModal
  );
}

if (purchaseCancelButton) {
  purchaseCancelButton.addEventListener(
    "click",
    closePurchaseModal
  );
}

if (purchaseModal) {
  purchaseModal.addEventListener("click", (event) => {
    if (event.target === purchaseModal) {
      closePurchaseModal();
    }
  });
}

if (purchaseConfirmButton) {
  purchaseConfirmButton.addEventListener("click", () => {
    if (!currentPurchase) {
      showToast("اختر المنتج أولًا", "error");
      return;
    }

    const product = currentPurchase.product;

    const buyerName =
      purchaseBuyerName?.value?.trim() || "";

    const buyerPhone =
      purchaseBuyerPhone?.value?.trim() || "";

    const message = [
      "طلب شراء جديد من King Store",
      `المنتج: ${product.name || "غير محدد"}`,
      `السعر: ${Number(product.price || 0)} جنيه`,
      `اسم المشتري: ${buyerName || "لم يُذكر"}`,
      `رقم المشتري: ${buyerPhone || "لم يُذكر"}`,
      `رقم التحويل: ${TRANSFER_NUMBER}`,
      "سأرسل صورة إيصال التحويل بعد إتمام الدفع."
    ].join("\n");

    const whatsappURL =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    GenUI.openUrl(whatsappURL);
  });
}

/* ---------- اختيار صورة إيصال التحويل ---------- */

if (receiptImageInput) {
  receiptImageInput.addEventListener("change", () => {
    const file = receiptImageInput.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showToast("اختر صورة إيصال صحيحة", "error");
      receiptImageInput.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showToast(
        "حجم الصورة يجب ألا يتجاوز 5 ميجابايت",
        "error"
      );
      receiptImageInput.value = "";
    }
  });
}

if (receiptUploadButton) {
  receiptUploadButton.addEventListener("click", () => {
    const file = receiptImageInput?.files?.[0];

    if (!file) {
      showToast("اختر صورة إيصال التحويل أولًا", "error");
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      showToast("حجم الصورة أكبر من 5 ميجابايت", "error");
      return;
    }

    const message = [
      "إيصال تحويل خاص بطلب من King Store",
      `اسم المستخدم: ${currentUser?.displayName || "غير محدد"}`,
      `المنتج: ${currentPurchase?.product?.name || "يرجى تحديد المنتج في الرسالة"}`
    ].join("\n");

    const whatsappURL =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    /*
      واتساب لا يتيح إرفاق ملف محلي تلقائيًا من رابط wa.me.
      فتح المحادثة لا يرسل الصورة وحده؛ أرفق الصورة يدويًا
      داخل واتساب بعد فتح المحادثة.
    */

    GenUI.openUrl(whatsappURL);
    showToast(
      "أرفق صورة الإيصال يدويًا داخل محادثة واتساب",
      "info"
    );
  });
}

/* ---------- إعدادات الكتابة في الشات ---------- */

let chatSettingsListenerStarted = false;

function startChatSettingsListener() {
  if (chatSettingsListenerStarted) return;
  chatSettingsListenerStarted = true;

  onValue(
    chatSettingsRef,
    (snapshot) => {
      /*
        القيمة الافتراضية تسمح بالكتابة إذا لم يُنشأ
        إعداد الشات في قاعدة البيانات بعد.
      */
      chatWritingEnabled = snapshot.exists()
        ? snapshot.val() === true
        : true;

      updateChatWritingUI();
    },
    (error) => {
      console.error("Chat settings listener error:", error);

      // عند فشل القراءة، نوقف كتابة المستخدمين العاديين.
      chatWritingEnabled = false;
      updateChatWritingUI();
    }
  );
}

startChatSettingsListener();

if (chatToggleWritingBtn) {
  chatToggleWritingBtn.addEventListener("click", async () => {
    if (!isAdmin()) {
      showToast("هذه الصلاحية للأدمن فقط", "error");
      return;
    }

    try {
      const nextValue = !chatWritingEnabled;

      await set(chatSettingsRef, nextValue);

      chatWritingEnabled = nextValue;
      updateChatWritingUI();

      showToast(
        nextValue
          ? "تم تفعيل الكتابة في الشات"
          : "تم إيقاف الكتابة في الشات",
        "success"
      );
    } catch (error) {
      console.error("Toggle chat writing error:", error);

      showToast(
        "تعذر تغيير الإعداد. تحقق من صلاحيات Firebase.",
        "error"
      );
    }
  });
}

/* ---------- إنشاء مربع كتابة المستخدم ---------- */

function ensureUserChatComposer() {
  if (!chatPanel || $("user-chat-compose")) return;

  const composer = document.createElement("div");
  composer.id = "user-chat-compose";
  composer.className = "user-chat-compose";

  composer.innerHTML = `
    <input
      id="user-chat-input"
      type="text"
      maxlength="1000"
      placeholder="اكتب رسالتك..."
      autocomplete="off"
      aria-label="رسالة الشات"
    >
    <button id="user-chat-send-btn" type="button">
      إرسال
    </button>
  `;

  chatPanel.appendChild(composer);

  const input = $("user-chat-input");
  const sendButton = $("user-chat-send-btn");

  if (sendButton) {
    sendButton.addEventListener("click", () => {
      sendChatMessage(input?.value || "", "user", input);
    });
  }

  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendChatMessage(input.value, "user", input);
      }
    });
  }

  updateChatWritingUI();
}

ensureUserChatComposer();

/* ---------- إرسال الرسائل ---------- */

async function sendChatMessage(
  rawText,
  senderType = "user",
  inputElement = null
) {
  const text = String(rawText || "").trim();

  if (!currentUser) {
    showToast("سجل الدخول أولًا لإرسال الرسائل", "error");
    return;
  }

  if (userIsBanned) {
    showToast("حسابك غير مسموح له باستخدام الشات", "error");
    return;
  }

  if (!text) {
    showToast("اكتب رسالة أولًا", "error");
    return;
  }

  if (text.length > 1000) {
    showToast("الرسالة طويلة جدًا", "error");
    return;
  }

  const admin = isAdmin();

  if (!admin && !chatWritingEnabled) {
    showToast("الكتابة في الشات متوقفة حاليًا", "error");
    return;
  }

  const messageData = {
    text,
    uid: currentUser.uid,
    name: currentUser.displayName || "مستخدم",
    email: currentUser.email || "",
    createdAt: Date.now(),
    senderType: admin ? "admin" : "user"
  };

  try {
    const newMessageRef = push(messagesRef);
    await set(newMessageRef, messageData);

    if (inputElement) {
      inputElement.value = "";
    } else if (chatInputField) {
      chatInputField.value = "";
    }
  } catch (error) {
    console.error("Send message error:", error);

    showToast(
      "تعذر إرسال الرسالة. تحقق من اتصال Firebase.",
      "error"
    );
  }
}

if (chatSendBtn) {
  chatSendBtn.addEventListener("click", () => {
    sendChatMessage(
      chatInputField?.value || "",
      "admin",
      chatInputField
    );
  });
}

if (chatInputField) {
  chatInputField.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      sendChatMessage(
        chatInputField.value,
        "admin",
        chatInputField
      );
    }
  });
}

/* ---------- عرض رسائل الشات ---------- */

function renderChatMessage(messageId, message) {
  if (!chatMessagesArea) return;

  const existing = chatMessagesArea.querySelector(
    `[data-message-id="${CSS.escape(messageId)}"]`
  );

  if (existing) existing.remove();

  const wrapper = document.createElement("div");
  wrapper.className = "chat-message";
  wrapper.dataset.messageId = messageId;

  const senderUID = String(message.uid || "");
  const ownMessage =
    Boolean(currentUser) && senderUID === currentUser.uid;

  const admin = isAdmin();
  const timestamp = Number(message.createdAt || 0);

  const canDelete =
    admin ||
    (
      ownMessage &&
      timestamp > 0 &&
      Date.now() - timestamp <= 60 * 60 * 1000
    );

  const senderName = escapeHtml(
    message.name || "مستخدم"
  );

  const messageText = escapeHtml(
    message.text || ""
  );

  const timeLabel = timestamp
    ? new Date(timestamp).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  wrapper.innerHTML = `
    <div class="chat-message-header">
      <strong class="chat-message-name">${senderName}</strong>
      <span class="chat-message-time">${escapeHtml(timeLabel)}</span>
    </div>
    <div class="chat-message-text">${messageText}</div>
    ${
      canDelete
        ? `<button
             type="button"
             class="chat-delete-message"
             data-delete-message="${escapeHtml(messageId)}"
           >حذف</button>`
        : ""
    }
  `;

  chatMessagesArea.appendChild(wrapper);
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

let chatListenersStarted = false;

function startChatMessagesListener() {
  if (chatListenersStarted) return;
  chatListenersStarted = true;

  const unsubscribeAdded = onChildAdded(
    messagesRef,
    (snapshot) => {
      if (!snapshot.exists()) return;

      renderChatMessage(
        snapshot.key,
        snapshot.val() || {}
      );

      chatHistoryLoaded = true;
    },
    (error) => {
      console.error("Chat listener error:", error);
      showToast("تعذر تحميل رسائل الشات", "error");
    }
  );

  const unsubscribeChanged = onChildChanged(
    messagesRef,
    (snapshot) => {
      if (!snapshot.exists()) return;

      renderChatMessage(
        snapshot.key,
        snapshot.val() || {}
      );
    },
    (error) => {
      console.error("Chat update listener error:", error);
    }
  );

  const unsubscribeRemoved = onChildRemoved(
    messagesRef,
    (snapshot) => {
      const messageElement = chatMessagesArea?.querySelector(
        `[data-message-id="${CSS.escape(snapshot.key)}"]`
      );

      messageElement?.remove();
    },
    (error) => {
      console.error("Chat delete listener error:", error);
    }
  );

  appUnsubscribers.push(
    unsubscribeAdded,
    unsubscribeChanged,
    unsubscribeRemoved
  );
}

startChatMessagesListener();

/* ---------- حذف الرسائل ---------- */

if (chatMessagesArea) {
  chatMessagesArea.addEventListener("click", async (event) => {
    const button = event.target.closest(
      "[data-delete-message]"
    );

    if (!button) return;

    if (!currentUser) {
      showToast("سجل الدخول أولًا", "error");
      return;
    }

    const messageId = button.dataset.deleteMessage;

    if (!messageId) return;

    try {
      const messageSnapshot = await get(
        ref(db, `messages/${messageId}`)
      );

      if (!messageSnapshot.exists()) {
        showToast("الرسالة غير موجودة", "error");
        return;
      }

      const message = messageSnapshot.val() || {};
      const admin = isAdmin();

      const ownMessage =
        String(message.uid || "") === currentUser.uid;

      const timestamp = Number(message.createdAt || 0);

      const withinOneHour =
        timestamp > 0 &&
        Date.now() - timestamp <= 60 * 60 * 1000;

      if (!admin && !(ownMessage && withinOneHour)) {
        showToast(
          "يمكنك حذف رسائلك أنت خلال ساعة واحدة فقط",
          "error"
        );
        return;
      }

      const confirmed = window.confirm(
        "هل تريد حذف هذه الرسالة؟"
      );

      if (!confirmed) return;

      button.disabled = true;

      await remove(ref(db, `messages/${messageId}`));

      showToast("تم حذف الرسالة", "success");
    } catch (error) {
      console.error("Delete message error:", error);

      showToast(
        "تعذر حذف الرسالة. تحقق من صلاحيات Firebase.",
        "error"
      );
    } finally {
      button.disabled = false;
    }
  });
}

/* ---------- مراقبة حالة الحظر ---------- */

let banListenerStarted = false;
let unsubscribeBanListener = null;

function startBanListener() {
  if (banListenerStarted || !currentUser) return;

  banListenerStarted = true;

  unsubscribeBanListener = onValue(
    ref(db, `bannedUsers/${currentUser.uid}`),
    (snapshot) => {
      const data = snapshot.val();

      userIsBanned =
        data === true ||
        data?.banned === true;

      if (userIsBanned) {
        showToast(
          "هذا الحساب محظور من استخدام بعض خدمات الموقع",
          "error"
        );
      }

      updateChatWritingUI();
    },
    (error) => {
      console.error("Ban listener error:", error);
    }
  );
}

/* ---------- تنظيف مستمع الحظر عند تبدل الحساب ---------- */

const previousAuthUser = currentUser;

onAuthStateChanged(auth, (user) => {
  if (
    previousAuthUser?.uid !== user?.uid &&
    unsubscribeBanListener
  ) {
    unsubscribeBanListener();
    unsubscribeBanListener = null;
    banListenerStarted = false;
  }

  if (!user) {
    userIsBanned = false;
    banListenerStarted = false;
    return;
  }

  startBanListener();
});

/* ---------- إظهار نافذة الشات ---------- */

const chatToggleButton =
  $("chat-toggle-btn") ||
  $("chat-float-btn") ||
  $("chat-open-btn");

const chatCloseButton =
  $("chat-close-btn") ||
  $("close-chat-btn");

if (chatToggleButton && chatPanel) {
  chatToggleButton.addEventListener("click", () => {
    const isHidden =
      chatPanel.hidden ||
      getComputedStyle(chatPanel).display === "none";

    chatPanel.hidden = !isHidden;
    chatPanel.style.display = isHidden ? "flex" : "none";
  });
}

if (chatCloseButton && chatPanel) {
  chatCloseButton.addEventListener("click", () => {
    chatPanel.hidden = true;
    chatPanel.style.display = "none";
  });
}

/* ---------- تنظيف عند مغادرة الصفحة ---------- */

window.addEventListener("pagehide", () => {
  for (const unsubscribe of productUnsubscribers) {
    try {
      unsubscribe();
    } catch (error) {
      console.warn("Product listener cleanup error:", error);
    }
  }

  for (const unsubscribe of appUnsubscribers) {
    try {
      unsubscribe();
    } catch (error) {
      console.warn("App listener cleanup error:", error);
    }
  }

  if (unsubscribeBanListener) {
    try {
      unsubscribeBanListener();
    } catch (error) {
      console.warn("Ban listener cleanup error:", error);
    }
  }
});
