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
