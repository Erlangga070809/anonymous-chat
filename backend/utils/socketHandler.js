const jwt = require('jsonwebtoken');
const config = require('../config');
const { query } = require('./db');
const matchService = require('../services/match.service');
const chatService = require('../services/chat.service');

const initializeSocket = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            
            if (!token) {
                return next(new Error('Authentication required'));
            }
            
            const decoded = jwt.verify(token, config.jwtSecret);
            socket.userId = decoded.userId;
            
            await query(
                'UPDATE users SET is_online = TRUE, last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
                [socket.userId]
            );
            
            next();
        } catch (error) {
            next(new Error('Authentication failed'));
        }
    });
    
    io.on('connection', (socket) => {
        const userId = socket.userId;
        
        socket.join(`user:${userId}`);
        
        io.emit('user:online', { userId });
        
        socket.on('match:find', async (preferences) => {
            try {
                socket.emit('match:status', { status: 'searching', message: 'Finding someone...' });
                
                const match = await matchService.findMatch(userId, preferences);
                
                if (!match) {
                    socket.emit('match:status', { status: 'no_match', message: 'No exact match. Expanding search...' });
                    
                    setTimeout(async () => {
                        const fallbackMatch = await matchService.findMatch(userId, {});
                        
                        if (fallbackMatch) {
                            socket.emit('match:found', { match: fallbackMatch });
                            io.to(`user:${userId}`).emit('conversation:started', { conversationId: fallbackMatch.conversationId });
                            io.to(`user:${fallbackMatch.matchedUserId}`).emit('conversation:started', { conversationId: fallbackMatch.conversationId });
                        } else {
                            socket.emit('match:timeout', { message: 'No one is available right now. Please try again.' });
                        }
                    }, 3000);
                } else {
                    socket.emit('match:found', { match });
                    io.to(`user:${userId}`).emit('conversation:started', { conversationId: match.conversationId });
                    io.to(`user:${match.matchedUserId}`).emit('conversation:started', { conversationId: match.conversationId });
                }
            } catch (error) {
                socket.emit('match:error', { message: error.message });
            }
        });
        
        socket.on('match:cancel', async () => {
            try {
                await matchService.cancelSearch(userId);
                socket.emit('match:cancelled', { message: 'Search cancelled' });
            } catch (error) {
                socket.emit('match:error', { message: error.message });
            }
        });
        
        socket.on('chat:join', async (conversationId) => {
            try {
                const canJoin = await chatService.canAccessConversation(userId, conversationId);
                
                if (canJoin) {
                    socket.join(`conversation:${conversationId}`);
                    socket.emit('chat:joined', { conversationId });
                    
                    const messages = await chatService.getMessages(conversationId, userId);
                    socket.emit('chat:history', { messages });
                } else {
                    socket.emit('chat:error', { message: 'Cannot access this conversation' });
                }
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('chat:leave', (conversationId) => {
            socket.leave(`conversation:${conversationId}`);
        });
        
        socket.on('chat:message', async (data) => {
            try {
                const message = await chatService.saveMessage(userId, data);
                io.to(`conversation:${data.conversationId}`).emit('chat:new_message', message);
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('chat:typing', (data) => {
            socket.to(`conversation:${data.conversationId}`).emit('chat:typing', {
                userId,
                isTyping: data.isTyping
            });
        });
        
        socket.on('chat:read', async (data) => {
            try {
                await chatService.markMessagesAsRead(userId, data.conversationId);
                io.to(`conversation:${data.conversationId}`).emit('chat:read', {
                    userId,
                    conversationId: data.conversationId
                });
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('chat:edit', async (data) => {
            try {
                const updated = await chatService.editMessage(userId, data.messageId, data.content);
                io.to(`conversation:${data.conversationId}`).emit('chat:edited', updated);
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('chat:delete', async (data) => {
            try {
                await chatService.deleteMessage(userId, data.messageId);
                io.to(`conversation:${data.conversationId}`).emit('chat:deleted', {
                    messageId: data.messageId,
                    conversationId: data.conversationId
                });
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('chat:react', async (data) => {
            try {
                const reaction = await chatService.addReaction(userId, data.messageId, data.reaction);
                io.to(`conversation:${data.conversationId}`).emit('chat:reaction', reaction);
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('chat:end', async (data) => {
            try {
                await matchService.endConversation(userId, data.conversationId, data.reason || 'next');
                io.to(`conversation:${data.conversationId}`).emit('conversation:ended', {
                    conversationId: data.conversationId,
                    reason: data.reason || 'next'
                });
            } catch (error) {
                socket.emit('chat:error', { message: error.message });
            }
        });
        
        socket.on('disconnect', async () => {
            await query(
                'UPDATE users SET is_online = FALSE, is_searching = FALSE, last_active_at = CURRENT_TIMESTAMP WHERE id = $1',
                [userId]
            );
            
            io.emit('user:offline', { userId });
        });
    });
};

module.exports = { initializeSocket };
