/* =========================
 *  Menu (Hamburger)
 * ========================= */
const hamburger = document.getElementById("hamburger");
const panel = document.getElementById("menuPanel");
const overlay = document.getElementById("overlay");

function toggleMenu(forceOpen) {
  if (!panel || !hamburger || !overlay) return;

  const isOpen =
    typeof forceOpen === "boolean"
      ? forceOpen
      : !panel.classList.contains("open");

  panel.classList.toggle("open", isOpen);
  hamburger.classList.toggle("open", isOpen);
  overlay.classList.toggle("show", isOpen);
}

if (hamburger) hamburger.addEventListener("click", () => toggleMenu());
if (overlay) overlay.addEventListener("click", () => toggleMenu(false));

/* =========================
 *  Login Elements
 * ========================= */
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginForm = document.getElementById("loginForm");
const userInfo = document.getElementById("userInfo");
const displayUsername = document.getElementById("displayUsername");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");

/* =========================
 *  Order Page Elements
 * ========================= */
const orderGuestView = document.getElementById("orderGuestView");
const orderMemberView = document.getElementById("orderMemberView");
const goToLoginBtn = document.getElementById("goToLoginBtn");
const floatingCart = document.getElementById("floatingCart");

/* =========================
 *  State Management
 * ========================= */
let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
let orderData =
  JSON.parse(localStorage.getItem("orderData")) || {
    nights: null,
    serviceId: null,
    sitterId: null,
  };

function saveState() {
  localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");
  localStorage.setItem("orderData", JSON.stringify(orderData));
}

function clearLoginError() {
  if (usernameInput) usernameInput.classList.remove("input-error");
  if (passwordInput) passwordInput.classList.remove("input-error");
  if (loginError) {
    loginError.textContent = "";
    loginError.classList.remove("show");
  }
}

/* =========================
 *  UI Update
 * ========================= */
function updateOrderView() {
  // order.html：未登入/已登入切換
  if (orderGuestView && orderMemberView) {
    if (isLoggedIn) {
      orderGuestView.style.display = "none";
      orderMemberView.style.display = "block";
    } else {
      orderGuestView.style.display = "block";
      orderMemberView.style.display = "none";
    }
  }

  // Floating cart：非 order.html 且已登入且有選天數才顯示
  if (floatingCart) {
    const isOrderPage = window.location.pathname.includes("order.html");
    if (!isOrderPage && isLoggedIn && orderData && orderData.nights) {
      floatingCart.style.display = "flex";
    } else {
      floatingCart.style.display = "none";
    }
  }

  // member.html：未登入/已登入切換 + 個人資料顯示
  const memberGuestView = document.getElementById("memberGuestView");
  const memberMemberView = document.getElementById("memberMemberView");
  const memberDisplayName = document.getElementById("memberDisplayName");

  const memberInfoName = document.getElementById("memberInfoName");
  const memberInfoPhone = document.getElementById("memberInfoPhone");
  const memberInfoEmail = document.getElementById("memberInfoEmail");
  const memberInfoAddress = document.getElementById("memberInfoAddress");

  if (memberGuestView && memberMemberView) {
    if (isLoggedIn) {
      memberGuestView.style.display = "none";
      memberMemberView.style.display = "block";

      const name =
        localStorage.getItem("memberName") ||
        localStorage.getItem("username") ||
        "會員";

      if (memberDisplayName) memberDisplayName.textContent = name;
      if (memberInfoName) memberInfoName.textContent = name;

      // ✅ Member.phone / Member.email / Member.address
      const phone = localStorage.getItem("memberPhone") || "-";
      const email = localStorage.getItem("memberEmail") || "-";
      const address = localStorage.getItem("memberAddress") || "-";

      if (memberInfoPhone) memberInfoPhone.textContent = phone;
      if (memberInfoEmail) memberInfoEmail.textContent = email;
      if (memberInfoAddress) memberInfoAddress.textContent = address;

      // 會員頁登入後：載入寵物＆綁定新增
      loadAndRenderPets();
      bindAddPetForm();
    } else {
      memberGuestView.style.display = "block";
      memberMemberView.style.display = "none";
    }
  }
}

function updateLoginUI() {
  if (isLoggedIn) {
    if (loginForm) loginForm.style.display = "none";
    if (userInfo) userInfo.style.display = "flex";

    const name =
      localStorage.getItem("memberName") ||
      localStorage.getItem("username") ||
      "會員";

    if (displayUsername) displayUsername.textContent = name;
  } else {
    if (loginForm) loginForm.style.display = "flex";
    if (userInfo) userInfo.style.display = "none";
  }

  updateOrderView();
}

