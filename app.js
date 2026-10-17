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
    const settingsPopupMenu = document.getElementById('settings-popup-menu');
    if(settingsPopupMenu) settingsPopupMenu.classList.remove('active');
};

function applyTranslations() {
    const htmlRoot = document.getElementById('html-root');
    if(htmlRoot) {
        htmlRoot.setAttribute('lang', currentLang);
        htmlRoot.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
            el.textContent = translations[currentLang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[currentLang] && translations[currentLang][key]) {
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

const adminAddProductBtn = document.getElementById('admin-add-product-btn');
const adminProductFormBox = document.getElementById('admin-product-form-box');
const newProductTitle = document.getElementById('new-product-title');
const newProductPrice = document.getElementById('new-product-price');
const newProductImgFile = document.getElementById('new-product-img-file');
const saveProductBtn = document.getElementById('save-product-btn');
const productsGridContainer = document.getElementById('products-grid-container');

let currentUser = null;
let isLoginHandled = false;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

const activeTheme = localStorage.getItem('king_store_theme');
if (activeTheme) document.body.className = activeTheme;

window.changeTheme = function(themeName) {
    document.body.className = themeName;
    localStorage.setItem('king_store_theme', themeName);
    if(settingsPopupMenu) settingsPopupMenu.classList.remove('active');
};

if(supportWaLink) {
    supportWaLink.href = `https://wa.me/201225428692?text=${encodeURIComponent("مرحباً، أريد الدعم الفني والاستفسار عن خدمات King Store.")}`;
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        if(loginScreen) loginScreen.style.display = 'none';
        if (!isLoginHandled && !sessionStorage.getItem('splash_shown')) {
            if(splashScreen) splashScreen.style.display = 'flex';
            setTimeout(() => {
                if(splashScreen) splashScreen.style.display = 'none';
                if(storeScreen) storeScreen.style.display = 'block';
                sessionStorage.setItem('splash_shown', 'true');
            }, 3000);
            isLoginHandled = true;
        } else {
            if(splashScreen) splashScreen.style.display = 'none';
            if(storeScreen) storeScreen.style.display = 'block';
        }
        if(menuUserImg) menuUserImg.src = user.photoURL || "";
        if(menuUserName) menuUserName.textContent = user.displayName || "مستخدم متميز";

        if (user.email === ADMIN_EMAIL || user.displayName === "احمد ممدوح") {
            if(adminAddProductBtn) adminAddProductBtn.style.display = 'block';
        }
    } else {
        currentUser = null;
        isLoginHandled = false;
        sessionStorage.removeItem('splash_shown');
        if(splashScreen) splashScreen.style.display = 'none';
        if(storeScreen) storeScreen.style.display = 'none';
        if(loginScreen) loginScreen.style.display = 'flex';
        if(settingsPopupMenu) settingsPopupMenu.classList.remove('active');
        if(chatModalContainer) chatModalContainer.classList.remove('active');
        if(adminAddProductBtn) adminAddProductBtn.style.display = 'none';
        if(adminProductFormBox) adminProductFormBox.style.display = 'none';
    }
    applyTranslations();
});

if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        if(authErrorMsg) authErrorMsg.textContent = "جاري فتح نافذة تسجيل الدخول...";
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            if(authErrorMsg) authErrorMsg.textContent = "خطأ في التسجيل: " + err.code;
        }
    });
}

if(settingsTriggerBtn) {
    settingsTriggerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if(settingsPopupMenu) settingsPopupMenu.classList.toggle('active');
    });
}

window.addEventListener('click', () => {
    if(settingsPopupMenu) settingsPopupMenu.classList.remove('active');
});

if(settingsPopupMenu) {
    settingsPopupMenu.addEventListener('click', (e) => { e.stopPropagation(); });
}

if(menuLogoutTrigger) {
    menuLogoutTrigger.addEventListener('click', async () => {
        try { await signOut(auth); } catch (e) { console.log(e); }
    });
}

if(triggerDeleteModal) {
    triggerDeleteModal.addEventListener('click', () => {
        if(settingsPopupMenu) settingsPopupMenu.classList.remove('active');
        if(deleteAlertModal) deleteAlertModal.style.display = 'flex';
    });
}

