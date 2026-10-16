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

// نظام الترجمة
const translations = {
    ar: {
        welcomeBack: "مرحباً بك مجدداً",
        loginDesc: "سجل دخولك الآن واستمتع بتجربة تسوق ذكية وآمنة.",
        splashTitle: "مرحباً بكم في King Store",
        splashDesc: "جاري تهيئة وتجهيز متجرك...",
        warningTitle: "⚠️ تحذير هام",
        warningDesc: "لا يمكن استرجاع البيانات نهائياً. هل أنت متأكد من رغبتك في حذف بيانات هذا الحساب؟",
        cancel: "إلغاء",
        confirmDelete: "تأكيد الحذف",
        logout: "تسجيل الخروج",
        languageLabel: "لغة الموقع:",
        themeLabel: "تخصيص ألوان الموقع:",
        support: "مركز الدعم الفني",
        deleteAccount: "حذف بيانات الحساب",
        purchasesTitle: "المشتريات والمنتجات",
        addProduct: "إضافة منتج",
        addNewProduct: "إضافة منتج جديد للمتجر",
        publishProduct: "نشر المنتج",
        chatHeader: "دردشة King Store",
        typeMessage: "اكتب رسالتك هنا..."
    },
    en: {
        welcomeBack: "Welcome Back",
        loginDesc: "Sign in now and enjoy a smart and secure shopping experience.",
        splashTitle: "Welcome to King Store",
        splashDesc: "Preparing your store...",
        warningTitle: "⚠️ Important Warning",
        warningDesc: "Data cannot be recovered. Are you sure you want to delete your account data?",
        cancel: "Cancel",
        confirmDelete: "Confirm Delete",
        logout: "Logout",
        languageLabel: "Website Language:",
        themeLabel: "Theme Customization:",
        support: "Support Center",
        deleteAccount: "Delete Account Data",
        purchasesTitle: "Purchases & Products",
        addProduct: "Add Product",
        addNewProduct: "Add New Product",
        publishProduct: "Publish Product",
        chatHeader: "King Store Chat",
        typeMessage: "Type your message here..."
    }
};

let currentLang = localStorage.getItem('king_store_lang') || 'ar';

window.changeLanguage = function(lang) {
    currentLang = lang;
    localStorage.setItem('king_store_lang', lang);
    applyTranslations();
    settingsPopupMenu.classList.remove('active');
};

function applyTranslations() {
    const htmlRoot = document.getElementById('html-root');
    htmlRoot.setAttribute('lang', currentLang);
    htmlRoot.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang][key]) {
            el.setAttribute('placeholder', translations[currentLang][key]);
        }
    });
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

const adminAddProductBtn = document.getElementById('admin-add-product-btn');
const adminProductFormBox = document.getElementById('admin-product-form-box');
const newProductTitle = document.getElementById('new-product-title');
const newProductPrice = document.getElementById('new-product-price');
const newProductImgFile = document.getElementById('new-product-img-file');
const saveProductBtn = document.getElementById('save-product-btn');
const productsGridContainer = document.getElementById('products-grid-container');

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

        // إظهار لوحة التحكم للمشرف فقط
        if (user.email === ADMIN_EMAIL || user.displayName === "احمد ممدوح") {
            adminAddProductBtn.style.display = 'block';
        }
    } else {
        currentUser = null;
        isLoginHandled = false;
        sessionStorage.removeItem('splash_shown');
        splashScreen.style.display = 'none';
        storeScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        settingsPopupMenu.classList.remove('active');
        chatModalContainer.classList.remove('active');
        adminAddProductBtn.style.display = 'none';
        adminProductFormBox.style.display = 'none';
    }
    applyTranslations();
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

// إدارة المنتجات ورفعها بـ Base64
adminAddProductBtn.addEventListener('click', () => {
    adminProductFormBox.style.display = adminProductFormBox.style.display === 'none' ? 'block' : 'none';
});

