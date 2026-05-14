const express     = require('express');
const User        = require('../../models/User');
const verifyToken = require('../../middleware/verifyToken');

const router = express.Router();

router.use(verifyToken);

// GET /api/v1/user/profile  — protected
router.get('/profile', async (req, res) => {
    try {
        const user = await User.findById(req.user.user_id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.status(200).json({ success: true, data: { user } });

    } catch (err) {
        console.error('[API] GET /user/profile error:', err.message);
        return res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

module.exports = router;
