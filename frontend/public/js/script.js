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

// ===== BOOKING MODAL =====
function getBookingOverlay() {
  return document.getElementById("bookingOverlay");
}
function getBmPrice() {
  const overlay = getBookingOverlay();
  return overlay ? parseInt(overlay.dataset.price) || 220 : 220;
}
function getCsrfToken() {
  const el = document.getElementById("chatbotCsrf");
  return el ? el.value : "";
}

function openBookingModal() {
  try {
    const overlay = getBookingOverlay();
    if (!overlay) {
      alert("Booking overlay not found");
      return;
    }
    overlay.classList.add("open");
    bmShowPanel(1);
    
    const bmSuccess = document.getElementById("bmSuccess");
    if (bmSuccess) bmSuccess.classList.remove("show");
    
    const bmSteps = document.getElementById("bmSteps");
    if (bmSteps) bmSteps.style.display = "";
    
    const bmTitle = document.getElementById("bmTitle");
    if (bmTitle) bmTitle.textContent = "Book your stay";
    
    const today = new Date().toISOString().split("T")[0];
    const bmCheckin = document.getElementById("bmCheckin");
    if (bmCheckin) bmCheckin.min = today;
    
    const bmCheckout = document.getElementById("bmCheckout");
    if (bmCheckout) bmCheckout.min = today;
  } catch(e) {
    alert("Error opening modal: " + e.message);
  }
}

function closeBookingModal() {
  const overlay = getBookingOverlay();
  if (!overlay) return;
  overlay.classList.remove("open");
}

// close modal if clicking outside
document.addEventListener("click", function (e) {
  const overlay = getBookingOverlay();
  if (overlay && overlay.classList.contains("open") && e.target === overlay) {
    closeBookingModal();
  }
});

function bmShowPanel(num) {
  if (!getBookingOverlay()) return;
  [1, 2, 3].forEach((i) => {
    document
      .getElementById("bmPanel" + i)
      .classList.toggle("active", i === num);
    const step = document.getElementById("bmS" + i);
    step.classList.remove("active", "done");
    if (i < num) step.classList.add("done");
    if (i === num) step.classList.add("active");
  });
}

function bmGetNights() {
  if (!getBookingOverlay()) return 0;
  const ci = document.getElementById("bmCheckin").value;
  const co = document.getElementById("bmCheckout").value;
  if (!ci || !co) return 0;
  const diff = (new Date(co) - new Date(ci)) / 86400000;
  return diff > 0 ? diff : 0;
}

function bmUpdateDates() {
  if (!getBookingOverlay()) return;
  const nights = bmGetNights();
  const ci = document.getElementById("bmCheckin").value;
  const co = document.getElementById("bmCheckout").value;
  const err = document.getElementById("bmDateErr");
  err.textContent = "";
  if (ci && co && nights <= 0) {
    err.textContent = "Check-out must be after check-in.";
    document.getElementById("bmNightsLabel").textContent = "Invalid dates";
    document.getElementById("bmNightsPrice").textContent = "";
    document.getElementById("bmNextTo2").disabled = true;
    return;
  }
  if (nights > 0) {
    document.getElementById("bmNightsLabel").textContent = `${nights} night${
      nights > 1 ? "s" : ""
    } × ₹${getBmPrice()}`;
    document.getElementById("bmNightsPrice").textContent = `₹${(
      nights * getBmPrice()
    ).toLocaleString("en-IN")}`;
    document.getElementById("bmNextTo2").disabled = false;
  } else {
    document.getElementById("bmNightsLabel").textContent =
      "Select dates to see nights";
    document.getElementById("bmNightsPrice").textContent = "";
    document.getElementById("bmNextTo2").disabled = true;
  }
}