if(cancelDeleteAction) {
    cancelDeleteAction.addEventListener('click', () => {
        if(deleteAlertModal) deleteAlertModal.style.display = 'none';
    });
}

if(confirmDeleteAction) {
    confirmDeleteAction.addEventListener('click', async () => {
        if(deleteAlertModal) deleteAlertModal.style.display = 'none';
        localStorage.clear();
        sessionStorage.clear();
        try { await signOut(auth); } catch (e) { console.log(e); }
        window.location.reload();
    });
}

if(adminAddProductBtn) {
    adminAddProductBtn.addEventListener('click', () => {
        if(adminProductFormBox) {
            adminProductFormBox.style.display = adminProductFormBox.style.display === 'none' ? 'block' : 'none';
        }
    });
}

if(saveProductBtn) {
    saveProductBtn.addEventListener('click', () => {
        const title = newProductTitle ? newProductTitle.value.trim() : '';
        const price = newProductPrice ? newProductPrice.value.trim() : '';
        const file = newProductImgFile && newProductImgFile.files ? newProductImgFile.files[0] : null;

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
                if(newProductTitle) newProductTitle.value = '';
                if(newProductPrice) newProductPrice.value = '';
                if(newProductImgFile) newProductImgFile.value = '';
                if(adminProductFormBox) adminProductFormBox.style.display = 'none';
                alert("تم نشر المنتج بنجاح!");
            }).catch(err => {
                alert("حدث خطأ أثناء النشر: " + err.message);
            });
        };
    });
}

const productsRef = ref(db, 'products');
onChildAdded(productsRef, (snapshot) => {
    renderProduct(snapshot.key, snapshot.val());
});
onChildRemoved(productsRef, (snapshot) => {
    const el = document.getElementById(`product-${snapshot.key}`);
    if (el) el.remove();
});

function renderProduct(id, data) {
    if(!productsGridContainer) return;
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

if(chatFloatBtn) {
    chatFloatBtn.addEventListener('click', () => {
        if(chatModalContainer) {
            chatModalContainer.classList.toggle('active');
            if(chatMessagesArea) chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
        }
    });
}

if(chatCloseBtn) {
    chatCloseBtn.addEventListener('click', () => {
        if(chatModalContainer) chatModalContainer.classList.remove('active');
    });
}

const chatRef = ref(db, 'messages');

onChildAdded(chatRef, (snapshot) => {
    renderMessage(snapshot.key, snapshot.val());
});
onChildRemoved(chatRef, (snapshot) => {
    const msgElem = document.getElementById(`msg-${snapshot.key}`);
    if (msgElem) msgElem.remove();
});

function renderMessage(msgId, data) {
    if(!chatMessagesArea) return;
    const isMyMessage = currentUser && (data.email === ADMIN_EMAIL || data.uid === currentUser.uid);
    const rowClass = isMyMessage ? 'chat-msg-row my-message' : 'chat-msg-row other-message';
    
    const isMsgAdmin = data.email === ADMIN_EMAIL || data.username === "احمد ممدوح" || data.isAdmin === true;
    const adminBadgeHtml = isMsgAdmin ? `<span class="admin-badge"><i class="fa-solid fa-crown"></i> مشرف</span>` : '';

    let messageBodyHtml = `<div class="chat-msg-text">${escapeHtml(data.text)}</div>`;
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
            ${messageBodyHtml}
            <div style="text-align: left; margin-top: 4px;">
                ${deleteBtnHtml}
            </div>
        </div>
    `;
    chatMessagesArea.appendChild(msgRow);
    chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

window.deleteMessage = function(msgId) {
    if (!currentUser) return;
    remove(ref(db, `messages/${msgId}`));
};

function sendChatMessage() {
    if(!chatInputField) return;
    const rawText = chatInputField.value.trim();
    if (!rawText || !currentUser) return;

    const filteredText = aiSmartCensor(rawText);
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

    push(chatRef, newMessage);
    chatInputField.value = '';
}

function escapeHtml(string) {
    return String(string).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

if(chatSendBtn) chatSendBtn.addEventListener('click', sendChatMessage);
if(chatInputField) {
    chatInputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
    }
