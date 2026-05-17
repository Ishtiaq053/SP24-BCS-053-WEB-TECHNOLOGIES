const express  = require('express');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');

const router = express.Router();

// ─── GET /register ────────────────────────────────────────────────────────────
router.get('/register', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('auth/register', { title: 'Register — WorkerFinder' });
});

// ─── POST /register ───────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Basic validation
        if (!name || !email || !password || !confirmPassword) {
            req.flash('error', 'All fields are required.');
            return res.redirect('/register');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match.');
            return res.redirect('/register');
        }

        if (password.length < 6) {
            req.flash('error', 'Password must be at least 6 characters.');
            return res.redirect('/register');
        }

        // Check for existing user
        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            req.flash('error', 'An account with that email already exists.');
            return res.redirect('/register');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            name:     name.trim(),
            email:    email.toLowerCase().trim(),
            password: hashedPassword,
            role:     'customer'
        });

        // Redirect to login after successful registration
        req.flash('success', `Account created successfully, ${user.name}! Please log in to continue.`);
        res.redirect('/login');

    } catch (err) {
        console.error('Register error:', err.message);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/register');
    }
});

// ─── GET /login ───────────────────────────────────────────────────────────────
router.get('/login', (req, res) => {
    if (req.session.userId) return res.redirect('/');
    res.render('auth/login', { title: 'Login — WorkerFinder' });
});

// ─── POST /login ──────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            req.flash('error', 'Email and password are required.');
            return res.redirect('/login');
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // Generic error — do not reveal which field is wrong
        if (!user) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.flash('error', 'Invalid email or password.');
            return res.redirect('/login');
        }

        // Create session
        req.session.userId   = user._id;
        req.session.userName = user.name;
        req.session.role     = user.role;

        // Redirect admins to dashboard
        if (user.role === 'admin') {
            req.flash('success', `Admin login successful. Welcome, ${user.name}.`);
            return res.redirect('/admin');
        }
        req.flash('success', `Welcome back, ${user.name}!`);
        res.redirect('/workers');

    } catch (err) {
        console.error('Login error:', err.message);
        req.flash('error', 'Something went wrong. Please try again.');
        res.redirect('/login');
    }
});

// ─── GET /logout ──────────────────────────────────────────────────────────────
router.get('/logout', (req, res) => {
    // Set flash FIRST — connect-flash writes to req.session
    req.flash('success', 'You have been logged out successfully.');

    // Clear auth data — keeps session alive long enough to carry the flash
    delete req.session.userId;
    delete req.session.userName;
    delete req.session.role;

    // Save (flush flash + cleared auth) then redirect to login
    req.session.save((err) => {
        if (err) console.error('Session save error:', err);
        res.redirect('/login');
    });
});

module.exports = router;
