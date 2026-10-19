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
  onChildAdded,
  onChildRemoved,
  onChildChanged,
  onValue,
  update,
  remove,
  onDisconnect
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const INITIAL_ADMIN_EMAIL = "ahmedmamdouh333388@gmail.com";
const TRANSFER_NUMBER = "01214563781";
const WHATSAPP_NUMBER = "201225428692";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

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
const chatComposeBox = $("chat-compose-box");
const userChatLockedMsg = $("user-chat-locked-msg");
const liveVisitorsCount = $("live-visitors-count");
const adminViewOnlineBtn = $("admin-view-online-btn");
const onlineUsersModal = $("online-users-modal");
const onlineUsersList = $("online-users-list");
const toggleChatLockBtn = $("toggle-chat-lock-btn");
const adminSettingsSection = $("admin-settings-section");

const musicTriggerBtn = $("music-trigger-btn");
const musicPopupMenu = $("music-popup-menu");
const bgAudio = $("bg-audio");
const musicPlayPauseBtn = $("music-play-pause-btn");
const adminMusicSection = $("admin-music-section");
const musicUrlInput = $("music-url-input");
const saveMusicUrlBtn = $("save-music-url-btn");

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;
let dynamicAdmins = {};
let bannedUsers = {};
let isChatLocked = false;
let currentMusicUrl = "";

const productDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم King Store."
  )}`;

onValue(ref(db, "settings/admins"), (snapshot) => {
  dynamicAdmins = {};
  if (snapshot.exists()) {
    dynamicAdmins = snapshot.val();
  }
  applyAdminPrivileges();
  renderAdminsList();
});

onValue(ref(db, "settings/banned"), (snapshot) => {
  bannedUsers = {};
  if (snapshot.exists()) {
    bannedUsers = snapshot.val();
  }
  if (currentUser) {
    const userEmail = currentUser.email?.trim().toLowerCase();
    const isBanned = Object.values(bannedUsers).some(e => e.trim().toLowerCase() === userEmail);
    if (isBanned) {
      toast("عذراً، تم حظرك من الدخول للموقع.", true);
      signOut(auth);
    }
  }
  renderBannedList();
});

onValue(ref(db, "settings/chatLocked"), (snapshot) => {
  isChatLocked = snapshot.exists() ? snapshot.val() : false;
  updateChatLockUI();
});

onValue(ref(db, "settings/musicUrl"), (snapshot) => {
  if (snapshot.exists()) {
    currentMusicUrl = snapshot.val();
    bgAudio.src = currentMusicUrl;
    musicUrlInput.value = currentMusicUrl;
  }
});

function isAdmin() {
  if (!currentUser || !currentUser.email) return false;
  const email = currentUser.email.trim().toLowerCase();
  if (email === INITIAL_ADMIN_EMAIL.toLowerCase()) return true;
  return Object.values(dynamicAdmins).some(e => e.trim().toLowerCase() === email);
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
  async function handleGoogleLogin() {
  authErrorMsg.textContent = "جاري فتح نافذة تسجيل الدخول...";
  try {
    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;
    const userEmail = currentUser.email?.trim().toLowerCase();
    const isBanned = Object.values(bannedUsers).some(e => e.trim().toLowerCase() === userEmail);
    if (isBanned) {
      await signOut(auth);
      authErrorMsg.textContent = "هذا الحساب محظور من دخول المتجر.";
      return;
    }
    authErrorMsg.textContent = "";
  } catch (error) {
    console.error("Login Error:", error);
    authErrorMsg.textContent = `تعذر تسجيل الدخول: ${error.message || error.code}`;
  }
}

$("google-login-btn").addEventListener("click", handleGoogleLogin);

function applyAdminPrivileges() {
  const adminMode = isAdmin();
  
  if (adminMode) {
    adminAddProductBtn.hidden = false;
    adminViewOnlineBtn.hidden = false;
    toggleChatLockBtn.hidden = false;
    adminSettingsSection.hidden = false;
    adminMusicSection.hidden = false;
    $("chat-access-note").textContent = "أنت كمشرف، تملك صلاحيات التحكم الكاملة";
  } else {
    adminAddProductBtn.hidden = true;
    adminViewOnlineBtn.hidden = true;
    toggleChatLockBtn.hidden = true;
    adminProductFormBox.hidden = true;
    adminSettingsSection.hidden = true;
    adminMusicSection.hidden = true;
    $("chat-access-note").textContent = "إعلانات وتحديثات المتجر";
  }

  updateChatLockUI();
  productDataById.forEach((data, id) => renderProduct(id, data));
}

function renderAdminsList() {
  const container = $("admins-list-container");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(dynamicAdmins).forEach(([key, email]) => {
    const item = document.createElement("div");
    item.className = "admin-sub-item";
    item.innerHTML = `<span>${escapeHtml(email)}</span> <button data-del-admin="${key}"><i class="fa-solid fa-trash"></i> حذف</button>`;
    container.appendChild(item);
  });
}

function renderBannedList() {
  const container = $("banned-list-container");
  if (!container) return;
  container.innerHTML = "";
  Object.entries(bannedUsers).forEach(([key, email]) => {
    const item = document.createElement("div");
    item.className = "admin-sub-item";
    item.innerHTML = `<span>${escapeHtml(email)}</span> <button data-del-ban="${key}"><i class="fa-solid fa-unlock"></i> إلغاء الحظر</button>`;
    container.appendChild(item);
  });
}

$("settings-popup-menu").addEventListener("click", async (e) => {
  const delAdminBtn = e.target.closest("[data-del-admin]");
  const delBanBtn = e.target.closest("[data-del-ban]");

  if (delAdminBtn && isAdmin()) {
    const key = delAdminBtn.dataset.delAdmin;
    try {
      await remove(ref(db, `settings/admins/${key}`));
      toast("تم حذف المشرف بنجاح.");
    } catch { toast("تعذر الحذف.", true); }
  }

  if (delBanBtn && isAdmin()) {
    const key = delBanBtn.dataset.delBan;
    try {
      await remove(ref(db, `settings/banned/${key}`));
      toast("تم إلغاء الحظر بنجاح.");
    } catch { toast("تعذر فك الحظر.", true); }
  }
});

musicTriggerBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  musicPopupMenu.classList.toggle("active");
  settingsPopupMenu.classList.remove("active");
});

musicPopupMenu.addEventListener("click", (e) => { e.stopPropagation(); });

musicPlayPauseBtn.addEventListener("click", () => {
  if (bgAudio.paused) {
    bgAudio.play().then(() => {
      musicPlayPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i> إيقاف المؤقت';
    }).catch(() => { toast("تعذر تشغيل الصوت، تأكد من الرابط.", true); });
  } else {
    bgAudio.pause();
    musicPlayPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i> تشغيل الصوت';
  }
});

saveMusicUrlBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  const newUrl = musicUrlInput.value.trim();
  if (!newUrl) return toast("اكتب رابط الأغنية أولاً.", true);
  try {
    await set(ref(db, "settings/musicUrl"), newUrl);
    toast("تم تحديث رابط الأغنية بنجاح.");
  } catch { toast("فشل حفظ الرابط.", true); }
});

function updateChatLockUI() {
  if (isAdmin()) {
    chatComposeBox.hidden = false;
    userChatLockedMsg.hidden = true;
    toggleChatLockBtn.innerHTML = isChatLocked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
    toggleChatLockBtn.title = isChatLocked ? "فتح الكتابة للمستخدمين" : "قفل الكتابة عن المستخدمين";
  } else {
    if (isChatLocked) {
      chatComposeBox.hidden = true;
      userChatLockedMsg.hidden = false;
    } else {
      chatComposeBox.hidden = false;
      userChatLockedMsg.hidden = true;
    }
  }
}

function setupPresence(user) {
  const myConnectionRef = ref(db, `presence/${user.uid}`);
  const connectedRef = ref(db, ".info/connected");

  onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      const conData = {
        name: user.displayName || "مستخدم",
        email: user.email || "",
        photo: user.photoURL || "",
        timestamp: Date.now()
      };
      set(myConnectionRef, conData);
      onDisconnect(myConnectionRef).remove();
    }
  });

  onValue(ref(db, "presence"), (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      liveVisitorsCount.textContent = Object.keys(data).length;
      if (isAdmin()) renderOnlineUsersModalList(data);
    } else {
      liveVisitorsCount.textContent = "1";
      if (isAdmin()) onlineUsersList.innerHTML = '<div class="empty-chat">لا يوجد متصلون سواك.</div>';
    }
  });
}

function renderOnlineUsersModalList(data) {
  onlineUsersList.innerHTML = "";
  Object.values(data).forEach((u) => {
    const item = document.createElement("div");
    item.className = "online-user-item";
    item.innerHTML = `
      <img src="${escapeHtml(u.photo || 'https://via.placeholder.com/32')}" alt="">
      <div>
        <strong>${escapeHtml(u.name)}</strong>
        <small>${escapeHtml(u.email)}</small>
      </div>
    `;
    onlineUsersList.appendChild(item);
  });
}

adminViewOnlineBtn.addEventListener("click", () => { onlineUsersModal.classList.add("active"); });
$("close-online-modal").addEventListener("click", () => { onlineUsersModal.classList.remove("active"); });
                                        OnAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    const userEmail = user.email?.trim().toLowerCase();
    const isBanned = Object.values(bannedUsers).some(e => e.trim().toLowerCase() === userEmail);
    if (isBanned) {
      toast("هذا الحساب محظور.", true);
      signOut(auth);
      return;
    }

    loginScreen.style.display = "none";
    setupPresence(user);

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
    loginScreen.style.display = "flex";
    splashScreen.style.display = "none";
    storeScreen.style.display = "none";
    settingsPopupMenu.classList.remove("active");
    musicPopupMenu.classList.remove("active");
    applyAdminPrivileges();
    sessionStorage.removeItem("king_splash_shown");
  }
});

settingsTriggerBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  settingsPopupMenu.classList.toggle("active");
  musicPopupMenu.classList.remove("active");
});

settingsPopupMenu.addEventListener("click", (event) => { event.stopPropagation(); });
document.addEventListener("click", () => {
  settingsPopupMenu.classList.remove("active");
  musicPopupMenu.classList.remove("active");
});

$("menu-logout-trigger").addEventListener("click", async () => {
  try {
    settingsPopupMenu.classList.remove("active");
    if (currentUser) await remove(ref(db, `presence/${currentUser.uid}`));
    await signOut(auth);
    toast("تم تسجيل الخروج.");
  } catch { toast("تعذر تسجيل الخروج.", true); }
});

$("add-admin-btn").addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = $("new-admin-email").value.trim().toLowerCase();
  if (!email) return toast("اكتب الإيميل أولاً.", true);
  try {
    await push(ref(db, "settings/admins"), email);
    $("new-admin-email").value = "";
    toast("تمت إضافة المشرف بنجاح.");
  } catch { toast("فشل إضافة المشرف.", true); }
});

$("ban-user-btn").addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = $("ban-user-email").value.trim().toLowerCase();
  if (!email) return toast("اكتب الإيميل للحظر.", true);
  try {
    await push(ref(db, "settings/banned"), email);
    $("ban-user-email").value = "";
    toast("تم حظر المستخدم بنجاح.");
  } catch { toast("فشل حظر المستخدم.", true); }
});

toggleChatLockBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  try {
    await set(ref(db, "settings/chatLocked"), !isChatLocked);
    toast(isChatLocked ? "تم فتح الشات للجميع." : "تم قفل الشات.");
  } catch { toast("تعذر تغيير حالة الشات.", true); }
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
  if (adminProductFormBox.hidden) openProductForm();
  else adminProductFormBox.hidden = true;
});

$("cancel-product-form").addEventListener("click", () => { adminProductFormBox.hidden = true; editingProductId = null; });
$("cancel-product-form-secondary").addEventListener("click", () => { adminProductFormBox.hidden = true; editingProductId = null; });
    function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    if (!file.type.startsWith("image/")) return reject(new Error("اختار ملف صورة صحيح."));
    if (file.size > 5 * 1024 * 1024) return reject(new Error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت."));
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
      await push(ref(db, "products"), { ...product, createdAt: Date.now(), createdBy: currentUser.uid });
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
        <button class="btn btn-primary buy-btn" data-buy="${escapeHtml(id)}"><i class="fa-solid fa-bag-shopping"></i> شراء الآن</button>
      </div>
    </div>
    ${isAdmin() ? `<div class="admin-product-actions"><button class="btn btn-small btn-edit" data-edit="${escapeHtml(id)}"><i class="fa-solid fa-pen"></i> تعديل</button><button class="btn btn-small btn-delete" data-delete="${escapeHtml(id)}"><i class="fa-solid fa-trash"></i> حذف</button></div>` : ""}
  `;
  productsGridContainer.appendChild(card);
}