// Initial UI update
updateLoginUI();

/* =========================
 *  Go to Login (buttons)
 * ========================= */
if (goToLoginBtn) {
  goToLoginBtn.addEventListener("click", () => {
    toggleMenu(true);
  });
}

const memberGoToLoginBtn = document.getElementById("memberGoToLoginBtn");
if (memberGoToLoginBtn) {
  memberGoToLoginBtn.addEventListener("click", () => {
    toggleMenu(true);
  });
}

/* =========================
 *  Login (DB via API)
 *  - username = mId (m0001)
 *  - password = Member.password
 * ========================= */
if (loginBtn) {
  if (usernameInput) usernameInput.addEventListener("input", clearLoginError);
  if (passwordInput) passwordInput.addEventListener("input", clearLoginError);

  loginBtn.addEventListener("click", async () => {
    const username = (usernameInput ? usernameInput.value : "").trim();
    const password = passwordInput ? passwordInput.value : "";

    clearLoginError();

    if (!username || !password) {
      if (loginError) {
        loginError.textContent = "請輸入帳號與密碼";
        loginError.classList.add("show");
      }
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "帳號或密碼錯誤");

      isLoggedIn = true;
      localStorage.setItem("isLoggedIn", "true");

      localStorage.setItem("mId", data.member.mId);
      localStorage.setItem("memberName", data.member.name || "");

      localStorage.setItem("memberPhone", data.member.phone || "");
      localStorage.setItem("memberEmail", data.member.email || "");
      localStorage.setItem("memberAddress", data.member.address || "");

      // 兼容舊版顯示
      localStorage.setItem("username", data.member.name || "");

      saveState();
      updateLoginUI();
      updateOrderView();

      if (usernameInput) usernameInput.value = "";
      if (passwordInput) passwordInput.value = "";

      loadAndRenderPets();
      bindAddPetForm();
    } catch (e) {
      if (usernameInput) usernameInput.classList.add("input-error");
      if (passwordInput) passwordInput.classList.add("input-error");
      if (loginError) {
        loginError.textContent = e.message || "登入失敗";
        loginError.classList.add("show");
      }
    }
  });
}

/* =========================
 *  Logout
 * ========================= */
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    alert("已登出");

    isLoggedIn = false;

    localStorage.setItem("isLoggedIn", "false");
    localStorage.removeItem("mId");
    localStorage.removeItem("memberName");
    localStorage.removeItem("memberPhone");
    localStorage.removeItem("memberEmail");
    localStorage.removeItem("memberAddress");
    localStorage.removeItem("username");

    saveState();
    updateLoginUI();

    const petList = document.querySelector(".pet-card-list");
    if (petList) petList.innerHTML = "";
  });
}

/* =========================
 *  Member Tabs (member.html)
 * ========================= */
function bindMemberTabs() {
  const tabs = document.querySelectorAll(".member-tab");
  const panels = document.querySelectorAll(".member-tab-panel");
  if (!tabs.length || !panels.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const target = tab.dataset.tab;
      panels.forEach((p) => p.classList.remove("active"));

      const panelEl = document.getElementById(`tab-${target}`);
      if (panelEl) panelEl.classList.add("active");

      if (target === "pets") {
        loadAndRenderPets();
        bindAddPetForm();
      }
    });
  });
}
bindMemberTabs();

/* =========================
 *  Pets: age calc + render + add
 * ========================= */
function calcPetAge(birth) {
  if (!birth) return "-";
  const birthDate = new Date(birth);
  const now = new Date();

  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? `${age} 歲` : "-";
}

async function loadAndRenderPets() {
  const petList = document.querySelector(".pet-card-list");
  if (!petList) return;

  const mId = localStorage.getItem("mId");
  if (!mId || !isLoggedIn) {
    petList.innerHTML = "";
    return;
  }

  try {
    const res = await fetch(`/api/pets?mId=${encodeURIComponent(mId)}`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "載入失敗");

    petList.innerHTML = "";

    if (!data.pets || data.pets.length === 0) {
      petList.innerHTML = `<div class="hint">目前沒有寵物資料</div>`;
      return;
    }

    data.pets.forEach((pet) => {
      const ageText = calcPetAge(pet.birth);
      const diseaseText = pet.disease ? pet.disease : "無";

      const card = document.createElement("div");
      card.className = "pet-card";
      card.innerHTML = `
        <div class="pet-header">
          <div class="pet-avatar">${pet.breed}</div>
          <div>
            <div class="pet-name">${pet.name}</div>
            <div class="pet-sub">${ageText}・${diseaseText}</div>
          </div>
        </div>
      `;
      petList.appendChild(card);
    });
  } catch (e) {
    petList.innerHTML = `<div class="hint">載入寵物失敗：${e.message}</div>`;
  }
}

