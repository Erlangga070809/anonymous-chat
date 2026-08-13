const { query } = require('../utils/db');
const { sanitizeText } = require('../utils/sanitizer');

const canAccessConversation = async (userId, conversationId) => {
    const result = await query(
        `SELECT id FROM conversations 
         WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) 
         AND status = 'active'`,
        [conversationId, userId]
    );
    
    return result.rows.length > 0;
};

const getMessages = async (conversationId, userId) => {
    const canAccess = await canAccessConversation(userId, conversationId);
    
    if (!canAccess) {
        throw new Error('Cannot access this conversation');
    }
    
    const result = await query(
        `SELECT m.id, m.conversation_id, m.sender_id, m.message_type, m.content,
                m.file_url, m.file_name, m.file_size, m.mime_type,
                m.reply_to, m.is_edited, m.is_deleted, m.created_at, m.updated_at,
                s.anonymous_id as sender_anonymous_id,
                COALESCE(
                    (SELECT json_agg(json_build_object('reaction', mr.reaction, 'user_id', mr.user_id))
                     FROM message_reactions mr WHERE mr.message_id = m.id),
                    '[]'
                ) as reactions
         FROM messages m
         JOIN anonymous_sessions s ON s.user_id = m.sender_id AND s.conversation_id = m.conversation_id
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC`,
        [conversationId]
    );
    
    return result.rows;
};

const saveMessage = async (userId, data) => {
    const { conversationId, content, messageType = 'text', fileUrl, fileName, fileSize, mimeType, replyTo } = data;
    
    const canAccess = await canAccessConversation(userId, conversationId);
    
    if (!canAccess) {
        throw new Error('Cannot access this conversation');
    }
    
    if (messageType === 'text') {
        const sanitizedContent = sanitizeText(content);
        
        if (!sanitizedContent || sanitizedContent.length === 0) {
            throw new Error('Message content is required');
        }
        
        if (sanitizedContent.length > 5000) {
            throw new Error('Message too long');
        }
        
        const result = await query(
            `INSERT INTO messages (conversation_id, sender_id, message_type, content, reply_to)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, conversation_id, sender_id, message_type, content, reply_to, created_at`,
            [conversationId, userId, messageType, sanitizedContent, replyTo]
        );
        
        const message = result.rows[0];
        
        const anonymousResult = await query(
            `SELECT anonymous_id FROM anonymous_sessions 
             WHERE user_id = $1 AND conversation_id = $2`,
            [userId, conversationId]
        );
        
        message.sender_anonymous_id = anonymousResult.rows[0]?.anonymous_id;
        message.reactions = [];
        
        return message;
    } else {
        const result = await query(
            `INSERT INTO messages (conversation_id, sender_id, message_type, file_url, file_name, file_size, mime_type, reply_to)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, conversation_id, sender_id, message_type, file_url, file_name, file_size, mime_type, reply_to, created_at`,
            [conversationId, userId, messageType, fileUrl, fileName, fileSize, mimeType, replyTo]
        );
        
        const message = result.rows[0];
        
        const anonymousResult = await query(
            `SELECT anonymous_id FROM anonymous_sessions 
             WHERE user_id = $1 AND conversation_id = $2`,
            [userId, conversationId]
        );
        
        message.sender_anonymous_id = anonymousResult.rows[0]?.anonymous_id;
        message.reactions = [];
        
        return message;
    }
};

