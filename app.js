import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getDatabase, ref, push, onChildAdded, onChildRemoved, onChildChanged, update, remove, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const translations = {
    ar: {
        welcome_back: "مرحباً بك مجدداً",
        login_desc: "سجل دخولك الآن واستمتع بتجربة تسوق ذكية وآمنة.",
        google_btn: "Continue with Google",
        splash_title: "مرحباً بكم في King Store",
        splash_desc: "جاري تهيئة وتجهيز متجرك...",
        alert_title: "⚠️ تحذير هام",
        alert_desc: "لا يمكن استرجاع البيانات نهائياً. هل أنت متأكد من رغبتك في حذف بيانات هذا الحساب؟",
        cancel_btn: "إلغاء",
        confirm_delete_btn: "تأكيد الحذف",
        logout_txt: "تسجيل الخروج",
        language_label: "لغة الموقع:",
        colors_label: "تخصيص ألوان الموقع:",
        support_txt: "مركز الدعم الفني",
        delete_account_txt: "حذف بيانات الحساب",
        purchases_title: "المشتريات",
        chat_title: "دردشة مجتمع King Store",
        chat_placeholder: "اكتب رسالتك هنا..."
    },
    en: {
        welcome_back: "Welcome Back",
        login_desc: "Sign in now and enjoy a smart & secure shopping experience.",
        google_btn: "Continue with Google",
        splash_title: "Welcome to King Store",
        splash_desc: "Preparing your store...",
        alert_title: "⚠️ Important Warning",
        alert_desc: "Data cannot be recovered. Are you sure you want to delete your account data?",
        cancel_btn: "Cancel",
        confirm_delete_btn: "Confirm Delete",
        logout_txt: "Logout",
        language_label: "Language:",
        colors_label: "Theme Colors:",
        support_txt: "Support Center",
        delete_account_txt: "Delete Account Data",
        purchases_title: "Purchases",
        chat_title: "King Store Community Chat",
        chat_placeholder: "Type your message here..."
    }
};

let currentLang = localStorage.getItem('king_store_lang') || 'ar';

function applyLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('king_store_lang', lang);
    
    const htmlRoot = document.getElementById('html-root');
    if (htmlRoot) {
        htmlRoot.setAttribute('lang', lang);
        htmlRoot.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
    }

    const langNameTxt = document.getElementById('lang-name-txt');
    if (langNameTxt) {
        langNameTxt.textContent = lang === 'ar' ? 'English' : 'العربية';
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.textContent = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    updateSupportLinkText();
}

window.toggleLanguage = function() {
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    applyLanguage(newLang);
    if (settingsPopupMenu) settingsPopupMenu.classList.remove('active');
};

function updateSupportLinkText() {
    const supportWaLink = document.getElementById('support-wa-link');
    if (!supportWaLink) return;
    const supportText = currentLang === 'ar' ? "مركز الدعم الفني" : "Support Center";
    const greetingText = currentLang === 'ar' ? "مرحباً، أريد الدعم الفني والاستفسار عن خدمات متجر King Store." : "Hello, I need support regarding King Store services.";
    
    supportWaLink.href = `https://wa.me/201225428692?text=${encodeURIComponent(greetingText)}`;
    const spanEl = supportWaLink.querySelector('span');
    if (spanEl) spanEl.textContent = supportText;
}

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
const chatMicBtn = document.getElementById('chat-mic-btn');

const replyPreviewBox = document.getElementById('reply-preview-box');
const replyingToText = document.getElementById('replying-to-text');
const cancelReplyBtn = document.getElementById('cancel-reply-btn');

let currentUser = null;
let isLoginHandled = false;
let replyingToData = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// تطبيق اللغة والتصميم بأمان بعد قراءة عناصر الصفحة
applyLanguage(currentLang);

const activeTheme = localStorage.getItem('king_store_theme');
if (activeTheme) document.body.className = activeTheme;