const bmLimits = {
  adult: { min: 1, max: 6 },
  child: { min: 0, max: 6 },
  infant: { min: 0, max: 4 },
};
function bmCount(type, dir) {
  if (!getBookingOverlay()) return;
  const el = document.getElementById(
    "bm" + type.charAt(0).toUpperCase() + type.slice(1) + "Count"
  );
  let v = parseInt(el.textContent) + dir;
  const { min, max } = bmLimits[type];
  v = Math.min(max, Math.max(min, v));
  el.textContent = v;
  document.getElementById(
    "bm" + type.charAt(0).toUpperCase() + type.slice(1) + "Minus"
  ).disabled = v <= min;
  document.getElementById(
    "bm" + type.charAt(0).toUpperCase() + type.slice(1) + "Plus"
  ).disabled = v >= max;
}

function bmFmtDate(s) {
  if (!s) return "—";
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function bmBuildSummary() {
  if (!getBookingOverlay()) return;
  const nights = bmGetNights();
  const adults = parseInt(document.getElementById("bmAdultCount").textContent);
  const children = parseInt(
    document.getElementById("bmChildCount").textContent
  );
  const infants = parseInt(
    document.getElementById("bmInfantCount").textContent
  );
  const base = nights * BM_PRICE;
  const tax = Math.round(base * 0.12);
  const total = base + tax;

  const box = document.getElementById("bmSummaryBox");
  box.innerHTML = `
    <div class="bm-sum-row"><span>Check-in</span><strong>${bmFmtDate(
      ci
    )}</strong></div>
    <div class="bm-sum-row"><span>Check-out</span><strong>${bmFmtDate(
      co
    )}</strong></div>
    <div class="bm-sum-row"><span>Guests</span><strong>${adults + children} guest${
    adults + children > 1 ? "s" : ""
  }${infants > 0 ? `, ${infants} infant${infants > 1 ? "s" : ""}` : ""}</strong></div>
  `;

  const bk = document.getElementById("bmBreakdown");
  bk.innerHTML = `
    <div class="bm-price-row"><span>₹${getBmPrice()} × ${nights} night${
    nights > 1 ? "s" : ""
  }</span><span>₹${base.toLocaleString("en-IN")}</span></div>
    <div class="bm-price-row"><span>Taxes & fees (12%)</span><span>₹${tax.toLocaleString(
      "en-IN"
    )}</span></div>
    <hr class="bm-divider">
    <div class="bm-price-row total"><span>Total</span><span>₹${total.toLocaleString(
      "en-IN"
    )}</span></div>
  `;
}

async function bmSubmit() {
  if (!getBookingOverlay()) return;
  const btn = document.getElementById("bmConfirmBtn");
  const status = document.getElementById("bmConfirmStatus");
  btn.disabled = true;
  btn.textContent = "Submitting…";
  status.textContent = "";

  const nights = bmGetNights();
  const base = nights * getBmPrice();
  const tax = Math.round(base * 0.12);

  const payload = {
    checkin: document.getElementById("bmCheckin").value,
    checkout: document.getElementById("bmCheckout").value,
    adults: parseInt(document.getElementById("bmAdultCount").textContent),
    children: parseInt(document.getElementById("bmChildCount").textContent),
    infants: parseInt(document.getElementById("bmInfantCount").textContent),
    nights,
    pricePerNight: getBmPrice(),
    subtotal: base,
    tax,
    total: base + tax,
    listingId: getBookingOverlay().dataset.listingId || "",
  };

  try {
    const res = await fetch(`/bookings/listings/${payload.listingId}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": getCsrfToken() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || errData.message || "Server error");
    }
    const data = await res.json();
    window.location.href = "/bookings/" + data.bookingRef;
  } catch (e) {
    status.textContent = e.message || "Booking failed. Please try again.";
    status.className = "bm-status err";
    btn.disabled = false;
    btn.textContent = "✔ Confirm Booking";
    alert("Booking Error: " + (e.message || "Booking failed. Please try again."));
  }
}

function showBookingSuccess(ref) {
  if (!getBookingOverlay()) return;
  document.getElementById("bmSteps").style.display = "none";
  document.getElementById("bmTitle").textContent = "";
  [1, 2, 3].forEach((i) =>
    document.getElementById("bmPanel" + i).classList.remove("active")
  );
  document.getElementById("bmRef").textContent = ref
    ? `Booking ref: ${ref}`
    : "";
  document.getElementById("bmSuccess").classList.add("show");
}
// ===== END BOOKING MODAL =====

// ===== STAYPOINT CHATBOT =====
const chatbot = document.getElementById("staypointChatbot");
const chatbotToggle = document.getElementById("chatbotToggle");
const chatbotClose = document.getElementById("chatbotClose");
const chatbotPanel = document.getElementById("chatbotPanel");
const chatbotForm = document.getElementById("chatbotForm");
const chatbotInput = document.getElementById("chatbotInput");
const chatbotMessages = document.getElementById("chatbotMessages");
const chatbotSuggestions = document.getElementById("chatbotSuggestions");

function setChatbotOpen(open) {
  if (!chatbot || !chatbotPanel || !chatbotToggle) return;
  chatbot.classList.toggle("open", open);
  chatbotPanel.setAttribute("aria-hidden", String(!open));
  chatbotToggle.setAttribute("aria-expanded", String(open));
  if (open) chatbotInput?.focus();
}

function addChatMessage(text, type = "bot") {
  if (!chatbotMessages) return;
  const msg = document.createElement("div");
  msg.className = `chat-msg ${type}`;
  msg.textContent = text;
  chatbotMessages.appendChild(msg);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

async function askStayPoint(message) {
  addChatMessage(message, "user");
  const thinking = document.createElement("div");
  thinking.className = "chat-msg bot muted";
  thinking.textContent = "Checking StayPoint details...";
  chatbotMessages.appendChild(thinking);
  chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrfToken },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    thinking.remove();
    addChatMessage(data.reply || "I could not find an answer for that yet.");
  } catch (err) {
    thinking.remove();
    addChatMessage("I could not connect right now. Please try again in a moment.");
  }
}

if (chatbotToggle) {
  chatbotToggle.addEventListener("click", () => {
    setChatbotOpen(!chatbot?.classList.contains("open"));
  });
}

if (chatbotClose) {
  chatbotClose.addEventListener("click", () => setChatbotOpen(false));
}

if (chatbotForm) {
  chatbotForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatbotInput.value.trim();
    if (!message) return;
    chatbotInput.value = "";
    await askStayPoint(message);
  });
}

if (chatbotSuggestions) {
  chatbotSuggestions.addEventListener("click", (e) => {
    if (e.target.tagName !== "BUTTON") return;
    setChatbotOpen(true);
    askStayPoint(e.target.textContent);
  });
}

/* ========================================= */
/*             GLOBAL PAGE LOADER            */
/* ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("global-loader");
  if (!loader) return;

  // 1. Fade out the loader once the page has fully loaded
  window.addEventListener("load", () => {
    // Add a tiny delay so the beautiful animation is seen for a split second
    setTimeout(() => {
      loader.classList.add("hidden");
    }, 200);
  });

  // 2. Fade the loader back IN when clicking a link that leaves the page
  const links = document.querySelectorAll("a");
  links.forEach(link => {
    link.addEventListener("click", (e) => {
      // Don't trigger for new tabs, anchors on the same page, or Javascript links
      if (
        link.target === "_blank" ||
        link.getAttribute("href").startsWith("#") ||
        link.getAttribute("href").startsWith("javascript:") ||
        e.ctrlKey || e.metaKey // user is holding ctrl/cmd to open in new tab
      ) {
        return;
      }
      
      // Show loader
      loader.classList.remove("hidden");
    });
  });

  // 3. Fade the loader back IN when submitting a form (like Search, Login, Booking)
  const forms = document.querySelectorAll("form");
  forms.forEach(form => {
    form.addEventListener("submit", () => {
      loader.classList.remove("hidden");
    });
  });
});
