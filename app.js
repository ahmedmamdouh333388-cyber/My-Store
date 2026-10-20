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
const todayRegistrationsModal = $("today-registrations-modal");
const todayRegistrationsList = $("today-registrations-list");
const adminViewTodayRegistrationsBtn = $("admin-view-today-registrations-btn");
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
let currentLang = "ar";
let userSessionRecordKey = null;

const productDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم Ahmed Store."
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
  
  const chatLinkField = $("chat-link-field");
  if (chatLinkField) {
    chatLinkField.hidden = !adminMode;
  }

  if (adminMode) {
    adminAddProductBtn.hidden = false;
    adminViewOnlineBtn.hidden = false;
    toggleChatLockBtn.hidden = false;
    adminSettingsSection.hidden = false;
    adminMusicSection.hidden = false;
    $("chat-access-note").textContent = currentLang === "ar" ? "أنت كمشرف، تملك صلاحيات التحكم الكاملة" : "You as admin have full control permissions";
  } else {
    adminAddProductBtn.hidden = true;
    adminViewOnlineBtn.hidden = true;
    toggleChatLockBtn.hidden = true;
    adminProductFormBox.hidden = true;
    adminSettingsSection.hidden = true;
    adminMusicSection.hidden = true;
    $("chat-access-note").textContent = currentLang === "ar" ? "إعلانات وتحديثات المتجر" : "Store announcements & updates";
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
    item.innerHTML = `<span>${escapeHtml(email)}</span> <button data-del-admin="${key}"><i class="fa-solid fa-trash"></i> ${currentLang === "ar" ? "حذف" : "Delete"}</button>`;
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
    item.innerHTML = `<span>${escapeHtml(email)}</span> <button data-del-ban="${key}"><i class="fa-solid fa-unlock"></i> ${currentLang === "ar" ? "إلغاء الحظر" : "Unban"}</button>`;
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
      toast(currentLang === "ar" ? "تم حذف المشرف بنجاح." : "Admin deleted successfully.");
    } catch (error) {
      console.error("Delete Admin Error:", error);
      toast(currentLang === "ar" ? "تعذر الحذف." : "Failed to delete.", true);
    }
  }

  if (delBanBtn && isAdmin()) {
    const key = delBanBtn.dataset.delBan;
    try {
      await remove(ref(db, `settings/banned/${key}`));
      toast(currentLang === "ar" ? "تم إلغاء الحظر بنجاح." : "Unbanned successfully.");
    } catch (error) {
      console.error("Unban Error:", error);
      toast(currentLang === "ar" ? "تعذر فك الحظر." : "Failed to unban.", true);
    }
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
      musicPlayPauseBtn.innerHTML = `<i class="fa-solid fa-pause"></i> ${currentLang === "ar" ? "إيقاف المؤقت" : "Pause Audio"}`;
    }).catch(() => { toast(currentLang === "ar" ? "تعذر تشغيل الصوت، تأكد من الرابط." : "Failed to play audio, check URL.", true); });
  } else {
    bgAudio.pause();
    musicPlayPauseBtn.innerHTML = `<i class="fa-solid fa-play"></i> ${currentLang === "ar" ? "تشغيل الصوت" : "Play Audio"}`;
  }
});

saveMusicUrlBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  const newUrl = musicUrlInput.value.trim();
  if (!newUrl) return toast(currentLang === "ar" ? "اكتب رابط الأغنية أولاً." : "Enter song URL first.", true);
  try {
    await set(ref(db, "settings/musicUrl"), newUrl);
    toast(currentLang === "ar" ? "تم تحديث رابط الأغنية بنجاح." : "Song URL updated successfully.");
  } catch { toast(currentLang === "ar" ? "فشل حفظ الرابط." : "Failed to save URL.", true); }
});

function updateChatLockUI() {
  if (isAdmin()) {
    chatComposeBox.hidden = false;
    userChatLockedMsg.hidden = true;
    toggleChatLockBtn.innerHTML = isChatLocked ? '<i class="fa-solid fa-lock"></i>' : '<i class="fa-solid fa-lock-open"></i>';
    toggleChatLockBtn.title = isChatLocked ? (currentLang === "ar" ? "فتح الكتابة للمستخدمين" : "Unlock chat") : (currentLang === "ar" ? "قفل الكتابة عن المستخدمين" : "Lock chat");
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
      if (isAdmin()) onlineUsersList.innerHTML = `<div class="empty-chat">${currentLang === "ar" ? "لا يوجد متصلون سواك." : "No online users except you."}</div>`;
    }
  });

  recordTodayRegistration(user);
}

