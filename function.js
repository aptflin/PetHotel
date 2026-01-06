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

// 當選單內的連結被點擊時，關閉漢堡選單（不阻止原本的導向行為）
document.querySelectorAll('#menuPanel a').forEach(link => {
  link.addEventListener('click', () => {
    // 使用短延遲以確保在單頁平滑滾動前先收起選單（UX 上較順）
    setTimeout(() => toggleMenu(false), 50);
  });
});

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
    petId: null,
    checkin: null,
    checkout: null,
  };

function saveState() {
  localStorage.setItem("isLoggedIn", isLoggedIn ? "true" : "false");
  localStorage.setItem("orderData", JSON.stringify(orderData));
}

// ========== Order: load pets into select & bind date/pet controls ==========
async function loadPetsIntoSelect() {
  const petSelect = document.getElementById('petSelect');
  if (!petSelect) return;

  // clear current
  petSelect.innerHTML = '<option value="">載入中...</option>';

  const mId = localStorage.getItem('mId');
  if (!mId) {
    petSelect.innerHTML = '<option value="">請先登入以載入寵物</option>';
    return;
  }

  try {
    const res = await fetch(`/api/pets?mId=${encodeURIComponent(mId)}`);
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok || !data || !data.ok) throw new Error((data && data.message) || `API ${res.status}`);

    const pets = data.pets || [];
    if (!pets.length) {
      petSelect.innerHTML = '<option value="">尚未新增寵物</option>';
      return;
    }

    petSelect.innerHTML = '<option value="">請選擇寵物</option>' + pets.map(p => `<option value="${p.pId}">${p.name} (${p.breed})</option>`).join('');

    // 如果 orderData.petId 有值，選回原本選擇
    if (orderData.petId) petSelect.value = orderData.petId;
  } catch (e) {
    console.error('Failed to load pets for order:', e);
    petSelect.innerHTML = '<option value="">載入失敗，稍後再試</option>';
  }
}

function computeNights(checkin, checkout) {
  if (!checkin || !checkout) return null;

  const a = new Date(checkin);
  const b = new Date(checkout);

  // ❌ 入住時間比退房還晚 → 非法
  if (a > b) return -1;

  // 入住 = 退房 → 0 晚（不住宿）
  if (a.getTime() === b.getTime()) return 0;

  // 正常計算
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24));
}



function bindOrderControls() {
  const petSelect = document.getElementById('petSelect');
  const checkinDate = document.getElementById('checkinDate');
  const checkoutDate = document.getElementById('checkoutDate');
  const nightsDisplay = document.getElementById('nightsDisplay');
  const petSelectError = document.getElementById('petSelectError');

  if (petSelect) {
    petSelect.addEventListener('change', () => {
      orderData.petId = petSelect.value || null;
      // clear error state when user picks a pet
      petSelect.classList.remove('input-error');
      if (petSelectError) petSelectError.style.display = orderData.petId ? 'none' : 'block';
      saveState();
    });
    // populate initial value if any
    if (orderData.petId) petSelect.value = orderData.petId;
  }

  function updateDates() {
  const ci = checkinDate?.value || null;
  const co = checkoutDate?.value || null;

  orderData.checkin = ci;
  orderData.checkout = co;

  const nights = computeNights(ci, co);

  // ✅ 日期一變就重置：服務、保母、訂單確認（避免舊選項殘留）
  orderData.serviceId = null;
  orderData.sitterId = null;

  // ❌ 入住 > 退房
  if (nights === -1) {
    alert("退房日期不可早於入住日期");
    if (checkoutDate) checkoutDate.value = "";
    orderData.checkout = null;
    orderData.nights = null;

    if (nightsDisplay) nightsDisplay.textContent = "-";

    saveState();

    // 重置後同步刷新 UI
    renderServices();
    renderSitters();
    renderSummary();
    return;
  }

  orderData.nights = nights;

  // UI 顯示
  if (nightsDisplay) {
    if (nights === 0) {
      nightsDisplay.textContent = "不住宿";
    } else if (nights > 0) {
      nightsDisplay.textContent = `${nights} 晚`;
    } else {
      nightsDisplay.textContent = "-";
    }
  }

  saveState();

  // ✅ 日期更新後：同步重畫服務/保母/訂單確認（全部回到未選狀態）
  renderServices();
  renderSitters();
  renderSummary();
}

  if (checkinDate) {
    checkinDate.addEventListener('change', updateDates);
    if (orderData.checkin) checkinDate.value = orderData.checkin;
  }

  if (checkoutDate) {
    checkoutDate.addEventListener('change', updateDates);
    if (orderData.checkout) checkoutDate.value = orderData.checkout;
  }

  if (nightsDisplay) {
    const n = orderData.nights;
    if (n === 0) {
      nightsDisplay.textContent = "不住宿";
    } else if (n > 0) {
      nightsDisplay.textContent = `${n} 晚`;
    } else {
      nightsDisplay.textContent = "-";
    }
  }
}

