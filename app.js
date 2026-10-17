import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  signInWithRedirect,
  getRedirectResult,
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

// إيميل المشرف المحدد
const ADMIN_EMAIL = "ahmadmamdouh333388@gmail.com";

// رقم التحويل ورقم واتساب الدعم
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
const adminChatCompose = $("admin-chat-compose");
const userChatReadonly = $("user-chat-readonly");

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;

const productDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    "مرحباً، أحتاج مساعدة من دعم King Store."
  )}`;

function isAdmin() {
  return !!currentUser &&
    currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
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

function openSettings() {
  settingsPopupMenu.classList.toggle("active");
}

// معالجة نتيجة إعادة التوجيه بعد العودة من Google
getRedirectResult(auth).catch((error) => {
  authErrorMsg.textContent = `تعذر تسجيل الدخول: ${error.code || error.message}`;
});

// تسجيل الدخول باستخدام التحويل المباشر (موصى به للهواتف)
$("google-login-btn").addEventListener("click", async () => {
  authErrorMsg.textContent = "جاري تحويلك لتسجيل الدخول...";

  try {
    await signInWithRedirect(auth, provider);
  } catch (error) {
    authErrorMsg.textContent =
      `تعذر تسجيل الدخول: ${error.code || error.message}`;
  }
});

// متابعة حالة تسجيل الدخول
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    loginScreen.style.display = "none";

    const alreadyShown =
      sessionStorage.getItem("king_splash_shown");

    if (!alreadyShown) {
      splashScreen.style.display = "flex";
      storeScreen.style.display = "none";

      window.setTimeout(() => {
        splashScreen.style.display = "none";
        storeScreen.style.display = "block";
        sessionStorage.setItem("king_splash_shown", "true");
      }, 1100);
    } else {
      splashScreen.style.display = "none";
      storeScreen.style.display = "block";
    }

    $("menu-user-img").src = user.photoURL || "";
    $("menu-user-name").textContent =
      user.displayName || "مستخدم King Store";
    $("menu-user-email").textContent = user.email || "";

    adminAddProductBtn.hidden = !isAdmin();
    adminChatCompose.hidden = !isAdmin();
    userChatReadonly.hidden = isAdmin();

    if (!isAdmin()) {
      adminProductFormBox.hidden = true;
    }

    $("chat-access-note").textContent = isAdmin()
      ? "أنت كمشرف تقدر ترسل تحديثات ورابط للمستخدمين"
      : "إعلانات وتحديثات المتجر";

    // إعادة رسم المنتجات لإظهار أدوات الإدارة للمشرف فقط
    productDataById.forEach((data, id) => renderProduct(id, data));
  } else {
    loginScreen.style.display = "flex";
    splashScreen.style.display = "none";
    storeScreen.style.display = "none";

    settingsPopupMenu.classList.remove("active");
    adminAddProductBtn.hidden = true;
    adminProductFormBox.hidden = true;
    adminChatCompose.hidden = true;
    userChatReadonly.hidden = false;

    sessionStorage.removeItem("king_splash_shown");
  }
});

// الإعدادات وتسجيل الخروج
settingsTriggerBtn.addEventListener("click", (event) => {
  event.stopPropagation();
  openSettings();
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
  } catch {
    toast("تعذر تسجيل الخروج. حاول مرة أخرى.", true);
  }
});

// تغيير اتجاه الصفحة
$("language-toggle").addEventListener("click", () => {
  const root = $("html-root");
  const english = root.lang !== "en";

  root.lang = english ? "en" : "ar";
  root.dir = english ? "ltr" : "rtl";

  toast(
    english
      ? "تم تغيير اتجاه الصفحة. بعض النصوص تبقى بالعربية."
      : "تم الرجوع للعرض العربي."
  );

  settingsPopupMenu.classList.remove("active");
});

// تغيير ألوان الموقع
document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.className = button.dataset.theme;

    localStorage.setItem(
      "king_store_theme",
      button.dataset.theme
    );

    settingsPopupMenu.classList.remove("active");
  });
});

const savedTheme = localStorage.getItem("king_store_theme");

if (savedTheme && /^theme-(blue|violet|mint|gold)$/.test(savedTheme)) {
  document.body.className = savedTheme;
}

// فتح نموذج إضافة أو تعديل منتج
function openProductForm(productId = null) {
  if (!isAdmin()) {
    return toast("هذه الخاصية للمشرف فقط.", true);
  }

  editingProductId = productId;

  $("product-form-title").textContent =
    productId ? "تعديل المنتج" : "إضافة منتج جديد";

  $("new-product-title").value = "";
  $("new-product-price").value = "";
  $("new-product-description").value = "";
  $("new-product-link").value = "";
  $("new-product-img-file").value = "";

  setFormMessage(
    productId
      ? "اختار صورة جديدة إذا كنت تريد تغيير الصورة، أو اتركها فارغة للاحتفاظ بالصورة الحالية."
      : ""
  );

  if (productId) {
    const product = productDataById.get(productId);

    if (!product) {
      return toast("لم يتم العثور على المنتج.", true);
    }

    $("new-product-title").value = product.title || "";
    $("new-product-price").value = product.price || "";
    $("new-product-description").value =
      product.description || "";
    $("new-product-link").value = product.link || "";
  }

  adminProductFormBox.hidden = false;

  adminProductFormBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

adminAddProductBtn.addEventListener("click", () => {
  if (adminProductFormBox.hidden) {
    openProductForm();
  } else {
    adminProductFormBox.hidden = true;
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

// قراءة صورة المنتج
function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    if (!file.type.startsWith("image/")) {
      return reject(new Error("اختار ملف صورة صحيح."));
    }

    if (file.size > 1_500_000) {
      return reject(
        new Error("حجم الصورة كبير. اختار صورة أقل من 1.5 ميجابايت.")
      );
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
    reader.readAsDataURL(file);
  });
}

// حفظ المنتج في Firebase
$("save-product-btn").addEventListener("click", async () => {
  if (!isAdmin()) {
    return toast("غير مسموح لك بإدارة المنتجات.", true);
  }

  const title = $("new-product-title").value.trim();
  const price = Number($("new-product-price").value);
  const description = $("new-product-description").value.trim();
  const link = $("new-product-link").value.trim();
  const file = $("new-product-img-file").files?.[0] || null;

  const existing = editingProductId
    ? productDataById.get(editingProductId)
    : null;

  if (!title || !Number.isFinite(price) || price <= 0) {
    setFormMessage(
      "اكتب اسم المنتج وسعراً صحيحاً أكبر من صفر.",
      true
    );
    return;
  }

  if (!existing && !file) {
    setFormMessage("اختار صورة للمنتج قبل الحفظ.", true);
    return;
  }

  const saveButton = $("save-product-btn");
  saveButton.disabled = true;
  saveButton.innerHTML =
    '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ';

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
      await update(
        ref(db, `products/${editingProductId}`),
        product
      );

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
    setFormMessage(
      error.message || "حدث خطأ أثناء الحفظ.",
      true
    );
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML =
      '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج';
  }
});

// منع عرض النصوص المدخلة كـ HTML
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

// عرض بطاقة المنتج
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
    ? `<a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="btn btn-small btn-external-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> رابط المنتج</a>`
    : "";

  card.innerHTML = `
    <div class="product-image-wrap">${imageMarkup}</div>
    <div class="product-body">
      <span class="product-category">KING SELECTION</span>
      <h3>${escapeHtml(data.title || "منتج")}</h3>
      <p class="product-description">${escapeHtml(data.description || "منتج مميز من King Store. تواصل معنا لو محتاج تفاصيل إضافية.")}</p>
      ${externalLinkMarkup}
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
  if (productsGridContainer.children.length === 0) {
    productsGridContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <strong>لسه مفيش منتجات</strong>
        <span>ارجع تاني قريب، المنتجات هتظهر هنا.</span>
      </div>`;
  }
}

