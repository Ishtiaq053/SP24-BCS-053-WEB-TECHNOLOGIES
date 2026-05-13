// ─── Auth Middleware ───────────────────────────────────────────────────────────

/**
 * isLoggedIn — Redirect guests to /login with a contextual flash message.
 */
function isLoggedIn(req, res, next) {
    if (req.session && req.session.userId) {
        return next();
    }
    // Show a specific message for worker detail / checkout access attempts
    const isWorkerDetail = /^\/workers\/[^/]+$/.test(req.path);
    const isCheckout     = req.path === '/checkout';
    if (isWorkerDetail || isCheckout) {
        req.flash('warning', 'Please login to explore worker details and booking.');
    } else {
        req.flash('warning', 'Please login to continue.');
    }
    res.redirect('/login');
}

/**
 * isAdmin — Allow only users with role === 'admin'.
 * Must be used AFTER isLoggedIn.
 */
function isAdmin(req, res, next) {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    req.flash('error', 'Access denied. This area is for administrators only.');
    res.redirect('/workers');
}

module.exports = { isLoggedIn, isAdmin };
