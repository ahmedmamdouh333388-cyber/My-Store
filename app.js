import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, onChildRemoved, onChildChanged, update, remove, onValue, onDisconnect, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAF7j3fuI1PHTW2sUgcRYjQo8J5hwwV4mM",
  authDomain: "my-store-75b70.firebaseapp.com",
  databaseURL: "https://my-store-75b70-default-rtdb.firebaseio.com",
  projectId: "my-store-75b70",
  storageBucket: "my-store-75b70.firebasestorage.app",
  messagingSenderId: "762773021655",
  appId: "1:762773021655:web:ce1490aab54115d549e192"
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
const newAdminEmailInput = $("new-admin-email");
const addAdminBtn = $("add-admin-btn");
const adminsListContainer = $("admins-list-container");
const bannedUserEmailInput = $("banned-user-email");
const banUserBtn = $("ban-user-btn");
const bannedListContainer = $("banned-list-container");

const storeBgAudio = $("store-bg-audio");
const musicToggleBtn = $("music-toggle-btn");
const musicPopupMenu = $("music-popup-menu");
const musicActionBtn = $("music-action-btn");
const musicStatusLabel = $("music-status-label");
const musicMuteToggle = $("music-mute-toggle");

musicToggleBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  settingsPopupMenu.classList.remove("active");
  musicPopupMenu.classList.toggle("active");
});

musicPopupMenu.addEventListener("click", (event) => { event.stopPropagation(); });

musicActionBtn.addEventListener("click", () => {
  if (storeBgAudio.paused) {
    storeBgAudio.play().then(() => {
      musicToggleBtn.classList.add("playing");
      musicActionBtn.innerHTML = '<i class="fa-solid fa-pause"></i> إيقاف';
      musicStatusLabel.textContent = "الموسيقى تعمل 🎵";
      toast("تم تشغيل الموسيقى");
    }).catch(() => toast("تعذر تشغيل الصوت.", true));
  } else {
    storeBgAudio.pause();
    musicToggleBtn.classList.remove("playing");
    musicActionBtn.innerHTML = '<i class="fa-solid fa-play"></i> تشغيل';
    musicStatusLabel.textContent = "الموسيقى متوقفة";
    toast("تم إيقاف الموسيقى.");
  }
});

musicMuteToggle.addEventListener("click", () => {
  storeBgAudio.muted = !storeBgAudio.muted;
  musicMuteToggle.innerHTML = storeBgAudio.muted ? '<i class="fa-solid fa-volume-xmark"></i><span>إلغاء الكتم</span>' : '<i class="fa-solid fa-volume-high"></i><span>كتم الصوت</span>';
  toast(storeBgAudio.muted ? "تم كتم الصوت." : "تم إلغاء الكتم.");
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
$("support-wa-link").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة من دعم King Store.")}`;

function isAdmin() {
  if (!currentUser || !currentUser.email) return false;
  const email = currentUser.email.trim().toLowerCase();
  return email === MASTER_ADMIN_EMAIL.trim().toLowerCase() || dynamicAdmins.has(email);
}

function isBanned(email) { return email ? bannedUsers.has(email.trim().toLowerCase()) : false; }

function toast(message, isError = false) {
  const item = document.createElement("div");
  item.className = `toast${isError ? " error" : ""}`;
  item.textContent = message;
  toastRegion.appendChild(item);
  window.setTimeout(() => item.remove(), 3600);
}

function showCustomConfirm(title, text, onYes) {
  $("confirm-title").textContent = title;
  $("confirm-text").textContent = text;
  confirmCallback = onYes;
  customConfirmModal.classList.add("active");
}

$("confirm-no-btn").addEventListener("click", () => { customConfirmModal.classList.remove("active"); confirmCallback = null; });
$("confirm-yes-btn").addEventListener("click", () => { customConfirmModal.classList.remove("active"); if (confirmCallback) confirmCallback(); confirmCallback = null; });

$("google-login-btn").addEventListener("click", async () => {
  authErrorMsg.textContent = "";
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
  } catch (error) {
    authErrorMsg.textContent = "تعذر تسجيل الدخول.";
  }
});
onValue(ref(db, "admins"), (snapshot) => {
  dynamicAdmins = new Set([MASTER_ADMIN_EMAIL]);
  adminsListContainer.innerHTML = "";
  if (snapshot.exists()) {
    snapshot.forEach((child) => {
      const email = child.val().email;
      if (email) {
        dynamicAdmins.add(email.trim().toLowerCase());
        const row = document.createElement("div");
        row.className = "admin-subitem";
        row.innerHTML = `<span>${email}</span>${email.toLowerCase() !== MASTER_ADMIN_EMAIL.toLowerCase() ? `<button data-remove-admin="${child.key}"><i class="fa-solid fa-trash"></i></button>` : '<small>الرئيسي</small>'}`;
        adminsListContainer.appendChild(row);
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
        const row = document.createElement("div");
        row.className = "admin-subitem";
        row.innerHTML = `<span>${email}</span><button data-unban="${child.key}"><i class="fa-solid fa-lock-open"></i></button>`;
        bannedListContainer.appendChild(row);
      }
    });
  }
  if (currentUser && isBanned(currentUser.email)) signOut(auth);
});

addAdminBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = newAdminEmailInput.value.trim().toLowerCase();
  if (email) { await push(ref(db, "admins"), { email }); newAdminEmailInput.value = ""; toast("تمت إضافة المشرف."); }
});

banUserBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = bannedUserEmailInput.value.trim().toLowerCase();
  if (email && email !== MASTER_ADMIN_EMAIL.toLowerCase()) { await push(ref(db, "banned_users"), { email }); bannedUserEmailInput.value = ""; toast("تم الحظر."); }
});

adminsListContainer.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-remove-admin]");
  if (btn && isAdmin()) await remove(ref(db, `admins/${btn.dataset.removeAdmin}`));
});

bannedListContainer.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-unban]");
  if (btn && isAdmin()) await remove(ref(db, `banned_users/${btn.dataset.unban}`));
});

onValue(ref(db, "settings/chatAllowedForUsers"), (snapshot) => {
  chatAllowedForUsers = snapshot.exists() ? snapshot.val() : true;
  updateChatUIState();
});

toggleChatPermissionCheckbox.addEventListener("change", async () => {
  if (isAdmin()) await set(ref(db, "settings/chatAllowedForUsers"), toggleChatPermissionCheckbox.checked);
});

onValue(ref(db, ".info/connected"), (snap) => {
  if (snap.val() === true && currentUser && !isBanned(currentUser.email)) {
    const pRef = push(ref(db, "online_users"));
    onDisconnect(pRef).remove();
    set(pRef, { onlineAt: Date.now(), email: currentUser.email || "مستخدم" });
  }
});

onValue(ref(db, "online_users"), (snapshot) => {
  activeOnlineUsersMap.clear();
  let count = 0;
  if (snapshot.exists()) {
    snapshot.forEach((child) => { count++; activeOnlineUsersMap.set(child.key, child.val().email); });
  }
  if (onlineCountEl) onlineCountEl.textContent = Math.max(1, count);
  
  if (onlineUsersList) {
    onlineUsersList.innerHTML = "";
    activeOnlineUsersMap.forEach((email) => {
      const row = document.createElement("div");
      row.className = "online-user-row";
      row.innerHTML = `<div class="online-user-info"><i class="fa-solid fa-circle" style="color:#22c55e;font-size:7px;"></i><span>${email}</span></div>`;
      onlineUsersList.appendChild(row);
    });
  }
});

adminViewOnlineBtn.addEventListener("click", () => { if (isAdmin()) onlineUsersModal.classList.add("active"); });
$("close-online-modal").addEventListener("click", () => onlineUsersModal.classList.remove("active"));

settingsTriggerBtn.addEventListener("click", (e) => { e.stopPropagation(); musicPopupMenu.classList.remove("active"); settingsPopupMenu.classList.toggle("active"); });
document.addEventListener("click", () => { settingsPopupMenu.classList.remove("active"); musicPopupMenu.classList.remove("active"); });
$("menu-logout-trigger").addEventListener("click", () => signOut(auth));

document.querySelectorAll("[data-theme]").forEach((btn) => {
  btn.addEventListener("click", () => { document.body.className = btn.dataset.theme; localStorage.setItem("king_store_theme", btn.dataset.theme); });
});
const savedTheme = localStorage.getItem("king_store_theme");
if (savedTheme) document.body.className = savedTheme;

function updateChatUIState() {
  if (isAdmin()) {
    adminChatToggleBox.hidden = false; chatComposeBox.hidden = false; userChatReadonly.hidden = true; chatLinkField.hidden = false;
    $("chat-access-note").textContent = "لوحة تحكم المشرف"; toggleChatPermissionCheckbox.checked = chatAllowedForUsers;
  } else {
    adminChatToggleBox.hidden = true; chatLinkField.hidden = true; $("chat-access-note").textContent = "إعلانات المتجر";
    chatComposeBox.hidden = !chatAllowedForUsers; userChatReadonly.hidden = chatAllowedForUsers;
  }
}

