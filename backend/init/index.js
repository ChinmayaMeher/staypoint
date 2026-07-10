require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Listing = require("../models/listing.js");
const { sampleListings } = require("./data.js");

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/staypoint";

async function main() {
  await mongoose.connect(MONGO_URL);
  console.log("Connected to DB");

  // Clear existing listings
  await Listing.deleteMany({});
  console.log("Cleared existing listings");

  // Insert sample listings
  await Listing.insertMany(sampleListings);
  console.log(`✅ Inserted ${sampleListings.length} sample listings`);

  await mongoose.connection.close();
  console.log("DB connection closed");
}

main().catch(console.error);
