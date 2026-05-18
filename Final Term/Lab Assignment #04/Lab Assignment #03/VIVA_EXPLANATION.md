# WorkerFinder — Complete Viva Explanation Guide
### SP24-BCS-053 | Lab Assignment #03 + #04

---

## 1. WHAT IS THIS PROJECT?

**WorkerFinder** is a full-stack web application built with:
- **Node.js + Express.js** — Backend server
- **MongoDB Atlas + Mongoose** — Cloud database
- **EJS (Embedded JavaScript)** — HTML templating engine
- **express-session** — Session-based authentication (website)
- **JWT (JSON Web Tokens)** — Token-based authentication (REST API)
- **bcryptjs** — Password hashing
- **Multer** — File/image uploads

It allows customers to browse workers (plumbers, electricians, etc.), book them, and allows admins to manage workers via a dashboard.

---

## 2. COMPLETE FILE STRUCTURE & WHAT EACH FILE DOES

```
Lab Assignment #03/
│
├── server.js              ← MAIN ENTRY POINT — starts the whole app
├── .env                   ← Secret config values (DB URL, JWT secret, etc.)
├── package.json           ← Lists all npm packages the project depends on
├── seed.js                ← Script to fill DB with 25 sample workers
├── createAdmin.js         ← Script to create the admin user in DB
├── test-api.js            ← Script to test the REST API endpoints
│
├── models/                ← MongoDB data schemas (blueprints for DB)
│   ├── User.js            ← Schema for users (customers + admins)
│   ├── Worker.js          ← Schema for service workers
│   └── Order.js           ← Schema for bookings/orders
│
├── middleware/            ← Functions that run BETWEEN request and response
│   ├── auth.js            ← Session auth guards (isLoggedIn, isAdmin)
│   ├── verifyToken.js     ← JWT auth guard for API routes
│   └── upload.js          ← Multer config for image uploads
│
├── routes/                ← URL route handlers
│   ├── auth.js            ← /register, /login, /logout (web)
│   ├── admin.js           ← /admin/* routes (dashboard, CRUD workers)
│   └── api/               ← REST API (Lab 4)
│       ├── apiAuth.js     ← POST /api/v1/auth/login
│       ├── apiWorkers.js  ← GET /api/v1/workers, GET /api/v1/workers/:id
│       ├── apiOrders.js   ← POST /api/v1/orders
│       └── apiUser.js     ← GET /api/v1/user/profile
│
├── views/                 ← EJS HTML templates (what the user sees)
│   ├── homepage.ejs       ← Landing page (/)
│   ├── workers.ejs        ← Worker catalog page (/workers)
│   ├── checkout.ejs       ← Booking/checkout page (/checkout)
│   ├── partials/          ← Reusable HTML fragments
│   │   ├── navbar.ejs     ← Top navigation bar (included in all pages)
│   │   ├── flash.ejs      ← Success/error alert banners
│   │   ├── adminNavbar.ejs← Admin top bar
│   │   └── adminSidebar.ejs← Admin left sidebar
│   ├── auth/              ← Auth pages
│   │   ├── login.ejs      ← Login form
│   │   └── register.ejs   ← Registration form
│   ├── workers/
│   │   └── details.ejs    ← Single worker detail page (/workers/:id)
│   └── admin/             ← Admin panel pages
│       ├── dashboard.ejs  ← Admin stats overview
│       ├── workers.ejs    ← Table of all workers
│       ├── addWorker.ejs  ← Form to add new worker
│       └── editWorker.ejs ← Form to edit existing worker
│
└── public/                ← Static files served directly to browser
    ├── css/               ← Stylesheet files
    ├── js/                ← Client-side JavaScript
    ├── images/            ← Static images
    └── uploads/           ← Worker profile images (uploaded by admin)
```

---

## 3. HOW THE FILES ARE LINKED TOGETHER

### The Chain of Connection:

