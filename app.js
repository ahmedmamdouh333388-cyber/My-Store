
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

// ===============================
// Firebase Configuration
// ===============================

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

// ===============================
// HTML Elements
// ===============================

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

let currentUser = null;
let currentPurchase = null;
let editingProductId = null;

let productListeners = [];
let messageListeners = [];

const productDataById = new Map();
const messageDataById = new Map();

// ===============================
// Initial Setup
// ===============================

if ($("current-year")) {
  $("current-year").textContent = new Date().getFullYear();
}

if ($("transfer-number")) {
  $("transfer-number").textContent = TRANSFER_NUMBER;
}

if ($("support-wa-link")) {
  $("support-wa-link").href =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      "مرحباً، أحتاج مساعدة من دعم King Store."
    )}`;
}

function isAdmin() {
  return Boolean(
    currentUser &&
    currentUser.email &&
    currentUser.email.toLowerCase() === ADMIN_EMAIL
  );
}

function toast(message, isError = false) {
  if (!toastRegion) {
    alert(message);
    return;
  }

  const item = document.createElement("div");
  item.className = `toast${isError ? " error" : ""}`;
  item.textContent = message;
  toastRegion.appendChild(item);

  window.setTimeout(() => item.remove(), 3600);
}

function setFormMessage(message, isError = false) {
  const el = $("product-form-message");
  if (!el) return;

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

// ===============================
// Google Login
// ===============================

if ($("google-login-btn")) {
  $("google-login-btn").addEventListener("click", async () => {
    if (authErrorMsg) {
      authErrorMsg.textContent = "جاري فتح تسجيل الدخول...";
    }

    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);

      if (authErrorMsg) {
        authErrorMsg.textContent =
          `تعذر تسجيل الدخول: ${error.code || error.message}`;
      }
    }
  });
}

// ===============================
// Authentication State
// ===============================

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    if (loginScreen) loginScreen.style.display = "none";

    const alreadyShown =
      sessionStorage.getItem("king_splash_shown");

    if (splashScreen && storeScreen && !alreadyShown) {
      splashScreen.style.display = "flex";
      storeScreen.style.display = "none";

      window.setTimeout(() => {
        splashScreen.style.display = "none";
        storeScreen.style.display = "block";
        sessionStorage.setItem("king_splash_shown", "true");
      }, 1100);
    } else {
      if (splashScreen) splashScreen.style.display = "none";
      if (storeScreen) storeScreen.style.display = "block";
    }

    if ($("menu-user-img")) {
      $("menu-user-img").src = user.photoURL || "";
    }

    if ($("menu-user-name")) {
      $("menu-user-name").textContent =
        user.displayName || "مستخدم King Store";
    }

    if ($("menu-user-email")) {
      $("menu-user-email").textContent = user.email || "";
    }

    if (adminAddProductBtn) {
      adminAddProductBtn.hidden = !isAdmin();
    }

    if (adminProductFormBox && !isAdmin()) {
      adminProductFormBox.hidden = true;
    }

    if ($("chat-access-note")) {
      $("chat-access-note").textContent = isAdmin()
        ? "أنت كمشرف تقدر ترسل تحديثات للمستخدمين"
        : "تقدر تقرأ الرسائل وترسل رسالتك";
    }

    attachProductListeners();
    attachMessageListeners();

  } else {
    if (loginScreen) loginScreen.style.display = "flex";
    if (splashScreen) splashScreen.style.display = "none";
    if (storeScreen) storeScreen.style.display = "none";

    if (settingsPopupMenu) {
      settingsPopupMenu.classList.remove("active");
    }

    if (adminAddProductBtn) adminAddProductBtn.hidden = true;
    if (adminProductFormBox) adminProductFormBox.hidden = true;

    productListeners.forEach((unsubscribe) => unsubscribe());
    productListeners = [];

    messageListeners.forEach((unsubscribe) => unsubscribe());
    messageListeners = [];

    productDataById.clear();
    messageDataById.clear();

    if (productsGridContainer) productsGridContainer.innerHTML = "";
    if (chatMessagesArea) chatMessagesArea.innerHTML = "";

    sessionStorage.removeItem("king_splash_shown");
  }
});

// ===============================
// Settings Menu
// ===============================

if (settingsTriggerBtn && settingsPopupMenu) {
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
}

if ($("menu-logout-trigger")) {
  $("menu-logout-trigger").addEventListener("click", async () => {
    try {
      await signOut(auth);
      toast("تم تسجيل الخروج.");
    } catch (error) {
      console.error(error);
      toast("تعذر تسجيل الخروج. حاول مرة أخرى.", true);
    }
  });
}

if ($("language-toggle")) {
  $("language-toggle").addEventListener("click", () => {
    const root = $("html-root");
    if (!root) return;

    const english = root.lang !== "en";

    root.lang = english ? "en" : "ar";
    root.dir = english ? "ltr" : "rtl";

    toast(
      english
        ? "تم تغيير اتجاه الصفحة. بعض النصوص تبقى بالعربية."
        : "تم الرجوع للعرض العربي."
    );

    settingsPopupMenu?.classList.remove("active");
  });
}

document.querySelectorAll("[data-theme]").forEach((button) => {
  button.addEventListener("click", () => {
    document.body.className = button.dataset.theme;

    localStorage.setItem(
      "king_store_theme",
      button.dataset.theme
    );

    settingsPopupMenu?.classList.remove("active");
  });
});

const savedTheme = localStorage.getItem("king_store_theme");

if (savedTheme && /^theme-(blue|violet|mint|gold)$/.test(savedTheme)) {
  document.body.className = savedTheme;
}

// ===============================
// Product Form
// ===============================

function openProductForm(productId = null) {
  if (!isAdmin()) {
    toast("هذه الخاصية للمشرف فقط.", true);
    return;
  }

  if (!adminProductFormBox) return;

  editingProductId = productId;

  $("product-form-title").textContent =
    productId ? "تعديل المنتج" : "إضافة منتج جديد";

  $("new-product-title").value = "";
  $("new-product-price").value = "";
  $("new-product-description").value = "";
  $("new-product-img-file").value = "";

  setFormMessage(
    productId
      ? "اختار صورة جديدة إذا كنت تريد تغيير الصورة، أو اتركها فارغة للاحتفاظ بالصورة الحالية."
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

if (adminAddProductBtn) {
  adminAddProductBtn.addEventListener("click", () => {
    if (adminProductFormBox.hidden) {
      openProductForm();
    } else {
      adminProductFormBox.hidden = true;
    }
  });
}

function cancelProductForm() {
  if (adminProductFormBox) adminProductFormBox.hidden = true;
  editingProductId = null;
}

if ($("cancel-product-form")) {
  $("cancel-product-form").addEventListener("click", cancelProductForm);
}

if ($("cancel-product-form-secondary")) {
  $("cancel-product-form-secondary").addEventListener(
    "click",
    cancelProductForm
  );
}

function readImage(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      reject(new Error("اختار ملف صورة صحيح."));
      return;
    }

    if (file.size > 1_500_000) {
      reject(
        new Error("حجم الصورة كبير. اختار صورة أقل من 1.5 ميجابايت.")
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));

    reader.readAsDataURL(file);
  });
}

// ===============================
// Save / Edit Product
// ===============================

if ($("save-product-btn")) {
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
    saveButton.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ';

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
      console.error("Save product error:", error);
      setFormMessage(error.message || "حدث خطأ أثناء الحفظ.", true);

    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML =
        '<i class="fa-solid fa-cloud-arrow-up"></i> حفظ المنتج';
    }
  });
}

// ===============================
// Render Products
// ===============================

function renderProduct(id, data) {
  if (!data || !productsGridContainer) return;

  productDataById.set(id, data);

  const old = $(`product-${id}`);
  if (old) old.remove();

  const card = document.createElement("article");
  card.className = "product-card";
  card.id = `product-${id}`;

  const imageMarkup = data.image
    ? `<img
        class="product-image"
        src="${escapeHtml(data.image)}"
        alt="${escapeHtml(data.title || "منتج")}"
        loading="lazy"
        onerror="this.onerror=null;this.replaceWith(Object.assign(document.createElement('div'),{className:'product-image-placeholder',innerHTML:'<i class=&quot;fa-solid fa-cube&quot;></i>'}))"
      >`
    : `<div class="product-image-placeholder">
         <i class="fa-solid fa-cube"></i>
       </div>`;

  card.innerHTML = `
    <div class="product-image-wrap">
      ${imageMarkup}
    </div>

    <div class="product-body">
      <span class="product-category">KING SELECTION</span>

      <h3>${escapeHtml(data.title || "منتج")}</h3>

      <p class="product-description">
        ${escapeHtml(
          data.description ||
          "منتج مميز من King Store. تواصل معنا لو محتاج تفاصيل إضافية."
        )}
      </p>

      <div class="product-bottom">
        <div class="product-price">
          ${escapeHtml(data.price)} <small>جنيه</small>
        </div>

        <button class="btn btn-primary buy-btn" data-buy="${escapeHtml(id)}">
          <i class="fa-solid fa-bag-shopping"></i>
          شراء الآن
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
  if (
    productsGridContainer &&
    productsGridContainer.children.length === 0
  ) {
    productsGridContainer.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-box-open"></i>
        <strong>لسه مفيش منتجات</strong>
        <span>ارجع تاني قريب، المنتجات هتظهر هنا.</span>
      </div>
    `;
  }
}

// ===============================
// Firebase Product Listeners
// ===============================

const productsRef = ref(db, "products");

function attachProductListeners() {
  productListeners.forEach((unsubscribe) => unsubscribe());
  productListeners = [];

  productDataById.clear();

  if (!productsGridContainer) return;

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
        renderProduct(snapshot.key, snapshot.val());
      },
      (error) => {
        console.error("Products read error:", error);
        toast("تعذر تحميل المنتجات: " + error.message, true);
      }
    )
  );

  productListeners.push(
    onChildRemoved(productsRef, (snapshot) => {
      $(`product-${snapshot.key}`)?.remove();
      productDataById.delete(snapshot.key);
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

// ===============================
// Product Buttons
// ===============================

if (productsGridContainer) {
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
        toast("هذه الخاصية للمشرف فقط.", true);
        return;
      }

      const id = deleteButton.dataset.delete;

      if (window.confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
        try {
          await remove(ref(db, `products/${id}`));
          toast("تم حذف المنتج.");
        } catch (error) {
          console.error("Delete product error:", error);
          toast("تعذر حذف المنتج. راجع صلاحيات قاعدة البيانات.", true);
        }
      }
    }
  });
}

// ===============================
// Purchase Modal
// ===============================

function openPurchaseModal(id, product) {
  currentPurchase = { id, ...product };

  $("purchase-product-name").textContent = product.title || "منتج";
  $("purchase-product-price").textContent = `${product.price} جنيه`;

  const image = $("purchase-product-image");

  if (image) {
    if (product.image) {
      image.src = product.image;
      image.style.visibility = "visible";
    } else {
      image.removeAttribute("src");
      image.style.visibility = "hidden";
    }

    image.onerror = () => {
      image.style.visibility = "hidden";
    };
  }

  purchaseModal?.classList.add("active");
}

function closePurchaseModal() {
  purchaseModal?.classList.remove("active");
  currentPurchase = null;
}

if ($("close-purchase-modal")) {
  $("close-purchase-modal").addEventListener(
    "click",
    closePurchaseModal
  );
}

if (purchaseModal) {
  purchaseModal.addEventListener("click", (event) => {
    if (event.target === purchaseModal) {
      closePurchaseModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closePurchaseModal();
    settingsPopupMenu?.classList.remove("active");
  }
});

if ($("copy-transfer-number")) {
  $("copy-transfer-number").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(TRANSFER_NUMBER);
      toast("تم نسخ رقم التحويل.");
    } catch {
      toast(`رقم التحويل: ${TRANSFER_NUMBER}`);
    }
  });
}

function orderMessage() {
  if (!currentPurchase) return "";

  return `مرحباً King Store، أريد تأكيد طلب:
المنتج: ${currentPurchase.title}
السعر: ${currentPurchase.price} جنيه
رقم التحويل: ${TRANSFER_NUMBER}
اسم الحساب: ${currentUser?.displayName || "غير محدد"}
سأرفق صورة التحويل في هذه المحادثة.`;
}

if ($("send-transfer-proof-btn")) {
  $("send-transfer-proof-btn").addEventListener("click", () => {
    if (!currentPurchase) return;

    const url =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderMessage())}`;

    window.open(url, "_blank", "noopener,noreferrer");
  });
}

if ($("copy-order-details-btn")) {
  $("copy-order-details-btn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(orderMessage());
      toast("تم نسخ تفاصيل الطلب. تقدر تلصقها في واتساب.");
    } catch {
      toast("تعذر النسخ تلقائياً. استخدم زر واتساب لإرسال ا
