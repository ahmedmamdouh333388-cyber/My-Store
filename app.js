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

const adminAddProductBtn = document.getElementById('admin-add-product-btn');
const adminProductFormBox = document.getElementById('admin-product-form-box');
const newProductTitle = document.getElementById('new-product-title');
const newProductPrice = document.getElementById('new-product-price');
const newProductImgFile = document.getElementById('new-product-img-file');
const newProductVideoFile = document.getElementById('new-product-video-file');
const saveProductBtn = document.getElementById('save-product-btn');
const productsGridContainer = document.getElementById('products-grid-container');

let currentUser = null;
let isLoginHandled = false;

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
            }, 2500);
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
});

// استخدام Popup مع معالجة الأخطاء لمنع التجمد
if(googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
        if(authErrorMsg) authErrorMsg.textContent = "جاري فتح نافذة تسجيل الدخول...";
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error(err);
            if(authErrorMsg) authErrorMsg.textContent = "فشل التسجيل، تأكد من السماح بالنافذة المنبثقة.";
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
        const imgFile = newProductImgFile && newProductImgFile.files ? newProductImgFile.files[0] : null;
        const videoFile = newProductVideoFile && newProductVideoFile.files ? newProductVideoFile.files[0] : null;

        if (!title || !price || !imgFile) {
            alert("يرجى إدخال اسم المنتج، السعر، واختيار صورة على الأقل.");
            return;
        }

        const readerImg = new FileReader();
        readerImg.readAsDataURL(imgFile);
        readerImg.onloadend = () => {
            const base64Image = readerImg.result;

            if (videoFile) {
                const readerVideo = new FileReader();
                readerVideo.readAsDataURL(videoFile);
                readerVideo.onloadend = () => {
                    const base64Video = readerVideo.result;
                    saveProductToDB(title, price, base64Image, base64Video);
                };
            } else {
                saveProductToDB(title, price, base64Image, null);
            }
        };
    });
}

function saveProductToDB(title, price, image, video) {
    const productsRef = ref(db, 'products');
    push(productsRef, {
        title: title,
        price: price,
        image: image,
        video: video || "",
        timestamp: Date.now()
    }).then(() => {
        if(newProductTitle) newProductTitle.value = '';
        if(newProductPrice) newProductPrice.value = '';
        if(newProductImgFile) newProductImgFile.value = '';
        if(newProductVideoFile) newProductVideoFile.value = '';
        if(adminProductFormBox) adminProductFormBox.style.display = 'none';
        alert("تم نشر المنتج بنجاح!");
    }).catch(err => {
        alert("حدث خطأ أثناء النشر: " + err.message);
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
    
    let deleteProductBtn = isUserAdmin ? `<button onclick="deleteProduct('${id}')" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-top: 6px; font-weight: bold;">حذف المنتج (خاص بالمشرف)</button>` : '';

    let mediaHtml = `<img src="${data.image}" style="width: 100%; height: 140px; object-fit: cover; border-radius: 10px; margin-bottom: 10px;">`;
    if (data.video && data.video.trim() !== "") {
        mediaHtml = `<video src="${data.video}" controls style="width: 100%; height: 140px; object-fit: cover; border-radius: 10px; margin-bottom: 10px; background: #000;"></video>`;
    }

    const card = document.createElement('div');
    card.id = `product-${id}`;
    card.style.cssText = "background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 14px; padding: 14px; text-align: center; display: flex; flex-direction: column; justify-content: space-between; backdrop-filter: blur(10px);";
    
    card.innerHTML = `
        ${mediaHtml}
        <div>
            <h4 style="margin: 0 0 5px 0; color: #fff; font-size: 16px;">${escapeHtml(data.title)}</h4>
            <p style="margin: 0 0 10px 0; color: var(--primary-color); font-weight: bold; font-size: 15px;">${escapeHtml(data.price)}</p>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
            <button onclick="openProductModal('${escapeHtml(data.title)}')" style="background: var(--primary-color); color: white; border: none; padding: 8px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">شراء ومواصفات المنتج 💳</button>
            ${deleteProductBtn}
        </div>
    `;
    productsGridContainer.appendChild(card);
}

window.deleteProduct = function(id) {
    if (currentUser && (currentUser.email === ADMIN_EMAIL || currentUser.displayName === "احمد ممدوح")) {
        if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
            remove(ref(db, `products/${id}`));
        }
    } else {
        alert("غير مسموح لك بحذف المنتج!");
    }
};

window.openProductModal = function(productTitle) {
    let existingModal = document.getElementById('custom-checkout-modal');
    if (existingModal) existingModal.remove();

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'custom-checkout-modal';
    modalOverlay.style.cssText = "position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); display: flex; justify-content: center; align-items: center; z-index: 10000; padding: 15px; box-sizing: border-box;";

    const waMessage = encodeURIComponent(`مرحباً، لقد قمت بتحويل قيمة المنتج (${productTitle}) على رقم فودافون كاش أو إنستا باي (01214563781)، وهذه هي صورة إيصال التحويل لتأكيد الطلب.`);

    modalOverlay.innerHTML = `
        <div style="background: #0f172a; border: 1px solid rgba(255,255,255,0.15); padding: 25px; border-radius: 16px; width: 100%; max-width: 420px; text-align: right; box-shadow: 0 15px 35px rgba(0,0,0,0.6); position: relative; color: #f3f4f6;" dir="rtl">
            <button id="close-checkout-modal" style="position: absolute; top: 15px; left: 15px; background: none; border: none; color: #9ca3af; font-size: 22px; cursor: pointer;">&times;</button>
            <h3 style="margin-top: 0; color: #fff; font-size: 18px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">🛒 تفاصيل الدفع والشراء: ${productTitle}</h3>
            
            <div style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 10px; margin: 15px 0; border: 1px dashed #34d399;">
                <p style="margin: 0 0 8px 0; font-size: 14px;">💳 <strong>رقم التحويل (فودافون كاش أو إنستا باي):</strong></p>
                <div style="color: #34d399; font-size: 20px; font-weight: bold; letter-spacing: 1px; text-align: center; padding: 5px; background: rgba(0,0,0,0.3); border-radius: 6px;">01214563781</div>
                <p style="margin: 10px 0 0 0; font-size: 13px; color: #fbbf24; line-height: 1.4;">⚠️ <strong>تعليمات هامة:</strong> بعد إتمام عملية التحويل على الرقم أعلاه، يرجى إرسال صورة إيصال التحويل هنا في الدعم المباشر أو عبر واتساب على الرقم: <strong>01225428692</strong>.</p>
            </div>

            <a href="https://wa.me/201225428692?text=${waMessage}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; background: #25d366; color: white; text-decoration: none; padding: 12px; border-radius: 10px; font-weight: bold; margin-top: 15px; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);">
                <i class="fa-brands fa-whatsapp" style="font-size: 20px;"></i> إرسال إيصال التحويل عبر واتساب (01225428692)
            </a>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    document.getElementById('close-checkout-modal').addEventListener('click', () => {
        modalOverlay.remove();
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) modalOverlay.remove();
    });
};

const badWordsPatterns = [/شرموط/i, /قحب/i, /منيوك/i, /متناك/i, /عرص/i, /خول/i, /أحا/i, /احا/i, /وسخ/i, /كلب/i, /حمار/i, /زفت/i, /طيز/i, /قذر/i, /عاهر/i, /عاهرة/i, /fuck/i, /shit/i, /bitch/i, /asshole/i, /cunt/i, /dick/i, /bastard/i, /idiot/i, /suck/i];

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
            
