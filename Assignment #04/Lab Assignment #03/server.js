require('dotenv').config();
const express      = require('express');
const mongoose     = require('mongoose');
const session      = require('express-session');
const MongoStore   = require('connect-mongo').MongoStore;
const flash        = require('connect-flash');

const Worker       = require('./models/Worker');
const authRoutes   = require('./routes/auth');
const adminRoutes  = require('./routes/admin');
const { isLoggedIn } = require('./middleware/auth');

const app = express();

// ─── View Engine & Static Files ───────────────────────────────────────────────
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// ─── MongoDB Connection ────────────────────────────────────────────────────────
let isDbConnected = false;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        isDbConnected = true;
        console.log('✅  MongoDB connected successfully');
    })
    .catch((err) => {
        console.error('❌  MongoDB connection error:', err.message);
        console.error('👉  Fix: Whitelist your IP in MongoDB Atlas → Network Access → Add IP Address');
    });

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(
    session({
        secret:            process.env.SESSION_SECRET || 'workerfinder_secret_key_2024',
        resave:            false,
        saveUninitialized: false,
        store: MongoStore.create({
            mongoUrl:    process.env.MONGO_URI,
            collectionName: 'sessions',
            ttl:         14 * 24 * 60 * 60  // 14 days
        }),
        cookie: {
            maxAge:   14 * 24 * 60 * 60 * 1000, // 14 days in ms
            httpOnly: true
        }
    })
);

// ─── Flash Messages ───────────────────────────────────────────────────────────
app.use(flash());

// ─── Global res.locals Middleware ─────────────────────────────────────────────
// Makes session data & flash available in every EJS template
app.use((req, res, next) => {
    res.locals.currentUser  = req.session.userId ? {
        id:   req.session.userId,
        name: req.session.userName,
        role: req.session.role
    } : null;
    res.locals.success = req.flash('success');
    res.locals.error   = req.flash('error');
    res.locals.info    = req.flash('info');
    res.locals.warning = req.flash('warning');
    next();
});

// ─── Categories list (shared across routes) ───────────────────────────────────
const CATEGORIES = [
    'Plumbing',
    'Electrical',
    'Carpentry',
    'Painting',
    'Cleaning',
    'Driving',
    'Gardening',
    'AC & Repair'
];

const LIMIT = 8; // workers per page

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /  — Landing page
app.get('/', (req, res) => {
    res.render('homepage');
});

// GET /workers  — Worker catalog with search, filter, sort & pagination
app.get('/workers', async (req, res) => {
    if (!isDbConnected) {
        return res.status(503).send(`
            <style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#0f172a;color:#f1f5f9;text-align:center;padding:2rem}</style>
            <h1 style="color:#f87171">⚠️ Database Not Connected</h1>
            <p>Could not reach MongoDB. Your IP may not be whitelisted in Atlas.</p>
            <p style="color:#94a3b8;font-size:.9rem">Go to <strong>MongoDB Atlas → Network Access → Add IP Address</strong> and whitelist your current IP, then restart the server.</p>
            <a href="/" style="margin-top:1rem;color:#60a5fa">← Back to Home</a>
        `);
    }
    try {
        // 1. Read query params (with safe defaults)
        const search   = req.query.search   || '';
        const category = req.query.category || '';
        const minPrice = req.query.minPrice || '';
        const maxPrice = req.query.maxPrice || '';
        const sort     = req.query.sort     || '';
        const page     = Math.max(1, parseInt(req.query.page) || 1);

        // 2. Build filter object dynamically
        const filter = {};

        if (search.trim()) {
            filter.name = { $regex: search.trim(), $options: 'i' };
        }

        if (category.trim()) {
            filter.category = category.trim();
        }

        if (minPrice !== '' || maxPrice !== '') {
            filter.price = {};
            if (minPrice !== '') filter.price.$gte = Number(minPrice);
            if (maxPrice !== '') filter.price.$lte = Number(maxPrice);
        }

        // 3. Build sort object
        let sortObj = {};
        switch (sort) {
            case 'price_asc':       sortObj = { price: 1 };       break;
            case 'price_desc':      sortObj = { price: -1 };      break;
            case 'rating_desc':     sortObj = { rating: -1 };     break;
            case 'experience_desc': sortObj = { experience: -1 }; break;
            default:                sortObj = { createdAt: -1 };  break;
        }

        // 4. Count total matching workers (for pagination)
        const totalWorkers = await Worker.countDocuments(filter);
        const totalPages   = Math.ceil(totalWorkers / LIMIT) || 1;

        const currentPage = Math.min(page, totalPages);
        const skip = (currentPage - 1) * LIMIT;

        // 5. Fetch the workers for this page
        const workers = await Worker.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(LIMIT);

        // 6. Render the view with all required variables
        res.render('workers', {
            workers,
            currentPage,
            totalPages,
            totalWorkers,
            search,
            category,
            minPrice,
            maxPrice,
            sort,
            categories: CATEGORIES
        });

    } catch (err) {
        console.error('Error in /workers route:', err.message);
        res.status(500).send('Server error — check console for details.');
    }
});

// GET /checkout — Protected page (logged-in users only)
app.get('/checkout', isLoggedIn, async (req, res) => {
    let worker = null;
    if (req.query.workerId) {
        try { worker = await Worker.findById(req.query.workerId); } catch (_) {}
    }
    res.render('checkout', { title: 'Checkout — WorkerFinder', worker });
});

// GET /workers/:id — Worker detail page (protected)
app.get('/workers/:id', isLoggedIn, async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) {
            req.flash('warning', 'Worker not found.');
            return res.redirect('/workers');
        }
        res.render('workers/details', { title: `${worker.name} — WorkerFinder`, worker });
    } catch (err) {
        // Invalid ObjectId format → treat as not found
        req.flash('warning', 'Worker not found.');
        res.redirect('/workers');
    }
});

// ─── Auth Routes (/register, /login, /logout) ─────────────────────────────────
app.use('/', authRoutes);

// ─── Admin Routes (/admin) ────────────────────────────────────────────────────
app.use('/admin', adminRoutes);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀  Server is running on http://localhost:${PORT}`);
});
