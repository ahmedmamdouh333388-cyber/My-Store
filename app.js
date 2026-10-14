import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
const menuOpenChatBtn = document.getElementById('menu-open-chat-btn');

const triggerDeleteModal = document.getElementById('trigger-delete-modal');
const deleteAlertModal = document.getElementById('delete-alert-modal');
const cancelDeleteAction = document.getElementById('cancel-delete-action');
const confirmDeleteAction = document.getElementById('confirm-delete-action');

const chatModalContainer = document.getElementById('chat-modal-container');
const chatCloseBtn = document.getElementById('chat-close-btn');
const chatMessagesArea = document.getElementById('chat-messages-area');
const chatInputField = document.getElementById('chat-input-field');
const chatSendBtn = document.getElementById('chat-send-btn');

let currentUser = null;
let isLoginHandled = false;

const activeTheme = localStorage.getItem('king_store_theme');
if (activeTheme) document.body.className = activeTheme;

window.changeTheme = function(themeName) {
    document.body.className = themeName;
    localStorage.setItem('king_store_theme', themeName);
    settingsPopupMenu.classList.remove('active');
};

supportWaLink.href = `https://wa.me/201225428692?text=${encodeURIComponent("مرحباً، أريد الدعم الفني والاستفسار عن خدمات متجر King Store.")}`;

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loginScreen.style.display = 'none';
        if (!isLoginHandled && !sessionStorage.getItem('splash_shown')) {
            splashScreen.style.display = 'flex';
            setTimeout(() => {
                splashScreen.style.display = 'none';
                storeScreen.style.display = 'block';
                sessionStorage.setItem('splash_shown', 'true');
            }, 3000);
            isLoginHandled = true;
        } else {
            splashScreen.style.display = 'none';
            storeScreen.style.display = 'block';
        }
        menuUserImg.src = user.photoURL || "";
        menuUserName.textContent = user.displayName || "مستخدم متميز";
    } else {
        currentUser = null;
        isLoginHandled = false;
        sessionStorage.removeItem('splash_shown');
        splashScreen.style.display = 'none';
        storeScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        settingsPopupMenu.classList.remove('active');
        chatModalContainer.classList.remove('active');
    }
});

googleLoginBtn.addEventListener('click', async () => {
    authErrorMsg.textContent = "جاري فتح نافذة تسجيل الدخول...";
    try {
        await signInWithPopup(auth, provider);
    } catch (err) {
        authErrorMsg.textContent = "خطأ في التسجيل: " + err.code;
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
    sessionStorage.clear();
    try { await signOut(auth); } catch (e) { console.log(e); }
    window.location.reload();
});

menuOpenChatBtn.addEventListener('click', () => {
    settingsPopupMenu.classList.remove('active');
    chatModalContainer.classList.add('active');
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
});

chatCloseBtn.addEventListener('click', () => {
    chatModalContainer.classList.remove('active');
});

const badWords = ["شرموط", "قحبة", "منيوك", "متناك", "عرص", "خول", "احا", "وسخ", "كلب", "حمار", "زفت", "طيز", "قذر", "لعنة", "لعن", "اوسخ", "عاهر", "عاهرة", "fuck", "shit", "bitch", "asshole", "cunt", "dick"];

function censorBadWords(text) {
    let cleanText = text;
    badWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        cleanText = cleanText.replace(regex, '***');
    });
    return cleanText;
}

const chatRef = ref(db, 'messages');
onChildAdded(chatRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        const msgRow = document.createElement('div');
        msgRow.className = 'chat-msg-row';
        msgRow.innerHTML = `
            <img src="${data.avatar || ''}" class="chat-msg-avatar">
            <div class="chat-msg-content">
                <div class="chat-msg-username">${escapeHtml(data.username)}</div>
                <div class="chat-msg-text">${escapeHtml(data.text)}</div>
            </div>
        `;
        chatMessagesArea.appendChild(msgRow);
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }
});

function sendChatMessage() {
    const rawText = chatInputField.value.trim();
    if (!rawText || !currentUser) return;

    const filteredText = censorBadWords(rawText);

    push(chatRef, {
        username: currentUser.displayName || 'مستخدم',
        avatar: currentUser.photoURL || '',
        text: filteredText,
        timestamp: Date.now()
    });

    chatInputField.value = '';
}

function escapeHtml(string) {
    return String(string).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

chatSendBtn.addEventListener('click', sendChatMessage);
chatInputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendChatMessage();
    }
});
                       