```
.env
  └── read by server.js (MONGO_URI, JWT_SECRET, SESSION_SECRET, PORT)

server.js (MAIN HUB)
  ├── connects to MongoDB Atlas using MONGO_URI
  ├── imports models/Worker.js    → uses for /workers and /workers/:id routes
  ├── imports routes/auth.js      → mounted at /
  ├── imports routes/admin.js     → mounted at /admin
  ├── imports routes/api/*.js     → mounted at /api/v1/*
  └── imports middleware/auth.js  → uses isLoggedIn for /checkout, /workers/:id

routes/auth.js
  └── imports models/User.js      → reads/creates user records in DB

routes/admin.js
  ├── imports models/Worker.js    → CRUD operations
  ├── imports models/User.js      → count users for dashboard
  ├── imports middleware/auth.js  → protects all /admin routes
  └── imports middleware/upload.js → handles worker image upload

routes/api/apiAuth.js
  └── imports models/User.js      → verifies login credentials, returns JWT

routes/api/apiWorkers.js
  └── imports models/Worker.js    → returns worker data as JSON

routes/api/apiOrders.js
  ├── imports models/Order.js     → creates order in DB
  └── imports middleware/verifyToken.js → checks JWT before allowing access

routes/api/apiUser.js
  ├── imports models/User.js      → fetches user profile from DB
  └── imports middleware/verifyToken.js → checks JWT

middleware/auth.js
  └── reads req.session.userId    → set by routes/auth.js during login

middleware/verifyToken.js
  └── reads req.headers.authorization → checks JWT signed with JWT_SECRET

middleware/upload.js
  └── saves files to public/uploads/ → path stored in Worker.image field
```

---

## 4. DETAILED FILE EXPLANATIONS

---

### `server.js` — THE BRAIN OF THE APP

This is the **main entry point**. When you run `node server.js`, everything starts here.

**What it does, line by line:**

1. **`require('dotenv').config()`** — Loads `.env` file so `process.env.MONGO_URI` etc. are available everywhere.

2. **Imports packages** — express, mongoose, session, flash, etc.

3. **`app.set('view engine', 'ejs')`** — Tells Express to use EJS for rendering HTML templates.

4. **`app.use(express.static('public'))`** — Serves CSS, JS, images from the `public/` folder automatically.

5. **`app.use(express.urlencoded({ extended: true }))`** — Parses HTML form data (POST body from forms).

6. **`app.use(express.json())`** — Parses JSON bodies (needed for API requests).

7. **MongoDB Connection** — `mongoose.connect(process.env.MONGO_URI)` connects to MongoDB Atlas cloud database.

8. **Session Setup** — Configures `express-session` with MongoStore so sessions are stored IN MongoDB (not in memory). Sessions last 14 days.

9. **Flash Messages** — `connect-flash` stores one-time messages (success/error) that show once and disappear.

10. **`res.locals` middleware** — Runs on EVERY request. Puts `currentUser`, `success`, `error` into `res.locals` so every EJS template can use them without passing manually.

11. **`GET /`** — Renders `views/homepage.ejs`.

12. **`GET /workers`** — The main catalog page. Reads query parameters (search, category, minPrice, maxPrice, sort, page), builds a MongoDB filter object, fetches 8 workers per page, renders `views/workers.ejs`.

13. **`GET /checkout`** — Protected by `isLoggedIn`. Renders checkout page.

14. **`GET /workers/:id`** — Protected by `isLoggedIn`. Fetches one worker by MongoDB ObjectId and renders `views/workers/details.ejs`.

15. **Route mounting** — `app.use('/', authRoutes)` means all routes defined in `routes/auth.js` are active. Same for `/admin` and `/api/v1/*`.

16. **API 404 handler** — Catches any `/api/...` URL that doesn't match a route.

17. **`app.listen(PORT)`** — Starts the HTTP server on port 3000.

---

### `.env` — ENVIRONMENT VARIABLES

```
MONGO_URI=mongodb+srv://...       ← MongoDB Atlas connection string
PORT=3000                         ← Server port
SESSION_SECRET=...                ← Used to sign/encrypt session cookies
JWT_SECRET=workerfinder_jwt_...   ← Used to sign/verify JWT tokens
JWT_EXPIRES_IN=1h                 ← JWT tokens expire after 1 hour
```

**Why not hardcode these?** Security. If you push to GitHub, secrets stay hidden.

---

### `package.json` — PROJECT DEPENDENCIES

Lists every npm package used:
| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `mongoose` | MongoDB ODM (Object Document Mapper) |
| `ejs` | HTML templating engine |
| `express-session` | Session management |
| `connect-mongo` | Store sessions in MongoDB |
| `connect-flash` | Flash messages |
| `bcryptjs` | Password hashing |
| `jsonwebtoken` | Create & verify JWT tokens |
| `multer` | Handle file uploads |
| `dotenv` | Load `.env` file |

---

## 5. MODELS (MongoDB Schemas)

### `models/User.js`

Defines the structure of a User document in MongoDB:

