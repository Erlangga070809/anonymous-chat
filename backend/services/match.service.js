const { query } = require('../utils/db');
const { generateAnonymousId } = require('../utils/helpers');
const { calculateAge } = require('../utils/helpers');

const findMatch = async (userId, preferences) => {
    const userResult = await query(
        `SELECT id, gender, date_of_birth, country, language, interests
         FROM users WHERE id = $1`,
        [userId]
    );
    
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    const userAge = calculateAge(user.date_of_birth);
    
    await query(
        'UPDATE users SET is_searching = TRUE, last_match_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
    );
    
    const prefs = preferences || {};
    const preferredGender = prefs.preferredGender || 'anyone';
    const ageRange = prefs.ageRange || { min: 18, max: 99 };
    const preferredCountry = prefs.country || 'Any country';
    const preferredLanguage = prefs.language || null;
    const preferredInterests = prefs.interests || [];
    
    const recentMatchExclusion = await query(
        `SELECT matched_with FROM match_history 
         WHERE user_id = $1 AND ended_at IS NULL
         ORDER BY matched_at DESC LIMIT 50`,
        [userId]
    );
    
    const excludedUserIds = recentMatchExclusion.rows.map(row => row.matched_with);
    excludedUserIds.push(userId);
    
    const blockedUsers = await query(
        'SELECT blocked_id FROM blocks WHERE blocker_id = $1',
        [userId]
    );
    
    excludedUserIds.push(...blockedUsers.rows.map(row => row.blocked_id));
    
    const blockedByUsers = await query(
        'SELECT blocker_id FROM blocks WHERE blocked_id = $1',
        [userId]
    );
    
    excludedUserIds.push(...blockedByUsers.rows.map(row => row.blocker_id));
    
    let matchQuery = `
        SELECT u.id, u.gender, u.date_of_birth, u.country, u.language, u.interests,
               u.is_online, u.is_searching
        FROM users u
        WHERE u.id != ALL($1::uuid[])
        AND u.is_online = TRUE
        AND u.is_searching = TRUE
        AND u.is_banned = FALSE
        AND u.is_suspended = FALSE
    `;
    
    const queryParams = [excludedUserIds];
    let paramCount = 2;
    
    if (preferredGender !== 'anyone') {
        matchQuery += ` AND u.gender = $${paramCount}`;
        queryParams.push(preferredGender);
        paramCount++;
    }
    
    matchQuery += ` AND EXTRACT(YEAR FROM AGE(u.date_of_birth)) BETWEEN $${paramCount} AND $${paramCount + 1}`;
    queryParams.push(ageRange.min || 18, ageRange.max || 99);
    paramCount += 2;
    
    if (preferredCountry !== 'Any country') {
        matchQuery += ` AND u.country = $${paramCount}`;
        queryParams.push(preferredCountry);
        paramCount++;
    }
    
    if (preferredLanguage) {
        matchQuery += ` AND u.language = $${paramCount}`;
        queryParams.push(preferredLanguage);
        paramCount++;
    }
    
    if (preferredInterests.length > 0) {
        matchQuery += ` AND u.interests && $${paramCount}::text[]`;
        queryParams.push(preferredInterests);
        paramCount++;
    }
    
    matchQuery += ` ORDER BY 
        CASE WHEN u.interests && $${paramCount}::text[] THEN 0 ELSE 1 END,
        CASE WHEN u.language = $${paramCount + 1} THEN 0 ELSE 1 END,
        CASE WHEN u.gender = $${paramCount + 2} THEN 0 ELSE 1 END,
        RANDOM()
        LIMIT 1`;
    
    queryParams.push(user.interests || [], user.language || '', preferredGender);
    
    const matchResult = await query(matchQuery, queryParams);
    
    if (matchResult.rows.length === 0) {
        await query(
            'UPDATE users SET is_searching = FALSE WHERE id = $1',
            [userId]
        );
        return null;
    }
    
    const matchedUser = matchResult.rows[0];
    
    const userAnonymousId = generateAnonymousId();
    const matchedAnonymousId = generateAnonymousId();
    
    const conversationResult = await query(
        `INSERT INTO conversations (user1_id, user2_id, user1_anonymous_id, user2_anonymous_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, matchedUser.id, userAnonymousId, matchedAnonymousId]
    );
    
    const conversationId = conversationResult.rows[0].id;
    
    await query(
        `INSERT INTO anonymous_sessions (user_id, anonymous_id, conversation_id, expires_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
                ($4, $5, $3, CURRENT_TIMESTAMP + INTERVAL '24 hours')`,
        [userId, userAnonymousId, conversationId, matchedUser.id, matchedAnonymousId]
    );
    
    await query(
        `INSERT INTO match_history (user_id, matched_with, conversation_id)
         VALUES ($1, $2, $3), ($2, $1, $3)`,
        [userId, matchedUser.id, conversationId]
    );
    
    await query(
        'UPDATE users SET is_searching = FALSE WHERE id IN ($1, $2)',
        [userId, matchedUser.id]
    );
    
    await query(
        'UPDATE conversations SET status = $1 WHERE id = $2',
        ['active', conversationId]
    );
    
    return {
        conversationId,
        matchedUserId: matchedUser.id,
        anonymousId: userAnonymousId,
        matchedAnonymousId: matchedAnonymousId,
        matchedAt: new Date().toISOString()
    };
};

const cancelSearch = async (userId) => {
    await query(
        'UPDATE users SET is_searching = FALSE WHERE id = $1',
        [userId]
    );
};

const endConversation = async (userId, conversationId, reason = 'next') => {
    const conversation = await query(
        `SELECT user1_id, user2_id FROM conversations WHERE id = $1`,
        [conversationId]
    );
    
    if (conversation.rows.length === 0) {
        throw new Error('Conversation not found');
    }
    
    const { user1_id, user2_id } = conversation.rows[0];
    
    if (userId !== user1_id && userId !== user2_id) {
        throw new Error('Not authorized to end this conversation');
    }
    
    await query(
        `UPDATE conversations SET status = 'ended', ended_at = CURRENT_TIMESTAMP, ended_by = $1
         WHERE id = $2`,
        [userId, conversationId]
    );
    
    await query(
        `UPDATE match_history SET ended_at = CURRENT_TIMESTAMP, end_reason = $1
         WHERE conversation_id = $2 AND ended_at IS NULL`,
        [reason, conversationId]
    );
    
    await query(
        'DELETE FROM anonymous_sessions WHERE conversation_id = $1',
        [conversationId]
    );
    
    await query(
        'UPDATE users SET is_searching = FALSE WHERE id IN ($1, $2)',
        [user1_id, user2_id]
    );
};

const checkRecentMatch = async (userId, targetUserId) => {
    const result = await query(
        `SELECT id FROM match_history 
         WHERE user_id = $1 AND matched_with = $2 
         AND matched_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
         LIMIT 1`,
        [userId, targetUserId]
    );
    
    return result.rows.length > 0;
};

module.exports = {
    findMatch,
    cancelSearch,
    endConversation,
    checkRecentMatch
};
