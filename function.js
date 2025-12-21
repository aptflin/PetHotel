const hamburger = document.getElementById("hamburger");
const panel = document.getElementById("menuPanel");
const overlay = document.getElementById("overlay");

function toggleMenu(forceOpen) {
  const isOpen = typeof forceOpen === "boolean" ? forceOpen : !panel.classList.contains("open");
  panel.classList.toggle("open", isOpen);
  hamburger.classList.toggle("open", isOpen);
  overlay.classList.toggle("show", isOpen);
}

hamburger.addEventListener("click", () => toggleMenu());
overlay.addEventListener("click", () => toggleMenu(false));

// Login Functionality
const loginBtn = document.getElementById("loginBtn");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginForm = document.getElementById("loginForm");
const userInfo = document.getElementById("userInfo");
const displayUsername = document.getElementById("displayUsername");
const logoutBtn = document.getElementById("logoutBtn");
const loginError = document.getElementById("loginError");

// Order Section Elements
const orderGuestView = document.getElementById("orderGuestView");
const orderMemberView = document.getElementById("orderMemberView");
const goToLoginBtn = document.getElementById("goToLoginBtn");
const floatingCart = document.getElementById("floatingCart");

// State Management
let isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
let currentStep = parseInt(localStorage.getItem("currentStep")) || 1;
let orderData = JSON.parse(localStorage.getItem("orderData")) || {
  nights: null,
  serviceId: null,
  sitterId: null,
};

function saveState() {
  localStorage.setItem("isLoggedIn", isLoggedIn);
  localStorage.setItem("currentStep", currentStep);
  localStorage.setItem("orderData", JSON.stringify(orderData));
}

function updateLoginUI() {
  if (isLoggedIn) {
    if (loginForm) loginForm.style.display = "none";
    if (userInfo) userInfo.style.display = "flex";
    if (displayUsername) displayUsername.textContent = localStorage.getItem("username") || "Admin";
  } else {
    if (loginForm) loginForm.style.display = "flex";
    if (userInfo) userInfo.style.display = "none";
  }
  updateOrderView();
}

function updateOrderView() {
  // Only run if elements exist (on order.html)
  if (orderGuestView && orderMemberView) {
    if (isLoggedIn) {
      orderGuestView.style.display = "none";
      orderMemberView.style.display = "block";
    } else {
      orderGuestView.style.display = "block";
      orderMemberView.style.display = "none";
    }
  }
  
  // Floating Cart Logic (on non-order pages)
  if (floatingCart) {
    const isOrderPage = window.location.pathname.includes("order.html");
    if (!isOrderPage && isLoggedIn && orderData.nights) {
      floatingCart.style.display = "flex";
    } else {
      floatingCart.style.display = "none";
    }
  }

  // Member Page Logic (on member.html)
  const memberGuestView = document.getElementById("memberGuestView");
  const memberMemberView = document.getElementById("memberMemberView");
  const memberDisplayName = document.getElementById("memberDisplayName");
  const memberInfoName = document.getElementById("memberInfoName");
  
  if (memberGuestView && memberMemberView) {
    if (isLoggedIn) {
      memberGuestView.style.display = "none";
      memberMemberView.style.display = "block";
      
      // 更新會員名稱（從 localStorage 取得）
      const username = localStorage.getItem("username") || "Admin";
      if (memberDisplayName) memberDisplayName.textContent = username;
      if (memberInfoName) memberInfoName.textContent = username;
    } else {
      memberGuestView.style.display = "block";
      memberMemberView.style.display = "none";
    }
  }
}

// Initial UI Update
updateLoginUI();

if (goToLoginBtn) {
  goToLoginBtn.addEventListener("click", () => {
    toggleMenu(true);
    // Scroll to login section if needed, or just open menu
  });
}

// 會員專區的「前往登入」按鈕
const memberGoToLoginBtn = document.getElementById("memberGoToLoginBtn");
if (memberGoToLoginBtn) {
  memberGoToLoginBtn.addEventListener("click", () => {
    toggleMenu(true);
  });
}

function clearLoginError() {
  if (usernameInput) usernameInput.classList.remove("input-error");
  if (passwordInput) passwordInput.classList.remove("input-error");
  if (loginError) {
    loginError.textContent = "";
    loginError.classList.remove("show");
  }
}