window.changeTheme = function(themeName) {
    document.body.className = themeName;
    localStorage.setItem('king_store_theme', themeName);
    if (settingsPopupMenu) settingsPopupMenu.classList.remove('active');
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if (loginScreen) loginScreen.style.display = 'none';
        if (!isLoginHandled && !sessionStorage.getItem('splash_shown')) {
            if (splashScreen) splashScreen.style.display = 'flex';
            setTimeout(() => {
                if (splashScreen) splashScreen.style.display = 'none';
                if (storeScreen) storeScreen.style.display = 'block';
                sessionStorage.setItem('splash_shown', 'true');
            }, 3000);
            isLoginHandled = true;
        } else {
            if (splashScreen) splashScreen.style.display = 'none';
            if (storeScreen) storeScreen.style.display = 'block';
        }
        if (menuUserImg) menuUserImg.src = user.photoURL || "";
        if (menuUserName) menuUserName.textContent = user.displayName || "مستخدم متميز";
    } else {
        currentUser = null;
        isLoginHandled = false;
        sessionStorage.removeItem('splash_shown');
        if (splashScreen) splashScreen.style.display = 'none';
        if (storeScreen) storeScreen.style.display = 'none';
        if (loginScreen) loginScreen.style.display = 'flex';
        if (settingsPopupMenu) settingsPopupMenu.classList.remove('active');
        if (chatModalContainer) chatModalContainer.classList.remove('active');
    }
});

if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        if (authErrorMsg) authErrorMsg.textContent = currentLang === 'ar' ? "جاري فتح نافذة تسجيل الدخول..." : "Opening login window...";
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            if (authErrorMsg) authErrorMsg.textContent = (currentLang === 'ar' ? "خطأ في التسجيل: " : "Login Error: ") + err.code;
        }
    });
}

if (settingsTriggerBtn) {
    settingsTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (settingsPopupMenu) settingsPopupMenu.classList.toggle('active');
    });
}

window.addEventListener('click', () => {
    if (settingsPopupMenu) settingsPopupMenu.classList.remove('active');
});

if (settingsPopupMenu) {
    settingsPopupMenu.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

if (menuLogoutTrigger) {
    menuLogoutTrigger.addEventListener('click', async () => {
        try { await signOut(auth); } catch (e) { console.log(e); }
    });
}

if (triggerDeleteModal) {
    triggerDeleteModal.addEventListener('click', () => {
        if (settingsPopupMenu) settingsPopupMenu.classList.remove('active');
        if (deleteAlertModal) deleteAlertModal.style.display = 'flex';
    });
}

if (cancelDeleteAction) {
    cancelDeleteAction.addEventListener('click', () => {
        if (deleteAlertModal) deleteAlertModal.style.display = 'none';
    });
}

if (confirmDeleteAction) {
    confirmDeleteAction.addEventListener('click', async () => {
        if (deleteAlertModal) deleteAlertModal.style.display = 'none';
        localStorage.clear();
        sessionStorage.clear();
        try { await signOut(auth); } catch (e) { console.log(e); }
        window.location.reload();
    });
}

if (chatFloatBtn) {
    chatFloatBtn.addEventListener('click', () => {
        if (chatModalContainer) {
            chatModalContainer.classList.toggle('active');
            if (chatMessagesArea) chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
        }
    });
}

if (chatCloseBtn) {
    chatCloseBtn.addEventListener('click', () => {
        if (chatModalContainer) chatModalContainer.classList.remove('active');
    });
}

if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', () => {
        replyingToData = null;
        if (replyPreviewBox) replyPreviewBox.style.display = 'none';
    });
}

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
    const msgId = snapshot.key;
    const data = snapshot.val();
    if (data) {
        renderMessage(msgId, data);
    }
});

onChildChanged(chatRef, (snapshot) => {
    const msgId = snapshot.key;
    const data = snapshot.val();
    if (data) {
        renderMessage(msgId, data);
    }
});

onChildRemoved(chatRef, (snapshot) => {
    const msgId = snapshot.key;
    const msgElem = document.getElementById(`msg-${msgId}`);
    if (msgElem) msgElem.remove();
});

