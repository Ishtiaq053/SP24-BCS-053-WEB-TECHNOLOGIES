const express  = require('express');
const mongoose = require('mongoose');
const Worker   = require('../../models/Worker');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/workers
// Public — paginated worker list with search, category, price & sort filters
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        // 1. Parse & sanitise query params
        const search   = (req.query.search   || '').trim();
        const category = (req.query.category || '').trim();
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        const sort     = (req.query.sort     || '').trim();
        const page     = Math.max(1, parseInt(req.query.page)  || 1);
        const limit    = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        // 2. Build Mongoose filter
        const filter = {};

        if (search) {
            // Escape regex special characters to prevent ReDoS attacks
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.name = { $regex: escapedSearch, $options: 'i' };
        }

        if (category) {
            filter.category = category;
        }

        // Only apply price filter when at least one bound is a valid finite number
        const minNum = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : NaN;
        const maxNum = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : NaN;
        if (!isNaN(minNum) || !isNaN(maxNum)) {
            filter.price = {};
            if (!isNaN(minNum)) filter.price.$gte = minNum;
            if (!isNaN(maxNum)) filter.price.$lte = maxNum;
        }

        // 3. Build sort object
        let sortObj = { createdAt: -1 }; // default: newest first
        switch (sort) {
            case 'price_asc':       sortObj = { price: 1 };       break;
            case 'price_desc':      sortObj = { price: -1 };      break;
            case 'rating_desc':     sortObj = { rating: -1 };     break;
            case 'experience_desc': sortObj = { experience: -1 }; break;
        }

        // 4. Pagination math
        const totalWorkers = await Worker.countDocuments(filter);
        const totalPages   = Math.ceil(totalWorkers / limit) || 1;
        const currentPage  = Math.min(page, totalPages);
        const skip         = (currentPage - 1) * limit;

        // 5. Fetch workers
        const workers = await Worker.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

        // 6. Return JSON only — never render EJS
        return res.status(200).json({
            success: true,
            data: {
                workers,
                pagination: {
                    currentPage,
                    totalPages,
                    totalWorkers,
                    limit,
                    hasNextPage: currentPage < totalPages,
                    hasPrevPage: currentPage > 1
                },
                filters: {
                    search,
                    category,
                    minPrice: minPrice || null,
                    maxPrice: maxPrice || null,
                    sort
                }
            }
        });

    } catch (err) {
        console.error('[API] GET /workers error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/workers/:id
// Public — single worker by MongoDB ObjectId
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validate ObjectId format before hitting the DB
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid worker ID format.'
            });
        }

        // 2. Fetch worker
        const worker = await Worker.findById(id);

        if (!worker) {
            return res.status(404).json({
                success: false,
                message: 'Worker not found.'
            });
        }

        return res.status(200).json({
            success: true,
            data: { worker }
        });

    } catch (err) {
        console.error('[API] GET /workers/:id error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

module.exports = router;