// Attempt to load controls when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // ✅ 只在預約服務頁才重置
  if (window.location.pathname.includes("order.html")) {
    resetOrderForReload();
  }

  loadPetsIntoSelect();
  bindOrderControls();
});


// Submit validation: require a pet selection before allowing order submission
document.addEventListener('DOMContentLoaded', () => {
  const submitBtn = document.getElementById('submitOrderBtn');
  const petSelect = document.getElementById('petSelect');
  const petSelectError = document.getElementById('petSelectError');
  if (submitBtn) {
    submitBtn.addEventListener('click', (e) => {
      // refresh orderData.petId from DOM in case user hasn't triggered change
      const selectedPet = petSelect ? petSelect.value : (orderData.petId || '');
      if (!selectedPet) {
        e.preventDefault();
        if (petSelect) petSelect.classList.add('input-error');
        if (petSelectError) petSelectError.style.display = 'block';
        alert('請先選擇一隻寵物');
        return;
      }

      // proceed: here you could build the order payload or show order summary
      // For now, just save state and log
      orderData.petId = selectedPet;
      saveState();
      console.log('Order ready', orderData);
    });
  }
});

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
      loadPendingOrderCount();

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

      // 先以 text 取得回應，避免空回應導致 res.json() 拋錯
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (err) {
        console.error('Failed to parse /api/login response as JSON:', err, 'responseText:', text);
        throw new Error('伺服器回應不是有效的 JSON，請檢查後端。');
      }

      if (!res.ok) {
        const msg = (data && data.message) ? data.message : `伺服器回應 ${res.status}`;
        throw new Error(msg);
      }

      if (!data || !data.ok) throw new Error((data && data.message) || '帳號或密碼錯誤');

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

      // If user logs in while staying on the reservation/order page,
      // refresh the pet dropdown immediately.
      if (typeof loadPetsIntoSelect === 'function') {
        loadPetsIntoSelect();
      }

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
 *  Pets: render + add (final)
 * ========================= */

