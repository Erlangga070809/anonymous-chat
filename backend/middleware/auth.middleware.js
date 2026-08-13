const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../utils/db');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const decoded = jwt.verify(token, config.jwtSecret);
        
        const result = await query(
            'SELECT id, email, username, role, is_banned, is_suspended, suspended_until FROM users WHERE id = $1',
            [decoded.userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        const user = result.rows[0];
        
        if (user.is_banned) {
            return res.status(403).json({ error: 'Account is banned' });
        }
        
        if (user.is_suspended && user.suspended_until && new Date(user.suspended_until) > new Date()) {
            return res.status(403).json({ error: 'Account is suspended' });
        }
        
        req.user = user;
        req.userId = user.id;
        
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Auth middleware error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    authenticate
};