function recordTodayRegistration(user) {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const userKey = user.uid;
  const regRef = ref(db, `dailyRegistrations/${todayKey}/${userKey}`);

  onValue(regRef, (snap) => {
    if (!snap.exists()) {
      set(regRef, {
        email: user.email || "",
        name: user.displayName || "مستخدم",
        loginTime: Date.now(),
        logoutTime: null
      });
    }
  }, { onlyOnce: true });

  userSessionRecordKey = { todayKey, userKey };
}

function handleUserLogoutSession() {
  if (userSessionRecordKey && currentUser) {
    const { todayKey, userKey } = userSessionRecordKey;
    const regRef = ref(db, `dailyRegistrations/${todayKey}/${userKey}/logoutTime`);
    set(regRef, Date.now()).catch(() => {});
  }
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

adminViewTodayRegistrationsBtn.addEventListener("click", () => {
  if (!isAdmin()) return;
  todayRegistrationsModal.classList.add("active");
  fetchTodayRegistrations();
});
$("close-today-modal").addEventListener("click", () => { todayRegistrationsModal.classList.remove("active"); });

function fetchTodayRegistrations() {
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const todayRegRef = ref(db, `dailyRegistrations/${todayKey}`);

  onValue(todayRegRef, (snapshot) => {
    todayRegistrationsList.innerHTML = "";
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([uKey, uData]) => {
        const item = document.createElement("div");
        item.className = "online-user-item";
        
        const loginStr = uData.loginTime ? new Date(uData.loginTime).toLocaleString(currentLang === "ar" ? "ar-EG" : "en-US") : "-";
        const logoutStr = uData.logoutTime ? new Date(uData.logoutTime).toLocaleString(currentLang === "ar" ? "ar-EG" : "en-US") : (currentLang === "ar" ? "لم يسجل خروج بعد" : "Still logged in");

        item.innerHTML = `
          <div style="flex:1; min-width:0;">
            <strong style="overflow-wrap:anywhere; color:var(--primary);">${escapeHtml(uData.email)}</strong>
            <small style="display:block; margin-top:3px;">${escapeHtml(uData.name || "مستخدم")}</small>
            <div id="details-${uKey}" hidden style="margin-top:8px; padding-top:8px; border-top:1px solid var(--line); font-size:11px;">
              <div>🕒 ${currentLang === "ar" ? "وقت الدخول:" : "Login Time:"} <b>${loginStr}</b></div>
              <div>🚪 ${currentLang === "ar" ? "وقت الخروج:" : "Logout Time:"} <b>${logoutStr}</b></div>
            </div>
          </div>
          <button class="btn btn-small btn-primary" data-toggle-reg-details="${uKey}">${currentLang === "ar" ? "عرض" : "View"}</button>
        `;
        todayRegistrationsList.appendChild(item);
      });
    } else {
      todayRegistrationsList.innerHTML = `<div class="empty-chat">${currentLang === "ar" ? "لا توجد تسجيلات حتى الآن اليوم." : "No registrations today yet."}</div>`;
    }
  });
}