```js
{
  name:     String    // required
  email:    String    // required, unique, lowercase
  password: String    // required (stored as bcrypt hash)
  role:     String    // 'customer' or 'admin' (default: 'customer')
  createdAt, updatedAt  // added automatically by { timestamps: true }
}
```

**Key concept**: Password is NEVER stored as plain text. bcrypt hashes it first.

---

### `models/Worker.js`

Defines the structure of a Worker document:

```js
{
  name:        String    // required
  price:       Number    // hourly rate, required
  category:    String    // must be one of 8 allowed values (enum)
  rating:      Number    // 1–5 (default: 3)
  stock:       Number    // 1 = available, 0 = busy
  experience:  Number    // years
  location:    String    // city name
  description: String    // bio
  jobsDone:    Number    // completed jobs count
  verified:    Boolean   // admin-verified badge
  image:       String    // path like '/uploads/filename.jpg'
}
```

**enum** means MongoDB rejects any category not in the allowed list.

---

### `models/Order.js`

Has TWO schemas — a nested sub-schema pattern:

**orderItemSchema** (embedded, no `_id`):
```js
{
  workerId:   ObjectId  // reference to Worker document
  workerName: String
  price:      Number
  quantity:   Number    // default 1
}
```

**orderSchema** (main):
```js
{
  user:        ObjectId  // reference to User who placed the order
  items:       [orderItemSchema]  // array of items
  totalAmount: Number
  status:      String    // 'pending', 'confirmed', 'completed', 'cancelled'
  notes:       String
}
```

**`ref: 'Worker'`** means Mongoose can "populate" the workerId with full worker data using `.populate()`.

---

## 6. MIDDLEWARE

### `middleware/auth.js` — Session Authentication Guard

Contains two functions used as **route middleware** (run before the actual route handler):

**`isLoggedIn(req, res, next)`**
- Checks if `req.session.userId` exists
- If YES → calls `next()` (let the request continue)
- If NO → sets a flash warning message → redirects to `/login`

**`isAdmin(req, res, next)`**
- Checks if `req.session.role === 'admin'`
- If YES → calls `next()`
- If NO → sets flash error → redirects to `/workers`
- Must be used AFTER `isLoggedIn`

**Usage in admin.js:**
```js
router.use(isLoggedIn, isAdmin);  // protects ALL routes in this file
```

---

### `middleware/verifyToken.js` — JWT Authentication Guard

Used only for `/api/v1/*` routes. Does NOT touch sessions.

**Flow:**
1. Reads `Authorization` header from the HTTP request
2. Checks it starts with `Bearer ` (e.g., `Bearer eyJ...`)
3. Extracts the token string
4. Calls `jwt.verify(token, JWT_SECRET)` to decode and validate
5. If valid → attaches decoded payload to `req.user` → calls `next()`
6. If expired → returns `403` with "Token has expired"
7. If invalid → returns `403` with "Invalid token"

**The decoded `req.user` contains:**
```js
{ user_id: "...", role: "customer", iat: 1234567, exp: 1234567 }
```

---

### `middleware/upload.js` — File Upload Handler (Multer)

Configures Multer to handle image uploads:
- **Storage**: saves to `public/uploads/` folder
- **Filename**: `timestamp-originalname.ext` (e.g., `1715800000000-ahmed_raza.jpg`)
- **File filter**: only accepts `.jpg`, `.jpeg`, `.png`, `.webp`
- **Size limit**: maximum 5 MB

Used in admin routes: `upload.single('image')` processes one file from the `<input name="image">` field.

---

## 7. ROUTES

### `routes/auth.js` — Web Authentication Routes

| Method | URL | What it does |
|--------|-----|-------------|
| GET | /register | Shows registration form |
| POST | /register | Creates new user account |
| GET | /login | Shows login form |
| POST | /login | Validates credentials, creates session |
| GET | /logout | Destroys session, redirects to login |

**POST /register flow:**
1. Validate all fields present
2. Check passwords match & length ≥ 6
3. Check email not already in DB
4. Hash password with bcrypt (12 salt rounds)
5. Create User in MongoDB
6. Auto-login: set `req.session.userId`, `req.session.userName`, `req.session.role`
7. Flash success → redirect to `/workers`

