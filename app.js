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
  onDisconnect,
  get
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
let userRegisteredName = "";

const productDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم King Store."
  )}`;

async function checkAndRegisterUserIdentity(user) {
  const userRef = ref(db, `users/${user.uid}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists() && snapshot.val().name) {
      userRegisteredName = snapshot.val().name;
      proceedWithLogin(user);
    } else {
      $("name-gate-modal").classList.add("active");
    }
  } catch (error) {
    userRegisteredName = user.displayName || "مستخدم";
    proceedWithLogin(user);
  }
}

$("gate-confirm-name-btn").addEventListener("click", async () => {
  const enteredName = $("gate-user-name-input").value.trim();
  if (enteredName.length < 2) {
    alert("الرجاء كتابة اسم صحيح!");
    return;
  }
  if (!currentUser) return;

  const userData = {
    name: enteredName,
    email: currentUser.email || "",
    nameLocked: true,
    uid: currentUser.uid
  };

  try {
    await set(ref(db, `users/${currentUser.uid}`), userData);
    userRegisteredName = enteredName;
    $("name-gate-modal").classList.remove("active");
    proceedWithLogin(currentUser);
  } catch (error) {
    alert("حدث خطأ أثناء حفظ الاسم.");
  }
});

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
    checkAndRegisterUserIdentity(currentUser);
  } catch (error) {
    console.error("Login Error:", error);
    authErrorMsg.textContent = `تعذر تسجيل الدخول: ${error.message || error.code}`;
  }
}

$("google-login-btn").addEventListener("click", handleGoogleLogin);

function applyAdminPrivileges() {
  const adminMode = isAdmin();
  
  const chatLinkField = $("chat-link-field");
  if (chatLinkField) {
    chatLinkField.hidden = !adminMode;
  }

  const adminEditNamesTrigger = $("admin-edit-names-trigger");
  if (adminEditNamesTrigger) {
    adminEditNamesTrigger.hidden = !adminMode;
  }

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

$("admin-edit-names-trigger").addEventListener("click", () => {
  if (!isAdmin()) return;
  settingsPopupMenu.classList.remove("active");
  $("admin-name-modal").classList.add("active");
});

$("close-admin-name-modal").addEventListener("click", () => {
  $("admin-name-modal").classList.remove("active");
});

$("admin-save-name-btn").addEventListener("click", async () => {
  if (!isAdmin()) return;
  const targetEmail = $("admin-target-email").value.trim().toLowerCase();
  const newName = $("admin-new-name").value.trim();

  if (!targetEmail || !newName) {
    alert("الرجاء إدخال البريد الإلكتروني والاسم الجديد!");
    return;
  }

  try {
    const usersSnap = await get(ref(db, "users"));
    let foundUid = null;
    if (usersSnap.exists()) {
      usersSnap.forEach((childSnap) => {
        const val = childSnap.val();
        if (val.email && val.email.trim().toLowerCase() === targetEmail) {
          foundUid = childSnap.key;
        }
      });
    }

    if (foundUid) {
      await update(ref(db, `users/${foundUid}`), { name: newName });
      toast("تم تعديل اسم المستخدم بنجاح.");
      $("admin-target-email").value = "";
      $("admin-new-name").value = "";
      $("admin-name-modal").classList.remove("active");
    } else {
      toast("لم يتم العثور على مستخدم بهذا البريد الإلكتروني.", true);
    }
  } catch (err) {
    toast("فشل تعديل الاسم.", true);
  }
});

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

  onValue(connectedRef, async (snap) => {
    if (snap.val() === true) {
      const userSnap = await get(ref(db, `users/${user.uid}`));
      const finalName = userSnap.exists() && userSnap.val().name ? userSnap.val().name : (user.displayName || "مستخدم");

      const conData = {
        name: finalName,
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
                            function proceedWithLogin(user) {
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

  get(ref(db, `users/${user.uid}`)).then((snapshot) => {
    const displayName = snapshot.exists() && snapshot.val().name ? snapshot.val().name : (user.displayName || "مستخدم King Store");
    userRegisteredName = displayName;
    $("menu-user-name").textContent = displayName;
  });

  $("menu-user-img").src = user.photoURL || "";
  $("menu-user-email").textContent = user.email || "";
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const userEmail = user.email?.trim().toLowerCase();
    const isBanned = Object.values(bannedUsers).some(e => e.trim().toLowerCase() === userEmail);
    if (isBanned) {
      toast("هذا الحساب محظور.", true);
      signOut(auth);
      return;
    }
    checkAndRegisterUserIdentity(user);
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
    const newLockState = !isChatLocked;
    await set(ref(db, "settings/chatLocked"), newLockState);
    toast(newLockState ? "تم قفل الشات عن المستخدمين." : "تم فتح الشات للجميع.");
  } catch { toast("تعذر تغيير حالة الشات.", true); }
});

$("language-toggle").addEventListener("click", () => {
  const root = $("html-root");
  const isEnglish = root.lang !== "en";
  root.lang = isEnglish ? "en" : "ar";
  root.dir = "rtl";
  
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key === "storeTitle") el.innerHTML = isEnglish ? 'King <em>Store</em>' : 'كينج <em>ستور</em>';
    if (key === "onlineNow") el.textContent = isEnglish ? 'Online Now' : 'متصل الآن';
    if (key === "logout") el.textContent = isEnglish ? 'Logout' : 'تسجيل الخروج';
  });

  toast(isEnglish ? "Switched to English (RTL Fixed)" : "تم العودة للعربية.");
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
if (savedTheme && /^theme-(blue|violet|mint|gold|red)$/.test(savedTheme)) {
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
    try { 
      await remove(ref(db, `products/${id}`)); 
      toast("تم حذف المنتج."); 
    } catch { 
      toast("تعذر حذف المنتج.", true); 
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
  if (event.key === "Escape") { closePurchaseModal(); settingsPopupMenu.classList.remove("active"); musicPopupMenu.classList.remove("active"); onlineUsersModal.classList.remove("active"); $("admin-name-modal").classList.remove("active"); $("name-gate-modal").classList.remove("active"); }
});

$("copy-transfer-number").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(TRANSFER_NUMBER); toast("تم نسخ رقم التحويل."); } catch { toast(`رقم التحويل: ${TRANSFER_NUMBER}`); }
});

