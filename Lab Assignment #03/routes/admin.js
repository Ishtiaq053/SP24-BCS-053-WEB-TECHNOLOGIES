const express             = require('express');
const Worker              = require('../models/Worker');
const User                = require('../models/User');
const { isLoggedIn, isAdmin } = require('../middleware/auth');

const router = express.Router();

// ─── GET /admin — Admin Dashboard ─────────────────────────────────────────────
router.get('/', isLoggedIn, isAdmin, async (req, res) => {
    try {
        const [totalWorkers, totalUsers, availableWorkers, busyWorkers, recentWorkers] =
            await Promise.all([
                Worker.countDocuments(),
                User.countDocuments(),
                Worker.countDocuments({ stock: 1 }),
                Worker.countDocuments({ stock: 0 }),
                Worker.find().sort({ createdAt: -1 }).limit(10)
            ]);


        res.render('admin/dashboard', {
            title: 'Admin Dashboard — WorkerFinder',
            totalWorkers,
            totalUsers,
            availableWorkers,
            busyWorkers,
            recentWorkers
        });

    } catch (err) {
        console.error('Admin dashboard error:', err.message);
        req.flash('error', 'Failed to load dashboard data.');
        res.redirect('/workers');
    }
});

module.exports = router;