todayRegistrationsList.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-toggle-reg-details]");
  if (btn) {
    const uKey = btn.dataset.toggleRegDetails;
    const detailsBox = $(`details-${uKey}`);
    if (detailsBox) {
      detailsBox.hidden = !detailsBox.hidden;
      btn.textContent = detailsBox.hidden ? (currentLang === "ar" ? "عرض" : "View") : (currentLang === "ar" ? "إخفاء" : "Hide");
    }
  }
});
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const userEmail = user.email?.trim().toLowerCase();
    const isBanned = Object.values(bannedUsers).some(e => e.trim().toLowerCase() === userEmail);
    if (isBanned) {
      toast(currentLang === "ar" ? "هذا الحساب محظور." : "This account is banned.", true);
      signOut(auth);
      return;
    }

    loginScreen.style.display = "none";
    setupPresence(user);

    const alreadyShown = sessionStorage.getItem("ahmed_store_splash_shown");
    if (!alreadyShown) {
      splashScreen.style.display = "flex";
      storeScreen.style.display = "none";
      window.setTimeout(() => {
        splashScreen.style.display = "none";
        storeScreen.style.display = "block";
        sessionStorage.setItem("ahmed_store_splash_shown", "true");
        applyAdminPrivileges();
      }, 1000);
    } else {
      splashScreen.style.display = "none";
      storeScreen.style.display = "block";
      applyAdminPrivileges();
    }

    $("menu-user-img").src = user.photoURL || "";
    $("menu-user-name").textContent = user.displayName || (currentLang === "ar" ? "مستخدم Ahmed Store" : "Ahmed Store User");
    $("menu-user-email").textContent = user.email || "";
  } else {
    loginScreen.style.display = "flex";
    splashScreen.style.display = "none";
    storeScreen.style.display = "none";
    settingsPopupMenu.classList.remove("active");
    musicPopupMenu.classList.remove("active");
    applyAdminPrivileges();
    sessionStorage.removeItem("ahmed_store_splash_shown");
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
    handleUserLogoutSession();
    if (currentUser) await remove(ref(db, `presence/${currentUser.uid}`));
    await signOut(auth);
    toast(currentLang === "ar" ? "تم تسجيل الخروج." : "Logged out successfully.");
  } catch { toast(currentLang === "ar" ? "تعذر تسجيل الخروج." : "Failed to logout.", true); }
});

$("add-admin-btn").addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = $("new-admin-email").value.trim().toLowerCase();
  if (!email) return toast(currentLang === "ar" ? "اكتب الإيميل أولاً." : "Enter email first.", true);
  try {
    await push(ref(db, "settings/admins"), email);
    $("new-admin-email").value = "";
    toast(currentLang === "ar" ? "تمت إضافة المشرف بنجاح." : "Admin added successfully.");
  } catch { toast(currentLang === "ar" ? "فشل إضافة المشرف." : "Failed to add admin.", true); }
});

$("ban-user-btn").addEventListener("click", async () => {
  if (!isAdmin()) return;
  const email = $("ban-user-email").value.trim().toLowerCase();
  if (!email) return toast(currentLang === "ar" ? "اكتب الإيميل للحظر." : "Enter email to ban.", true);
  try {
    await push(ref(db, "settings/banned"), email);
    $("ban-user-email").value = "";
    toast(currentLang === "ar" ? "تم حظر المستخدم بنجاح." : "User banned successfully.");
  } catch { toast(currentLang === "ar" ? "فشل حظر المستخدم." : "Failed to ban user.", true); }
});

toggleChatLockBtn.addEventListener("click", async () => {
  if (!isAdmin()) return;
  try {
    const newLockState = !isChatLocked;
    await set(ref(db, "settings/chatLocked"), newLockState);
    toast(newLockState ? (currentLang === "ar" ? "تم قفل الشات عن المستخدمين." : "Chat locked for users.") : (currentLang === "ar" ? "تم فتح الشات للجميع." : "Chat unlocked for everyone."));
  } catch { toast(currentLang === "ar" ? "تعذر تغيير حالة الشات." : "Failed to change chat state.", true); }
});

