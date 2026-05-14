const express     = require('express');
const User        = require('../../models/User');
const verifyToken = require('../../middleware/verifyToken');

const router = express.Router();

// ─── All routes under /api/v1/user require a valid JWT ───────────────────────
router.use(verifyToken);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/user/profile
// Protected — returns the authenticated user's profile (no password field)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
    try {
        // req.user.user_id comes from the verified JWT payload
        const user = await User.findById(req.user.user_id).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        return res.status(200).json({
            success: true,
            data: { user }
        });

    } catch (err) {
        console.error('[API] GET /user/profile error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

module.exports = router;