function bindAddPetForm() {
  const addBtn = document.getElementById("addPetBtn");
  if (!addBtn) return;
  if (addBtn.dataset.bound === "true") return;
  addBtn.dataset.bound = "true";

  const petNameInput = document.getElementById("petNameInput");
  const petBreedInput = document.getElementById("petBreedInput");
  const petBirthInput = document.getElementById("petBirthInput");
  const petDiseaseInput = document.getElementById("petDiseaseInput");
  const addPetMsg = document.getElementById("addPetMsg");

  addBtn.addEventListener("click", async () => {
    if (addPetMsg) addPetMsg.textContent = "";

    const mId = localStorage.getItem("mId");
    if (!mId || !isLoggedIn) {
      if (addPetMsg) addPetMsg.textContent = "請先登入會員";
      return;
    }

    const name = (petNameInput?.value || "").trim();
    const breed = (petBreedInput?.value || "").trim();
    const birth = (petBirthInput?.value || "").trim();
    const disease = (petDiseaseInput?.value || "").trim() || "無";

    if (!name || !breed || !birth) {
      if (addPetMsg) addPetMsg.textContent = "請填寫寵物名、種類、生日";
      return;
    }

    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mId, name, breed, birth, disease }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "新增失敗");

      if (addPetMsg)
        addPetMsg.textContent = `新增成功：${data.pet.name}（${data.pet.pId}）`;

      if (petNameInput) petNameInput.value = "";
      if (petBreedInput) petBreedInput.value = "";
      if (petBirthInput) petBirthInput.value = "";
      if (petDiseaseInput) petDiseaseInput.value = "";

      await loadAndRenderPets();
    } catch (e) {
      if (addPetMsg) addPetMsg.textContent = `新增失敗：${e.message}`;
    }
  });
}

/* =========================
 *  Order Process (order.html)
 *  - Services: GET /api/services
 *  - Sitters : GET /api/sitters?serviceId=s0001
 * ========================= */
const orderSummary = document.getElementById("orderSummary");

// 預設服務（若 /api/services 存在會覆蓋）
let services = [
  { id: "s0001", name: "遛狗", price: 500, desc: "" },
  { id: "s0002", name: "理髮", price: 1500, desc: "" },
  { id: "s0003", name: "住宿", price: 3000, desc: "" },
  { id: "s0004", name: "洗澡", price: 1200, desc: "" },
  { id: "s0005", name: "剪指甲", price: 1000, desc: "" },
];

// 每次載入保母（依 serviceId）更新
let sitters = [];

async function tryLoadCatalogFromDB() {
  try {
    const res = await fetch("/api/services");
    if (!res.ok) return;

    const data = await res.json();
    if (data && data.ok && Array.isArray(data.services)) {
      services = data.services;
    }
  } catch (_) {
    // ignore
  }
}

function getSelectedService() {
  return services.find((s) => s.id === orderData.serviceId) || null;
}
function getSelectedSitter() {
  return sitters.find((s) => s.id === orderData.sitterId) || null;
}

/* ==========
 *  Specialty tags + colors
 * ========== */
function normalizeSpecialties(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,\uFF0C\u3001]/g) // , ， 、
    .map((x) => x.trim())
    .filter(Boolean);
}

function specialtyToTagClass(spec) {
  const map = {
    遛狗: "tag--walk",
    理髮: "tag--groom",
    洗澡: "tag--bath",
    住宿: "tag--stay",
    剪指甲: "tag--nail",
  };
  return map[spec] || "tag--default";
}

/* ==========
 *  Stars (half-star supported)
 *  - Round to nearest 0.5
 *  - Render: full ★, half ★(via CSS gradient), empty ★
 * ========== */