function renderMessage(msgId, data) {
    const isMyMessage = currentUser && (data.email === ADMIN_EMAIL || data.uid === currentUser.uid || data.username === currentUser.displayName);
    const rowClass = isMyMessage ? 'chat-msg-row my-message' : 'chat-msg-row other-message';
    
    const isMsgAdmin = data.email === ADMIN_EMAIL || data.username === "احمد ممدوح" || data.isAdmin === true;
    const adminBadgeHtml = isMsgAdmin ? `<span class="admin-badge"><i class="fa-solid fa-crown"></i> ${currentLang === 'ar' ? 'مشرف' : 'Admin'}</span>` : '';

    let replyHtml = '';
    if (data.replyTo) {
        replyHtml = `<div class="reply-quote-box"><b>${escapeHtml(data.replyTo.username)}:</b> ${escapeHtml(data.replyTo.text)}</div>`;
    }

    let reactionsHtml = '';
    if (data.reactions) {
        Object.entries(data.reactions).forEach(([emoji, users]) => {
            const count = Object.keys(users).length;
            if (count > 0) {
                reactionsHtml += `<span class="reaction-pill">${emoji} ${count}</span>`;
            }
        });
    }

    let existingMsgElem = document.getElementById(`msg-${msgId}`);
    if (existingMsgElem) {
        existingMsgElem.className = rowClass;
        const reactionsRow = existingMsgElem.querySelector('.message-reactions-row');
        if (reactionsRow) reactionsRow.innerHTML = reactionsHtml;
        return;
    }

    let messageBodyHtml = '';
    if (data.type === 'audio' && data.audioUrl) {
        messageBodyHtml = `
            <div class="wa-audio-player" id="player-${msgId}">
                <button class="wa-play-btn" onclick="togglePlayAudio('${msgId}')">
                    <i class="fa-solid fa-play" id="play-icon-${msgId}"></i>
                </button>
                <div class="wa-audio-info">
                    <div class="wa-audio-progress-bar" onclick="seekAudio(event, '${msgId}')">
                        <div class="wa-audio-progress-fill" id="progress-${msgId}"></div>
                    </div>
                    <div class="wa-audio-time">
                        <span id="current-time-${msgId}">0:00</span>
                        <span>🎤 ${currentLang === 'ar' ? 'صوتية' : 'Audio'}</span>
                    </div>
                </div>
                <audio id="audio-el-${msgId}" src="${data.audioUrl}" preload="metadata"></audio>
            </div>
        `;
    } else {
        messageBodyHtml = `<div class="chat-msg-text">${escapeHtml(data.text)}</div>`;
    }

    const isUserAdmin = currentUser && (currentUser.email === ADMIN_EMAIL || currentUser.displayName === "احمد ممدوح");
    let deleteBtnHtml = '';
    if (currentUser && (data.uid === currentUser.uid || isUserAdmin)) {
        deleteBtnHtml = `<button class="delete-msg-btn" onclick="deleteMessage('${msgId}')">${currentLang === 'ar' ? 'حذف' : 'Delete'}</button>`;
    }

    const replyBtnText = currentLang === 'ar' ? 'رد' : 'Reply';

    const msgRow = document.createElement('div');
    msgRow.id = `msg-${msgId}`;
    msgRow.className = rowClass;
    msgRow.innerHTML = `
        <img src="${data.avatar || ''}" class="chat-msg-avatar">
        <div class="chat-msg-content">
            <div class="chat-msg-header-info">
                <span class="chat-msg-username">${escapeHtml(data.username)}</span>
                ${adminBadgeHtml}
            </div>
            ${replyHtml}
            ${messageBodyHtml}
            <div class="message-reactions-row">${reactionsHtml}</div>
            
            <div class="msg-actions-row">
                <button class="reply-action-btn" onclick="prepareReply('${msgId}', '${escapeHtml(data.username)}', '${data.type === 'audio' ? (currentLang === 'ar' ? 'رسالة صوتية 🎤' : 'Audio message 🎤') : escapeHtml(data.text)}')">${replyBtnText}</button>
                ${deleteBtnHtml}
            </div>
            
            <div class="reaction-popup-menu">
                <button class="reaction-btn-option" onclick="toggleReaction('${msgId}', '❤️')">❤️</button>
                <button class="reaction-btn-option" onclick="toggleReaction('${msgId}', '😂')">😂</button>
                <button class="reaction-btn-option" onclick="toggleReaction('${msgId}', '😭')">😭</button>
                <button class="reaction-btn-option" onclick="toggleReaction('${msgId}', '👍🏻')">👍🏻</button>
            </div>
        </div>
    `;
    if (chatMessagesArea) {
        chatMessagesArea.appendChild(msgRow);
        chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
    }

    if (data.type === 'audio') {
        const audioEl = document.getElementById(`audio-el-${msgId}`);
        const playIcon = document.getElementById(`play-icon-${msgId}`);
        const progressFill = document.getElementById(`progress-${msgId}`);
        const currentTimeText = document.getElementById(`current-time-${msgId}`);

        if (audioEl) {
            audioEl.addEventListener('timeupdate', () => {
                if (audioEl.duration && progressFill && currentTimeText) {
                    const percent = (audioEl.currentTime / audioEl.duration) * 100;
                    progressFill.style.width = percent + '%';
                    
                    const mins = Math.floor(audioEl.currentTime / 60);
                    const secs = Math.floor(audioEl.currentTime % 60);
                    currentTimeText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
                }
            });

            audioEl.addEventListener('ended', () => {
                if (playIcon) playIcon.className = "fa-solid fa-play";
                if (progressFill) progressFill.style.width = '0%';
                audioEl.currentTime = 0;
            });
        }
    }
}

