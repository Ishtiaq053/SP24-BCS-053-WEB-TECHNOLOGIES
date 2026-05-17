# Assignment #03 — WorkerFinder: Complete Code & Flow Explanation
**SP24-BCS-053 | Web Technologies**

---

## 1. What This App Does

WorkerFinder is a full-stack web app built with **Node.js + Express** on the backend, **MongoDB (Atlas)** as the database, **EJS** as the HTML templating engine, and **Vanilla CSS + jQuery** on the frontend.

Users can:
- Visit a landing/marketing page (`/`)
- Browse a live worker catalog (`/workers`) fetched from MongoDB
- Search, filter by category, filter by price range, sort, and paginate results — all without any page JS manipulation; the server re-queries MongoDB on every request.

---

## 2. Project File Structure

```
Assignment #03/
│
├── server.js            ← Main Express server (backend entry point)
├── seed.js              ← One-time script to populate MongoDB with 25 sample workers
├── package.json         ← Project metadata & npm dependencies
├── .env                 ← Secret config (MONGO_URI, PORT) — never committed to git
│
├── models/
│   └── Worker.js        ← Mongoose schema/model for a worker document
│
├── views/
│   ├── homepage.ejs     ← Landing page template (rendered server-side)
│   └── workers.ejs      ← Worker catalog template (rendered server-side with DB data)
│
└── public/              ← Static files served directly by Express
    ├── css/
    │   └── style.css    ← All styles for both pages
    └── js/
        ├── navbar.js    ← Mobile hamburger menu + FAQ accordion + smooth scroll
        └── carousel.js  ← jQuery infinite-loop services carousel
```

---

## 3. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Node.js | JavaScript on the server |
| Framework | Express.js v4 | HTTP routing, middleware, static files |
| Database | MongoDB Atlas | Cloud NoSQL database |
| ODM | Mongoose v8 | Schema definition + DB queries |
| Templating | EJS | Server-side HTML generation |
| Config | dotenv | Read `.env` variables |
| Frontend CSS | Vanilla CSS | All styling (dark theme, glassmorphism) |
| Frontend JS | jQuery 3.7.1 | Carousel only |
| Frontend JS | Vanilla JS | Navbar, FAQ, smooth scroll |

---

## 4. Backend Deep Dive — `server.js`

### 4.1 Setup & Middleware (Lines 1–11)

```js
require('dotenv').config();         // Loads .env → process.env.MONGO_URI etc.
const express  = require('express');
const mongoose = require('mongoose');
const Worker   = require('./models/Worker');  // Import the Mongoose model

const app = express();

app.set('view engine', 'ejs');           // Tell Express: render .ejs files from /views
app.use(express.static('public'));       // Serve /public folder as static (CSS/JS/images)
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded form bodies
```

- `dotenv` reads `.env` and makes `MONGO_URI` available as `process.env.MONGO_URI`.
- `express.static('public')` means any file inside `/public` is accessible at its path. So `/public/css/style.css` is served at `http://localhost:3000/css/style.css`.
- EJS is set as the view engine — when you call `res.render('homepage')`, Express automatically looks for `views/homepage.ejs`.

### 4.2 MongoDB Connection (Lines 14–26)

```js
let isDbConnected = false;

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        isDbConnected = true;
        console.log('✅  MongoDB connected');
    })
    .catch((err) => {
        console.error('❌  MongoDB error:', err.message);
        // Server keeps running even if DB is down
    });
```

**Key design decision:** The server does NOT crash if MongoDB is unavailable. Instead it sets `isDbConnected = false`. The `/workers` route checks this flag and shows a friendly error page instead of crashing.

The `MONGO_URI` looks like:
```
mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/workerfinder
```

### 4.3 Shared Constants (Lines 29–40)

```js
const CATEGORIES = ['Plumbing','Electrical','Carpentry','Painting',
                    'Cleaning','Driving','Gardening','AC & Repair'];
const LIMIT = 8; // workers shown per page
```