// تحميل المنتجات من Firebase
const productsRef = ref(db, "products");

onChildAdded(productsRef, (snapshot) => {
  const empty = productsGridContainer.querySelector(".empty-state");
  if (empty) empty.remove();

  renderProduct(snapshot.key, snapshot.val());
});

onChildRemoved(productsRef, (snapshot) => {
  $(`product-${snapshot.key}`)?.remove();
  productDataById.delete(snapshot.key);
  showEmptyProducts();
});

onChildChanged(productsRef, (snapshot) => {
  renderProduct(snapshot.key, snapshot.val());
});

window.setTimeout(showEmptyProducts, 3500);

// أزرار الشراء والتعديل والحذف
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
      return toast("هذه الخاصية للمشرف فقط.", true);
    }

    const id = deleteButton.dataset.delete;

    if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      try {
        await remove(ref(db, `products/${id}`));
        toast("تم حذف المنتج.");
      } catch {
        toast("تعذر حذف المنتج. راجع صلاحيات قاعدة البيانات.", true);
      }
    }
  }
});

// نافذة الشراء
function openPurchaseModal(id, product) {
  currentPurchase = { id, ...product };

  $("purchase-product-name").textContent =
    product.title || "منتج";

  $("purchase-product-price").textContent =
    `${product.price} جنيه`;

  $("purchase-product-image").src = product.image || "";

  $("purchase-product-image").style.visibility =
    product.image ? "visible" : "hidden";

  purchaseModal.classList.add("active");
}

