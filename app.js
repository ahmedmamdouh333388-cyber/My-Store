
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
  onChildAdded,
  onChildRemoved,
  onChildChanged,
  update,
  remove
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Firebase configuration
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

const ADMIN_EMAIL = "ahmedmamdouh333388@gmail.com";
const TRANSFER_NUMBER = "01214563781";
const WHATSAPP_NUMBER = "201225428692";
const ONE_HOUR = 60 * 60 * 1000;

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
const chatSendBtn = $("chat-send-btn");
const adminChatCompose = $("admin-chat-compose");
const userChatReadonly = $("user-chat-readonly");

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;

const productDataById = new Map();
const messageDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم King Store."
  )}`;

function isAdmin() {
  return Boolean(
    currentUser &&
    currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  );
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// Google login
$("google-login-btn").addEventListener("click", async () => {
  authErrorMsg.textContent = "جاري فتح تسجيل الدخول...";

  try {
    await signInWithPopup(auth, provider);
    authErrorMsg.textContent = "";
  } catch (error) {
    console.error(error);
    authErrorMsg.textContent =
      `تعذر تسجيل الدخول: ${error.code || error.message}`;
  }
});

// Authentication state
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (!user) {
    loginScreen.style.display = "flex";
    splashScreen.style.display = "none";
    storeScreen.style.display = "none";

    settingsPopupMenu.classList.remove("active");
    adminAddProductBtn.hidden = true;
    adminProductFormBox.hidden = true;
    adminChatCompose.hidden = true;
    userChatReadonly.hidden = false;

    sessionStorage.removeItem("king_splash_shown");
    return;
  }

  loginScreen.style.display = "none";

  const alreadyShown = sessionStorage.getItem("king_splash_shown");

  if (!alreadyShown) {
    splashScreen.style.display = "flex";
    storeScreen.style.display = "none";

    window.setTimeout(() => {
      if (!currentUser) return;

      splashScreen.style.display = "none";
      storeScreen.style.display = "block";
      sessionStorage.setItem("king_splash_shown", "true");
    }, 900);
  } else {
    splashScreen.style.display = "none";
    storeScreen.style.display = "block";
  }

  $("menu-user-img").src = user.photoURL || "";
  $("menu-user-name").textContent = user.displayName || "مستخدم King Store";
  $("menu-user-email").textContent = user.email || "";

  adminAddProductBtn.hidden = !isAdmin();
  adminChatCompose.hidden = false;
  userChatReadonly.hidden = true;

  $("chat-access-note").textContent = isAdmin()
    ? "أنت المشرف — يمكنك إدارة المنتجات والرسائل"
    : "دردشة المتجر — يمكنك حذف رسالتك خلال ساعة";

  chatInputField.placeholder = "اكتب رسالتك هنا...";

  productDataById.forEach((data, id) => renderProduct(id, data));

  chatMessagesArea.innerHTML = "";

  messageDataById.forEach((data, id) => {
    renderStoreMessage(id, data);
  });
});

// Settings menu
settingsTriggerBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  settingsPopupMenu.classList.toggle("active");
});

settingsPopupMenu.addEventListener("click", (event) => {
  event.stopPropagation();
});

document.addEventListener("click", () => {
  settingsPopupMenu.classList.remove("active");
});

$("menu-logout-trigger").addEventListener("click", async () => {
  try {
    await signOut(auth);
    toast("تم تسجيل الخروج.");
  } catch (error) {
    console.error(error);
    toast("تعذر تسجيل الخروج.", true);
  }
});

// Language toggle
$("language-toggle").addEventListener("click", () => {
  const root = $("html-root");
  const english = root.lang !== "en";

  root.lang = english ? "en" : "ar";
  root.dir = english ? "ltr" : "rtl";

  toast(
    english
      ? "تم تغيير اتجاه الصفحة. بعض النصوص ستظل بالعربية."
      : "تم الرجوع للعرض العربي."
  );

  settingsPopupMenu.classList.remove("active");
});

// Theme selection
document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    const theme = button.dataset.theme;

    document.body.className = theme;
    localStorage.setItem("king_store_theme", theme);
    settingsPopupMenu.classList.remove("active");
  });
});

const savedTheme = localStorage.getItem("king_store_theme");

if (savedTheme && /^theme-(blue|violet|mint|gold)$/.test(savedTheme)) {
  document.body.className = savedTheme;
}

// Product form
function openProductForm(productId = null) {
  if (!isAdmin()) {
    toast("هذه الخاصية للمشرف فقط.", true);
    return;
  }

  editingProductId = productId;

  $("product-form-title").textContent =
    productId ? "تعديل المنتج" : "إضافة منتج جديد";

  $("new-product-title").value = "";
  $("new-product-price").value = "";
  $("new-product-description").value = "";
  $("new-product-img-file").value = "";

  setFormMessage(
    productId
      ? "يمكنك اختيار صورة جديدة أو ترك الصورة فارغة للاحتفاظ بالحالية."
      : ""
  );

  if (productId) {
    const product = productDataById.get(productId);

    if (!product) {
      toast("لم يتم العثور على المنتج.", true);
      return;
    }

    $("new-product-title").value = product.title || "";
    $("new-product-price").value = product.price || "";
    $("new-product-description").value = product.description || "";
  }

  adminProductFormBox.hidden = false;
  adminProductFormBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

adminAddProductBtn.addEventListener("click", () => {
  if (!isAdmin()) return;

  if (adminProductFormBox.hidden) {
    openProductForm();
  } else {
    adminProductFormBox.hidden = true;
    editingProductId = null;
  }
});

$("cancel-product-form").addEventListener("click", () => {
  adminProductFormBox.hidden = true;
  editingProductId = null;
});

$("cancel-product-form-secondary").addEventListener("click", () => {
  adminProductFormBox.hidden = true;
  editingProductId = null;
});

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    if (!file.type.startsWith("image/")) {
      reject(new Error("اختار ملف صورة صحيح."));
      return;
    }

    if (file.size > 1_500_000) {
      reject(new Error("حجم الصورة لازم يكون أقل من 1.5 ميجابايت."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

// Save or update product
$("save-product-btn").addEventListener("click", async () => {
  if (!isAdmin()) {
    toast("غير مسموح لك بإدارة المنتجات.", true);
    return;
  }

  const title = $("new-product-title").value.trim();
  const price = Number($("new-product-price").value);
  const description = $("new-product-description").value.trim();
  const file = $("new-product-img-file").files?.[0] || null;

  const existing = editingProductId
    ? productDataById.get(editingProductId)
    : null;

  if (!title || !Number.isFinite(price) || price <= 0) {
    setFormMessage("اكتب اسم المنتج وسعراً صحيحاً أكبر من صفر.", true);
    return;
  }

  if (!existing && !file) {
    setFormMessage("اختار صورة للمنتج قبل الحفظ.", true);
    return;
  }

  const saveButton = $("save-product-btn");
  saveButton.disabled = true;
  saveButton.textContent = "جاري الحفظ...";

  try {
    const image = await readImage(file);

    const product = {
      title,
      price: price.toFixed(2).replace(/\.00$/, ""),
      description,
      image: image || existing?.image || "",
      updatedAt: Date.now(),
      updatedBy: currentUser.uid
    };

    if (editingProductId) {
      await update(ref(db, `products/${editingProductId}`), product);
      toast("تم تعديل المنتج بنجاح.");
    } else {
      await push(ref(db, "products"), {
        ...product,
        createdAt: Date.now(),
        createdBy: currentUser.uid
      });
      toast("تمت إضافة المنتج بنجاح.");
    }

    adminProductFormBox.hidden = true;
    editingProductId = null;
  } catch (error) {
    console.error(error);
    setFormMessage(error.message || "حدث خطأ أثناء الحفظ.", true);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML =
      '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج';
  }
});

// Render product
function renderProduct(id, data) {
  if (!data || !productsGridContainer) return;

  productDataById.set(id, data);

  $(`product-${id}`)?.remove();
  productsGridContainer.querySelector(".empty-state")?.remove();

  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `product-${id}`;

  const imageMarkup = data.image
    ? `<img class="product-image" src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || "منتج")}" loading="lazy">`
    : `<div class="product-image-placeholder"><i class="fa-solid fa-cube"></i></div>`;

  card.innerHTML = `
    <div class="product-image-wrap">${imageMarkup}</div>
    <div class="product-body">
      <span class="product-category">KING SELECTION</span>
      <h3>${escapeHtml(data.title || "منتج")}</h3>
      <p class="product-description">${escapeHtml(data.description || "منتج مميز من King Store.")}</p>
      <div class="product-bottom">
        <div class="product-price">${escapeHtml(data.price)} <small>جنيه</small></div>
        <button class="btn btn-primary buy-btn" data-buy="${escapeHtml(id)}">
          <i class="fa-solid fa-bag-shopping"></i> شراء الآن
        </button>
      </div>
    </div>
    ${
      isAdmin()
        ? `<div class="admin-product-actions">
            <button class="btn btn-small btn-edit" data-edit="${escapeHtml(id)}">
              <i class="fa-solid fa-pen"></i> تعديل
            </button>
            <button class="btn btn-small btn-delete" data-delete="${escapeHtml(id)}">
              <i class="fa-solid fa-trash"></i> حذف
            </button>
          </div>`
        : ""
    }
  `;

  productsGridContainer.appendChild(card);
}