if (loginBtn) {
  // Clear error on input
  usernameInput.addEventListener("input", clearLoginError);
  passwordInput.addEventListener("input", clearLoginError);

  loginBtn.addEventListener("click", () => {
    const username = usernameInput.value;
    const password = passwordInput.value;

    // Reset error first
    clearLoginError();

    if (username === "admin" && password === "admin") {
      // toggleMenu(false); // Optional: Close menu on success
      
      isLoggedIn = true;
      localStorage.setItem("username", username);
      saveState();
      updateLoginUI();
      updateOrderView(); // 確保會員專區也會更新
      
      // Clear inputs
      usernameInput.value = "";
      passwordInput.value = "";
      
    } else {
      // Show error
      usernameInput.classList.add("input-error");
      passwordInput.classList.add("input-error");
      if (loginError) {
        loginError.textContent = "帳號或密碼錯誤";
        loginError.classList.add("show");
      }
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    alert("已登出");
    
    isLoggedIn = false;
    localStorage.removeItem("username");
    // Optional: Clear order data on logout?
    // orderData = { nights: null, serviceId: null, sitterId: null };
    // currentStep = 1;
    saveState();
    
    updateLoginUI();
  });
}

// --- Order Process Logic ---

// Mock Data
const services = [
  { id: "s1", name: "基礎照護", price: 500, desc: "含餵食、清潔" },
  { id: "s2", name: "精緻美容", price: 1200, desc: "含洗澡、修剪" },
  { id: "s3", name: "醫療監控", price: 2000, desc: "24h 獸醫監控" },
];

const sitters = [
  { id: "p1", name: "Alice", services: ["s1"], price: 500 },
  { id: "p2", name: "Bob", services: ["s1", "s2"], price: 1500 },
  { id: "p3", name: "Charlie", services: ["s1", "s3"], price: 2500 },
  { id: "p4", name: "David", services: ["s1", "s2", "s3"], price: 3000 },
  { id: "p5", name: "Eve", services: ["s1"], price: 600 },
];

// Elements
const stepContents = document.querySelectorAll(".step-content");
const serviceList = document.getElementById("serviceList");
const sitterList = document.getElementById("sitterList");
const priceRange = document.getElementById("priceRange");
const priceRangeVal = document.getElementById("priceRangeVal");
const orderSummary = document.getElementById("orderSummary");
const submitOrderBtn = document.getElementById("submitOrderBtn");

// Init
function initOrder() {
  // Only run if we are on the order page (elements exist)
  if (!document.getElementById("orderMemberView")) return;

  renderServices();
  renderSitters();
  renderSummary();
  
  // Nights Selection
  document.querySelectorAll(".night-btn").forEach(btn => {
    // Restore selection
    if (parseInt(btn.dataset.value) === orderData.nights) {
        btn.classList.add("selected");
    }

    btn.addEventListener("click", () => {
      document.querySelectorAll(".night-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      orderData.nights = parseInt(btn.dataset.value);
      document.getElementById("customNights").value = "";
      saveState();
      renderSummary();
    });
  });

  const customNightsInput = document.getElementById("customNights");
  if (customNightsInput) {
      // Restore custom value if not in buttons
      const isButtonVal = [1,2,3,5,7].includes(orderData.nights);
      if (orderData.nights && !isButtonVal) {
          customNightsInput.value = orderData.nights;
      }

      customNightsInput.addEventListener("input", (e) => {
        document.querySelectorAll(".night-btn").forEach(b => b.classList.remove("selected"));
        const val = parseInt(e.target.value);
        if (val > 0) {
          orderData.nights = val;
        } else {
          orderData.nights = null;
        }
        saveState();
        renderSummary();
      });
  }

  // Price Range
  if (priceRange) {
      priceRange.addEventListener("input", (e) => {
        priceRangeVal.textContent = e.target.value;
        renderSitters();
      });
  }
  
  // Submit
  if (submitOrderBtn) {
      submitOrderBtn.addEventListener("click", () => {
        if (!orderData.nights || !orderData.serviceId || !orderData.sitterId) {
            alert("請完成所有選項（天數、服務、保母）");
            return;
        }
        alert("訂單已送出！感謝您的預訂。");
        // Reset
        orderData = { nights: null, serviceId: null, sitterId: null };
        saveState();
        
        document.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
        if (customNightsInput) customNightsInput.value = "";
        renderServices();
        renderSitters();
        renderSummary();
      });
  }
}

function renderServices() {
  if (!serviceList) return;
  serviceList.innerHTML = "";
  services.forEach(s => {
    const card = document.createElement("div");
    card.className = "service-card";
    if (orderData.serviceId === s.id) card.classList.add("selected");
    card.innerHTML = `
      <div class="service-title">${s.name}</div>
      <div class="service-desc">${s.desc}</div>
      <div class="service-price">$${s.price} / 晚</div>
    `;
    card.addEventListener("click", () => {
      orderData.serviceId = s.id;
      // orderData.sitterId = null; // Optional: Reset sitter when service changes? Let's keep it for now or user might want to keep sitter if valid.
      // Actually, let's reset sitter if the new service is not supported by current sitter? 
      // For simplicity in this flow, let's NOT reset automatically unless necessary, but the previous logic did.
      // Let's keep the logic: reset sitter to force re-selection or at least re-validation visually.
      orderData.sitterId = null; 
      
      saveState();
      renderServices(); // Re-render to update selection
      renderSitters(); // Re-render sitters to update qualifications
      renderSummary();
    });
    serviceList.appendChild(card);
  });
}

function renderSitters() {
  if (!sitterList) return;
  sitterList.innerHTML = "";
  const maxPrice = parseInt(priceRange.value);
  
  // Filter and Sort
  let filtered = [...sitters];
  
  // Sort: Recommended (Service + Budget) first, then Price, then Name
  filtered.sort((a, b) => {
    const aRec = a.services.includes(orderData.serviceId) && a.price <= maxPrice;
    const bRec = b.services.includes(orderData.serviceId) && b.price <= maxPrice;
    
    if (aRec && !bRec) return -1;
    if (!aRec && bRec) return 1;
    
    if (a.price !== b.price) {
      return a.price - b.price;
    }
    return a.name.localeCompare(b.name);
  });

  filtered.forEach(s => {
    const isRecommended = s.services.includes(orderData.serviceId) && s.price <= maxPrice;
    const isServiceMatch = s.services.includes(orderData.serviceId);
    
    const card = document.createElement("div");
    card.className = `sitter-card`;
    if (orderData.sitterId === s.id) card.classList.add("selected");
    
    // Generate tags
    const tags = s.services.map(sid => {
        const sName = services.find(ser => ser.id === sid)?.name;
        return `<span class="tag">${sName}</span>`;
    }).join("");

    card.innerHTML = `
      <div class="sitter-img">👤</div>
      <div class="sitter-name">${s.name}</div>
      <div class="sitter-price">$${s.price} / 晚</div>
      <div class="sitter-tags">${tags}</div>
      ${isRecommended ? '<div style="color:#B4F05A; font-weight:bold; margin-top:5px;">★ 推薦</div>' : ''}
    `;
    
    card.addEventListener("click", () => {
      if (!isServiceMatch) {
        alert("此保母不提供您選擇的服務，請選擇其他保母。");
        return;
      }
      orderData.sitterId = s.id;
      saveState();
      renderSitters();
      renderSummary();
    });
    sitterList.appendChild(card);
  });
}

function renderSummary() {
  if (!orderSummary) return;
  
  // Clear if data incomplete
  if (!orderData.nights || !orderData.serviceId || !orderData.sitterId) {
      orderSummary.innerHTML = `<div style="text-align:center; color:#999;">請完成上方所有選擇以查看訂單明細</div>`;
      return;
  }

  const service = services.find(s => s.id === orderData.serviceId);
  const sitter = sitters.find(s => s.id === orderData.sitterId);
  
  if (!service || !sitter) return;

  const total = (service.price + sitter.price) * orderData.nights;

  orderSummary.innerHTML = `
    <div class="summary-item"><span>住宿天數</span><span>${orderData.nights} 晚</span></div>
    <div class="summary-item"><span>選擇服務</span><span>${service.name} ($${service.price}/晚)</span></div>
    <div class="summary-item"><span>專屬保母</span><span>${sitter.name} ($${sitter.price}/晚)</span></div>
    <div class="summary-total"><span>總金額</span><span>$${total}</span></div>
  `;
}

// Floating Cart Click
if (floatingCart) {
    floatingCart.addEventListener("click", () => {
      window.location.href = "order.html";
    });
}

// Initialize
initOrder();
// End of Order Logic
