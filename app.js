const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

const ADMIN_EMAIL = "ahmadmamdouh333388@gmail.com";

const loginBtn = document.getElementById("google-login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userInfo = document.getElementById("user-info");
const userName = document.getElementById("user-name");
const adminPanel = document.getElementById("admin-panel");
const productForm = document.getElementById("product-form");
const productsGrid = document.getElementById("products-grid");

// تسجيل الدخول بواسطة قوقل
loginBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider);
});

// تسجيل الخروج
logoutBtn.addEventListener("click", () => {
    auth.signOut();
});

// مراقبة حالة تسجيل الدخول وصلاحيات الأدمن
auth.onAuthStateChanged(user => {
    if (user) {
        loginBtn.style.display = "none";
        userInfo.style.display = "flex";
        userName.textContent = user.displayName;

        if (user.email === ADMIN_EMAIL) {
            adminPanel.style.display = "block";
        } else {
            adminPanel.style.display = "none";
        }
    } else {
        loginBtn.style.display = "block";
        userInfo.style.display = "none";
        adminPanel.style.display = "none";
    }
});

// إضافة منتج جديد بواسطة الأدمن مع رابط Stripe
productForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("prod-name").value;
    const desc = document.getElementById("prod-desc").value;
    const price = document.getElementById("prod-price").value;
    const image = document.getElementById("prod-img").value;
    const stripeLink = document.getElementById("prod-stripe").value;

    const newProductRef = db.ref("products").push();
    newProductRef.set({
        name,
        desc,
        price,
        image,
        stripeLink
    }).then(() => {
        alert("تم إضافة المنتج بنجاح!");
        productForm.reset();
    });
});

// جلب وعرض المنتجات في المتجر
db.ref("products").on("value", snapshot => {
    productsGrid.innerHTML = "";
    const products = snapshot.val();
    if (products) {
        Object.keys(products).forEach(id => {
            const product = products[id];
            const card = document.createElement("div");
            card.className = "product-card";
            card.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.desc}</p>
                <p><strong>${product.price}</strong></p>
                <a href="${product.stripeLink}" target="_blank"><button class="btn-3d success">شراء الآن</button></a>
                ${auth.currentUser && auth.currentUser.email === ADMIN_EMAIL ? `<button onclick="deleteProduct('${id}')" class="btn-3d danger" style="margin-top:8px;">حذف</button>` : ''}
            `;
            productsGrid.appendChild(card);
        });
    }
});

// دالة حذف المنتج للأدمن فقط
window.deleteProduct = function(id) {
    if(auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
        if(confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
            db.ref("products/" + id).remove();
        }
    } else {
        alert("غير مسموح لك بالحذف!");
    }
}

// نظام الشات المباشر
const chatInput = document.getElementById("chat-input");
const sendChatBtn = document.getElementById("send-chat-btn");
const chatMessages = document.getElementById("chat-messages");

sendChatBtn.addEventListener("click", () => {
    const messageText = chatInput.value.trim();
    if (messageText && auth.currentUser) {
        db.ref("chats").push({
            user: auth.currentUser.displayName,
            text: messageText,
            timestamp: Date.now()
        });
        chatInput.value = "";
    } else if (!auth.currentUser) {
        alert("يرجى تسجيل الدخول أولاً لإرسال رسالة في الدعم.");
    }
});

db.ref("chats").on("value", snapshot => {
    chatMessages.innerHTML = "";
    const chats = snapshot.val();
    if (chats) {
        Object.keys(chats).forEach(id => {
            const chat = chats[id];
            const msgDiv = document.createElement("div");
            msgDiv.style.margin = "5px 0";
            msgDiv.innerHTML = `<strong>${chat.user}:</strong> ${chat.text}`;
            chatMessages.appendChild(msgDiv);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});
        