const translations = {
  ar: {
    welcome: "WELCOME TO THE NEXT LEVEL",
    storeTitle: "Ahmed",
    storeSubtitle: "تجربة شراء مختلفة، أسرع وأسهل.",
    googleLogin: "المتابعة باستخدام Google",
    secureGoogle: "تسجيل دخول آمن عبر Google",
    smartShopping: "SMART SHOPPING EXPERIENCE",
    heroKicker: "AHMED STORE / DIGITAL MARKET",
    heroHeading1: "اختار اللي يناسبك.",
    heroHeading2: "واستمتع بالتجربة.",
    heroDesc: "منتجاتك المفضلة في مكان واحد، بتجربة بسيطة وآمنة وتصميم معمول للمستقبل.",
    discoverBtn: "اكتشف المنتجات",
    proof1: "تجربة واضحة",
    proof2: "دعم مباشر",
    theCollection: "THE COLLECTION",
    productsHeading: "المنتجات مميزة",
    productsDesc: "اختار منتجك وابدأ طلبك في خطوات بسيطة.",
    addProductBtn: "إضافة منتج",
    trust1Title: "خطوات شراء واضحة",
    trust1Desc: "السعر وتعليمات التحويل قبل التأكيد",
    trust2Title: "تواصل بسهولة",
    trust2Desc: "إرسال تفاصيل الطلب للدعم",
    trust3Title: "إدارة مخصصة",
    trust3Desc: "أدوات الإدارة للمشرف فقط",
    footerText: "تسوق بذكاء. اختار بثقة.",
    langBtn: "تغيير اللغة / English",
    logoutBtn: "تسجيل الخروج",
    supportBtn: "الدعم الفني",
    uiColor: "لون الواجهة",
    liveVisitors: "متصل الآن",
    chatTitle: "رسائل المتجر",
    chatNote: "إعلانات وتحديثات المتجر"
  },
  en: {
    welcome: "WELCOME TO THE NEXT LEVEL",
    storeTitle: "Ahmed",
    storeSubtitle: "A different, faster, and easier shopping experience.",
    googleLogin: "Continue with Google",
    secureGoogle: "Secure login via Google",
    smartShopping: "SMART SHOPPING EXPERIENCE",
    heroKicker: "AHMED STORE / DIGITAL MARKET",
    heroHeading1: "Choose what suits you.",
    heroHeading2: "And enjoy the experience.",
    heroDesc: "Your favorite products in one place, with a simple, secure, and future-proof design.",
    discoverBtn: "Discover Products",
    proof1: "Clear Experience",
    proof2: "Direct Support",
    theCollection: "THE COLLECTION",
    productsHeading: "Featured Products",
    productsDesc: "Choose your product and start your order in simple steps.",
    addProductBtn: "Add Product",
    trust1Title: "Clear Purchase Steps",
    trust1Desc: "Price and transfer instructions before confirmation",
    trust2Title: "Connect Easily",
    trust2Desc: "Send order details to support",
    trust3Title: "Custom Management",
    trust3Desc: "Management tools for admin only",
    footerText: "Shop smart. Choose with confidence.",
    langBtn: "Change Language / العربية",
    logoutBtn: "Logout",
    supportBtn: "Technical Support",
    uiColor: "Interface Color",
    liveVisitors: "online now",
    chatTitle: "Store Messages",
    chatNote: "Store announcements & updates"
  }
};

$("language-toggle").addEventListener("click", () => {
  currentLang = currentLang === "ar" ? "en" : "ar";
  const t = translations[currentLang];

  document.querySelector(".login-card .eyebrow").textContent = t.welcome;
  document.querySelector(".login-card h1").innerHTML = `${t.storeTitle} <span>Store</span>`;
  document.querySelector(".login-card .muted").textContent = t.storeSubtitle;
  document.querySelector("#google-login-btn span").textContent = t.googleLogin;
  document.querySelector(".login-card small.muted").textContent = t.secureGoogle;

  document.querySelector(".brand-lockup small").textContent = t.smartShopping;
  document.querySelector(".hero-kicker").innerHTML = `<i class="fa-solid fa-bolt"></i> ${t.heroKicker}`;
  document.querySelector(".hero-copy h1").innerHTML = `${t.heroHeading1}<br><span>${t.heroHeading2}</span>`;
  document.querySelector(".hero-copy > p").textContent = t.heroDesc;
  document.querySelector(".hero-cta").innerHTML = `${t.discoverBtn} <i class="fa-solid fa-arrow-left"></i>`;
  
  document.querySelector(".section-heading .eyebrow").textContent = t.theCollection;
  document.querySelector(".section-heading h2").innerHTML = `${currentLang === "ar" ? "المنتجات" : "Featured"} <span>${currentLang === "ar" ? "المميزة" : "Products"}</span>`;
  document.querySelector(".section-heading p").textContent = t.productsDesc;
  if ($("admin-add-product-btn")) $("admin-add-product-btn").innerHTML = `<i class="fa-solid fa-plus"></i> ${t.addProductBtn}`;

  $("language-toggle").querySelector("span").textContent = t.langBtn;
  document.querySelector("#menu-logout-trigger span").textContent = t.logoutBtn;
  document.querySelector("#support-wa-link span").textContent = t.supportBtn;

  toast(currentLang === "ar" ? "تم تغيير اللغة بنجاح." : "Language changed successfully.");
  settingsPopupMenu.classList.remove("active");
  applyAdminPrivileges();
});

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.className = button.dataset.theme;
    localStorage.setItem("ahmed_store_theme", button.dataset.theme);
    settingsPopupMenu.classList.remove("active");
  });
});

