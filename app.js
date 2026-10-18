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
Function updateChatUIState() {
  const adminMode = isAdmin();
  
  if (adminMode) {
    adminChatToggleBox.hidden = false;
    chatComposeBox.hidden = false;
    userChatReadonly.hidden = true;
    chatLinkField.hidden = false;
    $("chat-access-note").textContent = "لوحة تحكم المشرف بالرسائل";
    toggleChatPermissionCheckbox.checked = chatAllowedForUsers;
  } else {
    adminChatToggleBox.hidden = true;
    chatLinkField.hidden = true;
    $("chat-access-note").textContent = "إعلانات وتحديثات المتجر";

    if (chatAllowedForUsers) {
      chatComposeBox.hidden = false;
      userChatReadonly.hidden = true;
      chatInputField.placeholder = "اكتب رسالتك للمتجر...";
    } else {
      chatComposeBox.hidden = true;
      userChatReadonly.hidden = false;
    }
  }
}

function applyAdminPrivileges() {
  const adminMode = isAdmin();
  document.querySelectorAll(".admin-only").forEach(el => {
    el.hidden = !adminMode;
  });
  updateChatUIState();
  productDataById.forEach((data, id) => renderProduct(id, data));
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (isBanned(user.email)) {
      await signOut(auth);
      loginScreen.style.display = "flex";
      storeScreen.style.display = "none";
      authErrorMsg.textContent = "عذراً، هذا الحساب محظور من دخول المتجر.";
      return;
    }
    currentUser = user;
    loginScreen.style.display = "none";

    const alreadyShown = sessionStorage.getItem("king_splash_shown");

    if (!alreadyShown) {
      splashScreen.style.display = "flex";
      storeScreen.style.display = "none";

      window.setTimeout(() => {
        splashScreen.style.display = "none";
        storeScreen.style.display = "block";
        sessionStorage.setItem("king_splash_shown", "true");
        applyAdminPrivileges();
      }, 1000);
    } else {
      splashScreen.style.display = "none";
      storeScreen.style.display = "block";
      applyAdminPrivileges();
    }

    $("menu-user-img").src = user.photoURL || "";
    $("menu-user-name").textContent = user.displayName || "مستخدم King Store";
    $("menu-user-email").textContent = user.email || "";

  } else {
    currentUser = null;
    loginScreen.style.display = "flex";
    splashScreen.style.display = "none";
    storeScreen.style.display = "none";

    settingsPopupMenu.classList.remove("active");
    applyAdminPrivileges();

    sessionStorage.removeItem("king_splash_shown");
  }
});

function openProductForm(productId = null) {
  if (!isAdmin()) return toast("هذه الخاصية للمشرف فقط.", true);

  editingProductId = productId;
  $("product-form-title").textContent = productId ? "تعديل المنتج" : "إضافة منتج جديد";

  $("new-product-title").value = "";
  $("new-product-price").value = "";
  $("new-product-description").value = "";
  $("new-product-link").value = "";
  $("new-product-img-file").value = "";

  setFormMessage(productId ? "اختار صورة جديدة أو اتركها فارغة." : "");

  if (productId) {
    const product = productDataById.get(productId);
    if (product) {
      $("new-product-title").value = product.title || "";
      $("new-product-price").value = product.price || "";
      $("new-product-description").value = product.description || "";
      $("new-product-link").value = product.link || "";
    }
  }

  adminProductFormBox.hidden = false;
  adminProductFormBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

adminAddProductBtn.addEventListener("click", () => {
  if (adminProductFormBox.hidden) {
    openProductForm();
  } else {
    adminProductFormBox.hidden = true;
  }
});

$("cancel-product-form").addEventListener("click", () => {
  adminProductFormBox.hidden = true;
  editingProductId = null;
});

$("cancel-product-form-secondary").addEventListener("click", () => {
  adminProductFormBox.hidden = true;
  editingProductId = null;
});

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith("image/")) return reject(new Error("اختار ملف صورة صحيح."));
    if (file.size > 5_000_000) return reject(new Error("حجم الصورة كبير جداً. الحد الأقصى 5 ميجابايت."));

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

