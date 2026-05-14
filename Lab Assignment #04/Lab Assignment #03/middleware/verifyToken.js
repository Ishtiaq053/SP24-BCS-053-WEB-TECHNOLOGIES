const jwt = require('jsonwebtoken');

/**
 * verifyToken — JWT authentication middleware for /api/v1 routes.
 * Does NOT touch express-session.
 */
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. No token provided.'
        });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Invalid token format. Use: Bearer <token>'
        });
    }

    const token = parts[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;   // { user_id, role, iat, exp }
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: 'Token has expired. Please log in again.'
            });
        }
        return res.status(403).json({
            success: false,
            message: 'Invalid token. Access denied.'
        });
    }
};

module.exports = verifyToken;