saveProductBtn.addEventListener('click', () => {
    const title = newProductTitle.value.trim();
    const price = newProductPrice.value.trim();
    const file = newProductImgFile.files[0];

    if (!title || !price || !file) {
        alert("يرجى إدخال اسم المنتج، السعر، واختيار صورة.");
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const base64Image = reader.result;
        const productsRef = ref(db, 'products');
        
        push(productsRef, {
            title: title,
            price: price,
            image: base64Image,
            timestamp: Date.now()
        }).then(() => {
            newProductTitle.value = '';
            newProductPrice.value = '';
            newProductImgFile.value = '';
            adminProductFormBox.style.display = 'none';
            alert("تم نشر المنتج بنجاح!");
        }).catch(err => {
            alert("حدث خطأ أثناء النشر: " + err.message);
        });
    };
});

// جلب وعرض المنتجات في قسم المشتريات
const productsRef = ref(db, 'products');
onChildAdded(productsRef, (snapshot) => {
    renderProduct(snapshot.key, snapshot.val());
});
onChildRemoved(productsRef, (snapshot) => {
    const el = document.getElementById(`product-${snapshot.key}`);
    if (el) el.remove();
});

function renderProduct(id, data) {
    const isUserAdmin = currentUser && (currentUser.email === ADMIN_EMAIL || currentUser.displayName === "احمد ممدوح");
    let deleteProductBtn = isUserAdmin ? `<button onclick="deleteProduct('${id}')" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px;">حذف المنتج</button>` : '';

    const card = document.createElement('div');
    card.id = `product-${id}`;
    card.style.cssText = "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 12px; text-align: center; display: flex; flex-direction: column; justify-content: space-between;";
    card.innerHTML = `
        <img src="${data.image}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 8px; margin-bottom: 10px;">
        <div>
            <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 16px;">${escapeHtml(data.title)}</h4>
            <p style="margin: 0; color: #3b82f6; font-weight: bold; font-size: 15px;">${escapeHtml(data.price)}</p>
        </div>
        ${deleteProductBtn}
    `;
    productsGridContainer.appendChild(card);
}

window.deleteProduct = function(id) {
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        remove(ref(db, `products/${id}`));
    }
};

// ذكاء اصطناعي لفلترة السب والقذف والشتائم بدقة عالية
const badWordsPatterns = [
    /شرموط/i, /قحب/i, /منيوك/i, /متناك/i, /عرص/i, /خول/i, /أحا/i, /احا/i, /وسخ/i, /كلب/i, /حمار/i, /زفت/i, /طيز/i, /قذر/i, /عاهر/i, /عاهرة/i,
    /fuck/i, /shit/i, /bitch/i, /asshole/i, /cunt/i, /dick/i, /bastard/i, /idiot/i, /suck/i
];

function aiSmartCensor(text) {
    let cleanText = text;
    badWordsPatterns.forEach(pattern => {
        cleanText = cleanText.replace(pattern, '***');
    });
    return cleanText;
}

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

const chatRef = ref(db, 'messages');

onChildAdded(chatRef, (snapshot) => {
    renderMessage(snapshot.key, snapshot.val());
});
onChildChanged(chatRef, (snapshot) => {
    renderMessage(snapshot.key, snapshot.val());
});
onChildRemoved(chatRef, (snapshot) => {
    const msgElem = document.getElementById(`msg-${snapshot.key}`);
    if (msgElem) msgElem.remove();
});

function renderMessage(msgId, data) {
    const isMyMessage = currentUser && (data.email === ADMIN_EMAIL || data.uid === currentUser.uid);
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
            if (count > 0) reactionsHtml += `<span class="reaction-pill">${emoji} ${count}</span>`;
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
    let deleteBtnHtml = (currentUser && (data.uid === currentUser.uid || isUserAdmin)) ? `<button class="delete-msg-btn" onclick="deleteMessage('${msgId}')">حذف</button>` : '';

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

    Object.keys(reactions).