function showEmptyProducts() {
  if (productsGridContainer.querySelector(".product-card")) return;

  productsGridContainer.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-box-open"></i>
      <strong>لسه مفيش منتجات</strong>
      <span>ارجع تاني قريب، المنتجات هتظهر هنا.</span>
    </div>`;
}

// Product database listeners
const productsRef = ref(db, "products");

onChildAdded(productsRef, (snapshot) => {
  renderProduct(snapshot.key, snapshot.val());
});

onChildChanged(productsRef, (snapshot) => {
  renderProduct(snapshot.key, snapshot.val());
});

onChildRemoved(productsRef, (snapshot) => {
  $(`product-${snapshot.key}`)?.remove();
  productDataById.delete(snapshot.key);
  showEmptyProducts();
});

window.setTimeout(showEmptyProducts, 3500);

// Product buttons
productsGridContainer.addEventListener("click", async (event) => {
  const buyButton = event.target.closest("[data-buy]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (buyButton) {
    const product = productDataById.get(buyButton.dataset.buy);
    if (product) openPurchaseModal(buyButton.dataset.buy, product);
  }

  if (editButton) {
    openProductForm(editButton.dataset.edit);
  }

  if (deleteButton) {
    if (!isAdmin()) {
      toast("هذه الخاصية للمشرف فقط.", true);
      return;
    }

    const id = deleteButton.dataset.delete;

    if (!confirm("هل أنت متأكد من حذف هذا المنتج؟")) return;

    try {
      await remove(ref(db, `products/${id}`));
      toast("تم حذف المنتج.");
    } catch (error) {
      console.error(error);
      toast("تعذر حذف المنتج. راجع قواعد Firebase.", true);
    }
  }
});

// Purchase modal
function openPurchaseModal(id, product) {
  currentPurchase = { id, ...product };

  $("purchase-product-name").textContent = product.title || "منتج";
  $("purchase-product-price").textContent = `${product.price} جنيه`;
  $("purchase-product-image").src = product.image || "";
  $("purchase-product-image").style.visibility =
    product.image ? "visible" : "hidden";

  purchaseModal.classList.add("active");
}

function closePurchaseModal() {
  purchaseModal.classList.remove("active");
  currentPurchase = null;
}

$("close-purchase-modal").addEventListener("click", closePurchaseModal);

purchaseModal.addEventListener("click", (event) => {
  if (event.target === purchaseModal) closePurchaseModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePurchaseModal();
    settingsPopupMenu.classList.remove("active");
  }
});

$("copy-transfer-number").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(TRANSFER_NUMBER);
    toast("تم نسخ رقم التحويل.");
  } catch {
    toast(`رقم التحويل: ${TRANSFER_NUMBER}`);
  }
});

function orderMessage() {
  if (!currentPurchase) return "";

  return `مرحباً King Store، أريد تأكيد طلب:
المنتج: ${currentPurchase.title}
السعر: ${currentPurchase.price} جنيه
رقم التحويل: ${TRANSFER_NUMBER}
اسم الحساب: ${currentUser?.displayName || "غير محدد"}
سأرفق صورة التحويل في هذه المحادثة.`;
}

$("send-transfer-proof-btn").addEventListener("click", () => {
  if (!currentPurchase) return;

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;

  window.open(url, "_blank", "noopener,noreferrer");
});

$("copy-order-details-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(orderMessage());
    toast("تم نسخ تفاصيل الطلب.");
  } catch {
    toast("تعذر النسخ. استخدم زر واتساب.", true);
  }
});

// ======================================
// Chat: all signed-in users can message
// ======================================

const messagesRef = ref(db, "messages");

onChildAdded(messagesRef, (snapshot) => {
  messageDataById.set(snapshot.key, snapshot.val());
  renderStoreMessage(snapshot.key, snapshot.val());
});

onChildChanged(messagesRef, (snapshot) => {
  messageDataById.set(snapshot.key, snapshot.val());
  renderStoreMessage(snapshot.key, snapshot.val());
});

onChildRemoved(messagesRef, (snapshot) => {
  messageDataById.delete(snapshot.key);
  $(`store-message-${snapshot.key}`)?.remove();

  if (!chatMessagesArea.querySelector(".chat-message")) {
    chatMessagesArea.innerHTML =
      '<div class="empty-chat">لا توجد رسائل حتى الآن.</div>';
  }
});

function renderStoreMessage(id, data) {
  if (!data || !chatMessagesArea) return;

  chatMessagesArea.querySelector(".empty-chat")?.remove();
  $(`store-message-${id}`)?.remove();

  const timestamp = Number(data.timestamp) || 0;
  const owner = Boolean(currentUser && data.uid === currentUser.uid);

  const canDelete = isAdmin() || (
    owner &&
    timestamp > 0 &&
    Date.now() >= timestamp &&
    Date.now() < timestamp + ONE_HOUR
  );

  const date = timestamp
    ? new Date(timestamp).toLocaleString("ar-EG", {
        dateStyle: "short",
        timeStyle: "short"
      })
    : "";

  const message = document.createElement("article");
  message.className = "chat-message";
  message.id = `store-message-${id}`;

  message.innerHTML = `
    <div class="chat-message-top">
      <strong>
        ${escapeHtml(data.username || "مستخدم")}
        ${data.uid === currentUser?.uid && isAdmin()
          ? '<i class="fa-solid fa-crown"></i>'
          : ""}
      </strong>
      <time>${escapeHtml(date)}</time>
    </div>
    <p>${escapeHtml(data.text || "")}</p>
    ${
      canDelete
        ? `<button class="chat-delete-btn" data-delete-message="${escapeHtml(id)}">
             <i class="fa-solid fa-trash"></i>
             ${isAdmin() && !owner ? "حذف الرسالة" : "حذف رسالتي"}
           </button>`
        : ""
    }
  `;

  chatMessagesArea.appendChild(message);
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

$("chat-float-btn").addEventListener("click", () => {
  chatPanel.classList.toggle("active");
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
});

$("chat-close-btn").addEventListener("click", () => {
  chatPanel.classList.remove("active");
});

async function sendStoreMessage() {
  if (!currentUser) {
    toast("سجّل الدخول أولًا لإرسال رسالة.", true);
    return;
  }

  const text = chatInputField.value.trim();

  if (!text) return;

  if (text.length > 500) {
    toast("الرسالة طويلة جدًا.", true);
    return;
  }

  chatSendBtn.disabled = true;

  try {
    await push(messagesRef, {
      uid: currentUser.uid,
      username: currentUser.displayName || "مستخدم",
      text,
      timestamp: Date.now()
    });

    chatInputField.value = "";
  } catch (error) {
    console.error(error);
    toast("تعذر إرسال الرسالة. راجع قواعد Firebase.", true);
  } finally {
    chatSendBtn.disabled = false;
  }
}

chatSendBtn.addEventListener("click", sendStoreMessage);

chatInputField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendStoreMessage();
  }
});

// Delete message: owner within one hour, admin any time
chatMessagesArea.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-message]");

  if (!button || !currentUser) return;

  const id = button.dataset.deleteMessage;
  const data = messageDataById.get(id);

  if (!data) {
    toast("الرسالة غير موجودة.", true);
    return;
  }

  const owner = data.uid === currentUser.uid;
  const timestamp = Number(data.timestamp) || 0;

  const withinOneHour =
    timestamp > 0 &&
    Date.now() >= timestamp &&
    Date.now() < timestamp + ONE_HOUR;

  if (!isAdmin() && !(owner && withinOneHour)) {
    toast("تقدر تحذف رسالتك خلال أول ساعة فقط.", true);
    return;
  }

  if (!confirm("هل ت