const savedTheme = localStorage.getItem("ahmed_store_theme");
if (savedTheme && /^theme-(blue|violet|mint|gold|red)$/.test(savedTheme)) {
  document.body.className = savedTheme;
      }
      function openProductForm(productId = null) {
  if (!isAdmin()) return toast(currentLang === "ar" ? "هذه الخاصية للمشرف فقط." : "Admin only feature.", true);
  editingProductId = productId;
  $("product-form-title").textContent = productId ? (currentLang === "ar" ? "تعديل المنتج" : "Edit Product") : (currentLang === "ar" ? "إضافة منتج جديد" : "Add New Product");
  $("new-product-title").value = "";
  $("new-product-price").value = "";
  $("new-product-description").value = "";
  $("new-product-link").value = "";
  $("new-product-img-file").value = "";
  setFormMessage(productId ? (currentLang === "ar" ? "اختار صورة جديدة أو اتركها فارغة." : "Choose new image or leave empty.") : "");
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
    if (!file.type.startsWith("image/")) return reject(new Error(currentLang === "ar" ? "اختار ملف صورة صحيح." : "Select a valid image file."));
    if (file.size > 5 * 1024 * 1024) return reject(new Error(currentLang === "ar" ? "حجم الصورة يجب ألا يتجاوز 5 ميجابايت." : "Image size must not exceed 5MB."));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error(currentLang === "ar" ? "تعذر قراءة الصورة." : "Failed to read image."));
    reader.readAsDataURL(file);
  });
}

$("save-product-btn").addEventListener("click", async () => {
  if (!isAdmin()) return toast(currentLang === "ar" ? "غير مسموح لك بإدارة المنتجات." : "Not allowed to manage products.", true);
  const title = $("new-product-title").value.trim();
  const price = Number($("new-product-price").value);
  const description = $("new-product-description").value.trim();
  const link = $("new-product-link").value.trim();
  const file = $("new-product-img-file").files?.[0] || null;
  const existing = editingProductId ? productDataById.get(editingProductId) : null;

  if (!title || !Number.isFinite(price) || price <= 0) {
    setFormMessage(currentLang === "ar" ? "اختار اسم المنتج وسعراً صحيحاً." : "Select product name and valid price.", true);
    return;
  }
  if (!existing && !file) {
    setFormMessage(currentLang === "ar" ? "اختار صورة للمنتج." : "Select product image.", true);
    return;
  }

  const saveButton = $("save-product-btn");
  saveButton.disabled = true;
  saveButton.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${currentLang === "ar" ? "جاري الحفظ" : "Saving"}`;

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
      toast(currentLang === "ar" ? "تم تعديل المنتج بنجاح." : "Product updated successfully.");
    } else {
      await push(ref(db, "products"), { ...product, createdAt: Date.now(), createdBy: currentUser.uid });
      toast(currentLang === "ar" ? "تمت إضافة المنتج بنجاح." : "Product added successfully.");
    }
    adminProductFormBox.hidden = true;
    editingProductId = null;
  } catch (error) {
    setFormMessage(error.message || (currentLang === "ar" ? "حدث خطأ أثناء الحفظ." : "Error during saving."), true);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> ${currentLang === "ar" ? "حفظ المنتج" : "Save Product"}`;
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
    ? `<a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-small btn-external-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${currentLang === "ar" ? "رابط المنتج" : "Product Link"}</a>`
    : "";

  card.innerHTML = `
    <div class="product-image-wrap">${imageMarkup}</div>
    <div class="product-body">
      <span class="product-category">AHMED SELECTION</span>
      <h3>${escapeHtml(data.title || "منتج")}</h3>
      <p class="product-description">${escapeHtml(data.description || "منتج مميز من Ahmed Store.")}</p>
      ${externalLinkMarkup}
      <div class="product-bottom">
        <div class="product-price">${escapeHtml(data.price)} <small>${currentLang === "ar" ? "جنيه" : "EGP"}</small></div>
        <button class="btn btn-primary buy-btn" data-buy="${escapeHtml(id)}"><i class="fa-solid fa-bag-shopping"></i> ${currentLang === "ar" ? "شراء الآن" : "Buy Now"}</button>
      </div>
    </div>
    ${isAdmin() ? `<div class="admin-product-actions"><button class="btn btn-small btn-edit" data-edit="${escapeHtml(id)}"><i class="fa-solid fa-pen"></i> ${currentLang === "ar" ? "تعديل" : "Edit"}</button><button class="btn btn-small btn-delete" data-delete="${escapeHtml(id)}"><i class="fa-solid fa-trash"></i> ${currentLang === "ar" ? "حذف" : "Delete"}</button></div>` : ""}
  `;
  productsGridContainer.appendChild(card);
}

function showEmptyProducts() {
  if (productsGridContainer.children.length === 0) {
    productsGridContainer.innerHTML = `<div class="empty-state"><i class="fa-solid fa-box-open"></i><strong>${currentLang === "ar" ? "لسه مفيش منتجات" : "No products yet"}</strong><span>${currentLang === "ar" ? "انتظر قليلاً لتظهر المنتجات." : "Wait a moment for products to appear."}</span></div>`;
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
    if (!isAdmin()) return toast(currentLang === "ar" ? "هذه الخاصية للمشرف فقط." : "Admin only feature.", true);
    const id = deleteButton.dataset.delete;
    try { 
      await remove(ref(db, `products/${id}`)); 
      toast(currentLang === "ar" ? "تم حذف المنتج." : "Product deleted."); 
    } catch { 
      toast(currentLang === "ar" ? "تعذر حذف المنتج." : "Failed to delete product.", true); 
    }
  }
});

