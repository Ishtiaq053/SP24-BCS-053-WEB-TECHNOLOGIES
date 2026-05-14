const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../../models/User');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/v1/auth/login
// Public — returns a JWT on valid credentials
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate required fields
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        // 2. Find user by email
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        // 3. Use generic message to avoid user enumeration
        const INVALID_MSG = 'Invalid credentials.';

        if (!user) {
            return res.status(401).json({ success: false, message: INVALID_MSG });
        }

        // 4. Compare submitted password against stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: INVALID_MSG });
        }

        // 5. Sign JWT — payload contains ONLY user_id and role (no PII)
        const token = jwt.sign(
            {
                user_id: user._id,
                role:    user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h'
            }
        );

        // 6. Return token + safe user info (password never included)
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