**POST /login flow:**
1. Find user by email (lowercase)
2. If not found → generic error (don't reveal which field is wrong — security)
3. `bcrypt.compare(plainPassword, hashedPassword)` — compare
4. If match → set session → redirect (admin goes to `/admin`, customer to `/workers`)

**GET /logout flow:**
1. Set flash message FIRST (before clearing session)
2. Delete `userId`, `userName`, `role` from session
3. `req.session.save()` → ensures flash is saved before redirect
4. Redirect to `/login`

---

### `routes/admin.js` — Admin CRUD Routes

All routes here are protected by `router.use(isLoggedIn, isAdmin)` at the top.

| Method | URL | What it does |
|--------|-----|-------------|
| GET | /admin | Dashboard with stats |
| GET | /admin/workers | List all workers |
| GET | /admin/workers/add | Show add-worker form |
| POST | /admin/workers/add | Create new worker in DB |
| GET | /admin/workers/edit/:id | Show edit form for one worker |
| POST | /admin/workers/edit/:id | Update worker in DB |
| POST | /admin/workers/delete/:id | Delete worker from DB |

**Dashboard (GET /admin):**
Uses `Promise.all()` to run 6 MongoDB queries simultaneously (faster than sequential):
- Total workers, total users, available, busy, verified workers, recent 10 workers

**POST /admin/workers/add flow:**
1. `upload.single('image')` runs first — saves image file if provided
2. `validateWorkerBody()` checks all fields
3. If errors → delete uploaded file (cleanup), re-render form with errors
4. If valid → `Worker.create({...})` with imagePath `/uploads/filename.jpg`
5. Flash success → redirect to `/admin/workers`

**POST /admin/workers/edit/:id flow:**
1. Same validation as add
2. If new image uploaded → delete OLD image file → set new path
3. If no new image → keep existing `worker.image`
4. `worker.save()` — saves changes

**POST /admin/workers/delete/:id:**
1. Find worker
2. If it has a local uploaded image → delete the file from disk
3. `Worker.findByIdAndDelete(id)`

---

## 8. REST API ROUTES (Lab Assignment #4)

These are completely separate from the website. They return **JSON**, not HTML.

### `routes/api/apiAuth.js`

**POST /api/v1/auth/login**
- Accepts: `{ email, password }` in JSON body
- Validates credentials same as web login
- If valid → creates JWT: `jwt.sign({ user_id, role }, JWT_SECRET, { expiresIn: '1h' })`
- Returns: `{ success: true, token: "eyJ...", user: { id, name, email, role } }`

---

### `routes/api/apiWorkers.js` (PUBLIC — no token needed)

**GET /api/v1/workers**
- Accepts query params: `search`, `category`, `minPrice`, `maxPrice`, `sort`, `page`, `limit`
- Same filtering logic as the website's `/workers` route
- Returns JSON with workers array + pagination info

**GET /api/v1/workers/:id**
- Validates that `:id` is a valid MongoDB ObjectId
- Returns single worker as JSON or 404

---

### `routes/api/apiOrders.js` (PROTECTED — JWT required)

**POST /api/v1/orders**
- Requires `Authorization: Bearer <token>` header
- `verifyToken` middleware runs first
- Validates `items` array (each must have `workerId`, `workerName`, `price`)
- Calculates `totalAmount` automatically
- Creates Order in MongoDB with `user: req.user.user_id` (from JWT payload)

---

### `routes/api/apiUser.js` (PROTECTED — JWT required)

**GET /api/v1/user/profile**
- Requires JWT token
- Finds user by `req.user.user_id`
- Returns user data excluding password (`.select('-password')`)

---

## 9. VIEWS (EJS Templates)

EJS = HTML with embedded JavaScript using `<% %>` tags.

| Tag | Purpose |
|-----|---------|
| `<% code %>` | Run JS code (loops, if/else) |
| `<%= value %>` | Output value (HTML-escaped) |
| `<%- value %>` | Output raw HTML (unescaped) |
| `<%- include('partials/navbar') %>` | Include another EJS file |

### Key Template Variables

Every template can use `res.locals` values set in `server.js`:
- `currentUser` — `{ id, name, role }` or `null`
- `success`, `error`, `warning`, `info` — flash message arrays

### `partials/navbar.ejs`
Included in every public page. Shows different links based on `currentUser`:
- Logged out: Login | Register
- Logged in (customer): Workers | Logout
- Logged in (admin): Admin Dashboard | Logout

### `partials/flash.ejs`
Displays flash messages as styled alert boxes. Included on every page.

---

## 10. COMPLETE REQUEST-RESPONSE FLOW

### Flow 1: Customer Registers

```
Browser: POST /register (form data: name, email, password, confirmPassword)
  → server.js receives request
  → routes/auth.js handles it
  → validates input
  → queries MongoDB: User.findOne({ email }) — check duplicate
  → bcrypt.hash(password, 12) — hash password
  → User.create({...}) — saves to MongoDB
  → req.session.userId = user._id — creates session
  → session stored in MongoDB 'sessions' collection
  → req.flash('success', 'Welcome!') — stores flash in session
  → res.redirect('/workers')
Browser: GET /workers
  → session cookie sent → session loaded from MongoDB
  → res.locals.currentUser = { id, name, role }
  → flash message read and cleared
  → workers.ejs rendered with currentUser available
```

### Flow 2: Customer Views Worker Catalog

```
Browser: GET /workers?search=Ahmed&category=Plumbing&sort=price_asc&page=2
  → server.js /workers route handler
  → filter = { name: /Ahmed/i, category: 'Plumbing' }
  → sortObj = { price: 1 }
  → Worker.countDocuments(filter) → e.g. 5 total
  → totalPages = Math.ceil(5 / 8) = 1
  → Worker.find(filter).sort().skip(0).limit(8) → workers array
  → res.render('workers', { workers, currentPage, totalPages, ... })
  → EJS template loops over workers and renders cards
Browser: sees filtered, sorted, paginated results
```

### Flow 3: API Login + Order Placement

```
Client: POST /api/v1/auth/login { email, password }
  → apiAuth.js → validates → bcrypt.compare
  → jwt.sign({ user_id, role }, JWT_SECRET, { expiresIn: '1h' })
  → returns { success: true, token: "eyJ..." }

Client: POST /api/v1/orders
  Headers: Authorization: Bearer eyJ...
  Body: { items: [{ workerId, workerName, price, quantity }] }
  → verifyToken middleware runs
  → jwt.verify(token, JWT_SECRET) → decodes → req.user = { user_id, role }
  → apiOrders.js validates items
  → calculates totalAmount
  → Order.create({ user: req.user.user_id, items, totalAmount })
  → returns { success: true, data: { order } }
```

### Flow 4: Admin Adds a Worker

```
Admin Browser: GET /admin/workers/add
  → server.js → /admin prefix → routes/admin.js
  → router.use(isLoggedIn, isAdmin) runs
  → checks req.session.userId (not null) ✓
  → checks req.session.role === 'admin' ✓
  → res.render('admin/addWorker', { categories, errors: {}, old: {} })

Admin Browser: POST /admin/workers/add (multipart form with image)
  → upload.single('image') middleware runs → saves file to public/uploads/
  → validateWorkerBody(req.body) → checks required fields
  → Worker.create({ ..., image: '/uploads/timestamp-name.jpg' })
  → req.flash('success', 'Worker added!')
  → res.redirect('/admin/workers')
```

---

## 11. UTILITY SCRIPTS

### `seed.js`
- Run ONCE with: `node seed.js`
- Deletes ALL existing workers from DB
- Inserts 25 pre-defined workers (3 per category × 8 categories + 1)
- Used to get fresh demo data

### `createAdmin.js`
- Run ONCE with: `node createAdmin.js`
- Creates admin user with email `admin@workerfinder.com`, password `admin123`
- Checks if admin already exists before creating

### `test-api.js`
- Tests all API endpoints programmatically
- Logs in via API, saves token, tests workers/orders/profile endpoints

---

## 12. AUTHENTICATION: SESSION vs JWT (KEY CONCEPT FOR VIVA)

| Feature | Session (Website) | JWT (API) |
|---------|-----------------|-----------|
| Storage | Server-side (MongoDB) | Client-side (token string) |
| Sent via | Cookie (automatic) | `Authorization` header (manual) |
| Stateful? | Yes — server remembers | No — stateless |
| Middleware | `auth.js` → `isLoggedIn` | `verifyToken.js` |
| Where used | All `/` and `/admin` routes | All `/api/v1` routes |
| Login sets | `req.session.userId` | Returns JWT token |
| Expiry | 14 days | 1 hour |

---

## 13. SECURITY FEATURES

1. **Password Hashing** — `bcrypt.hash(password, 12)` — 12 salt rounds, impossible to reverse
2. **Generic Error Messages** — Login says "Invalid email or password" not "email not found" — prevents user enumeration
3. **Session stored in DB** — MongoStore, not in-memory (survives server restart)
4. **JWT Verification** — All API protected routes verify token signature
5. **Input Validation** — Both client-side (HTML required) and server-side (route handlers)
6. **httpOnly Cookie** — Session cookie can't be read by JavaScript (XSS protection)
7. **File Upload Filtering** — Only image types allowed, max 5MB
8. **Role-Based Access** — `isAdmin` middleware blocks non-admin users from /admin routes
9. **`.gitignore`** — `.env` is not committed to Git (secrets stay local)

---

## 14. COMMON VIVA QUESTIONS & ANSWERS

**Q: What is Express.js?**
A: Express is a minimal web framework for Node.js. It handles routing (which code runs for which URL), middleware, and request/response management.

**Q: What is Mongoose?**
A: Mongoose is an ODM (Object Document Mapper) for MongoDB. It lets you define schemas (data structures) and interact with MongoDB using JavaScript objects instead of raw queries.

**Q: What is middleware?**
A: Middleware is a function that runs between the HTTP request arriving and the route handler responding. It receives `(req, res, next)`. If it calls `next()`, execution continues to the next middleware or route.

**Q: What is the difference between `req.session` and JWT?**
A: Sessions store user info on the server (in MongoDB) and send only a session ID in a cookie. JWT encodes user info directly in a token string that the client stores and sends with every request — no server storage needed.

**Q: What does `bcrypt.hash` do?**
A: It takes a plain text password and applies a one-way hashing algorithm with a random "salt" (random data). The result cannot be reversed. To verify, you use `bcrypt.compare()` which hashes the input and compares the result.

**Q: What is `res.locals`?**
A: It's an object that exists for the lifetime of one request-response cycle. Anything set on `res.locals` is automatically available in EJS templates without being explicitly passed.

**Q: What does `Promise.all()` do?**
A: Runs multiple async operations (like DB queries) IN PARALLEL and waits for ALL to finish. Faster than running them one after another.

**Q: What is EJS?**
A: EJS (Embedded JavaScript) is a templating language. You write HTML with special tags `<% %>` to embed JavaScript logic. Express renders these templates and sends pure HTML to the browser.

**Q: What is the `upload.single('image')` middleware?**
A: It's a Multer middleware that processes one file upload from a form field named `'image'`. The file is saved to disk and its info is available at `req.file`.

**Q: Why do we use `{ timestamps: true }` in Mongoose schemas?**
A: It automatically adds `createdAt` and `updatedAt` fields to every document that MongoDB updates automatically.

**Q: What is `router.use(isLoggedIn, isAdmin)` in admin.js?**
A: It's a global middleware for the router — every single route in that file must pass through `isLoggedIn` and then `isAdmin` before the route handler runs.

**Q: What does `Worker.find(filter).sort().skip().limit()` do?**
A: This is a chained Mongoose query. `find(filter)` selects matching documents, `.sort()` orders them, `.skip(n)` skips n documents (for pagination), `.limit(n)` returns at most n documents.

**Q: What is dotenv?**
A: The `dotenv` package reads a `.env` file and loads key=value pairs into `process.env` so you can access them anywhere in your Node.js code without hardcoding secrets.

**Q: What is `connect-flash`?**
A: A package that stores temporary messages in the session. When you call `req.flash('success', 'Done!')`, the message is saved in the session. The next time you read it with `req.flash('success')`, the message is returned AND deleted from the session — it shows exactly once.

---

## 15. DATA FLOW DIAGRAM

```
Browser/API Client
      │
      ▼
  server.js  ← reads .env for config
      │
      ├──── Applies Middleware (session, flash, res.locals, json parser)
      │
      ├──── Static files (public/) served immediately
      │
      ├──── Route Matching:
      │        /              → homepage.ejs
      │        /workers       → workers.ejs  (MongoDB query)
      │        /workers/:id   → details.ejs  (requires login)
      │        /checkout      → checkout.ejs (requires login)
      │        /register      → auth.js → User model
      │        /login         → auth.js → User model
      │        /logout        → auth.js
      │        /admin/*       → admin.js → Worker/User models
      │        /api/v1/auth/* → apiAuth.js → User model
      │        /api/v1/workers/* → apiWorkers.js → Worker model
      │        /api/v1/orders/* → apiOrders.js → Order model (JWT protected)
      │        /api/v1/user/* → apiUser.js → User model (JWT protected)
      │
      ▼
  MongoDB Atlas (cloud)
      ├── users collection
      ├── workers collection
      ├── orders collection
      └── sessions collection
```

---

*Document prepared for SP24-BCS-053 — Lab Assignment #03 & #04 Viva*
