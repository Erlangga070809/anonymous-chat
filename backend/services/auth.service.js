const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('../utils/db');
const { validateEmail, validateUsername, validatePassword, validateName, validateAge } = require('../utils/validators');
const { sanitizeObject } = require('../utils/sanitizer');

const registerUser = async (userData) => {
    const sanitized = sanitizeObject(userData);
    const { name, username, email, password, gender, dateOfBirth } = sanitized;
    
    if (!validateName(name)) {
        throw new Error('Invalid name');
    }
    
    if (!validateUsername(username)) {
        throw new Error('Invalid username');
    }
    
    if (!validateEmail(email)) {
        throw new Error('Invalid email');
    }
    
    if (!validatePassword(password)) {
        throw new Error('Password must be at least 8 characters');
    }
    
    const age = validateAge(dateOfBirth);
    if (age < 18) {
        throw new Error('Must be at least 18 years old');
    }
    
    const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email.toLowerCase(), username]
    );
    
    if (existingUser.rows.length > 0) {
        throw new Error('Email or username already exists');
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await query(
        `INSERT INTO users (name, username, email, password_hash, gender, date_of_birth)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, username, email, gender, date_of_birth, role`,
        [name, username, email.toLowerCase(), passwordHash, gender, dateOfBirth]
    );
    
    return result.rows[0];
};

const loginUser = async (email, password) => {
    const result = await query(
        'SELECT * FROM users WHERE email = $1',
        [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Invalid credentials');
    }
    
    const user = result.rows[0];
    
    if (user.is_banned) {
        throw new Error('Account is banned');
    }
    
    if (user.is_suspended && user.suspended_until && new Date(user.suspended_until) > new Date()) {
        throw new Error('Account is suspended');
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
        throw new Error('Invalid credentials');
    }
    
    await query(
        'UPDATE users SET is_online = TRUE, last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
    );
    
    const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
    );
    
    const refreshToken = require('../utils/helpers').generateToken();
    const refreshExpiry = new Date();
    refreshExpiry.setDate(refreshExpiry.getDate() + 30);
    
    await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, refreshToken, refreshExpiry]
    );
    
    return {
        user: {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatar_url
        },
        token,
        refreshToken
    };
};

const logoutUser = async (userId) => {
    await query(
        'UPDATE users SET is_online = FALSE, is_searching = FALSE, last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
    );
    
    await query(
        'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1 AND revoked = FALSE',
        [userId]
    );
};

const getCurrentUser = async (userId) => {
    const result = await query(
        `SELECT id, name, username, email, gender, date_of_birth, country, language,
                avatar_url, bio, interests, role, is_online, is_searching, created_at
         FROM users WHERE id = $1`,
        [userId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    
    return result.rows[0];
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
};