function buildStarDOM(ratingValue) {
  const wrap = document.createElement("div");
  wrap.className = "sitter-rating";

  let r = Number(ratingValue);
  if (!Number.isFinite(r)) r = 0;

  r = Math.max(0, Math.min(5, r));
  r = Math.round(r * 2) / 2; // 0.5 precision

  const full = Math.floor(r);
  const half = r - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  for (let i = 0; i < full; i++) {
    const s = document.createElement("span");
    s.className = "star full";
    s.textContent = "★";
    wrap.appendChild(s);
  }
  if (half) {
    const s = document.createElement("span");
    s.className = "star half";
    s.textContent = "★";
    wrap.appendChild(s);
  }
  for (let i = 0; i < empty; i++) {
    const s = document.createElement("span");
    s.className = "star empty";
    s.textContent = "★";
    wrap.appendChild(s);
  }
  return wrap;
}

/* ==========
 *  Price display rule
 *  - Only service "住宿" shows "/晚"
 *  - others: no "/晚"
 * ========== */
function formatServicePriceText(serviceName, priceNumber) {
  const p = Number(priceNumber);
  if (serviceName === "住宿") return `$${p}/晚`;
  return `$${p}`;
}

/* ---- Render Services ---- */
function renderServices() {
  const serviceList = document.getElementById("serviceList");
  if (!serviceList) return;

  serviceList.innerHTML = "";

  services.forEach((svc) => {
    const card = document.createElement("div");
    card.className = "service-card";
    if (orderData.serviceId === svc.id) card.classList.add("selected");

    // ✅ only 住宿 has /晚
    const priceText = formatServicePriceText(svc.name, svc.price);

    card.innerHTML = `
      <div class="service-title">${svc.name}</div>
      <div class="service-price">${priceText}</div>
    `;

    card.addEventListener("click", () => {
      orderData.serviceId = svc.id;
      orderData.sitterId = null; // 換服務就清空保母
      saveState();
      renderServices();
      renderSitters();
      renderSummary();
    });

    serviceList.appendChild(card);
  });
}

/* ---- Render Sitters (DB) ----
 * - name      -> Sitter.eName
 * - specialty -> Sitter.specialty (multi: 理髮,洗澡)
 * - price     -> Offers.SitterPrice
 * - seniority -> Sitter.seniority
 * - review    -> Sitter.review
 * Price rule:
 * - sitter price NEVER shows /晚
 */
async function renderSitters() {
  const sitterList = document.getElementById("sitterList");
  const priceRange = document.getElementById("priceRange");
  if (!sitterList || !priceRange) return;

  const selectedServiceId = orderData.serviceId;
  const maxBudget = Number(priceRange.value || 999999);

  sitterList.innerHTML = "";

  if (!selectedServiceId) {
    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "請先選擇服務項目";
    sitterList.appendChild(hint);
    return;
  }

  let dbSitters = [];
  try {
    const res = await fetch(
      `/api/sitters?serviceId=${encodeURIComponent(selectedServiceId)}`
    );
    const data = await res.json();
    if (!data.ok) throw new Error(data.message || "載入保母失敗");
    dbSitters = Array.isArray(data.sitters) ? data.sitters : [];
  } catch (e) {
    sitters = [];
    const err = document.createElement("div");
    err.className = "hint";
    err.textContent = `載入保母失敗：${e.message}`;
    sitterList.appendChild(err);
    return;
  }

  sitters = dbSitters;

  const filtered = dbSitters.filter((s) => Number(s.price) <= maxBudget);

  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent =
      "沒有符合條件的保母（請提高預算或該服務目前沒有 Offers）";
    sitterList.appendChild(empty);
    return;
  }

  filtered.forEach((s) => {
    const card = document.createElement("div");
    card.className = "sitter-card";
    if (orderData.sitterId === s.id) card.classList.add("selected");

    const specs = normalizeSpecialties(s.specialty);
    const tagsHTML =
      specs.length === 0
        ? `<span class="tag tag--default">未填專長</span>`
        : specs
            .map((sp) => `<span class="tag ${specialtyToTagClass(sp)}">${sp}</span>`)
            .join("");

    const rating = Number(s.review);
    const ratingText = Number.isFinite(rating) ? rating.toFixed(1) : "-";

    // ✅ sitter price: no "/晚"
    const sitterPriceText = `$${Number(s.price)}`;

    card.innerHTML = `
      <div class="sitter-img">👤</div>
      <div class="sitter-name">${s.name || "-"}</div>

      <div class="sitter-price">${sitterPriceText}</div>

      <div class="sitter-tags">${tagsHTML}</div>

      <div class="sitter-meta">
        <div class="sitter-seniority">資歷：${s.seniority || "-"}</div>
        <div class="sitter-review-line">
          <span class="sitter-review-num">${ratingText}</span>
          <span class="sitter-stars"></span>
        </div>
      </div>
    `;

    const starMount = card.querySelector(".sitter-stars");
    if (starMount) {
      starMount.innerHTML = "";
      starMount.appendChild(buildStarDOM(rating));
    }

    card.addEventListener("click", () => {
      orderData.sitterId = s.id;
      saveState();
      renderSitters();
      renderSummary();
    });

    sitterList.appendChild(card);
  });
}

