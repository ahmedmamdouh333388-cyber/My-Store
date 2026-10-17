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
  remove,
  serverTimestamp
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

const ADMIN_EMAIL = "ahmedmamdouh333388@gmail.com";
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

const adminAddPostBtn = $("admin-add-post-btn");
const adminPostFormBox = $("admin-post-form-box");
const postsGridContainer = $("posts-grid-container");

const productsGridContainer = $("products-grid-container");
const purchaseModal = $("purchase-modal");
const toastRegion = $("toast-region");

const chatPanel = $("chat-panel");
const chatMessagesArea = $("chat-messages-area");
const chatInputField = $("chat-input-field");
const chatSendBtn = $("chat-send-btn");
const chatCompose = $("chat-compose");

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;

const renderedProductIds = new Set();
const productDataById = new Map();

$("current-year").textContent = new Date().getFullYear();
$("transfer-number").textContent = TRANSFER_NUMBER;

$("support-wa-link").href =
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحباً، أحتاج مساعدة من دعم King Store.")}`;

function isAdmin() {
  return !!currentUser &&
    String(currentUser.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
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

function setPostFormMessage(message, isError = false) {
  const el = $("post-form-message");
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

function normalizeExternalUrl(value) {
  if (!value) return "";

  try {
    const parsed = new URL(value);
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function openSettings() {
  settingsPopupMenu.classList.toggle("active");
}

/* تسجيل الدخول بجوجل */
$("google-login-btn").addEventListener("click", async () => {
  authErrorMsg.textContent = "جاري فتح تسجيل الدخول...";

  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    authErrorMsg.textContent =
      `تعذر تسجيل الدخول: ${error.code || error.message}`;
  }
});

/* التحقق من الحساب وإظهار أدوات المدير */
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    loginScreen.style.display = "none";

    const alreadyShown = sessionStorage.getItem("king_splash_shown");

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
    adminAddPostBtn.hidden = !isAdmin();
    chatCompose.hidden = !isAdmin();

    $("chat-readonly-note").textContent = isAdmin()
      ? "يمكنك إرسال الرسائل وحذف أي رسالة في أي وقت."
      : "الرسائل للعرض فقط؛ الإرسال والحذف للمشرف وحده.";

    attachProductListeners();
    attachPostListeners();
    attachMessageListeners();

    if (!isAdmin()) {
      adminProductFormBox.hidden = true;
      adminPostFormBox.hidden = true;
    }

    $("chat-access-note").textContent = isAdmin()
      ? "أنت كمشرف تقدر ترسل رسائل للزوار"
      : "رسائل وإعلانات المتجر";
  } else {
    loginScreen.style.display = "flex";
    splashScreen.style.display = "none";
    storeScreen.style.display = "none";

    settingsPopupMenu.classList.remove("active");

    adminAddProductBtn.hidden = true;
    adminProductFormBox.hidden = true;
    adminAddPostBtn.hidden = true;
    adminPostFormBox.hidden = true;
    chatCompose.hidden = true;

    postListeners.forEach((unsubscribe) => unsubscribe());
    postListeners = [];

    productListeners.forEach((unsubscribe) => unsubscribe());
    productListeners = [];

    messageListeners.forEach((unsubscribe) => unsubscribe());
    messageListeners = [];

    productDataById.clear();
    messageDataById.clear();

    productsGridContainer.innerHTML = "";
    postsGridContainer.innerHTML = "";
    chatMessagesArea.innerHTML = "";

    sessionStorage.removeItem("king_splash_shown");
  }
});

/* الإعدادات وتسجيل الخروج */
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

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.className = button.dataset.theme;
    localStorage.setItem("king_store_theme", button.dataset.theme);
    settingsPopupMenu.classList.remove("active");
  });
});

const savedTheme = localStorage.getItem("king_store_theme");

if (savedTheme && /^theme-(blue|violet|mint|gold)$/.test(savedTheme)) {
  document.body.className = savedTheme;
}

/* قراءة الصور والتحقق من نوعها وحجمها */
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

