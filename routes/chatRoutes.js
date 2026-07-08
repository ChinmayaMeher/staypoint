const express = require("express");
const router = express.Router();
const Listing = require("../models/listing");

const knowledgeBase = [
  {
    keys: ["book", "reserve", "reservation", "check in", "check-in", "date"],
    answer:
      "To book a stay, open any listing, choose your check-in and check-out dates, select guests, then confirm the request. Instant-book listings can be confirmed right away; other stays may stay pending until the host approves.",
  },
  {
    keys: ["price", "cost", "fee", "tax", "payment", "total"],
    answer:
      "Each listing shows a nightly price. During booking StayPoint calculates the stay total from nights, guests, taxes, and fees before you confirm, so customers can review the amount first.",
  },
  {
    keys: ["cancel", "refund", "policy"],
    answer:
      "Cancellation rules depend on the listing policy: flexible, moderate, or strict. You can cancel eligible pending or confirmed bookings from your bookings page.",
  },
  {
    keys: ["host", "list", "room", "property", "owner"],
    answer:
      "Hosts can create listings with photos, location, price, room count, guest capacity, amenities, house rules, minimum nights, and cancellation policy. Use the List Your Room button after signing in as a host.",
  },
  {
    keys: ["wishlist", "save", "favorite", "favourite"],
    answer:
      "Signed-in customers can save stays to their wishlist and come back later to compare options before booking.",
  },
  {
    keys: ["account", "login", "signup", "sign up", "profile", "password"],
    answer:
      "Customers can create an account, log in securely, manage their profile, and view bookings. Hosts also get access to listing and booking management tools.",
  },
  {
    keys: ["review", "rating", "feedback"],
    answer:
      "StayPoint listings support customer reviews and ratings, helping future guests compare stays with more confidence.",
  },
  {
    keys: ["contact", "support", "help", "problem", "issue"],
    answer:
      "For urgent help, sign in and check your booking details first. Hosts and guests should use the booking reference when contacting support so the stay can be found quickly.",
  },
  {
    keys: ["safe", "security", "privacy", "secure"],
    answer:
      "StayPoint uses authenticated accounts, protected sessions, CSRF checks, input validation, and security headers to keep customer and host actions safer.",
  },
];

function normalize(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function findAnswer(message) {
  const normalized = normalize(message);
  const match = knowledgeBase.find((item) =>
    item.keys.some((key) => normalized.includes(key))
  );

  if (match) return match.answer;

  return "I can help with booking stays, prices, cancellation policies, wishlists, account setup, hosting, reviews, and safety on StayPoint. Try asking about one of those topics.";
}

router.post("/", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        reply: "Please type a question about StayPoint and I will help.",
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        reply: "Please keep your question under 500 characters.",
      });
    }

    const [activeListings, categories] = await Promise.all([
      Listing.countDocuments({ isActive: true }),
      Listing.distinct("category", { isActive: true }),
    ]);

    const reply = `${findAnswer(message)}\n\nRight now StayPoint has ${activeListings} active stay${activeListings === 1 ? "" : "s"}${categories.length ? ` across ${categories.slice(0, 5).join(", ")}${categories.length > 5 ? " and more" : ""}` : ""}.`;

    res.json({
      reply,
      suggestions: ["How do I book?", "What fees are included?", "How can I become a host?"],
    });
  } catch (err) {
    console.error("Chat assistant error:", err);
    res.status(500).json({
      reply: "I could not load StayPoint details just now. Please try again in a moment.",
    });
  }
});

module.exports = router;
