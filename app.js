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

const activeTheme = localStorage.getItem('king_store_theme');
if (activeTheme) document.body.className = activeTheme;

window.changeTheme = function(themeName) {
    document.body.className = themeName;
    localStorage.setItem('king_store_theme', themeName);
    settingsPopupMenu.classList.remove('active');
};

supportWaLink.href = `https://wa.me/201225428692?text=${encodeURIComponent("مرحباً، أريد الدعم الفني والاستفسار عن خدمات King Store.")}`;

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

chatFloatBtn.addEventListener('click', () => {
    chatModalContainer.classList.toggle('active');
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
});

chatCloseBtn.addEventListener('click', () => {
    chatModalContainer.classList.remove('active');
});

cancelReplyBtn.addEventListener('click', () => {
    replyingToData = null;
    replyPreviewBox.style.display = 'none';
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
    const adminBadgeHtml = isMsgAdmin ? `<span class="admin-badge"><i class="fa-solid fa-crown"></i> مشرف</span>` : '';

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
                        <span>🎤 صوتية</span>
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
        deleteBtnHtml = `<button class="delete-msg-btn" onclick="deleteMessage('${msgId}')">حذف</button>`;
    }

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
                <button class="reply-action-btn" onclick="prepareReply('${msgId}', '${escapeHtml(data.username)}', '${data.type === 'audio' ? 'رسالة صوتية 🎤' : escapeHtml(data.text)}')">رد</button>
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
    chatMessagesArea.appendChild(msgRow);
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;

    if (data.type === 'audio') {
        const audioEl = document.getElementById(`audio-el-${msgId}`);
        const playIcon = document.getElementById(`play-icon-${msgId}`);
        const progressFill = document.getElementById(`progress-${msgId}`);
        const currentTimeText = document.getElementById(`current-time-${msgId}`);

        audioEl.addEventListener('timeupdate', () => {
            if (audioEl.duration) {
                const percent = (audioEl.currentTime / audioEl.duration) * 100;
                progressFill.style.width = percent + '%';
                
                const mins = Math.floor(audioEl.currentTime / 60);
                const secs = Math.floor(audioEl.currentTime % 60);
                currentTimeText.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }
        });

        audioEl.addEventListener('ended', () => {
            playIcon.className = "fa-solid fa-play";
            progressFill.style.width = '0%';
            audioEl.currentTime = 0;
        });
    }
}

window.togglePlayAudio = function(msgId) {
    const audioEl = document.getElementById(`audio-el-${msgId}`);
    const playIcon = document.getElementById(`play-icon-${msgId}`);

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
        playIcon.className = "fa-solid fa-pause";
    } else {
        audioEl.pause();
        playIcon.className = "fa-solid fa-play";
    }
};

window.prepareReply = function(msgId, username, text) {
    replyingToData = { username, text };
    replyingToText.textContent = `الرد على ${username}: ${text.substring(0, 25)}...`;
    replyPreviewBox.style.display = 'block';
    chatInputField.focus();
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

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64AudioMessage = reader.result;
                    sendAudioMessage(base64AudioMessage);
                };
            };

            mediaRecorder.start();
            isRecording = true;
            chatMicBtn.classList.add('recording');
        } catch (err) {
            alert("عذراً، يرجى السماح للمتصفح بالوصول إلى الميكروفون.");
        }
    } else {
        mediaRecorder.stop();
        isRecording = false;
        chatMicBtn.classList.remove('recording');
    }
});

function sendAudioMessage(audioUrl) {
    const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.displayName === "احمد ممدوح";

    const newMessage = {
        uid: currentUser.uid,
        email: currentUser.email,
        username: currentUser.displayName || 'مستخدم',
        avatar: currentUser.photoURL || '',
        type: 'audio',
        audioUrl: audioUrl,
        isAdmin: isAdminUser,
        timestamp: Date.now()
    };

    if (replyingToData) {
        newMessage.replyTo = replyingToData;
    }

    push(chatRef, newMessage);
    replyingToData = null;
    replyPreviewBox.style.display = 'none';
}

function sendChatMessage() {
    const rawText = chatInputField.value.trim();
    if (!rawText || !currentUser) return;

    const filteredText = censorBadWords(rawText);
    const isAdminUser = currentUser.email === ADMIN_EMAIL || currentUser.displayName === "احمد ممدوح";

    const newMessage = {
        uid: currentUser.uid,
        email: currentUser.email,
        username: currentUser.displayName || 'مستخدم',
        avatar: currentUser.photoURL || '',
        type: 'text',
        text: filteredText,
        isAdmin: isAdminUser,
        timestamp: Date.now()
    };

    if (replyingToData) {
        newMessage.replyTo = replyingToData;
    }

    push(chatRef, newMessage);

    chatInputField.value = '';
    replyingToData = null;
    replyPreviewBox.style.display = 'none';
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
        