function applyAdminPrivileges() {
  document.querySelectorAll(".admin-only").forEach(el => el.hidden = !isAdmin());
  updateChatUIState();
  productDataById.forEach((data, id) => renderProduct(id, data));
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (isBanned(user.email)) { await signOut(auth); loginScreen.style.display = "flex"; storeScreen.style.display = "none"; return; }
    currentUser = user; loginScreen.style.display = "none"; storeScreen.style.display = "block";
    applyAdminPrivileges();
    $("menu-user-img").src = user.photoURL || "";
    $("menu-user-name").textContent = user.displayName || "مستخدم";
    $("menu-user-email").textContent = user.email || "";
  } else {
    currentUser = null; loginScreen.style.display = "flex"; storeScreen.style.display = "none";
    applyAdminPrivileges();
  }
});

adminAddProductBtn.addEventListener("click", () => { adminProductFormBox.hidden = !adminProductFormBox.hidden; });
$("cancel-product-form").addEventListener("click", () => adminProductFormBox.hidden = true);
$("cancel-product-form-secondary").addEventListener("click", () => adminProductFormBox.hidden = true);

$("save-product-btn").addEventListener("click", async () => {
  if (!isAdmin()) return;
  const title = $("new-product-title").value.trim();
  const price = Number($("new-product-price").value);
  const description = $("new-product-description").value.trim();
  const link = $("new-product-link").value.trim();
  const file = $("new-product-img-file").files?.[0];
  
  if (!title || price <= 0) return;
  const reader = new FileReader();
  reader.onload = async () => {
    await push(ref(db, "products"), { title, price, description, link, image: reader.result || "", createdAt: Date.now() });
    adminProductFormBox.hidden = true;
    toast("تم الحفظ.");
  };
  if (file) reader.readAsDataURL(file);
  else reader.onload({ target: { result: "" } });
});

function renderProduct(id, data) {
  productDataById.set(id, data);
  $(`product-${id}`)?.remove();
  productsGridContainer.querySelector(".empty-state")?.remove();
  const card = document.createElement("article");
  card.className = "product-card"; card.id = `product-${id}`;
  card.innerHTML = `
    <div class="product-image-wrap">${data.image ? `<img class="product-image" src="${data.image}">` : '<div class="product-image-placeholder"><i class="fa-solid fa-cube"></i></div>'}</div>
    <div class="product-body">
      <span class="product-category">KING SELECTION</span>
      <h3>${data.title}</h3>
      <p class="product-description">${data.description || ""}</p>
      <div class="product-bottom"><div class="product-price">${data.price} <small>جنيه</small></div>
      <button class="btn btn-primary buy-btn" data-buy="${id}"><i class="fa-solid fa-bag-shopping"></i> شراء</button></div>
    </div>
    ${isAdmin() ? `<div class="admin-product-actions"><button class="btn btn-small btn-delete" data-delete="${id}"><i class="fa-solid fa-trash"></i> حذف</button></div>` : ""}
  `;
  productsGridContainer.appendChild(card);
}

onChildAdded(ref(db, "products"), (s) => renderProduct(s.key, s.val()));
onChildRemoved(ref(db, "products"), (s) => $(`product-${s.key}`)?.remove());

productsGridContainer.addEventListener("click", async (e) => {
  const buy = e.target.closest("[data-buy]");
  const del = e.target.closest("[data-delete]");
  if (buy) {
    currentPurchase = productDataById.get(buy.dataset.buy);
    $("purchase-product-name").textContent = currentPurchase.title;
    $("purchase-product-price").textContent = currentPurchase.price + " جنيه";
    $("purchase-product-image").src = currentPurchase.image || "";
    purchaseModal.classList.add("active");
  }
  if (del && isAdmin()) await remove(ref(db, `products/${del.dataset.delete}`));
});

$("close-purchase-modal").addEventListener("click", () => purchaseModal.classList.remove("active"));
$("send-transfer-proof-btn").addEventListener("click", () => {
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("أريد تأكيد طلب منتج: " + currentPurchase.title)}`, "_blank");
});

onChildAdded(ref(db, "messages"), (s) => {
  chatMessagesArea.querySelector(".empty-chat")?.remove();
  const d = s.val();
  const msg = document.createElement("article");
  msg.className = "chat-message";
  msg.innerHTML = `<div class="chat-message-top"><strong>${d.username}</strong></div><p>${d.text}</p>`;
  chatMessagesArea.appendChild(msg);
});

$("chat-float-btn").addEventListener("click", () => chatPanel.classList.toggle("active"));
$("chat-close-btn").addEventListener("click", () => chatPanel.classList.remove("active"));

$("chat-send-btn").addEventListener("click", async () => {
  const text = chatInputField.value.trim();
  if (!text) return;
  await push(ref(db, "messages"), { username: isAdmin() ? "المشرف" : "مستخدم", text, timestamp: Date.now() });
  chatInputField.value = "";
});
  