// breedToEmoji / normalizeText / normalizeDisease / calcPetAge / renderPetCardModern
// 你檔案內已經有了（renderPetCardModern 會輸出 .pet-card-modern）:contentReference[oaicite:4]{index=4}

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

    // 參考你 /api/login 的寫法：先拿 text 再 parse，避免後端回 HTML/空字串時直接掛掉:contentReference[oaicite:7]{index=7}
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      console.error("Failed to parse /api/pets response as JSON:", err, "responseText:", text);
      throw new Error("伺服器回應不是有效的 JSON，請檢查後端 /api/pets。");
    }

    if (!res.ok) {
      const msg = (data && data.message) ? data.message : `伺服器回應 ${res.status}`;
      throw new Error(msg);
    }
    if (!data || !data.ok) throw new Error((data && data.message) || "載入失敗");

    if (!Array.isArray(data.pets) || data.pets.length === 0) {
      petList.innerHTML = `<div class="hint">目前沒有寵物資料</div>`;
      return;
    }

    // ✅ 用你已存在的現代卡片 renderer:contentReference[oaicite:8]{index=8}
    petList.innerHTML = data.pets.map(renderPetCardModern).join("");
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
  const petLigationInput = document.getElementById("petLigationInput");     // ✅ Ligation
  const petWeightInput = document.getElementById("petWeightInput");         // ✅ weight
  const petPersonalityInput = document.getElementById("petPersonalityInput"); // ✅ personality
  const petDiseaseInput = document.getElementById("petDiseaseInput");       // ✅ disease
  const petNoticeInput = document.getElementById("petNoticeInput");         // ✅ notice
  const addPetMsg = document.getElementById("addPetMsg");

  addBtn.addEventListener("click", async () => {
    if (addPetMsg) addPetMsg.textContent = "";

    const mId = localStorage.getItem("mId");
    if (!mId || !isLoggedIn) {
      if (addPetMsg) addPetMsg.textContent = "請先登入會員";
      return;
    }

    const name = (petNameInput?.value || "").trim();
    const breed = (petBreedInput?.value || "").trim(); // 依你的需求：顯示「貓/狗」
    const birth = (petBirthInput?.value || "").trim();
    const ligation = (petLigationInput?.value || "").trim(); // 依你的需求：不要用 0/1，用文字
    const weightRaw = (petWeightInput?.value || "").trim();
    const weight = weightRaw === "" ? null : Number(weightRaw);
    const personality = (petPersonalityInput?.value || "").trim();
    const disease = (petDiseaseInput?.value || "").trim() || "無"; // 空就顯示「無」邏輯一致:contentReference[oaicite:5]{index=5}
    const notice = (petNoticeInput?.value || "").trim();

    // 基本必填：名、種類、生日、是否結紮
    if (!name || !breed || !birth || !ligation) {
      if (addPetMsg) addPetMsg.textContent = "請填寫寵物名、種類、生日、是否結紮";
      return;
    }

    if (weight !== null && Number.isNaN(weight)) {
      if (addPetMsg) addPetMsg.textContent = "體重格式不正確";
      return;
    }

    try {
      const res = await fetch("/api/pets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mId,
          name,
          breed,
          birth,
          ligation,
          weight,
          personality,
          disease,
          notice,
        }),
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.message || "新增失敗");

      if (addPetMsg) addPetMsg.textContent = `新增成功：${data.pet.name}`;

      // 清空表單（保留 breed 預設可自行調整）
      if (petNameInput) petNameInput.value = "";
      if (petBirthInput) petBirthInput.value = "";
      if (petLigationInput) petLigationInput.value = "";
      if (petWeightInput) petWeightInput.value = "";
      if (petPersonalityInput) petPersonalityInput.value = "";
      if (petDiseaseInput) petDiseaseInput.value = "";
      if (petNoticeInput) petNoticeInput.value = "";

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
      const isSame = orderData.serviceId === svc.id;

      if (isSame) {
        // ✅ 再點一次：取消服務 + 連帶取消保母
        orderData.serviceId = null;
        orderData.sitterId = null;
      } else {
        // ✅ 換服務：選取新服務 + 清空保母
        orderData.serviceId = svc.id;
        orderData.sitterId = null;
      }

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
  const isSame = orderData.sitterId === s.id;

  // ✅ 再點一次同一位保母：取消選取
  orderData.sitterId = isSame ? null : s.id;

  saveState();
  renderSitters();
  renderSummary();
});

    sitterList.appendChild(card);
  });
}

/* =========================
 * Summary + Pricing Rules (by sNo)
 * ========================= */

// ✅ 服務代碼（依 DB sNo）
const SERVICE_BASIC = "s0001";     // 基礎照護
const SERVICE_GROOMING = "s0002";  // 精緻美容
const SERVICE_MEDICAL = "s0003";   // 醫療監控

// ✅ 住宿費（每天/每晚）
const LODGING_FEE_PER_NIGHT = 700;