$("save-product-btn").addEventListener("click", async () => {
  if (!isAdmin()) return toast("غير مسموح لك بإدارة المنتجات.", true);

  const title = $("new-product-title").value.trim();
  const price = Number($("new-product-price").value);
  const description = $("new-product-description").value.trim();
  const link = $("new-product-link").value.trim();
  const file = $("new-product-img-file").files?.[0] || null;

  const existing = editingProductId ? productDataById.get(editingProductId) : null;

  if (!title || !Number.isFinite(price) || price <= 0) {
    setFormMessage("اختار اسم المنتج وسعراً صحيحاً.", true);
    return;
  }

  if (!existing && !file) {
    setFormMessage("اختار صورة للمنتج.", true);
    return;
  }

  const saveButton = $("save-product-btn");
  saveButton.disabled = true;
  saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ';

  try {
    const image = await readImage(file);
    const product = {
      title,
      price: price.toFixed(2).replace(/\.00$/, ""),
      description,
      link: link || "",
      image: image || existing?.image || "",
      updatedAt: Date.now(),
      updatedBy: currentUser.uid
    };

    if (editingProductId) {
      await update(ref(db, `products/${editingProductId}`), product);
      toast("تم تعديل المنتج بنجاح.");
    } else {
      await push(ref(db, "products"), {
        ...product,
        createdAt: Date.now(),
        createdBy: currentUser.uid
      });
      toast("تمت إضافة المنتج بنجاح.");
    }

    adminProductFormBox.hidden = true;
    editingProductId = null;
  } catch (error) {
    setFormMessage(error.message || "حدث خطأ أثناء الحفظ.", true);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج';
  }
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function renderProduct(id, data) {
  if (!data || !productsGridContainer) return;
  productDataById.set(id, data);

  const old = $(`product-${id}`);
  if (old) old.remove();

  productsGridContainer.querySelector(".empty-state")?.remove();

  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `product-${id}`;

  const imageMarkup = data.image
    ? `<img class="product-image" src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || "منتج")}" loading="lazy">`
    : `<div class="product-image-placeholder"><i class="fa-solid fa-cube"></i></div>`;

  const externalLinkMarkup = data.link
    ? `<a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-small btn-external-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> رابط المنتج</a>`
    : "";

  card.innerHTML = `
    <div class="product-image-wrap">${imageMarkup}</div>
    <div class="product-body">
      <span class="product-category">KING SELECTION</span>
      <h3>${escapeHtml(data.title || "منتج")}</h3>
      <p class="product-description">${escapeHtml(data.description || "منتج مميز من King Store.")}</p>
      ${externalLinkMarkup}
      <div class="product-bottom">
        <div class="product-price">${escapeHtml(data.price)} <small>جنيه</small></div>
        <button class="btn btn-primary buy-btn" data-buy="${escapeHtml(id)}">
          <i class="fa-solid fa-bag-shopping"></i> شراء الآن
        </button>
      </div>
    </div>
    ${
      isAdmin()
        ? `<div class="admin-product-actions">
            <button class="btn btn-small btn-edit" data-edit="${escapeHtml(id)}">
              <i class="fa-solid fa-pen"></i> تعديل
            </button>
            <button class="btn btn-small btn-delete" data-delete="${escapeHtml(id)}">
              <i class="fa-solid fa-trash"></i> حذف
            </button>
          </div>`
        : ""
    }
  `;

  productsGridContainer.appendChild(card);
}

function showEmptyProducts() {
  if (productsGridContainer.children.length === 0) {
    productsGridContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <strong>لسه مفيش منتجات</strong>
        <span>انتظر قليلاً لتظهر المنتجات.</span>
      </div>`;
  }
}

const productsRef = ref(db, "products");

onChildAdded(productsRef, (snapshot) => {
  productsGridContainer.querySelector(".empty-state")?.remove();
  renderProduct(snapshot.key, snapshot.val());
});

onChildRemoved(productsRef, (snapshot) => {
  $(`product-${snapshot.key}`)?.remove();
  productDataById.delete(snapshot.key);
  showEmptyProducts();
});

onChildChanged(productsRef, (snapshot) => {
  renderProduct(snapshot.key, snapshot.val());
});

window.setTimeout(showEmptyProducts, 3000);

productsGridContainer.addEventListener("click", async (event) => {
  const buyButton = event.target.closest("[data-buy]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (buyButton) {
    const product = productDataById.get(buyButton.dataset.buy);
    if (product) openPurchaseModal(buyButton.dataset.buy, product);
  }

  if (editButton) {
    openProductForm(editButton.dataset.edit);
  }

  if (deleteButton) {
    if (!isAdmin()) return toast("هذه الخاصية للمشرف فقط.", true);
    const id = deleteButton.dataset.delete;
    
    showCustomConfirm("حذف المنتج", "هل أنت متأكد من رغبتك في حذف هذا المنتج نهائياً؟", async () => {
      try {
        await remove(ref(db, `products/${id}`));
        toast("تم حذف المنتج.");
      } catch {
        toast("تعذر حذف المنتج.", true);
      }
    });
  }
});

function openPurchaseModal(id, product) {
  currentPurchase = { id, ...product };
  $("purchase-product-name").textContent = product.title || "منتج";
  $("purchase-product-price").textContent = `${product.price} جنيه`;
  $("purchase-product-image").src = product.image || "";
  $("purchase-product-image").style.visibility = product.image ? "visible" : "hidden";
  purchaseModal.classList.add("active");
}

function closePurchaseModal() {
  purchaseModal.classList.remove("active");
  currentPurchase = null;
}

$("close-purchase-modal").addEventListener("click", closePurchaseModal);
purchaseModal.addEventListener("click", (event) => {
  if (event.target === purchaseModal) closePurchaseModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePurchaseModal();
    customConfirmModal.classList.remove("active");
    settingsPopupMenu.classList.remove("active");
    onlineUsersModal.classList.remove("active");
  }
});

$("copy-transfer-number").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(TRANSFER_NUMBER);
    toast("تم نسخ رقم التحويل.");
  } catch {
    toast(`رقم التحويل: ${TRANSFER_NUMBER}`);
  }
});

function orderMessage() {
  if (!currentPurchase) return "";
  return `مرحباً King Store، أريد تأكيد طلب:
المنتج: ${currentPurchase.title}
السعر: ${currentPurchase.price} جنيه
رقم التحويل: ${TRANSFER_NUMBER}
اسم الحساب: ${currentUser?.displayName || "غير محدد"}
سأرفق صورة التحويل في هذه المحادثة.`;
}

$("send-transfer-proof-btn").addEventListener("click", () => {
  if (!currentPurchase) return;
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

$("copy-order-details-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(orderMessage());
    toast("تم نسخ تفاصيل الطلب.");
  } catch {
    toast("تعذر النسخ تلقائياً.", true);
  }
});

const messagesRef = ref(db, "messages");

onChildAdded(messagesRef, (snapshot) => {
  renderStoreMessage(snapshot.key, snapshot.val());
});

onChildRemoved(messagesRef, (snapshot) => {
  $(`store-message-${snapshot.key}`)?.remove();
  if (!chatMessagesArea.querySelector(".chat-message")) {
    chatMessagesArea.innerHTML = '<div class="empty-chat">لا توجد رسائل حتى الآن.</div>';
  }
});

function renderStoreMessage(id, data) {
  if (!chatMessagesArea || !data) return;
  chatMessagesArea.querySelector(".empty-chat")?.remove();

  const message = document.createElement("article");
  message.className = "chat-message";
  message.id = `store-message-${id}`;

  const date = data.timestamp
    ? new Date(data.timestamp).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })
    : "";

  const linkMarkup = data.link
    ? `<br><a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="chat-message-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> زيارة الرابط</a>`
    : "";

  message.innerHTML = `
    <div class="chat-message-top">
      <strong><i class="fa-solid fa-crown"></i> ${escapeHtml(data.username || "King Store")}</strong>
      <time>${escapeHtml(date)}</time>
    </div>
    <p>${escapeHtml(data.text || "")}${linkMarkup}</p>
    ${
      isAdmin()
        ? `<button class="chat-delete-btn" data-delete-message="${escapeHtml(id)}">
            <i class="fa-solid fa-trash"></i> حذف الرسالة
          </button>`
        : ""
    }
  `;

  chatMessagesArea.appendChild(message);
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

$("chat-float-btn").addEventListener("click", () => {
  chatPanel.classList.toggle("active");
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
});

$("chat-close-btn").addEventListener("click", () => {
  chatPanel.classList.remove("active");
});

async function sendStoreMessage() {
  const text = chatInputField.value.trim();
  const link = chatLinkField.value.trim();
  if (!text) return;

  if (!isAdmin() && !chatAllowedForUsers) {
    return toast("عذراً، الكتابة مغلقة من قبل المشرف حالياً.", true);
  }

  chatSendBtn.disabled, true;

  try {
    await push(messagesRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      username: isAdmin() ? "King Store (المشرف)" : (currentUser.displayName || "مستخدم"),
      text,
      link: isAdmin() ? (link || "") : "",
      timestamp: Date.now(),
      isAdmin: isAdmin()
    });

    chatInputField.value = "";
    chatLinkField.value = "";
    toast("تم إرسال الرسالة بنجاح.");
  } catch {
    toast("تعذر إرسال الرسالة.", true);
  } finally {
    chatSendBtn.disabled = false;
  }
}

chatSendBtn.addEventListener("click", sendStoreMessage);
chatInputField.addEventListener("keydown", (e) => { if (e.key === "Enter") sendStoreMessage(); });
chatLinkField.addEventListener("keydown", (e) => { if (e.key === "Enter") sendStoreMessage(); });

chatMessagesArea.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-message]");
  if (!button || !isAdmin()) return;

  showCustomConfirm("حذف الرسالة", "هل أنت متأكد من رغبتك في حذف هذه الرسالة من المتجر؟", async () => {
    try {
      await remove(ref(db, `messages/${button.dataset.deleteMessage}`));
      toast("تم حذف الرسالة.");
    } catch {
      toast("تعذر حذف الرسالة.", true);
    }
  });
});
