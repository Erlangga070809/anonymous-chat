const { query } = require('../utils/db');
const { sanitizeObject, sanitizeText } = require('../utils/sanitizer');
const { validateUsername, validateName } = require('../utils/validators');
const { calculateAge } = require('../utils/helpers');

const getUserProfile = async (userId) => {
    const result = await query(
        `SELECT id, name, username, email, gender, date_of_birth, country, language,
                avatar_url, bio, interests, role, created_at, updated_at
         FROM users WHERE id = $1`,
        [userId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    
    const user = result.rows[0];
    user.age = calculateAge(user.date_of_birth);
    
    return user;
};

const updateProfile = async (userId, profileData) => {
    const sanitized = sanitizeObject(profileData);
    const { name, username, bio, gender, dateOfBirth, country, language, interests } = sanitized;
    
    if (name && !validateName(name)) {
        throw new Error('Invalid name');
    }
    
    if (username && !validateUsername(username)) {
        throw new Error('Invalid username');
    }
    
    if (username) {
        const existingUsername = await query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [username, userId]
        );
        
        if (existingUsername.rows.length > 0) {
            throw new Error('Username already taken');
        }
    }
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (name) {
        updates.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
    }
    
    if (username) {
        updates.push(`username = $${paramCount}`);
        values.push(username);
        paramCount++;
    }
    
    if (bio !== undefined) {
        updates.push(`bio = $${paramCount}`);
        values.push(sanitizeText(bio));
        paramCount++;
    }
    
    if (gender) {
        updates.push(`gender = $${paramCount}`);
        values.push(gender);
        paramCount++;
    }
    
    if (dateOfBirth) {
        updates.push(`date_of_birth = $${paramCount}`);
        values.push(dateOfBirth);
        paramCount++;
    }
    
    if (country) {
        updates.push(`country = $${paramCount}`);
        values.push(country);
        paramCount++;
    }
    
    if (language) {
        updates.push(`language = $${paramCount}`);
        values.push(language);
        paramCount++;
    }
    
    if (interests && Array.isArray(interests)) {
        updates.push(`interests = $${paramCount}`);
        values.push(interests);
        paramCount++;
    }
    
    if (updates.length === 0) {
        throw new Error('No fields to update');
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);
    
    const result = await query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
         RETURNING id, name, username, email, gender, date_of_birth, country, language,
                   avatar_url, bio, interests, role, updated_at`,
        values
    );
    
    const user = result.rows[0];
    user.age = calculateAge(user.date_of_birth);
    
    return user;
};

const updateAvatar = async (userId, avatarUrl) => {
    const result = await query(
        'UPDATE users SET avatar_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING avatar_url',
        [avatarUrl, userId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('User not found');
    }
    
    return result.rows[0];
};

const updatePreferences = async (userId, preferences) => {
    const sanitized = sanitizeObject(preferences);
    const { preferredGender, ageRange, country, language, interests } = sanitized;
    
    let ageRangeJson = null;
    if (ageRange) {
        ageRangeJson = JSON.stringify(ageRange);
    }
    
    let interestsArray = null;
    if (interests && Array.isArray(interests)) {
        interestsArray = JSON.stringify(interests);
    }
    
    const result = await query(
        `INSERT INTO user_preferences (user_id, preferred_gender, age_range, country, language, interests)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) 
         DO UPDATE SET 
            preferred_gender = $2,
            age_range = $3,
            country = $4,
            language = $5,
            interests = $6,
            updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [userId, preferredGender, ageRangeJson, country, language, interestsArray]
    );
    
    return result.rows[0];
};

const getPreferences = async (userId) => {
    const result = await query(
        'SELECT * FROM user_preferences WHERE user_id = $1',
        [userId]
    );
    
    return result.rows[0] || null;
};

const getBlockedUsers = async (userId) => {
    const result = await query(
        `SELECT b.id, b.blocked_id, b.created_at,
                u.username, u.name
         FROM blocks b
         JOIN users u ON b.blocked_id = u.id
         WHERE b.blocker_id = $1
         ORDER BY b.created_at DESC`,
        [userId]
    );
    
    return result.rows;
};

const unblockUser = async (userId, blockedId) => {
    await query(
        'DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
        [userId, blockedId]
    );
};

const deleteAccount = async (userId) => {
    await query('DELETE FROM users WHERE id = $1', [userId]);
};

module.exports = {
    getUserProfile,
    updateProfile,
    updateAvatar,
    updatePreferences,
    getPreferences,
    getBlockedUsers,
    unblockUser,
    deleteAccount
};
