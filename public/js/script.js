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
const BM_PRICE =
  parseInt(document.getElementById("bookingOverlay").dataset.price) || 220;

function openBookingModal() {
  document.getElementById("bookingOverlay").classList.add("open");
  bmShowPanel(1);
  document.getElementById("bmSuccess").classList.remove("show");
  document.getElementById("bmSteps").style.display = "";
  document.getElementById("bmTitle").textContent = "Book your stay";
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("bmCheckin").min = today;
  document.getElementById("bmCheckout").min = today;
}

function closeBookingModal() {
  document.getElementById("bookingOverlay").classList.remove("open");
}

// close modal if clicking outside
document
  .getElementById("bookingOverlay")
  .addEventListener("click", function (e) {
    if (e.target === this) closeBookingModal();
  });

function bmShowPanel(num) {
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
  const ci = document.getElementById("bmCheckin").value;
  const co = document.getElementById("bmCheckout").value;
  if (!ci || !co) return 0;
  const diff = (new Date(co) - new Date(ci)) / 86400000;
  return diff > 0 ? diff : 0;
}

function bmUpdateDates() {
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
    } × ₹${BM_PRICE}`;
    document.getElementById("bmNightsPrice").textContent = `₹${(
      nights * BM_PRICE
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
  const ci = document.getElementById("bmCheckin").value;
  const co = document.getElementById("bmCheckout").value;

  const gp = [`${adults} adult${adults > 1 ? "s" : ""}`];
  if (children) gp.push(`${children} child${children > 1 ? "ren" : ""}`);
  if (infants) gp.push(`${infants} infant${infants > 1 ? "s" : ""}`);

  document.getElementById("bmSummaryBox").innerHTML = `
    <div class="bm-sum-item"><div class="bm-sum-key">Check-in</div><div class="bm-sum-val">${bmFmtDate(
      ci
    )}</div></div>
    <div class="bm-sum-item"><div class="bm-sum-key">Check-out</div><div class="bm-sum-val">${bmFmtDate(
      co
    )}</div></div>
    <div class="bm-sum-item"><div class="bm-sum-key">Guests</div><div class="bm-sum-val">${gp.join(
      ", "
    )}</div></div>
  `;
  document.getElementById("bmBreakdown").innerHTML = `
    <div class="bm-price-row"><span>₹${BM_PRICE} × ${nights} night${
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
  const btn = document.getElementById("bmConfirmBtn");
  const status = document.getElementById("bmConfirmStatus");
  btn.disabled = true;
  btn.textContent = "Submitting…";
  status.textContent = "";

  const nights = bmGetNights();
  const base = nights * BM_PRICE;
  const tax = Math.round(base * 0.12);

  const payload = {
    checkin: document.getElementById("bmCheckin").value,
    checkout: document.getElementById("bmCheckout").value,
    adults: parseInt(document.getElementById("bmAdultCount").textContent),
    children: parseInt(document.getElementById("bmChildCount").textContent),
    infants: parseInt(document.getElementById("bmInfantCount").textContent),
    nights,
    pricePerNight: BM_PRICE,
    subtotal: base,
    tax,
    total: base + tax,
    listingId:
      document.getElementById("bookingOverlay").dataset.listingId || "",
  };

  try {
    const res = await fetch("/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();
    showBookingSuccess(data.bookingRef);
  } catch (e) {
    status.textContent = "Booking failed. Please try again.";
    status.className = "bm-status err";
    btn.disabled = false;
    btn.textContent = "✔ Confirm Booking";
  }
}

function showBookingSuccess(ref) {
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
