const express     = require('express');
const mongoose    = require('mongoose');
const Order       = require('../../models/Order');
const verifyToken = require('../../middleware/verifyToken');

const router = express.Router();

// ─── All routes under /api/v1/orders require a valid JWT ─────────────────────
router.use(verifyToken);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/orders
// Protected — create a new order for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { items, notes } = req.body;

        // 1. Validate items array
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order must contain at least one item.'
            });
        }

        // 2. Validate each item has required fields
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.workerId || !item.workerName || item.price === undefined) {
                return res.status(400).json({
                    success: false,
                    message: `Item at index ${i} is missing required fields (workerId, workerName, price).`
                });
            }
            // Validate workerId is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(item.workerId)) {
                return res.status(400).json({
                    success: false,
                    message: `Item at index ${i} has an invalid workerId format.`
                });
            }
            if (typeof item.price !== 'number' || item.price < 0) {
                return res.status(400).json({
                    success: false,
                    message: `Item at index ${i} has an invalid price.`
                });
            }
        }

        // 3. Calculate totalAmount from items (price × quantity)
        const totalAmount = items.reduce((sum, item) => {
            const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
            return sum + item.price * qty;
        }, 0);

        // 4. Create the order — use req.user.user_id injected by verifyToken
        const order = await Order.create({
            user:        req.user.user_id,
            items,
            totalAmount,
            notes:       notes || ''
        });

        // 5. Return 201 Created
        return res.status(201).json({
            success: true,
            message: 'Order placed successfully.',
            data: { order }
        });

    } catch (err) {
        console.error('[API] POST /orders error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

module.exports = router;
