const express  = require('express');
const mongoose = require('mongoose');
const Worker   = require('../../models/Worker');

const router = express.Router();

// GET /api/v1/workers  — public, paginated + filtered
router.get('/', async (req, res) => {
    try {
        const search   = (req.query.search   || '').trim();
        const category = (req.query.category || '').trim();
        const minPrice = req.query.minPrice;
        const maxPrice = req.query.maxPrice;
        const sort     = (req.query.sort     || '').trim();
        const page     = Math.max(1, parseInt(req.query.page)  || 1);
        const limit    = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));

        const filter = {};

        if (search) {
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            filter.name = { $regex: escapedSearch, $options: 'i' };
        }

        if (category) {
            filter.category = category;
        }

        const minNum = minPrice !== undefined && minPrice !== '' ? Number(minPrice) : NaN;
        const maxNum = maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : NaN;
        if (!isNaN(minNum) || !isNaN(maxNum)) {
            filter.price = {};
            if (!isNaN(minNum)) filter.price.$gte = minNum;
            if (!isNaN(maxNum)) filter.price.$lte = maxNum;
        }

        let sortObj = { createdAt: -1 };
        switch (sort) {
            case 'price_asc':       sortObj = { price: 1 };       break;
            case 'price_desc':      sortObj = { price: -1 };      break;
            case 'rating_desc':     sortObj = { rating: -1 };     break;
            case 'experience_desc': sortObj = { experience: -1 }; break;
        }

        const totalWorkers = await Worker.countDocuments(filter);
        const totalPages   = Math.ceil(totalWorkers / limit) || 1;
        const currentPage  = Math.min(page, totalPages);
        const skip         = (currentPage - 1) * limit;

        const workers = await Worker.find(filter)
            .sort(sortObj)
            .skip(skip)
            .limit(limit);

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
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// GET /api/v1/workers/:id  — public, single worker
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid worker ID format.' });
        }

        const worker = await Worker.findById(id);

        if (!worker) {
            return res.status(404).json({ success: false, message: 'Worker not found.' });
        }

        return res.status(200).json({ success: true, data: { worker } });

    } catch (err) {
        console.error('[API] GET /workers/:id error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

module.exports = router;