/* =========================
   إدارة المنتجات
========================= */

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
  $("new-product-img-file").value = "";
  $("new-product-link").value = "";

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
    $("new-product-description").value = product.description || "";
    $("new-product-link").value = product.link || "";
  }

  adminProductFormBox.hidden = false;

  adminProductFormBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

adminAddProductBtn.addEventListener("click", () => {
  const wasHidden = adminProductFormBox.hidden;

  if (wasHidden) {
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

$("save-product-btn").addEventListener("click", async () => {
  if (!isAdmin()) {
    return toast("غير مسموح لك بإدارة المنتجات.", true);
  }

  const title = $("new-product-title").value.trim();
  const price = Number($("new-product-price").value);
  const description = $("new-product-description").value.trim();

  const rawLink = $("new-product-link").value.trim();
  const link = normalizeExternalUrl(rawLink);

  const file = $("new-product-img-file").files?.[0] || null;
  const existing = editingProductId
    ? productDataById.get(editingProductId)
    : null;

  if (!title || !Number.isFinite(price) || price <= 0) {
    setFormMessage("اكتب اسم المنتج وسعراً صحيحاً أكبر من صفر.", true);
    return;
  }

  if (rawLink && !link) {
    setFormMessage(
      "الرابط غير صحيح. استخدم رابطاً يبدأ بـ https:// أو http://",
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
      link,
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
    setFormMessage(error.message || "حدث خطأ أثناء الحفظ.", true);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML =
      '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج';
  }
});

function renderProduct(id, data) {
  if (!data || !productsGridContainer) return;

  productDataById.set(id, data);

  const old = $(`product-${id}`);
  if (old) old.remove();

  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `product-${id}`;

  const imageMarkup = data.image
    ? `<img class="product-image" src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || "منتج")}" loading="lazy" onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'product-image-placeholder',innerHTML:'<i class=\\'fa-solid fa-cube\\'></i>'}))">`
    : `<div class="product-image-placeholder"><i class="fa-solid fa-cube"></i></div>`;

  const safeProductLink = normalizeExternalUrl(data.link || "");

  card.innerHTML = `
    <div class="product-image-wrap">${imageMarkup}</div>

    <div class="product-body">
      <span class="product-category">KING SELECTION</span>

      <h3>${escapeHtml(data.title || "منتج")}</h3>

      <p class="product-description">
        ${escapeHtml(data.description || "منتج مميز من King Store. تواصل معنا لو محتاج تفاصيل إضافية.")}
      </p>

      <div class="product-bottom">
        <div class="product-price">
          ${escapeHtml(data.price)} <small>جنيه</small>
        </div>

        <button class="btn btn-primary buy-btn" data-buy="${escapeHtml(id)}">
          <i class="fa-solid fa-bag-shopping"></i> شراء الآن
        </button>
      </div>

      ${
        safeProductLink
          ? `<a class="content-link-btn" href="${escapeHtml(safeProductLink)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح الرابط</a>`
          : ""
      }
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
      </div>
    `;
  }
}

const productsRef = ref(db, "products");
let productListeners = [];

function attachProductListeners() {
  productListeners.forEach((unsubscribe) => unsubscribe());

  productListeners = [];
  renderedProductIds.clear();
  productDataById.clear();

  productsGridContainer.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-cube"></i>
      <strong>جاري تحميل المنتجات...</strong>
      <span>لحظات ونجهز لك المتجر.</span>
    </div>
  `;

  productListeners.push(
    onChildAdded(
      productsRef,
      (snapshot) => {
        productsGridContainer.querySelector(".empty-state")?.remove();
        renderedProductIds.add(snapshot.key);
        renderProduct(snapshot.key, snapshot.val());
      },
      (error) => toast("تعذر تحميل المنتجات: " + error.message, true)
    )
  );

  productListeners.push(
    onChildRemoved(productsRef, (snapshot) => {
      $(`product-${snapshot.key}`)?.remove();
      productDataById.delete(snapshot.key);
      renderedProductIds.delete(snapshot.key);
      showEmptyProducts();
    })
  );

  productListeners.push(
    onChildChanged(productsRef, (snapshot) => {
      renderProduct(snapshot.key, snapshot.val());
    })
  );

  window.setTimeout(showEmptyProducts, 3500);
}

productsGridContainer.addEventListener("click", async (event) => {
  const buyButton = event.target.closest("[data-buy]");
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (buyButton) {
    const product = productDataById.get(buyButton.dataset.buy);

    if (product) {
      openPurchaseModal(buyButton.dataset.buy, product);
    }
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

/* =========================
   إدارة المنشورات
========================= */

function resetPostForm() {
  $("new-post-title").value = "";
  $("new-post-text").value = "";
  $("new-post-img-file").value = "";
  $("new-post-link").value = "";

  setPostFormMessage("");
}

function openPostForm() {
  if (!isAdmin()) {
    return toast("نشر المنشورات للمشرف فقط.", true);
  }

  resetPostForm();
  adminPostFormBox.hidden = false;

  adminPostFormBox.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

adminAddPostBtn.addEventListener("click", () => {
  if (adminPostFormBox.hidden) {
    openPostForm();
  } else {
    adminPostFormBox.hidden = true;
  }
});

$("cancel-post-form").addEventListener("click", () => {
  adminPostFormBox.hidden = true;
  resetPostForm();
});

$("cancel-post-form-secondary").addEventListener("click", () => {
  adminPostFormBox.hidden = true;
  resetPostForm();
});

function renderPost(id, data) {
  if (!data || !postsGridContainer) return;

  const old = $(`post-${id}`);
  if (old) old.remove();

  const card = document.createElement("article");
  card.className = "post-card";
  card.id = `post-${id}`;

  const imageMarkup = data.image
    ? `<img class="post-image" src="${escapeHtml(data.image)}" alt="${escapeHtml(data.title || "منشور من King Store")}" loading="lazy">`
    : "";

  const safeLink = normalizeExternalUrl(data.link || "");
  const timestamp = Number(data.createdAt || 0);

  const dateLabel = timestamp
    ? new Date(timestamp).toLocaleString("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short"
      })
    : "";

  card.innerHTML = `
    ${imageMarkup ? `<div class="post-image-wrap">${imageMarkup}</div>` : ""}

    <div class="post-body">
      <div class="post-meta">
        <span><i class="fa-solid fa-crown"></i> King Store</span>
        <time>${escapeHtml(dateLabel)}</time>
      </div>

      ${data.title ? `<h3>${escapeHtml(data.title)}</h3>` : ""}

      <p>${escapeHtml(data.text || "")}</p>

      ${
        safeLink
          ? `<a class="content-link-btn" href="${escapeHtml(safeLink)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-arrow-up-right-from-square"></i> فتح الرابط</a>`
          : ""
      }
    </div>

    ${
      isAdmin()
        ? `<div class="admin-product-actions">
             <button class="btn btn-small btn-delete" data-delete-post="${escapeHtml(id)}">
               <i class="fa-solid fa-trash"></i> حذف المنشور
             </button>
           </div>`
        : ""
    }
  `;

  postsGridContainer.appendChild(card);
}

function showEmptyPosts() {
  if (postsGridContainer.children.length === 0) {
    postsGridContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-bullhorn"></i>
        <strong>لا توجد منشورات حالياً</strong>
        <span>تابع المتجر لمعرفة آخر الأخبار والعروض.</span>
      </div>
    `;
  }
}

const postsRef = ref(db, "posts");
let postListeners = [];

function attachPostListeners() {
  postListeners.forEach((unsubscribe) => unsubscribe());

  postListeners = [];

  postsGridContainer.innerHTML = `
    <div class="empty-state">
      <i class="fa-solid fa-bullhorn"></i>
      <strong>جاري تحميل المنشورات...</strong>
      <span>لحظات ونجهز لك آخر التحديثات.</sp