function showEmptyProducts() {
  if (productsGridContainer.children.length === 0) {
    productsGridContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><strong>لسه مفيش منتجات</strong><span>انتظر قليلاً لتظهر المنتجات.</span></div>`;
  }
}

const productsRef = ref(db, "products");
onChildAdded(productsRef, (snapshot) => { productsGridContainer.querySelector(".empty-state")?.remove(); renderProduct(snapshot.key, snapshot.val()); });
onChildRemoved(productsRef, (snapshot) => { $(`product-${snapshot.key}`)?.remove(); productDataById.delete(snapshot.key); showEmptyProducts(); });
onChildChanged(productsRef, (snapshot) => { renderProduct(snapshot.key, snapshot.val()); });
window.setTimeout(showEmptyProducts, 3000);

productsGridContainer.addEventListener("click", async (event) => {
  const buyButton = event.target.closest("[data-buy]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (buyButton) { const product = productDataById.get(buyButton.dataset.buy); if (product) openPurchaseModal(buyButton.dataset.buy, product); }
  if (editButton) openProductForm(editButton.dataset.edit);
  if (deleteButton) {
    if (!isAdmin()) return toast("هذه الخاصية للمشرف فقط.", true);
    const id = deleteButton.dataset.delete;
    if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      try { await remove(ref(db, `products/${id}`)); toast("تم حذف المنتج."); } catch { toast("تعذر حذف المنتج.", true); }
    }
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

function closePurchaseModal() { purchaseModal.classList.remove("active"); currentPurchase = null; }
$("close-purchase-modal").addEventListener("click", closePurchaseModal);
purchaseModal.addEventListener("click", (event) => { if (event.target === purchaseModal) closePurchaseModal(); });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closePurchaseModal(); settingsPopupMenu.classList.remove("active"); musicPopupMenu.classList.remove("active"); onlineUsersModal.classList.remove("active"); }
});

$("copy-transfer-number").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(TRANSFER_NUMBER); toast("تم نسخ رقم التحويل."); } catch { toast(`رقم التحويل: ${TRANSFER_NUMBER}`); }
});

function orderMessage() {
  if (!currentPurchase) return "";
  return `مرحباً King Store، أريد تأكيد طلب:\nالمنتج: ${currentPurchase.title}\nالسعر: ${currentPurchase.price} جنيه\nرقم التحويل: ${TRANSFER_NUMBER}\nاسم الحساب: ${currentUser?.displayName || "غير محدد"}\nسأرفق صورة التحويل في هذه المحادثة.`;
}

$("send-transfer-proof-btn").addEventListener("click", () => {
  if (!currentPurchase) return;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`, "_blank", "noopener,noreferrer");
});