function openPurchaseModal(id, product) {
  currentPurchase = { id, ...product };
  $("purchase-product-name").textContent = product.title || "منتج";
  $("purchase-product-price").textContent = `${product.price} ${currentLang === "ar" ? "جنيه" : "EGP"}`;
  $("purchase-product-image").src = product.image || "";
  $("purchase-product-image").style.visibility = product.image ? "visible" : "hidden";
  purchaseModal.classList.add("active");
}

function closePurchaseModal() { purchaseModal.classList.remove("active"); currentPurchase = null; }
$("close-purchase-modal").addEventListener("click", closePurchaseModal);
purchaseModal.addEventListener("click", (event) => { if (event.target === purchaseModal) closePurchaseModal(); });

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") { closePurchaseModal(); settingsPopupMenu.classList.remove("active"); musicPopupMenu.classList.remove("active"); onlineUsersModal.classList.remove("active"); todayRegistrationsModal.classList.remove("active"); }
});

$("copy-transfer-number").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(TRANSFER_NUMBER); toast(currentLang === "ar" ? "تم نسخ رقم التحويل." : "Transfer number copied."); } catch { toast(`رقم التحويل: ${TRANSFER_NUMBER}`); }
});

function orderMessage() {
  if (!currentPurchase) return "";
  return `مرحباً Ahmed Store، أريد تأكيد طلب:\nالمنتج: ${currentPurchase.title}\nالسعر: ${currentPurchase.price} جنيه\nرقم التحويل: ${TRANSFER_NUMBER}\nاسم الحساب: ${currentUser?.displayName || "غير محدد"}\nسأرفق صورة التحويل في هذه المحادثة.`;
}