function closePurchaseModal() {
  purchaseModal.classList.remove("active");
  currentPurchase = null;
}

$("close-purchase-modal").addEventListener(
  "click",
  closePurchaseModal
);

purchaseModal.addEventListener("click", (event) => {
  if (event.target === purchaseModal) closePurchaseModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePurchaseModal();
    settingsPopupMenu.classList.remove("active");
  }
});

// نسخ رقم التحويل
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

// فتح واتساب لإرسال تفاصيل الطلب
$("send-transfer-proof-btn").addEventListener("click", () => {
  if (!currentPurchase) return;

  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;

  window.open(url, "_blank", "noopener,noreferrer");
});

// نسخ تفاصيل الطلب
$("copy-order-details-btn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(orderMessage());
    toast("تم نسخ تفاصيل الطلب. تقدر تلصقها في واتساب.");
  } catch {
    toast("تعذر النسخ تلقائياً. استخدم زر واتساب لإرسال التفاصيل.", true);
  }
});

// رسائل المتجر: القراءة للجميع والإرسال للمشرف فقط
const messagesRef = ref(db, "messages");

onChildAdded(messagesRef, (snapshot) => {
  renderStoreMessage(snapshot.key, snapshot.val());
});

onChildRemoved(messagesRef, (snapshot) => {
  $(`store-message-${snapshot.key}`)?.remove();

  if (!chatMessagesArea.querySelector(".chat-message")) {
    chatMessagesArea.innerHTML =
      '<div class="empty-chat">لا توجد رسائل حتى الآن.</div>';
  }
});

function renderStoreMessage(id, data) {
  if (!chatMessagesArea || !data) return;

  chatMessagesArea.querySelector(".empty-chat")?.remove();

  const message = document.createElement("article");
  message.className = "chat-message";
  message.id = `store-message-${id}`;

  const date = data.timestamp
    ? new Date(data.timestamp).toLocaleString("ar-EG", {
        dateStyle: "short",
        timeStyle: "short"
      })
    : "";

  const linkMarkup = data.link
    ? `<br><a href="${escapeHtml(data.link)}" target="_blank" rel="noopener noreferrer" class="chat-message-link"><i class="fa-solid fa-arrow-up-right-from-square"></i> زيارة الرابط</a>`
    : "";

  message.innerHTML = `
    <div class="chat-message-top">
      <strong><i class="fa-solid fa-crown"></i> ${escapeHtml(data.username || "King Store")}</strong>
      <time>${escapeHtml(date)}</time>
    </div>
    <p>${escapeHtml(data.text || "")}${linkMarkup}</p>
    ${
      isAdmin()
        ? `<button class="chat-delete-btn" data-delete-message="${escapeHtml(id)}">
            <i class="fa-solid fa-trash"></i> حذف الرسالة
          </button>`
        : ""
    }
  `;

  chatMessagesArea.appendChild(message);
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
}

// فتح وإغلاق لوحة الرسائل
$("chat-float-btn").addEventListener("click", () => {
  chatPanel.classList.toggle("active");
  chatMessagesArea.scrollTop = chatMessagesArea.scrollHeight;
});

$("chat-close-btn").addEventListener("click", () => {
  chatPanel.classList.remove("active");
});

// إرسال رسالة من المشرف
async function sendStoreMessage() {
  if (!isAdmin()) {
    return toast("إرسال الرسائل متاح للمشرف فقط.", true);
  }

  const text = chatInputField.value.trim();
  const link = chatLinkField.value.trim();
  if (!text) return;

  chatSendBtn.disabled = true;

  try {
    await push(messagesRef, {
      uid: currentUser.uid,
      email: currentUser.email,
      username: "King Store",
      text,
      link: link || "",
      timestamp: Date.now(),
      isAdmin: true
    });

    chatInputField.value = "";
    chatLinkField.value = "";
    toast("تم إرسال رسالة المتجر.");
  } catch {
    toast("تعذر إرسال الرسالة. راجع قواعد Firebase.", true);
  } finally {
    chatSendBtn.disabled = false;
  }
}

chatSendBtn.addEventListener("click", sendStoreMessage);

chatInputField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendStoreMessage();
});

chatLinkField.addEventListener("keydown", (event) => {
  if (event.key === "Enter") sendStoreMessage();
});

// حذف رسالة بواسطة المشرف
ch