$("copy-order-details-btn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(orderMessage()); toast("تم نسخ تفاصيل الطلب."); } catch { toast("تعذر النسخ تلقائياً.", true); }
});

const messagesRef = ref(db, "messages");
onChildAdded(messagesRef, (snapshot) => { renderStoreMessage(snapshot.key, snapshot.val()); });
onChildRemoved(messagesRef, (snapshot) => {
  $(`store-message-${snapshot.key}`)?.remove();
  if (!chatMessagesArea.querySelector(".chat-message")) chatMessagesArea.innerHTML = '<div class="empty-chat">لا توجد رسائل حتى الآن.</div>';
});

function renderStoreMessage(id, data) {
  if (!chatMessagesArea || !data) return;
  chatMessagesArea.querySelector(".empty-chat")?.remove();
  const message = document.createElement("article");
  message.className = "chat-message";
  message.id = `store-message-${id}`;
  const date = data.timestamp ? new Date(data.timestamp).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "";
  const linkMarkup = data.link ? `<br><a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="chat-message-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> زيارة الرابط</a>` : "";

  message.innerHTML = `
    <div class="chat-message-top"><strong><i class="fa-solid fa-crown"></i> ${escapeHtml(data.username || "King Store")}</strong><time>${escapeHtml(date)}</time></div>
    <p>${escapeHtml(data.text || "")}${linkMarkup}</p>
    ${isAdmin() ? `<button class="chat-delete-btn" data-delete-message="${escapeHtml(id)}"><i class="fa-solid fa-trash"></i> حذف الرسالة</button>` : ""}
  `;
  chatMessagesArea.appendChild(message);
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

$("chat-float-btn").addEventListener("click", () => { chatPanel.classList.toggle("active"); chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight; });
$("chat-close-btn").addEventListener("click", () => { chatPanel.classList.remove("active"); });

async function sendStoreMessage() {
  if (isChatLocked && !isAdmin()) return toast("عذراً، الكتابة معطلة حالياً من قبل المشرف.", true);
  const text = chatInputField.value.trim();
  const link = chatLinkField.value.trim();
  if (!text) return;
  chatSendBtn.disabled = true;
  try {
    await push(messagesRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      username: isAdmin() ? "King Store (مشرف)" : (currentUser.displayName || "مستخدم"),
      text,
      link: link || "",
      timestamp: Date.now(),
      isAdmin: isAdmin()
    });
    chatInputField.value = "";
    chatLinkField.value = "";
    toast("تم إرسال الرسالة.");
  } catch { toast("تعذر إرسال الرسالة.", true); } finally { chatSendBtn.disabled = false; }
}

