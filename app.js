import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, onChildRemoved, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

const ADMIN_EMAIL = "ahmadmamdouh333388@gmail.com";

const loginScreen = document.getElementById('login-screen');
const splashScreen = document.getElementById('splash-screen');
const storeScreen = document.getElementById('store-screen');
const googleLoginBtn = document.getElementById('google-login-btn');
const authErrorMsg = document.getElementById('auth-error-msg');

const settingsTriggerBtn = document.getElementById('settings-trigger-btn');
const settingsPopupMenu = document.getElementById('settings-popup-menu');
const menuUserImg = document.getElementById('menu-user-img');
const menuUserName = document.getElementById('menu-user-name');
const menuLogoutTrigger = document.getElementById('menu-logout-trigger');
const supportWaLink = document.getElementById('support-wa-link');

const triggerDeleteModal = document.getElementById('trigger-delete-modal');
const deleteAlertModal = document.getElementById('delete-alert-modal');
const cancelDeleteAction = document.getElementById('cancel-delete-action');
const confirmDeleteAction = document.getElementById('confirm-delete-action');

const chatFloatBtn = document.getElementById('chat-float-btn');
const chatModalContainer = document.getElementById('chat-modal-container');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatMessagesArea = document.getElementById('chat-messages-area');
const chatInputField = document.getElementById('chat-input-field');
const chatSendBtn = document.getElementById('chat-send-btn');

let currentUser = null;

const langTexts = {
    ar: {
        loginTitle: "أهلاً بك",
        loginDesc: "سجل دخولك الآن واستمتع بتجربة تسوق ذكية وآمنة.",
        googleBtn: "المتابعة باستخدام Google",
        splash: "جاري تهيئة متجر King Store...",
        alertTitle: "تحذير هام",
        alertDesc: "لا يمكن استرجاع البيانات نهائياً. هل أنت متأكد من رغبتك في حذف بيانات هذا الحساب؟",
        cancelBtn: "إلغاء",
        confirmBtn: "تأكيد الحذف",
        logout: "تسجيل الخروج",
        langLabel: "لغة الموقع:",
        themeLabel: "ألوان الموقع:",
        support: "الدعم الفني",
        deleteAccount: "حذف بيانات الحساب",
        heroTitle: "مرحباً بك في King Store",
        chatTitle: "دردشة المجتمع",
        chatPlaceholder: "اكتب رسالتك هنا..."
    },
    en: {
        loginTitle: "Welcome Back",
        loginDesc: "Sign in now and enjoy a smart, secure shopping experience.",
        googleBtn: "Continue with Google",
        splash: "Initializing King Store...",
        alertTitle: "Important Warning",
        alertDesc: "Data cannot be recovered once deleted. Are you sure you want to clear your account data?",
        cancelBtn: "Cancel",
        confirmBtn: "Confirm Delete",
        logout: "Logout",
        langLabel: "Language:",
        themeLabel: "Theme Colors:",
        support: "Technical Support",
        deleteAccount: "Delete Account Data",
        heroTitle: "Welcome to King Store",
        chatTitle: "Community Chat",
        chatPlaceholder: "Type your message here..."
    }
};

let currentLang = localStorage.getItem('king_store_lang') || 'ar';

window.switchLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('king_store_lang', lang);
    applyLang(lang);
    settingsPopupMenu.classList.remove('active');
};