function orderMessage() {
  if (!currentPurchase) return "";
  return `مرحباً King Store، أريد تأكيد طلب:\nالمنتج: ${currentPurchase.title}\nالسعر: ${currentPurchase.price} جنيه\nرقم التحويل: ${TRANSFER_NUMBER}\nاسم الحساب: ${userRegisteredName || currentUser?.displayName || "غير محدد"}\nسأرفق صورة التحويل في هذه المحادثة.`;
}

$("send-transfer-proof-btn").addEventListener("click", () => {
  if (!currentPurchase) return;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`, "_blank", "noopener,noreferrer");
});

$("copy-order-details-btn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(orderMessage()); toast("تم نسخ تفاصيل الطلب."); } catch { toast("تعذر النسخ تلقائياً.", true); }
});

const messagesRef = ref(db, "messages");
onValue(messagesRef, (snapshot) => {
  if (snapshot.exists()) {
    chatMessagesArea.querySelector(".empty-chat")?.remove();
    snapshot.forEach((childSnap) => {
      renderStoreMessage(childSnap.key, childSnap.val());
    });
  } else {
    chatMessagesArea.innerHTML = '<div class="empty-chat">لا توجد رسائل حتى الآن.</div>';
  }
});

function renderStoreMessage(id, data) {
  if (!chatMessagesArea || !data) return;
  
  let message = $(`store-message-${id}`);
  if (!message) {
    message = document.createElement("article");
    message.className = "chat-message";
    message.id = `store-message-${id}`;
    chatMessagesArea.appendChild(message);
  }

  const date = data.timestamp ? new Date(data.timestamp).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" }) : "";
  const linkMarkup = data.link ? `<br><a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="chat-message-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> زيارة الرابط</a>` : "";

  const reactions = data.reactions || {};
  const emojiCounts = { "❤️": 0, "😂": 0, "😭": 0, "👍🏻": 0 };
  let myChosenEmoji = null;

  Object.entries(reactions).forEach(([uid, emoji]) => {
    if (emojiCounts[emoji] !== undefined) {
      emojiCounts[emoji]++;
    }
    if (currentUser && uid === currentUser.uid) {
      myChosenEmoji = emoji;
    }
  });

  let reactionsHtml = `<div class="message-reactions-wrap" style="position:relative;">`;
  
  Object.entries(emojiCounts).forEach(([emoji, count]) => {
    if (count > 0) {
      const isActive = myChosenEmoji === emoji ? " active-by-me" : "";
      reactionsHtml += `<button class="reaction-pill${isActive}" data-react-emoji="${emoji}" data-msg-id="${id}">${emoji} <span>${count}</span></button>`;
    }
  });

  reactionsHtml += `
    <button class="add-reaction-btn" data-toggle-popup="${id}" title="إضافة تفاعل"><i class="fa-solid fa-face-smile"></i></button>
    <div class="reactions-popup glass-card" id="popup-reactions-${id}">
      <button class="reaction-option" data-select-emoji="❤️" data-msg-id="${id}">❤️</button>
      <button class="reaction-option" data-select-emoji="😂" data-msg-id="${id}">😂</button>
      <button class="reaction-option" data-select-emoji="😭" data-msg-id="${id}">😭</button>
      <button class="reaction-option" data-select-emoji="👍🏻" data-msg-id="${id}">👍🏻</button>
    </div>
  </div>`;

  message.innerHTML = `
    <div class="chat-message-top"><strong><i class="fa-solid fa-crown"></i> ${escapeHtml(data.username || "King Store")}</strong><time>${escapeHtml(date)}</time></div>
    <p>${escapeHtml(data.text || "")}${linkMarkup}</p>
    ${reactionsHtml}
    ${isAdmin() ? `<button class="chat-delete-btn" data-delete-message="${escapeHtml(id)}"><i class="fa-solid fa-trash"></i> حذف الرسالة</button>` : ""}
  `;

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
      username: isAdmin() ? "King Store (مشرف)" : (userRegisteredName || currentUser.displayName || "مستخدم"),
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
  const toggleBtn = event.target.closest("[data-toggle-popup]");
  const selectEmojiBtn = event.target.closest("[data-select-emoji]");
  const existingReactionBtn = event.target.closest("[data-react-emoji]");
  const deleteMsgBtn = event.target.closest("[data-delete-message]");

  if (!toggleBtn && !selectEmojiBtn) {
    document.querySelectorAll(".reactions-popup").forEach(p => p.classList.remove("active"));
  }

  if (toggleBtn) {
    event.stopPropagation();
    const msgId = toggleBtn.dataset.togglePopup;
    const popup = $(`popup-reactions-${msgId}`);
    document.querySelectorAll(".reactions-popup").forEach(p => {
      if (p !== popup) p.classList.remove("active");
    });
    if (popup) popup.classList.toggle("active");
    return;
  }

  if (selectEmojiBtn) {
    event.stopPropagation();
    if (!currentUser) return toast("يجب تسجيل الدخول لتتمكن من التفاعل.", true);
    const msgId = selectEmojiBtn.dataset.msgId;
    const emoji = selectEmojiBtn.dataset.selectEmoji;
    const userUid = currentUser.uid;

    try {
      await set(ref(db, `messages/${msgId}/reactions/${userUid}`), emoji);
      $(`popup-reactions-${msgId}`)?.classList.remove("active");
    } catch {
      toast("تعذر تسجيل التفاعل.", true);
    }
    return;
  }

  if (existingReactionBtn) {
    event.stopPropagation();
    if (!currentUser) return;
    const msgId = existingReactionBtn.dataset.msgId;
    const userUid = currentUser.uid;

    try {
      await remove(ref(db, `messages/${msgId}/reactions/${userUid}`));
    } catch {
      toast("تعذر تعديل التفاعل.", true);
    }
    return;
  }

  if (deleteMsgBtn && isAdmin()) {
    const msgId = deleteMsgBtn.dataset.deleteMessage;
    try {
      await remove(ref(db, `messages/${msgId}`));
      $(`store-message-${msgId}`)?.remove();
      toast("تم حذف الرسالة بنجاح.");
    } catch (error) {
      console.error("Delete Error:", error);
      toast("تعذر حذف الرسالة.", true);
    }
  }
});
                                                                   
