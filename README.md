# StayPoint 🏠

A full-stack room listing platform where hosts can list their rooms and guests can browse, book and review stays.

## Features
- **Browse Rooms** — Search & filter by category (Apartment, House, Villa, Cabin, Studio, Hostel)
- **Authentication** — Signup / Login / Logout with Passport.js
- **Host Listings** — Create, Edit, Delete your own rooms
- **Reviews** — Leave star ratings and comments on stays
- **Flash Messages** — User-friendly success/error feedback
- **Responsive Design** — Works on mobile and desktop

## Tech Stack
- Node.js + Express
- MongoDB + Mongoose
- EJS (templating)
- Passport.js (authentication)
- Express Session + connect-mongo
- connect-flash (messages)

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Edit `.env`:
```
PORT=8080
MONGO_URL=mongodb://localhost:27017/staypoint
SECRET=your_secret_key_here
```

### 3. Seed the database (optional)
```bash
cd init
node index.js
```

### 4. Start the server
```bash
node app.js
# or for auto-reload:
npx nodemon app.js
```

### 5. Open in browser
Visit: http://localhost:8080

## Folder Structure
```
staypoint/
├── app.js              # Main server
├── .env                # Environment config
├── models/
│   ├── listing.js      # Listing schema
│   ├── review.js       # Review schema
│   └── user.js         # User schema (with passport)
├── routes/
│   ├── listingRoutes.js
│   ├── reviewRoutes.js
│   └── userRoutes.js
├── views/
│   ├── layouts/        # Boilerplate layout
│   ├── includes/       # Navbar, footer
│   ├── listings/       # index, show, new, edit
│   └── users/          # signup, login
├── public/
│   ├── css/style.css
│   └── js/script.js
└── init/               # DB seed data
```