const editMessage = async (userId, messageId, newContent) => {
    const messageResult = await query(
        'SELECT * FROM messages WHERE id = $1',
        [messageId]
    );
    
    if (messageResult.rows.length === 0) {
        throw new Error('Message not found');
    }
    
    const message = messageResult.rows[0];
    
    if (message.sender_id !== userId) {
        throw new Error('Cannot edit this message');
    }
    
    if (message.message_type !== 'text') {
        throw new Error('Only text messages can be edited');
    }
    
    const sanitizedContent = sanitizeText(newContent);
    
    if (!sanitizedContent || sanitizedContent.length === 0) {
        throw new Error('Message content is required');
    }
    
    const result = await query(
        `UPDATE messages SET content = $1, is_edited = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING id, conversation_id, sender_id, message_type, content, is_edited, updated_at`,
        [sanitizedContent, messageId]
    );
    
    const updatedMessage = result.rows[0];
    
    const anonymousResult = await query(
        `SELECT anonymous_id FROM anonymous_sessions 
         WHERE user_id = $1 AND conversation_id = $2`,
        [userId, updatedMessage.conversation_id]
    );
    
    updatedMessage.sender_anonymous_id = anonymousResult.rows[0]?.anonymous_id;
    
    const reactionsResult = await query(
        `SELECT reaction, user_id FROM message_reactions WHERE message_id = $1`,
        [messageId]
    );
    
    updatedMessage.reactions = reactionsResult.rows;
    
    return updatedMessage;
};

const deleteMessage = async (userId, messageId) => {
    const messageResult = await query(
        'SELECT * FROM messages WHERE id = $1',
        [messageId]
    );
    
    if (messageResult.rows.length === 0) {
        throw new Error('Message not found');
    }
    
    const message = messageResult.rows[0];
    
    if (message.sender_id !== userId) {
        throw new Error('Cannot delete this message');
    }
    
    await query(
        'UPDATE messages SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [messageId]
    );
};

const addReaction = async (userId, messageId, reaction) => {
    const messageResult = await query(
        'SELECT conversation_id FROM messages WHERE id = $1',
        [messageId]
    );
    
    if (messageResult.rows.length === 0) {
        throw new Error('Message not found');
    }
    
    const conversationId = messageResult.rows[0].conversation_id;
    
    const canAccess = await canAccessConversation(userId, conversationId);
    
    if (!canAccess) {
        throw new Error('Cannot access this conversation');
    }
    
    const validReactions = ['👍', '❤️', '😊', '😂', '😮', '😢', '👏', '🎉'];
    
    if (!validReactions.includes(reaction)) {
        throw new Error('Invalid reaction');
    }
    
    const existingReaction = await query(
        'SELECT id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3',
        [messageId, userId, reaction]
    );
    
    if (existingReaction.rows.length > 0) {
        await query(
            'DELETE FROM message_reactions WHERE id = $1',
            [existingReaction.rows[0].id]
        );
        
        return {
            messageId,
            userId,
            reaction,
            removed: true
        };
    }
    
    const result = await query(
        `INSERT INTO message_reactions (message_id, user_id, reaction)
         VALUES ($1, $2, $3)
         RETURNING id, message_id, user_id, reaction, created_at`,
        [messageId, userId, reaction]
    );
    
    return {
        ...result.rows[0],
        removed: false
    };
};

const markMessagesAsRead = async (userId, conversationId) => {
    const canAccess = await canAccessConversation(userId, conversationId);
    
    if (!canAccess) {
        throw new Error('Cannot access this conversation');
    }
    
    await query(
        `UPDATE messages SET is_read = TRUE 
         WHERE conversation_id = $1 AND sender_id != $2 AND is_read = FALSE`,
        [conversationId, userId]
    );
};

const getConversationInfo = async (userId, conversationId) => {
    const result = await query(
        `SELECT c.id, c.user1_id, c.user2_id, c.user1_anonymous_id, c.user2_anonymous_id,
                c.status, c.started_at,
                CASE WHEN c.user1_id = $1 THEN c.user2_anonymous_id ELSE c.user1_anonymous_id END as other_anonymous_id,
                CASE WHEN c.user1_id = $1 THEN u2.is_online ELSE u1.is_online END as other_online_status
         FROM conversations c
         JOIN users u1 ON c.user1_id = u1.id
         JOIN users u2 ON c.user2_id = u2.id
         WHERE c.id = $2 AND (c.user1_id = $1 OR c.user2_id = $1)`,
        [userId, conversationId]
    );
    
    if (result.rows.length === 0) {
        throw new Error('Conversation not found');
    }
    
    return result.rows[0];
};

module.exports = {
    canAccessConversation,
    getMessages,
    saveMessage,
    editMessage,
    deleteMessage,
    addReaction,
    markMessagesAsRead,
    getConversationInfo
};
