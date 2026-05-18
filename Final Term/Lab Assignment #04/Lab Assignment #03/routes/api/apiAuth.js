const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../../models/User');

const router = express.Router();

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });

        const INVALID_MSG = 'Invalid credentials.';

        if (!user) {
            return res.status(401).json({ success: false, message: INVALID_MSG });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: INVALID_MSG });
        }

        const token = jwt.sign(
            { user_id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful.',
            token,
            user: {
                id:    user._id,
                name:  user.name,
                email: user.email,
                role:  user.role
            }
        });

    } catch (err) {
        console.error('[API] POST /auth/login error:', err.message);
        return res.status(500).json({
            success: false,
            message: 'Server error. Please try again later.'
        });
    }
});

module.exports = router;