chatSendBtn.addEventListener("click", sendStoreMessage);
chatInputField.addEventListener("keydown", (e) => { if (e.key === "Enter") sendStoreMessage(); });
chatLinkField.addEventListener("keydown", (e) => { if (e.key === "Enter") sendStoreMessage(); });

chatMessagesArea.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-message]");
  if (!button || !isAdmin()) return;
  if (!window.confirm("هل تريد حذف هذه الرسالة؟")) return;
  try {
    await remove(ref(db, `messages/${button.dataset.deleteMessage}`));
    toast("تم حذف الرسالة.");
  } catch { toast("تعذر حذف الرسالة.", true); }
});

// --- منطق مساعد Gemini الذكي لمتجر King Store ---
const chatPanelEl = $("chat-panel");
const aiChatPanel = $("ai-chat-panel");
const openAiChatBtn = $("open-ai-chat-btn");
const backToGeneralChatBtn = $("back-to-general-chat-btn");
const aiChatCloseBtn = $("ai-chat-close-btn");
const aiMessagesArea = $("ai-messages-area");
const aiInputField = $("ai-input-field");
const aiSendBtn = $("ai-send-btn");

if (openAiChatBtn) {
  openAiChatBtn.addEventListener("click", () => {
    chatPanelEl.classList.remove("active");
    aiChatPanel.classList.add("active");
    aiMessagesArea.scrollTop = aiMessagesArea.scrollHeight;
  });
}

if (backToGeneralChatBtn) {
  backToGeneralChatBtn.addEventListener("click", () => {
    aiChatPanel.classList.remove("active");
    chatPanelEl.classList.add("active");
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
  });
}

if (aiChatCloseBtn) {
  aiChatCloseBtn.addEventListener("click", () => {
    aiChatPanel.classList.remove("active");
  });
}