function classifyServiceBySNo(service) {
  if (!service || !service.id) return null;
  switch (service.id) {
    case SERVICE_BASIC:
      return "basic";
    case SERVICE_GROOMING:
      return "grooming";
    case SERVICE_MEDICAL:
      return "medical";
    default:
      return "other";
  }
}

/**
 * 計價規則（依你需求）：
 * - 有住宿(nights>0)
 *   - 不選服務/保母：700 * nights
 *   - 同時選服務+保母：
 *       s0001/s0003：保母價 * nights（不另收700）
 *       s0002：保母價 + 700*nights
 * - 無住宿(nights=0)：必選服務+保母，總價=保母價
 *
 * 回傳：
 * { ok, total, lines, message }
 */
function calcOrderPricing({ nightsRaw, service, sitter }) {
  const nights = Number.isFinite(Number(nightsRaw)) ? Number(nightsRaw) : null;

  const hasNightsValue = nights !== null && !Number.isNaN(nights);
  if (!hasNightsValue) {
    return { ok: false, total: 0, lines: [], message: "請先選擇入住/退房日期（或住宿天數）" };
  }

  const hasStay = nights > 0;
  const hasService = !!service;
  const hasSitter = !!sitter;

  // ========== 有住宿 ==========
  if (hasStay) {
    // 允許：都不選 → 純住宿
    if (!hasService && !hasSitter) {
      const stayFee = LODGING_FEE_PER_NIGHT * nights;
      return {
        ok: true,
        total: stayFee,
        lines: [
          { label: "住宿晚數", value: `${nights} 晚` },
          { label: "住宿費", value: `$${stayFee}` },
        ],
      };
    }

    // 不允許：只選一半
    if (hasService !== hasSitter) {
      return {
        ok: false,
        total: 0,
        lines: [],
        message: "有住宿時：若要選擇服務，必須同時選擇「服務項目 + 專屬保母」；若不選，兩者都不要選。",
      };
    }

    // 有住宿 + 同時選服務與保母
    const type = classifyServiceBySNo(service);
    const sitterPrice = Number(sitter.price) || 0;

    // 精緻美容：保母價 + 住宿費
    if (type === "grooming") {
      const stayFee = LODGING_FEE_PER_NIGHT * nights;
      const total = stayFee + sitterPrice;
      return {
        ok: true,
        total,
        lines: [
          { label: "住宿晚數", value: `${nights} 晚` },
          { label: "服務項目", value: service.name || service.id },
          { label: "專屬保母", value: `${sitter.name}` },
          { label: "住宿費", value: `$${stayFee}` },
          { label: "精緻美容", value: `$${sitterPrice}` },
        ],
      };
    }

    // 基礎照護 / 醫療監控：保母價 * nights（不另收700）
    if (type === "basic" || type === "medical") {
      const total = sitterPrice * nights;
      return {
        ok: true,
        total,
        lines: [
          { label: "住宿晚數", value: `${nights} 晚` },
          { label: "服務項目", value: service.name || service.id },
          { label: "專屬保母", value: `${sitter.name}` },
          { label: "計費方式", value: `$${sitterPrice} × ${nights} 晚` },
        ],
      };
    }

    // 其他服務（保守處理：比照保母價*天數，不另收700）
    const total = sitterPrice * nights;
    return {
      ok: true,
      total,
      lines: [
        { label: "住宿晚數", value: `${nights} 晚` },
        { label: "服務項目", value: service.name || service.id },
        { label: "專屬保母", value: `${sitter.name} ($${sitterPrice})` },
      ],
    };
  }

  // ========== 無住宿（nights = 0） ==========
  if (!hasService || !hasSitter) {
    return {
      ok: false,
      total: 0,
      lines: [],
      message: "無住宿時：必須選擇一項服務項目與一位專屬保母。",
    };
  }

  const sitterPrice = Number(sitter.price) || 0;
  return {
    ok: true,
    total: sitterPrice,
    lines: [
      { label: "住宿", value: "無住宿" },
      { label: "服務項目", value: service.name || service.id },
      { label: "專屬保母", value: `${sitter.name}` },
    ],
  };
}

