const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const Worker   = require('../models/Worker');
const User     = require('../models/User');
const Booking  = require('../models/Booking');
const { isLoggedIn, isAdmin } = require('../middleware/auth');
const upload   = require('../middleware/upload');

const router = express.Router();

// ── All admin routes require login + admin role ───────────────────────────────
router.use(isLoggedIn, isAdmin);

const CATEGORIES = [
    'Plumbing', 'Electrical', 'Carpentry', 'Painting',
    'Cleaning', 'Driving', 'Gardening', 'AC & Repair'
];

// ── Helper: server-side validation ───────────────────────────────────────────
function validateWorkerBody(body) {
    const errors = {};
    if (!body.name || !body.name.trim())
        errors.name = 'Name is required.';
    if (!body.category || !CATEGORIES.includes(body.category))
        errors.category = 'Please select a valid category.';
    const price = Number(body.price);
    if (!body.price || isNaN(price) || price < 0)
        errors.price = 'Price must be a positive number.';
    const rating = Number(body.rating);
    if (body.rating !== '' && (isNaN(rating) || rating < 1 || rating > 5))
        errors.rating = 'Rating must be between 1 and 5.';
    return errors;
}

// ─── GET /admin ─ Dashboard ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const [totalWorkers, totalUsers, availableWorkers, busyWorkers, verifiedWorkers, recentWorkers, totalAppointments, recentBookings] =
            await Promise.all([
                Worker.countDocuments(),
                User.countDocuments(),
                Worker.countDocuments({ stock: 1 }),
                Worker.countDocuments({ stock: 0 }),
                Worker.countDocuments({ verified: true }),
                Worker.find().sort({ createdAt: -1 }).limit(10),
                Booking.countDocuments(),
                Booking.find().sort({ createdAt: -1 }).limit(5).lean()
            ]);

        res.render('admin/dashboard', {
            title: 'Admin Dashboard — WorkerFinder',
            totalWorkers,
            totalUsers,
            availableWorkers,
            busyWorkers,
            verifiedWorkers,
            recentWorkers,
            totalAppointments,
            recentBookings
        });
    } catch (err) {
        console.error('Admin dashboard error:', err.message);
        req.flash('error', 'Failed to load dashboard data.');
        res.redirect('/workers');
    }
});

// ─── GET /admin/workers ─ Workers Table ───────────────────────────────────────
router.get('/workers', async (req, res) => {
    try {
        const workers = await Worker.find().sort({ createdAt: -1 });
        res.render('admin/workers', {
            title: 'Manage Workers — WorkerFinder',
            workers
        });
    } catch (err) {
        console.error('Admin workers list error:', err.message);
        req.flash('error', 'Failed to load workers list.');
        res.redirect('/admin');
    }
});

// ─── GET /admin/workers/add ─ Show Add Form ───────────────────────────────────
router.get('/workers/add', (req, res) => {
    res.render('admin/addWorker', {
        title: 'Add Worker — WorkerFinder',
        categories: CATEGORIES,
        errors: {},
        old: {}
    });
});

// ─── POST /admin/workers/add ─ Create Worker ──────────────────────────────────
router.post('/workers/add', upload.single('image'), async (req, res) => {
    const errors = validateWorkerBody(req.body);

    if (Object.keys(errors).length > 0) {
        // Delete the uploaded file if there are validation errors
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.render('admin/addWorker', {
            title: 'Add Worker — WorkerFinder',
            categories: CATEGORIES,
            errors,
            old: req.body
        });
    }

    try {
        const imagePath = req.file ? '/uploads/' + req.file.filename : '';

        await Worker.create({
            name:        req.body.name.trim(),
            category:    req.body.category,
            price:       Number(req.body.price),
            rating:      req.body.rating ? Number(req.body.rating) : 3,
            stock:       req.body.stock === '1' ? 1 : 0,
            experience:  Number(req.body.experience) || 0,
            location:    req.body.location ? req.body.location.trim() : 'Lahore',
            description: req.body.description ? req.body.description.trim() : '',
            jobsDone:    Number(req.body.jobsDone) || 0,
            verified:    req.body.verified === 'true',
            image:       imagePath
        });

        req.flash('success', `Worker "${req.body.name.trim()}" added successfully!`);
        res.redirect('/admin/workers');
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('Add worker error:', err.message);
        req.flash('error', 'Failed to add worker. Please try again.');
        res.render('admin/addWorker', {
            title: 'Add Worker — WorkerFinder',
            categories: CATEGORIES,
            errors: {},
            old: req.body
        });
    }
});

// ─── GET /admin/workers/edit/:id ─ Show Edit Form ────────────────────────────
router.get('/workers/edit/:id', async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) {
            req.flash('error', 'Worker not found.');
            return res.redirect('/admin/workers');
        }
        res.render('admin/editWorker', {
            title: 'Edit Worker — WorkerFinder',
            worker,
            categories: CATEGORIES,
            errors: {},
            old: {}
        });
    } catch (err) {
        console.error('Edit form error:', err.message);
        req.flash('error', 'Worker not found.');
        res.redirect('/admin/workers');
    }
});