function generateAiResponse(userQuery) {
  const query = userQuery.toLowerCase().trim();
  let productsListText = "";
  let productsArray = Array.from(productDataById.values());
  
  if (productsArray.length > 0) {
    productsListText = productsArray.map(p => `• ${p.title} - السعر: ${p.price} جنيه`).join("\n");
  } else {
    productsListText = "• جاري تحديث قائمة المنتجات حالياً.";
  }

  if (query.includes("مرحبا") || query.includes("اهلاً") || query.includes("سلام")) {
    return "أهلاً بك يا فندم في **King Store**! أنا مساعدك الذكي. كيف يمكنني مساعدتك في اختيار منتج اليوم؟";
  }
  
  if (query.includes("منتج") || query.includes("معروض") || query.includes("المنتجات") || query.includes("أسعار") || query.includes("ايه عندك")) {
    return `إليك المنتجات المتوفرة حالياً في المتجر:\n\n${productsListText}\n\nيمكنك اختيار أي منتج للبدء في خطوات الشراء الفورية!`;
  }

  if (query.includes("شراء") || query.includes("طلب") || query.includes("دفع") || query.includes("تحويل")) {
    return `عملية الشراء في **King Store** سهلة للغاية:\n1. اختر المنتج المناسب واضغط على زر "شراء الآن".\n2. قم بتحويل المبلغ إلى رقم التحويل المعتمد (${TRANSFER_NUMBER}).\n3. أرسل صورة التحويل عبر زر الواتساب لإتمام تأكيد طلبك فوراً.`;
  }

  if (query.includes("تواصل") || query.includes("دعم") || query.includes("واتساب") || query.includes("رقم")) {
    return `يمكنك التواصل مباشرة مع الدعم الفني لمتجر **King Store** عبر رقم الواتساب: ${WHATSAPP_NUMBER} أو من خلال زر الدعم في القائمة الرئيسية.`;
  }

  for (let p of productsArray) {
    if (p.title && query.includes(p.title.toLowerCase())) {
      return `منتج **${p.title}** متوفر لدينا!\n- السعر: ${p.price} جنيه\n- الوصف: ${p.description || "بدون وصف إضافي"}\nيمكنك الضغط على زر "شراء الآن" أسفل المنتج لطلبه مباشرة.`;
    }
  }

  return "عذراً يا فندم، أنا مخصص فقط للإجابة عن الاستفسارات المتعلقة بمنتجات، أسعار، وسياسات متجر **King Store** فقط. تفضل بسؤال عما يخص منتجاتنا وسأكون سعيداً بمساعدتك! ✨";
}

async function sendAiMessage() {
  const text = aiInputField.value.trim();
  if (!text) return;

  const userMsgDiv = document.createElement("div");
  userMsgDiv.className = "chat-msg user-msg";
  userMsgDiv.innerHTML = `<p>${escapeHtml(text)}</p>`;
  aiMessagesArea.appendChild(userMsgDiv);
  aiInputField.value = "";
  aiMessagesArea.scrollTop = aiMessagesArea.scrollHeight;

  aiSendBtn.disabled = true;
  const typingDiv = document.createElement("div");
  typingDiv.className = "chat-msg ai-msg";
  typingDiv.innerHTML = `<p><i class="fa-solid fa-spinner fa-spin"></i> جاري التفكير والبحث في المنتجات...</p>`;
  aiMessagesArea.appendChild(typingDiv);
  aiMessagesArea.scrollTop = aiMessagesArea.scrollHeight;

  setTimeout(() => {
    typingDiv.remove();
    const replyText = generateAiResponse(text);
    
    const aiMsgDiv = document.createElement("div");
    aiMsgDiv.className = "chat-msg ai-msg";
    aiMsgDiv.innerHTML = `<p>${replyText.replace(/\n/g, '<br>')}</p>`;
    aiMessagesArea.appendChild(aiMsgDiv);
    aiMessagesArea.scrollTop = aiMessagesArea.scrollHeight;
    aiSendBtn.disabled = false;
  }, 700);
}

if (aiSendBtn) {
  aiSendBtn.addEventListener("click", sendAiMessage);
}
if (aiInputField) {
  aiInputField.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendAiMessage();
  });
                                                                                                                                    }
      