/* ---- Summary ----
 * Price rule:
 * - service: only 住宿 shows /晚
 * - sitter : never shows /晚
 */
function renderSummary() {
  if (!orderSummary) return;

  if (!orderData.nights || !orderData.serviceId || !orderData.sitterId) {
    orderSummary.innerHTML = `<div style="text-align:center; color:#999;">請完成上方所有選擇以查看訂單明細</div>`;
    return;
  }

  const service = getSelectedService();
  const sitter = getSelectedSitter();
  if (!service || !sitter) {
    orderSummary.innerHTML = `<div style="text-align:center; color:#999;">訂單資料不完整，請重新選擇</div>`;
    return;
  }

  const nights = Number(orderData.nights);
  const total =
    (Number(service.price) + Number(sitter.price)) * nights;

  const servicePriceText = formatServicePriceText(service.name, service.price);
  const sitterPriceText = `$${Number(sitter.price)}`; // ✅ no "/晚"

  orderSummary.innerHTML = `
    <div class="summary-item"><span>住宿天數</span><span>${nights} 晚</span></div>
    <div class="summary-item"><span>選擇服務</span><span>${service.name} (${servicePriceText})</span></div>
    <div class="summary-item"><span>專屬保母</span><span>${sitter.name} (${sitterPriceText})</span></div>
    <div class="summary-total"><span>總金額</span><span>$${total}</span></div>
  `;
}

/* ---- Floating Cart Click ---- */
if (floatingCart) {
  floatingCart.addEventListener("click", () => {
    window.location.href = "order.html";
  });
}

/* ---- Init Order Page ---- */
async function initOrder() {
  if (!document.getElementById("orderMemberView")) return;

  await tryLoadCatalogFromDB();

  // Nights buttons
  const nightBtns = document.querySelectorAll(".night-btn");
  const customNightsInput = document.getElementById("customNights");

  nightBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = Number(btn.getAttribute("data-value"));
      orderData.nights = val;
      saveState();

      if (customNightsInput) customNightsInput.value = "";
      nightBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      renderSummary();
      updateOrderView();
    });

    const val = Number(btn.getAttribute("data-value"));
    if (orderData.nights === val) btn.classList.add("selected");
  });

  if (customNightsInput) {
    customNightsInput.addEventListener("input", () => {
      const val = Number(customNightsInput.value);
      if (val >= 1) {
        orderData.nights = val;
        saveState();
        nightBtns.forEach((b) => b.classList.remove("selected"));
        renderSummary();
        updateOrderView();
      }
    });
  }

  // Budget range
  const priceRange = document.getElementById("priceRange");
  const priceRangeVal = document.getElementById("priceRangeVal");
  if (priceRange && priceRangeVal) {
    priceRangeVal.textContent = priceRange.value;

    priceRange.addEventListener("input", () => {
      priceRangeVal.textContent = priceRange.value;
      renderSitters();
      renderSummary();
    });
  }

  // Submit order（示範）
  const submitOrderBtn = document.getElementById("submitOrderBtn");
  if (submitOrderBtn) {
    submitOrderBtn.addEventListener("click", async () => {
      if (!isLoggedIn) {
        alert("請先登入會員");
        return;
      }
      if (!orderData.nights || !orderData.serviceId || !orderData.sitterId) {
        alert("請完成所有選項（天數、服務、保母）");
        return;
      }

      alert("訂單已送出（示範）");

      orderData = { nights: null, serviceId: null, sitterId: null };
      saveState();

      nightBtns.forEach((b) => b.classList.remove("selected"));
      if (customNightsInput) customNightsInput.value = "";

      renderServices();
      renderSitters();
      renderSummary();
      updateOrderView();
    });
  }

  renderServices();
  await renderSitters();
  renderSummary();
}

initOrder();