// ─── POST /admin/workers/edit/:id ─ Update Worker ────────────────────────────
router.post('/workers/edit/:id', upload.single('image'), async (req, res) => {
    const errors = validateWorkerBody(req.body);

    if (Object.keys(errors).length > 0) {
        if (req.file) fs.unlink(req.file.path, () => {});
        try {
            const worker = await Worker.findById(req.params.id);
            return res.render('admin/editWorker', {
                title: 'Edit Worker — WorkerFinder',
                worker,
                categories: CATEGORIES,
                errors,
                old: req.body
            });
        } catch (_) {
            req.flash('error', 'Worker not found.');
            return res.redirect('/admin/workers');
        }
    }

    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) {
            if (req.file) fs.unlink(req.file.path, () => {});
            req.flash('error', 'Worker not found.');
            return res.redirect('/admin/workers');
        }

        // Determine new image path
        let imagePath = worker.image; // keep old image by default
        if (req.file) {
            // Delete old image if it was uploaded previously
            if (worker.image && worker.image.startsWith('/uploads/')) {
                const oldPath = path.join(__dirname, '..', 'public', worker.image);
                fs.unlink(oldPath, () => {});
            }
            imagePath = '/uploads/' + req.file.filename;
        }

        worker.name        = req.body.name.trim();
        worker.category    = req.body.category;
        worker.price       = Number(req.body.price);
        worker.rating      = req.body.rating ? Number(req.body.rating) : 3;
        worker.stock       = req.body.stock === '1' ? 1 : 0;
        worker.experience  = Number(req.body.experience) || 0;
        worker.location    = req.body.location ? req.body.location.trim() : 'Lahore';
        worker.description = req.body.description ? req.body.description.trim() : '';
        worker.jobsDone    = Number(req.body.jobsDone) || 0;
        worker.verified    = req.body.verified === 'true';
        worker.image       = imagePath;

        await worker.save();

        req.flash('success', `Worker "${worker.name}" updated successfully!`);
        res.redirect('/admin/workers');
    } catch (err) {
        if (req.file) fs.unlink(req.file.path, () => {});
        console.error('Update worker error:', err.message);
        req.flash('error', 'Failed to update worker. Please try again.');
        res.redirect(`/admin/workers/edit/${req.params.id}`);
    }
});

// ─── POST /admin/workers/delete/:id ─ Delete Worker ───────────────────────────────────
router.post('/workers/delete/:id', async (req, res) => {
    try {
        const worker = await Worker.findById(req.params.id);
        if (!worker) {
            req.flash('error', 'Worker not found.');
            return res.redirect('/admin/workers');
        }

        // Delete associated image file if it's a local upload
        if (worker.image && worker.image.startsWith('/uploads/')) {
            const imgPath = path.join(__dirname, '..', 'public', worker.image);
            fs.unlink(imgPath, () => {});
        }

        await Worker.findByIdAndDelete(req.params.id);
        req.flash('success', `Worker "${worker.name}" deleted successfully.`);
        res.redirect('/admin/workers');
    } catch (err) {
        console.error('Delete worker error:', err.message);
        req.flash('error', 'Failed to delete worker.');
        res.redirect('/admin/workers');
    }
});

// ─── GET /admin/appointments ─ All Bookings ──────────────────────────────────────────
router.get('/appointments', async (req, res) => {
    try {
        const bookings = await Booking.find()
            .sort({ createdAt: -1 })
            .lean();
        res.render('admin/appointments', {
            title:    'Appointments — WorkerFinder Admin',
            bookings,
            activePage: 'appointments'
        });
    } catch (err) {
        console.error('Admin appointments error:', err.message);
        req.flash('error', 'Failed to load appointments.');
        res.redirect('/admin');
    }
});

// ─── POST /admin/appointments/:id/status ─ Update Booking Status ─────────────────
router.post('/appointments/:id/status', async (req, res) => {
    const VALID = ['pending','confirmed','in-progress','completed','cancelled','rejected'];
    try {
        const { status } = req.body;
        if (!VALID.includes(status)) {
            req.flash('error', 'Invalid status value.');
            return res.redirect('/admin/appointments');
        }
        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/admin/appointments');
        }
        req.flash('success', `Booking status updated to "${status}".`);
        res.redirect('/admin/appointments');
    } catch (err) {
        console.error('Update booking status error:', err.message);
        req.flash('error', 'Failed to update booking status.');
        res.redirect('/admin/appointments');
    }
});

// ─── POST /admin/appointments/:id/delete ─ Delete Booking ────────────────────────
router.post('/appointments/:id/delete', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndDelete(req.params.id);
        if (!booking) {
            req.flash('error', 'Booking not found.');
            return res.redirect('/admin/appointments');
        }
        req.flash('success', 'Appointment deleted successfully.');
        res.redirect('/admin/appointments');
    } catch (err) {
        console.error('Delete booking error:', err.message);
        req.flash('error', 'Failed to delete appointment.');
        res.redirect('/admin/appointments');
    }
});

module.exports = router;
