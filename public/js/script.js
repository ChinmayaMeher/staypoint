// Mobile menu toggle
const menuBtn = document.getElementById("menuBtn");
const mobileMenu = document.getElementById("mobileMenu");
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener("click", () => {
    mobileMenu.classList.toggle("open");
  });
}

// Auto-dismiss flash messages after 4 seconds
document.querySelectorAll(".flash").forEach((el) => {
  setTimeout(() => {
    el.style.transition = "opacity 0.4s";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
  }, 4000);
});

// Image URL preview
const imgInput = document.getElementById("image");
if (imgInput) {
  imgInput.addEventListener("input", (e) => {
    const url = e.target.value;
    let preview = document.getElementById("img-preview");
    if (!preview && url) {
      preview = document.createElement("img");
      preview.id = "img-preview";
      preview.style.cssText =
        "width:100%;max-height:160px;object-fit:cover;border-radius:8px;margin-top:8px;";
      imgInput.parentElement.appendChild(preview);
    }
    if (preview) preview.src = url;
  });
}