/* ---- Summary ---- */
function renderSummary() {
  if (!orderSummary) return;

  const service = getSelectedService();
  const sitter = getSelectedSitter();

  const pricing = calcOrderPricing({
    nightsRaw: orderData.nights,
    service,
    sitter,
  });

  if (!pricing.ok) {
    orderSummary.innerHTML = `<div style="text-align:center; color:#999;">${pricing.message}</div>`;
    return;
  }

  const linesHTML = pricing.lines
    .map((x) => `<div class="summary-item"><span>${x.label}</span><span>${x.value}</span></div>`)
    .join("");

  orderSummary.innerHTML = `
    ${linesHTML}
    <div class="summary-total"><span>總金額</span><span>$${pricing.total}</span></div>
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

  // ✅ 進入訂購頁時：服務/保母不要預設選取（清掉 localStorage 可能殘留的選擇）
  orderData.serviceId = null;
  orderData.sitterId = null;
  saveState();

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

// Submit order（寫入 DB）
const submitOrderBtn = document.getElementById("submitOrderBtn");
if (submitOrderBtn) {
  submitOrderBtn.addEventListener("click", async (e) => {
    if (!isLoggedIn) {
      alert("請先登入會員");
      return;
    }

    const mId = (localStorage.getItem("mId") || "").toString().trim();
    if (!mId) {
      alert("登入狀態異常，請重新登入");
      return;
    }

    // 寵物必選
    const petSelect = document.getElementById("petSelect");
    const selectedPet = (petSelect && petSelect.value) ? petSelect.value : (orderData.petId || "");
    if (!selectedPet) {
      alert("請先選擇寵物");
      return;
    }

    const service = getSelectedService();
    const sitter = getSelectedSitter();
    const pricing = calcOrderPricing({ nightsRaw: orderData.nights, service, sitter });
    if (!pricing.ok) {
      alert(pricing.message);
      return;
    }

    // 組裝要寫入 DB 的 BookingDetail
    const nights = Number(orderData.nights);
    const items = [];

    if (nights > 0) {
      // 純住宿：都不選（700 * nights）
      if (!service && !sitter) {
        items.push({ sNo: null, pId: selectedPet, amount: nights, price: 700 });
      } else {
        // 有住宿 + 同時選服務+保母
        const type = classifyServiceBySNo(service);
        const sitterPrice = Number(sitter.price) || 0;

        if (type === "grooming") {
          // 精緻美容：住宿費(700*nights) + 保母價(一次)
          items.push({ sNo: null, pId: selectedPet, amount: nights, price: 700 });
          items.push({ sNo: service.id, pId: selectedPet, amount: 1, price: sitterPrice });
        } else {
          // 基礎照護/醫療監控：保母價 * nights（不另收700）
          items.push({ sNo: service.id, pId: selectedPet, amount: nights, price: sitterPrice });
        }
      }
    } else {
      // 無住宿：必選服務+保母，總價=保母價；amount=0 讓訂單列表顯示「無住宿」
      const sitterPrice = Number(sitter.price) || 0;
      items.push({ sNo: service.id, pId: selectedPet, amount: 0, price: sitterPrice });
    }

    try {
      submitOrderBtn.disabled = true;

      const payload = {
        mId,
        sId: sitter ? sitter.id : null,
        startDate: orderData.checkin || null,
        endDate: orderData.checkout || null,
        totalPrice: pricing.total,
        items,
      };

      const resp = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-member-id": mId,
        },
        body: JSON.stringify(payload),
      });

      const txt = await resp.text();
      const data = txt ? JSON.parse(txt) : null;
      if (!resp.ok || !data || !data.ok) {
        throw new Error((data && data.message) || `送出失敗 (${resp.status})`);
      }

      alert(`訂單已成立！\n訂單編號：${data.bNo}\n送出時間：${data.rDate}\n總金額：$${pricing.total}`);

      // 成功後重置（保留 petId）
      orderData = {
        nights: null,
        serviceId: null,
        sitterId: null,
        petId: selectedPet,
        checkin: null,
        checkout: null,
      };
      saveState();

      // UI reset
      if (petSelect) petSelect.value = selectedPet;
      nightBtns.forEach((b) => b.classList.remove("selected"));
      if (customNightsInput) customNightsInput.value = "";

      renderServices();
      renderSitters();
      renderSummary();
      updateOrderView();
    } catch (err) {
      alert(err.message || "送出訂單失敗");
    } finally {
      submitOrderBtn.disabled = false;
    }
  });
}
  renderServices();
  await renderSitters();
  renderSummary();
}

initOrder();




/* =========================
 *  Pet Age Calculator
 * ========================= */
// 回傳格式：{ years: number, months: number, text: string }
function calcPetAge(birthDateStr) {
  if (!birthDateStr) {
    return { years: 0, months: 0, text: "未知" };
  }

  const birth = new Date(birthDateStr);
  const now = new Date();

  if (isNaN(birth.getTime())) {
    return { years: 0, months: 0, text: "未知" };
  }

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  // 如果這個月還沒過生日，要借月
  if (days < 0) {
    months -= 1;
  }

  // 月份為負，借一年
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // 保底（避免負數）
  years = Math.max(0, years);
  months = Math.max(0, months);

  // 顯示文字規則
  let text = "";
  if (years > 0 && months > 0) {
    text = `${years} 歲 ${months} 個月`;
  } else if (years > 0) {
    text = `${years} 歲`;
  } else {
    text = `${months} 個月`;
  }

  return { years, months, text };
}

function renderPetCardModern(pet) {
  const {
    name,
    breed,
    birth,
    ligation,
    weight,
    personality,
    disease,
    notice,
  } = pet;

  const emoji = breed === "狗" ? "🐶" : "🐱";
  const age = calcPetAge(birth); // 你前一步加的「年＋月」計算函式

  return `
    <div class="pet-card">
      <div class="pet-header">
        <div class="pet-avatar">${emoji}</div>
        <div>
          <div class="pet-name">${name ?? "未命名"}</div>
          <div class="pet-sub">${breed ?? "—"}｜${age.text}｜${ligation ?? "—"}</div>
        </div>
      </div>

      <div class="pet-info">
        <div><span class="pet-label">體重</span>${weight ?? "—"} kg</div>
        <div><span class="pet-label">個性</span>${personality || "—"}</div>
        <div><span class="pet-label">過敏 / 慢性病</span>${disease || "無"}</div>
        <div><span class="pet-label">特別注意</span>${notice || "—"}</div>
      </div>
    </div>
  `;
}

/* =========================
 *  Orders: load + render (member.html)
 * ========================= */

let __ordersCache = [];
let __ordersLoadedOnce = false;

function formatDateYMD(dateValue) {
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function formatMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$ 0";
  return "$ " + num.toLocaleString("en-US");
}

// 把 DB 的 status（或用日期推算）轉成：reserved/staying/completed/cancelled
function normalizeOrderStatus(order) {
  const raw = (order.status || "").toString();

  // 1) 先吃 DB status 關鍵字（你可依你 DB 實際值調整）
  if (raw.includes("取消")) return { key: "cancelled", text: "已取消", css: "order-status-cancelled" };
  if (raw.includes("完成")) return { key: "completed", text: "已完成", css: "order-status-done" };
  if (raw.includes("住宿中")) return { key: "staying", text: "住宿中", css: "order-status-staying" };
  if (raw.includes("預約")) return { key: "reserved", text: "預約中", css: "order-status-reserved" };

  // 2) 若 DB 沒給明確文字：用日期推
  const now = new Date();
  const b = new Date(order.b.startDate);
  const r = new Date(order.rDate);

  if (!Number.isNaN(b.getTime()) && !Number.isNaN(r.getTime())) {
    if (now < b) return { key: "reserved", text: "預約中", css: "order-status-reserved" };
    if (now >= b && now < r) return { key: "staying", text: "住宿中", css: "order-status-staying" };
    if (now >= r) return { key: "completed", text: "已完成", css: "order-status-done" };
  }

  return { key: "reserved", text: raw || "預約中", css: "order-status-reserved" };
}

function renderOrderItemHTML(order) {
  const st = normalizeOrderStatus(order);
  const bNo = order.bNo || "-";
  const orderDate = formatDateYMD(order.rDate);

  const nights = Number(order.nights);

  let nightsText = "無住宿";
  if (Number.isFinite(nights) && nights > 0) {
    nightsText = `住宿${nights} 晚`;
  }

  const petNames = (order.petNames || "").toString().trim();
  const petText = petNames ? `寵物：${petNames}` : "寵物：-";

  const serviceNames = (order.serviceNames || "").toString() || "僅住宿";
  const sitterName = (order.sitterName || "").toString() || "無專屬保母";

  const totalPrice = formatMoney(order.totalPrice);

  // ✅ 只在「住宿中 / 已完成」顯示查看照顧日誌
  const showLogBtn = st.key === "staying" || st.key === "completed";
  const logBtn = showLogBtn
    ? `<button class="order-link-btn" onclick="switchToLogs('${bNo}')">查看照顧日誌</button>`
    : "";

  return `
    <div class="member-order-item" data-status="${st.key}" data-bno="${bNo}">
      <div class="order-main">
        <div class="order-id-date">
          <span class="order-id">訂單編號：${bNo}</span>
          <span class="order-date">${orderDate}</span>
        </div>
        <div class="order-detail">
          <span>${nightsText}</span>
          <span class="service-info">服務：${serviceNames}</span>
          <span>保母：${sitterName}</span>
          <span>${petText}</span>
        </div>
      </div>
      <div class="order-side">
        <div class="order-price">${totalPrice}</div>
        <div class="order-status ${st.css}">${st.text}</div>
        ${logBtn}
      </div>
    </div>
  `;
}

async function loadAndRenderOrders(force = false) {
  const list = document.getElementById("memberOrderList") || document.querySelector(".member-order-list");
  if (!list) return;

  const mId = localStorage.getItem("mId");
  if (!mId || !isLoggedIn) {
    list.innerHTML = `<div class="hint">請先登入以查看訂單</div>`;
    return;
  }

  if (__ordersLoadedOnce && !force) {
    // 直接用快取重畫
    list.innerHTML = __ordersCache.length
      ? __ordersCache.map(renderOrderItemHTML).join("")
      : `<div class="hint">目前沒有訂單</div>`;
    applyOrderFilterFromActiveButton();
    return;
  }

  list.innerHTML = `<div class="hint">載入訂單中...</div>`;

  try {
    const res = await fetch(`/api/orders?mId=${encodeURIComponent(mId)}`, {
      headers: { "x-member-id": mId }, // 讓後端可以比對避免偷看
    });

    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (e) {
      throw new Error("伺服器回應不是有效的 JSON，請檢查後端 /api/orders。");
    }

    if (!res.ok) throw new Error((data && data.message) || `伺服器回應 ${res.status}`);
    if (!data || !data.ok) throw new Error((data && data.message) || "載入失敗");

    __ordersCache = Array.isArray(data.orders) ? data.orders : [];
    __ordersLoadedOnce = true;

    list.innerHTML = __ordersCache.length
      ? __ordersCache.map(renderOrderItemHTML).join("")
      : `<div class="hint">目前沒有訂單</div>`;

    applyOrderFilterFromActiveButton();
  } catch (e) {
    list.innerHTML = `<div class="hint">載入訂單失敗：${e.message}</div>`;
  }
}

function applyOrderFilterFromActiveButton() {
  const activeBtn = document.querySelector(".order-filter.active");
  const status = activeBtn ? activeBtn.dataset.status : "all";

  const items = document.querySelectorAll(".member-order-item");
  items.forEach((item) => {
    if (status === "all" || item.dataset.status === status) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

function bindOrderFiltersDynamic() {
  const filters = document.querySelectorAll(".order-filter");
  if (!filters.length) return;

  // 避免重複綁定
  filters.forEach((btn) => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";

    btn.addEventListener("click", () => {
      filters.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyOrderFilterFromActiveButton();
    });
  });
}

// 會員頁登入後：載入訂單＆綁定篩選
bindOrderFiltersDynamic();
loadAndRenderOrders(false);

async function loadAndRenderCareLogs(targetBNo = null) {
  const container = document.getElementById("careLogList");
  if (!container) return;

  const mId = localStorage.getItem("mId");
  if (!mId) {
    container.innerHTML = "<p>請先登入</p>";
    return;
  }

  container.innerHTML = "<p>載入照顧日誌中...</p>";

  const res = await fetch(`/api/carelogs?mId=${encodeURIComponent(mId)}`);
  const data = await res.json();

  if (!data.ok) {
    container.innerHTML = "<p>載入失敗</p>";
    return;
  }

  container.innerHTML = data.logs.map(renderCareLogHTML).join("");

  // 若是從訂單點進來，自動捲動
  if (targetBNo) {
    const el = document.getElementById(`log-${targetBNo}`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }
}

function renderCareLogHTML(log) {
  const dateText = new Date(log.recordTime).toLocaleDateString();

  // ✅ 完全對齊「訂單明細」的狀態樣式
  let statusClass = "order-status-on-going";
  let statusText = "住宿中";

  const raw = (log.bookingStatus || "").toString();

  // 依 Booking.status 決定樣式（和訂單同規則）
  if (raw.includes("完成")) {
    statusClass = "order-status-done";
    statusText = "已完成";
  } else if (raw.includes("住宿")) {
    statusClass = "order-status-staying";
    statusText = "住宿中";
  }

  return `
    <div class="care-log-item" id="log-${log.bNo}">
      <div class="care-log-header">
        <div>
          <div class="care-log-date">${dateText}</div>
          <div class="care-log-pet">
            訂單編號${log.bNo}・${log.petName || "-"}・${log.nights}晚住宿・保母${log.sitterName || "-"}
          </div>
        </div>

        <!-- ✅ 關鍵：加上 order-status 基底 class，才會跟訂單一模一樣 -->
        <span class="order-status ${statusClass}">
          ${statusText}
        </span>
      </div>

      <div class="care-log-body">
        ${log.description || ""}
      </div>
    </div>
  `;
}

/* =========================
 *  Go to Member Page
 * ========================= */
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".member-area-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      window.location.href = "member.html";
    });
  });
});

/* =========================
 * Reset order on reload
 * ========================= */
function resetOrderForReload() {
  // 重置核心訂單狀態
  orderData = {
    nights: null,
    serviceId: null,
    sitterId: null,
    petId: null,
    checkin: null,
    checkout: null,
  };

  saveState();

  // 重置日期欄位
  const checkinDate = document.getElementById("checkinDate");
  const checkoutDate = document.getElementById("checkoutDate");
  const nightsDisplay = document.getElementById("nightsDisplay");

  if (checkinDate) checkinDate.value = "";
  if (checkoutDate) checkoutDate.value = "";
  if (nightsDisplay) nightsDisplay.textContent = "-";

  // 重畫 UI（全部回到未選狀態）
  if (typeof renderServices === "function") renderServices();
  if (typeof renderSitters === "function") renderSitters();
  if (typeof renderSummary === "function") renderSummary();
}

// 載入「預約中」訂單數量
async function loadPendingOrderCount() {
  const mId = (localStorage.getItem("mId") || "").toString().trim();
  if (!mId) return;

  try {
    const resp = await fetch("/api/orders/pending/summary", {
      headers: { "x-member-id": mId },
    });

    const data = await resp.json();
    if (!data.ok) {
      console.warn("載入預約中訂單失敗", data.message);
      return;
    }

    const el = document.getElementById("pendingOrderCount");
    if (el) {
      el.textContent = data.pendingCount;
    }
  } catch (err) {
    console.error("載入預約中訂單錯誤", err);
  }
}