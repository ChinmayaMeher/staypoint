# StayPoint 🏠

A premium full-stack room listing and booking platform built with Node.js, Express, MongoDB, and EJS. StayPoint allows hosts to list their properties and guests to browse, book, and review stays with a modern, secure, and feature-rich experience.

## ✨ Features

### Core Features
- **Browse Listings** — Search & filter by category, price, location, and guest count
- **Advanced Search** — Full-text search across titles, descriptions, and locations
- **Booking System** — Complete booking flow with date selection, pricing calculation, and status tracking
- **User Authentication** — Signup/Login/Logout with Passport.js local strategy
- **User Profiles** — Rich user profiles with avatars, bios, and stats
- **Host Dashboard** — Dedicated dashboard for hosts to manage listings and bookings
- **Reviews & Ratings** — Detailed reviews with star ratings and host responses
- **Wishlist** — Save favorite listings for later
- **Image Uploads** — Multiple image uploads per listing with primary image selection
- **Flash Messages** — User-friendly success/error feedback

### Security Features
- **CSRF Protection** — Cross-site request forgery protection
- **Rate Limiting** — API rate limiting to prevent abuse
- **Input Validation** — Server-side validation with express-validator
- **XSS Protection** — Cross-site scripting prevention
- **NoSQL Injection Protection** — MongoDB sanitization
- **Helmet.js** — Security headers for HTTP responses
- **Secure Sessions** — HTTP-only cookies with secure flags

### User Experience
- **Responsive Design** — Works seamlessly on mobile and desktop
- **Pagination** — Efficient listing pagination
- **Sorting Options** — Sort by price, rating, or newest
- **Real-time Availability** — Check booking availability for listings
- **Graceful Error Handling** — User-friendly error pages

## 🛠 Tech Stack

- **Backend:** Node.js + Express.js
- **Database:** MongoDB + Mongoose
- **Templating:** EJS (Embedded JavaScript Templates)
- **Authentication:** Passport.js (Local Strategy)
- **Session Management:** express-session + connect-mongo
- **File Upload:** Multer
- **Validation:** express-validator
- **Security:** Helmet, express-rate-limit, express-mongo-sanitize, xss-clean
- **Styling:** Custom CSS with modern design system

## 📁 Project Structure

```
staypoint/
├── app.js                    # Main application entry point
├── .env                      # Environment variables
├── .env.example              # Example environment file
├── package.json              # Dependencies and scripts
├── models/                   # Mongoose schemas
│   ├── booking.js           # Booking schema
│   ├── listing.js           # Listing schema
│   ├── review.js            # Review schema
│   ├── user.js              # User schema
│   └── wishlist.js          # Wishlist schema
├── routes/                   # Route handlers
│   ├── bookingRoutes.js     # Booking routes
│   ├── listingRoutes.js     # Listing routes
│   ├── profileRoutes.js     # User profile routes
│   ├── reviewRoutes.js      # Review routes
│   ├── userRoutes.js        # Authentication routes
│   └── wishlistRoutes.js    # Wishlist routes
├── middleware/               # Custom middleware
│   ├── auth.js              # Authentication middleware
│   ├── security.js          # Security middleware
│   ├── upload.js            # File upload middleware
│   └── validation.js        # Input validation middleware
├── views/                    # EJS templates
│   ├── layouts/             # Layout templates
│   ├── includes/            # Reusable components
│   ├── listings/            # Listing views
│   ├── users/               # User auth views
│   ├── bookings/            # Booking views
│   ├── wishlist/            # Wishlist views
│   └── profile/             # Profile views
├── public/                   # Static assets
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client-side JavaScript
│   └── uploads/             # User-uploaded files
│       ├── listings/        # Listing images
│       └── avatars/         # User avatars
└── init/                     # Database seeding
    ├── index.js             # Seed script
    └── data.js              # Sample data
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (v6 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/ChinmayaMeher/Staypoint.git
   cd staypoint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   
   Copy the example environment file and configure:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   PORT=8080
   NODE_ENV=development
   MONGO_URL=mongodb://localhost:27017/staypoint
   SECRET=your_secret_key_here
   ```

4. **Seed the database (optional)**
   ```bash
   npm run seed
   ```

5. **Start the server**
   ```bash
   # Production
   npm start
   
   # Development with auto-reload
   npm run dev
   ```

6. **Open in browser**
   ```
   http://localhost:8080
   ```

## 📖 API Endpoints

### Authentication
- `POST /register` - User registration
- `POST /login` - User login
- `GET /logout` - User logout

### Listings
- `GET /listings` - Get all listings (with filters)
- `GET /listings/:id` - Get single listing
- `POST /listings` - Create listing (host only)
- `PUT /listings/:id` - Update listing (owner only)
- `DELETE /listings/:id` - Delete listing (owner only)
- `GET /listings/api/:id/availability` - Get booking availability

### Bookings
- `GET /bookings` - Get user's bookings (as guest)
- `GET /bookings/host` - Get bookings for user's listings (as host)
- `POST /bookings/listings/:id/book` - Create booking
- `GET /bookings/:id` - Get booking details
- `POST /bookings/:id/cancel` - Cancel booking
- `PATCH /bookings/:id/status` - Update booking status (host only)

### Wishlist
- `GET /wishlist` - Get user's wishlist
- `POST /wishlist/toggle` - Toggle wishlist item
- `POST /wishlist/add` - Add to wishlist
- `POST /wishlist/remove` - Remove from wishlist
- `DELETE /wishlist/:id` - Delete wishlist item

### Profile
- `GET /profile` - View user profile
- `GET /profile/edit` - Edit profile page
- `PUT /profile` - Update profile
- `POST /profile/avatar` - Upload avatar
- `GET /profile/host/dashboard` - Host dashboard
- `GET /profile/settings` - Account settings
- `PUT /profile/settings` - Update settings
- `DELETE /profile` - Delete account

### Reviews
- `POST /listings/:id/reviews` - Create review
- `PUT /listings/:id/reviews/:reviewId` - Update review
- `DELETE /listings/:id/reviews/:reviewId` - Delete review

## 🔒 Security

StayPoint implements multiple security layers:

1. **Helmet.js** - Sets security HTTP headers
2. **CSRF Protection** - Prevents cross-site request forgery
3. **Rate Limiting** - Prevents brute force attacks
4. **Input Validation** - Validates and sanitizes all user input
5. **XSS Protection** - Prevents cross-site scripting
6. **MongoDB Sanitization** - Prevents NoSQL injection
7. **Secure Sessions** - HTTP-only cookies with secure flags
8. **Password Hashing** - Bcrypt hashing with salt

## 🎨 Design System

StayPoint uses a custom design system with:

- **Colors:** Warm, earthy tones with primary orange (#c8622a)
- **Typography:** Playfair Display (headings) + DM Sans (body)
- **Components:** Buttons, cards, forms, modals, flash messages
- **Responsive:** Mobile-first approach with breakpoints
- **Accessibility:** ARIA labels and semantic HTML

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the ISC License.

## 🙏 Acknowledgments

- Inspired by Airbnb's booking experience
- Built with modern web development best practices
- Designed for scalability and maintainability

## 📧 Contact

For support or inquiries, please open an issue on GitHub or contact the maintainers.

---

**StayPoint** - Find your perfect stay 🏠