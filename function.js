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

function clearLoginError() {
  usernameInput.classList.remove("input-error");
  passwordInput.classList.remove("input-error");
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
      
      // Switch to logged in view
      loginForm.style.display = "none";
      userInfo.style.display = "flex";
      displayUsername.textContent = username;
      
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
    // Switch back to login view
    loginForm.style.display = "flex";
    userInfo.style.display = "none";
    alert("已登出");
  });
}