window.togglePlayAudio = function(msgId) {
    const audioEl = document.getElementById(`audio-el-${msgId}`);
    const playIcon = document.getElementById(`play-icon-${msgId}`);
    if (!audioEl) return;

    document.querySelectorAll('audio').forEach(el => {
        if (el.id !== `audio-el-${msgId}`) {
            el.pause();
            el.currentTime = 0;
            const otherId = el.id.replace('audio-el-', '');
            const otherIcon = document.getElementById(`play-icon-${otherId}`);
            if (otherIcon) otherIcon.className = "fa-solid fa-play";
        }
    });

    if (audioEl.paused) {
        audioEl.play();
        if (playIcon) playIcon.className = "fa-solid fa-pause";
    } else {
        audioEl.pause();
        if (playIcon) playIcon.className = "fa-solid fa-play";
    }
};

window.prepareReply = function(msgId, username, text) {
    replyingToData = { username, text };
    const prefix = currentLang === 'ar' ? 'الرد على' : 'Replying to';
    if (replyingToText) replyingToText.textContent = `${prefix} ${username}: ${text.substring(0, 25)}...`;
    if (replyPreviewBox) replyPreviewBox.style.display = 'block';
    if (chatInputField) chatInputField.focus();
};

window.toggleReaction = async function(msgId, emoji) {
    if (!currentUser) return;
    const userKey = currentUser.uid.replace(/[.#$[\]]/g, "_");
    const msgRef = ref(db, `messages/${msgId}/reactions`);
    
    const snapshot = await get(msgRef);
    let reactions = snapshot.exists() ? snapshot.val() : {};

    Object.keys(reactions).forEach(e => {
        if (reactions[e] && reactions[e][userKey]) {
            delete reactions[e][userKey];
            if (Object.keys(reactions[e]).length === 0) {
                delete reactions[e];
            }
        }
    });

    if (!reactions[emoji] || !reactions[emoji][userKey]) {
        if (!reactions[emoji]) reactions[emoji] = {};
        reactions[emoji][userKey] = true;
    }

    await update(ref(db, `messages/${msgId}`), { reactions: reactions });
};

window.deleteMessage = function(msgId) {
    if (!currentUser) return;
    const msgRef = ref(db, `messages/${msgId}`);
    remove(msgRef);
};

if (chatMicBtn) {
    chatMicBtn.addEventListener('click', async () => {
        if (!currentUser) return;

        if (!isRecording) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.o