These are defined once and reused across routes, keeping things DRY (Don't Repeat Yourself).

### 4.4 Route: `GET /` — Landing Page (Lines 44–47)

```js
app.get('/', (req, res) => {
    res.render('homepage');
});
```

The simplest route possible. No database query needed. Express renders `views/homepage.ejs` and sends the resulting HTML to the browser.

### 4.5 Route: `GET /workers` — Worker Catalog (Lines 50–129)

This is the core route. Here is the step-by-step flow:

**Step 1 — Read query parameters from the URL**
```js
const search   = req.query.search   || '';
const category = req.query.category || '';
const minPrice = req.query.minPrice || '';
const maxPrice = req.query.maxPrice || '';
const sort     = req.query.sort     || '';
const page     = Math.max(1, parseInt(req.query.page) || 1);
```
When the user submits the filter form, the browser sends a URL like:
`/workers?category=Plumbing&sort=price_asc&page=2`
Express makes these available on `req.query`.

**Step 2 — Build a MongoDB filter object dynamically**
```js
const filter = {};
if (search.trim())  filter.name     = { $regex: search.trim(), $options: 'i' };
if (category.trim()) filter.category = category.trim();
if (minPrice !== '' || maxPrice !== '') {
    filter.price = {};
    if (minPrice !== '') filter.price.$gte = Number(minPrice);
    if (maxPrice !== '') filter.price.$lte = Number(maxPrice);
}
```
- `$regex` with `$options: 'i'` = case-insensitive partial text search on the `name` field.
- `$gte` = greater than or equal (minimum price).
- `$lte` = less than or equal (maximum price).
- Only the fields the user filled in are added to the filter. Empty filter `{}` = no filtering = return all workers.

**Step 3 — Build a sort object**
```js
let sortObj = {};
switch (sort) {
    case 'price_asc':       sortObj = { price: 1 };       break; // ascending
    case 'price_desc':      sortObj = { price: -1 };      break; // descending
    case 'rating_desc':     sortObj = { rating: -1 };     break;
    case 'experience_desc': sortObj = { experience: -1 }; break;
    default:                sortObj = { createdAt: -1 };  break; // newest first
}
```
`1` = ascending, `-1` = descending in MongoDB.

**Step 4 — Count documents (for pagination)**
```js
const totalWorkers = await Worker.countDocuments(filter);
const totalPages   = Math.ceil(totalWorkers / LIMIT) || 1;
const currentPage  = Math.min(page, totalPages);
const skip         = (currentPage - 1) * LIMIT;
```
- `countDocuments(filter)` runs the same filter but only counts matches (fast, no data transfer).
- `skip` = how many documents to skip. Page 1 → skip 0. Page 2 → skip 8. Page 3 → skip 16.

**Step 5 — Fetch the actual workers**
```js
const workers = await Worker.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(LIMIT);
```
This is a single chained Mongoose query:
- `.find(filter)` → apply the search/category/price filter
- `.sort(sortObj)` → order the results
- `.skip(skip)` → skip to the right page
- `.limit(LIMIT)` → take only 8 (or fewer at end)

**Step 6 — Render the view**
```js
res.render('workers', {
    workers, currentPage, totalPages, totalWorkers,
    search, category, minPrice, maxPrice, sort,
    categories: CATEGORIES
});
```
All variables are passed to `workers.ejs`. EJS uses them to build the HTML dynamically.

### 4.6 Starting the Server (Lines 132–135)

```js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
});
```
The server listens on port 3000 by default (or from `.env` if deployed).

---

## 5. Database Layer — `models/Worker.js`

```js
const workerSchema = new mongoose.Schema({
    name:        { type: String,  required: true, trim: true },
    price:       { type: Number,  required: true, min: 0 },
    category:    { type: String,  required: true,
                   enum: ['Plumbing','Electrical','Carpentry','Painting',
                          'Cleaning','Driving','Gardening','AC & Repair'] },
    rating:      { type: Number,  min: 1, max: 5, default: 3 },
    stock:       { type: Number,  default: 1 },   // 1=available, 0=busy
    experience:  { type: Number,  default: 0 },   // years
    location:    { type: String,  default: 'Lahore' },
    description: { type: String,  default: '' },
    jobsDone:    { type: Number,  default: 0 },
    verified:    { type: Boolean, default: false }
}, { timestamps: true });   // adds createdAt and updatedAt automatically

module.exports = mongoose.model('Worker', workerSchema);
```

**Key points:**
- `enum` on `category` means MongoDB will reject any document with a category not in the list.
- `{ timestamps: true }` auto-adds `createdAt` and `updatedAt` fields — this is how the default sort "Newest First" (`createdAt: -1`) works.
- `module.exports` exports the model so `server.js` can `require('./models/Worker')` and call `.find()`, `.countDocuments()`, etc.
- MongoDB stores these as documents in a collection named **workers** (Mongoose pluralises the model name automatically).

---

## 6. Database Seeding — `seed.js`

This is a one-time script run with `npm run seed`. It:
1. Connects to MongoDB
2. Deletes all existing worker documents (`Worker.deleteMany({})`)
3. Inserts 25 hand-crafted worker objects (`Worker.insertMany(workers)`)
4. Closes the connection

The 25 workers cover all 8 categories (3 workers each, except AC & Repair which has 4), with realistic Pakistani names, cities, prices (PKR 350–1100/hr), ratings (3.8–4.9), and job counts.

```js
// Example seed entry:
{ name: 'Ahmed Raza', category: 'Plumbing', price: 800, rating: 4.8,
  stock: 1, experience: 8, location: 'Lahore',
  description: 'Expert in pipe fitting, leak repairs...', jobsDone: 134, verified: true }
```

---

## 7. Frontend — Views (EJS Templates)

### 7.1 What is EJS?

EJS = **Embedded JavaScript**. It is an HTML file where you can inject JavaScript between `<% %>` tags:
- `<%= value %>` — output a value as text (HTML-escaped)
- `<% code %>` — run JavaScript (loops, conditions) without output
- `<%- html %>` — output raw HTML (unescaped)

### 7.2 `views/homepage.ejs` — Landing Page

This page is entirely static (no DB data). It has these sections:

| Section | Description |
|---|---|
| **Navbar** | Logo + nav links. "Find Workers" links to `/workers`. |
| **Hero** | Full-screen image with search bar (cosmetic only, not wired to backend). |
| **Services Carousel** | 6 service cards with images from Unsplash. Powered by `carousel.js`. |
| **How It Works** | 3-step visual guide (Post Job → Get Applications → Hire). |
| **Why Choose Us** | 4 feature cards (Verified Workers, Communication, Secure, Fast). |
| **Contact** | Info panel + contact form (frontend only, no email sending). |
| **FAQ** | 5 accordion questions powered by `navbar.js`. |
| **Footer** | Brand, resource links, legal links, social links. |

The page loads two JS files at the bottom:
```html
<script src="/js/navbar.js"></script>
<script src="/js/carousel.js"></script>
```

And jQuery from CDN in the `<head>` (needed by carousel.js):
```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
```

### 7.3 `views/workers.ejs` — Worker Catalog

This is the dynamic page. The server passes these variables into it:
`workers`, `currentPage`, `totalPages`, `totalWorkers`, `search`, `category`, `minPrice`, `maxPrice`, `sort`, `categories`

**Hero banner** — Shows live count from DB:
```html
<p>Browse <%= totalWorkers %> verified professionals across <%= categories.length %> skilled trades</p>
```

**Filter form** — A `<form method="GET" action="/workers">`. When submitted, the browser appends all inputs as query string parameters to the URL. The page reloads and the server re-runs the query with new filters.
```html
<input name="search" value="<%= search %>">       <!-- preserves current value -->
<select name="category">
    <% categories.forEach(cat => { %>
        <option value="<%= cat %>" <%= category === cat ? 'selected' : '' %>>
            <%= cat %>
        </option>
    <% }); %>
</select>
```
The `selected` attribute is conditionally added so the dropdown remembers the user's choice after page reload.

**Results info bar** — Shows "Showing 8 of 25 workers" and active filter tags.

**Workers grid** — Loops over the `workers` array:
```html
<% workers.forEach(function(worker) { %>
    <%
        const isAvailable = worker.stock === 1;
        const fullStars   = Math.floor(worker.rating);
        const halfStar    = (worker.rating - fullStars) >= 0.5;
    %>
    <div class="worker-card">
        <!-- Avatar from ui-avatars.com API (generates initials avatars) -->
        <img src="https://ui-avatars.com/api/?name=<%= encodeURIComponent(worker.name) %>...">
        
        <!-- Verified badge only shown if worker.verified === true -->
        <% if (worker.verified) { %>
            <span class="verified-badge">✓ Verified</span>
        <% } %>
        
        <!-- Star rating rendered with a loop -->
        <% for (let i = 1; i <= 5; i++) { %>
            <% if (i <= fullStars) { %>
                <span class="star star--full">★</span>
            <% } else if (i === fullStars + 1 && halfStar) { %>
                <span class="star star--half">★</span>
            <% } else { %>
                <span class="star star--empty">★</span>
            <% } %>
        <% } %>
        
        <span class="price-amount">PKR <%= worker.price.toLocaleString() %>/hr</span>
        <button <%= isAvailable ? '' : 'disabled' %>>
            <%= isAvailable ? 'View Profile' : 'Unavailable' %>
        </button>
    </div>
<% }); %>
```

**Empty state** — If `workers.length === 0`, shows a "No Workers Found" message with a reset link instead of the grid.

**Pagination** — Only shown if `totalPages > 1`. A helper function builds URLs that preserve all current filters:
```js
function buildPageUrl(p) {
    const params = new URLSearchParams();
    if (search)   params.set('search',   search);
    if (category) params.set('category', category);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (sort)     params.set('sort',     sort);
    params.set('page', p);
    return '/workers?' + params.toString();
}
```
So clicking "Next" goes to `/workers?category=Plumbing&sort=rating_desc&page=2`, keeping the filters intact. A sliding window of 5 page buttons is shown with `…` ellipsis for long page ranges.

---

## 8. Frontend JavaScript — `public/js/`

### 8.1 `navbar.js`

This file runs on **both pages**. It handles:

**Mobile hamburger menu:**
```js
hamburger.addEventListener('click', function() {
    hamburger.classList.toggle('active');  // animates 3 lines → X
    navMenu.classList.toggle('active');    // shows/hides the menu
});
```
Clicking outside the menu closes it. Clicking any nav link also closes it.

**Smooth scroll** — For `href="#section"` anchor links:
```js
if (href.startsWith('#')) {
    e.preventDefault();
    document.getElementById(targetId).scrollIntoView({ behavior: 'smooth' });
}
```

**Navbar scroll shadow** — Adds a box-shadow when the user scrolls down > 50px:
```js
window.addEventListener('scroll', function() {
    if (window.scrollY > 50) navbar.style.boxShadow = '...';
});
```

**FAQ Accordion:**
```js
faqItems.forEach(function(item) {
    item.querySelector('.faq-question').addEventListener('click', function() {
        const isActive = item.classList.contains('active');
        faqItems.forEach(i => i.classList.remove('active')); // close all
        if (!isActive) item.classList.add('active');          // open clicked one
    });
});
```
CSS shows/hides `.faq-answer` based on `.faq-item.active`.

### 8.2 `carousel.js` (jQuery-powered)

This is the most complex JS file. It powers the Services section carousel on the homepage.

**Configuration:**
```js
const AUTOPLAY_INTERVAL = 5000;   // auto-advance every 5 seconds
const SLIDE_DURATION    = 420;    // CSS transition in ms
const BREAKPOINTS = {
    desktop: { minWidth: 993, visible: 3 },  // show 3 cards
    tablet:  { minWidth: 601, visible: 2 },  // show 2 cards
    mobile:  { minWidth: 0,   visible: 1 },  // show 1 card
};
```

**Infinite loop trick — Cloning:**
To avoid the carousel "snapping back" at the beginning/end, it clones slides:
- Appends clones of the **first N** slides to the end (for when user goes forward past last)
- Prepends clones of the **last N** slides to the front (for when user goes backward past first)

When the user slides into a cloned zone, after the animation finishes, it silently jumps (`transition: none`) to the real equivalent slide. The user never sees this.

**`goTo(index)` function — the core:**
```js
function goTo(index) {
    if (isAnimating) return;         // prevent double-click glitches
    isAnimating = true;

    const offset = (index + vis) * cardW;  // +vis offsets for prepended clones
    $track.css({
        transition: `transform ${SLIDE_DURATION}ms cubic-bezier(...)`,
        transform:  `translateX(-${offset}px)`
    });
    currentIndex = index;
    updateCounter();

    setTimeout(function() {
        // if we slid into clone zone, jump back to real slide silently
        if (currentIndex >= totalSlides) jumpToIndex(0, true);
        else if (currentIndex < 0) jumpToIndex(totalSlides - 1, true);
        $track.css('transition', '');
        isAnimating = false;
    }, SLIDE_DURATION + 10);
}
```

**Responsive resizing:**
```js
$(window).on('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
        buildClones();        // rebuild clones for new visible count
        setCardWidths();      // recalculate card pixel widths
        jumpToIndex(savedIndex, true);
    }, 150); // debounce — only fires 150ms after last resize event
});
```

**Touch/swipe support:**
```js
track.addEventListener('touchstart', e => touchStartX = e.changedTouches[0].screenX);
track.addEventListener('touchend',   e => {
    const diff = touchStartX - e.changedTouches[0].screenX;
    if (Math.abs(diff) > 40) {      // minimum 40px swipe
        if (diff > 0) slideNext();
        else          slidePrev();
    }
});
```

---

## 9. How Frontend and Backend Connect

This is the most important concept to understand:

```
BROWSER                              SERVER (Express)
  │                                       │
  │  1. User types: localhost:3000/       │
  │ ─────────────────────────────────────►│
  │                                       │  app.get('/')
  │                                       │  res.render('homepage')
  │                                       │  EJS → HTML string
  │◄─────────────────────────────────────-│
  │  2. Browser receives full HTML page   │
  │     (navbar, hero, carousel, FAQ...)  │
  │                                       │
  │  3. Browser requests static assets:  │
  │     GET /css/style.css               │
  │     GET /js/navbar.js                │
  │     GET /js/carousel.js             │
  │ ─────────────────────────────────────►│
  │                                       │  express.static('public')
  │◄─────────────────────────────────────-│  serves files directly
  │                                       │
  │  4. User clicks "Find Workers"        │
  │     GET /workers                     │
  │ ─────────────────────────────────────►│
  │                                       │  app.get('/workers')
  │                                       │  Worker.find({})  ──► MongoDB Atlas
  │                                       │         ◄──────────── [{...}, {...}]
  │                                       │  res.render('workers', { workers, ... })
  │◄─────────────────────────────────────-│
  │  5. Full HTML with worker cards       │
  │                                       │
  │  6. User submits filter form:         │
  │     GET /workers?category=Plumbing   │
  │     &sort=rating_desc&page=1         │
  │ ─────────────────────────────────────►│
  │                                       │  Reads req.query.category = "Plumbing"
  │                                       │  filter = { category: "Plumbing" }
  │                                       │  Worker.find(filter).sort(...).skip(0).limit(8)
  │                                       │  → 3 workers returned
  │◄─────────────────────────────────────-│
  │  7. New HTML page with filtered cards │
```

**The key point:** Every filter/sort/page change is a **full page reload**. There is no AJAX, no fetch API. The filter form uses `method="GET"`, so all values go into the URL. The server reads them, queries MongoDB, and renders a fresh HTML page. This is called the **Server-Side Rendering (SSR)** pattern.

---

## 10. The `.env` File

```
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/workerfinder
PORT=3000
```

This file is listed in `.gitignore` so it is never pushed to GitHub. It stores secrets. `dotenv` reads it at startup and makes values available as `process.env.MONGO_URI`.

---

## 11. `package.json` — Scripts

```json
{
  "scripts": {
    "start": "node server.js",   // production start
    "dev":   "node server.js",   // development start
    "seed":  "node seed.js"      // populate the database
  },
  "dependencies": {
    "dotenv":   "^16.4.5",   // read .env file
    "ejs":      "^3.1.10",   // HTML templating
    "express":  "^4.18.2",   // web framework
    "mongoose": "^8.4.0"     // MongoDB object modelling
  }
}
```

---

## 12. How to Run the App

```bash
# 1. Install dependencies
npm install

# 2. Create .env file with your MongoDB Atlas URI
# (add your IP to Atlas Network Access first)

# 3. Seed the database (run only once)
npm run seed

# 4. Start the server
npm run dev

# 5. Open browser
# http://localhost:3000        → Landing page
# http://localhost:3000/workers → Worker catalog
```

---

## 13. Feature-by-Feature Flow Summary

### Search by Name
1. User types "Ahmed" in search box → clicks Apply
2. Browser sends `GET /workers?search=Ahmed`
3. Server: `filter.name = { $regex: 'Ahmed', $options: 'i' }`
4. MongoDB finds all workers whose name contains "Ahmed" (case-insensitive)
5. EJS renders only those workers

### Filter by Category
1. User selects "Plumbing" → clicks Apply
2. Browser sends `GET /workers?category=Plumbing`
3. Server: `filter.category = 'Plumbing'`
4. MongoDB returns only Plumbing workers

### Price Range Filter
1. User enters Min: 500, Max: 900
2. Browser sends `GET /workers?minPrice=500&maxPrice=900`
3. Server: `filter.price = { $gte: 500, $lte: 900 }`
4. MongoDB returns workers with price between 500 and 900

### Sort
1. User selects "Top Rated" → clicks Apply
2. Browser sends `GET /workers?sort=rating_desc`
3. Server: `sortObj = { rating: -1 }`
4. Mongoose `.sort({ rating: -1 })` orders workers from highest to lowest rating

### Pagination
1. 25 total workers, 8 per page → 4 pages total
2. User clicks page 3
3. Browser sends `GET /workers?page=3`
4. Server: `skip = (3-1) * 8 = 16`, `.skip(16).limit(8)` → workers 17–24
5. Pagination component shows [1] [2] **[3]** [4]

### Combining Filters
All filters work together. Example:
`/workers?category=Electrical&minPrice=700&sort=rating_desc&page=1`
→ MongoDB filter: `{ category: 'Electrical', price: { $gte: 700 } }`, sorted by rating descending, page 1 results only.

---

## 14. CSS Architecture — `public/css/style.css`

The stylesheet uses CSS custom properties (variables) for the design system:

```css
:root {
    --clr-bg:       #0f172a;   /* dark navy background */
    --clr-surface:  #1e293b;   /* card/panel surfaces */
    --clr-primary:  #6366f1;   /* indigo accent color */
    --clr-text:     #f1f5f9;   /* light text */
    --radius-card:  16px;      /* consistent border radius */
}
```

Key design patterns used:
- **Dark theme** — dark navy background with light text
- **Glassmorphism** — semi-transparent backgrounds with `backdrop-filter: blur()`
- **CSS Grid** — workers displayed in a responsive grid (`auto-fill`, `minmax`)
- **Flexbox** — navbar, filter bar, card layouts
- **CSS transitions** — hover effects on cards, buttons, nav links
- **Media queries** — responsive breakpoints at 992px, 768px, 600px

---

*This document covers every file, every function, and every connection in the WorkerFinder Assignment #03 project.*