$("send-transfer-proof-btn").addEventListener("click", () => {
  if (!currentPurchase) return;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`, "_blank", "noopener,noreferrer");
});

$("copy-order-details-btn").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(orderMessage()); toast(currentLang === "ar" ? "تم نسخ تفاصيل الطلب." : "Order details copied."); } catch { toast(currentLang === "ar" ? "تعذر النسخ تلقائياً." : "Failed to copy automatically.", true); }
});

const messagesRef = ref(db, "messages");
onValue(messagesRef, (snapshot) => {
  if (snapshot.exists()) {
    chatMessagesArea.querySelector(".empty-chat")?.remove();
    snapshot.forEach((childSnap) => {
      renderStoreMessage(childSnap.key, childSnap.val());
    });
  } else {
    chatMessagesArea.innerHTML = `<div class="empty-chat">${currentLang === "ar" ? "لا توجد رسائل حتى الآن." : "No messages yet."}</div>`;
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

  const date = data.timestamp ? new Date(data.timestamp).toLocaleString(currentLang === "ar" ? "ar-EG" : "en-US", { dateStyle: "short", timeStyle: "short" }) : "";
  const linkMarkup = data.link ? `<br><a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="chat-message-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${currentLang === "ar" ? "زيارة الرابط" : "Visit Link"}</a>` : "";

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
    <button class="add-reaction-btn" data-toggle-popup="${id}" title="${currentLang === "ar" ? "إضافة تفاعل" : "Add reaction"}"><i class="fa-solid fa-face-smile"></i></button>
    <div class="reactions-popup glass-card" id="popup-reactions-${id}">
      <button class="reaction-option" data-select-emoji="❤️" data-msg-id="${id}">❤️</button>
      <button class="reaction-option" data-select-emoji="😂" data-msg-id="${id}">😂</button>
      <button class="reaction-option" data-select-emoji="😭" data-msg-id="${id}">😭</button>
      <button class="reaction-option" data-select-emoji="👍🏻" data-msg-id="${id}">👍🏻</button>
    </div>
  </div>`;

  message.innerHTML = `
    <div class="chat-message-top"><strong><i class="fa-solid fa-crown"></i> ${escapeHtml(data.username || "Ahmed Store")}</strong><time>${escapeHtml(date)}</time></div>
    <p>${escapeHtml(data.text || "")}${linkMarkup}</p>
    ${reactionsHtml}
    ${isAdmin() ? `<button class="chat-delete-btn" data-delete-message="${escapeHtml(id)}"><i class="fa-solid fa-trash"></i> ${currentLang === "ar" ? "حذف الرسالة" : "Delete Message"}</button>` : ""}
  `;

  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

$("chat-float-btn").addEventListener("click", () => { chatPanel.classList.toggle("active"); chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight; });
$("chat-close-btn").addEventListener("click", () => { chatPanel.classList.remove("active"); });

async function sendStoreMessage() {
  if (isChatLocked && !isAdmin()) return toast(currentLang === "ar" ? "عذراً، الكتابة معطلة حالياً من قبل المشرف." : "Chat is currently locked by admin.", true);
  const text = chatInputField.value.trim();
  const link = chatLinkField.value.trim();
  if (!text) return;
  chatSendBtn.disabled = true;
  try {
    await push(messagesRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      username: isAdmin() ? "Ahmed Store (مشرف)" : (currentUser.displayName || "مستخدم"),
      text,
      link: link || "",
      timestamp: Date.now(),
      isAdmin: isAdmin()
    });
    chatInputField.value = "";
    chatLinkField.value = "";
    toast(currentLang === "ar" ? "تم إرسال الرسالة." : "Message sent.");
  } catch { toast(currentLang === "ar" ? "تعذر إرسال الرسالة." : "Failed to send message.", true); } finally { chatSendBtn.disabled = false; }
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
    if (!currentUser) return toast(currentLang === "ar" ? "يجب تسجيل الدخول لتتمكن من التفاعل." : "You must log in to react.", true);
    const msgId = selectEmojiBtn.dataset.msgId;
    const emoji = selectEmojiBtn.dataset.selectEmoji;
    const userUid = currentUser.uid;

    try {
      await set(ref(db, `messages/${msgId}/reactions/${userUid}`), emoji);
      $(`popup-reactions-${msgId}`)?.classList.remove("active");
    } catch {
      toast(currentLang === "ar" ? "تعذر تسجيل التفاعل." : "Failed to record reaction.", true);
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
      toast(currentLang === "ar" ? "تعذر تعديل التفاعل." : "Failed to update reaction.", true);
    }
    return;
  }

  if (deleteMsgBtn && isAdmin()) {
    const msgId = deleteMsgBtn.dataset.deleteMessage;
    try {
      await remove(ref(db, `messages/${msgId}`));
      $(`store-message-${msgId}`)?.remove();
      toast(currentLang === "ar" ? "تم حذف الرسالة بنجاح." : "Message deleted successfully.");
    } catch (error) {
      console.error("Delete Error:", error);
      toast(currentLang === "ar" ? "تعذر حذف الرسالة." : "Failed to delete message.", true);
    }
  }
});
                                                                                                                                                                                                                                                                                                                           
