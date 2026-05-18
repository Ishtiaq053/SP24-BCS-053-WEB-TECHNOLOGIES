const express = require('express');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { isLoggedIn } = require('../middleware/auth');

const router = express.Router();

// ─── POST /bookings/create ────────────────────────────────────────────────────
// Protected: must be logged in. Validates, calculates, saves booking.
router.post('/create', isLoggedIn, async (req, res) => {
    try {
        const { workerId, bookingDate, hours, notes } = req.body;

        // ── 1. Validate required fields ───────────────────────────────────────
        if (!workerId || !bookingDate || !hours) {
            req.flash('error', 'All booking fields are required.');
            return res.redirect('/workers');
        }

        const parsedHours = parseInt(hours, 10);
        if (isNaN(parsedHours) || parsedHours < 1 || parsedHours > 24) {
            req.flash('error', 'Hours must be between 1 and 24.');
            return res.redirect('/workers');
        }

        // ── 2. Validate date (no past dates) ──────────────────────────────────
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const selected = new Date(bookingDate);
        if (isNaN(selected.getTime()) || selected < today) {
            req.flash('error', 'Please select a valid future date.');
            return res.redirect('/workers');
        }

        // ── 3. Fetch worker & customer from DB ────────────────────────────────
        const worker = await Worker.findById(workerId);
        const customer = await User.findById(req.session.userId).select('-password');

        if (!worker) {
            req.flash('error', 'Worker not found.');
            return res.redirect('/workers');
        }
        if (!customer) {
            req.flash('error', 'Session expired. Please log in again.');
            return res.redirect('/login');
        }
        if (worker.stock !== 1) {
            req.flash('error', `${worker.name} is currently unavailable.`);
            return res.redirect('/workers');
        }

        // ── 4. Calculate total server-side ────────────────────────────────────
        const totalAmount = worker.price * parsedHours;

        // ── 5. Save booking ───────────────────────────────────────────────────
        await Booking.create({
            worker: worker._id,
            customer: customer._id,
            workerName: worker.name,
            workerCategory: worker.category,
            workerPrice: worker.price,
            customerName: customer.name,
            customerEmail: customer.email,
            bookingDate: selected,
            hours: parsedHours,
            totalAmount,
            notes: notes ? notes.trim() : '',
            status: 'pending'
        });

        req.flash('success', `✅ Booking confirmed! ${worker.name} has been booked for ${parsedHours} hour${parsedHours > 1 ? 's' : ''} on ${selected.toDateString()}. Total: PKR ${totalAmount.toLocaleString()}`);
        res.redirect('/workers');

    } catch (err) {
        console.error('Booking create error:', err.message);
        req.flash('error', 'Booking failed. Please try again.');
        res.redirect('/workers');
    }
});

module.exports = router;