function applyLang(lang) {
    const htmlRoot = document.getElementById('html-root');
    htmlRoot.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    htmlRoot.setAttribute('lang', lang);

    const t = langTexts[lang];
    if (!t) return;

    document.getElementById('txt-login-title').textContent = t.loginTitle;
    document.getElementById('txt-login-desc').textContent = t.loginDesc;
    document.getElementById('txt-google-btn').textContent = t.googleBtn;
    document.getElementById('txt-splash').textContent = t.splash;
    document.getElementById('txt-alert-title').textContent = t.alertTitle;
    document.getElementById('txt-alert-desc').textContent = t.alertDesc;
    document.getElementById('cancel-delete-action').textContent = t.cancelBtn;
    document.getElementById('confirm-delete-action').textContent = t.confirmBtn;
    document.getElementById('txt-logout').textContent = t.logout;
    document.getElementById('txt-lang-label').textContent = t.langLabel;
    document.getElementById('txt-theme-label').textContent = t.themeLabel;
    document.getElementById('txt-support').textContent = t.support;
    document.getElementById('txt-delete-account').textContent = t.deleteAccount;
    document.getElementById('txt-hero-title').textContent = t.heroTitle;
    document.getElementById('txt-chat-title').textContent = t.chatTitle;
    chatInputField.placeholder = t.chatPlaceholder;

    document.getElementById('lang-ar-btn').classList.toggle('active', lang === 'ar');
    document.getElementById('lang-en-btn').classList.toggle('active', lang === 'en');
}

applyLang(currentLang);

const activeTheme = localStorage.getItem('king_store_theme');
if (activeTheme) document.body.className = activeTheme;

window.changeTheme = function(themeName) {
    document.body.className = themeName;
    localStorage.setItem('king_store_theme', themeName);
    settingsPopupMenu.classList.remove('active');
};

supportWaLink.href = `https://wa.me/201225428692?text=${encodeURIComponent("Hello, I need technical support.")}`;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginScreen.style.display = 'none';
        storeScreen.style.display = 'block';
        menuUserImg.src = user.photoURL || "";
        menuUserName.textContent = user.displayName || "User";
    } else {
        currentUser = null;
        storeScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
    }
});

googleLoginBtn.addEventListener('click', async () => {
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        authErrorMsg.textContent = "Error: " + err.code;
    }
});

settingsTriggerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPopupMenu.classList.toggle('active');
});

window.addEventListener('click', () => {
    settingsPopupMenu.classList.remove('active');
});

settingsPopupMenu.addEventListener('click', (e) => {
    e.stopPropagation();
});

menuLogoutTrigger.addEventListener('click', async () => {
    try { await signOut(auth); } catch (e) { console.log(e); }
});

triggerDeleteModal.addEventListener('click', () => {
    settingsPopupMenu.classList.remove('active');
    deleteAlertModal.style.display = 'flex';
});

cancelDeleteAction.addEventListener('click', () => {
    deleteAlertModal.style.display = 'none';
});

confirmDeleteAction.addEventListener('click', async () => {
    deleteAlertModal.style.display = 'none';
    localStorage.clear();
    try { await signOut(auth); } catch (e) { console.log(e); }
    window.location.reload();
});

chatFloatBtn.addEventListener('click', () => {
    chatModalContainer.classList.toggle('active');
});

chatCloseBtn.addEventListener('click', () => {
    chatModalContainer.classList.remove('active');
});

const chatRef = ref(db, 'messages');

onChildAdded(chatRef, (snapshot) => {
    const msgId = snapshot.key;
    const data = snapshot.val();
    if (data) renderMessage(msgId, data);
});

onChildRemoved(chatRef, (snapshot) => {
    const msgElem = document.getElementById(`msg-${snapshot.key}`);
    if (msgElem) msgElem.remove();
});

function renderMessage(msgId, data) {
    if (document.getElementById(`msg-${msgId}`)) return;
    const msgRow = document.createElement('div');
    msgRow.id = `msg-${msgId}`;
    msgRow.style.cssText = "margin-bottom: 8px; padding: 8px; background: #1e293b; border-radius: 8px; font-size: 12px;";
    msgRow.innerHTML = `<b>${data.username || 'User'}:</b> ${data.text || ''}`;
    chatMessagesArea.appendChild(msgRow);
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

function sendChatMessage() {
    const text = chatInputField.value.trim();
    if (!text || !currentUser) return;

    push(chatRef, {
        uid: currentUser.uid,
        username: currentUser.displayName || 'User',
        text: text,
        timestamp: Date.now()
    });
    chatInputField.value = '';
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
});
        
