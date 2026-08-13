const chatService = require('../services/chat.service');

const getMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const messages = await chatService.getMessages(conversationId, req.userId);
        res.json(messages);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const saveMessage = async (req, res) => {
    try {
        const message = await chatService.saveMessage(req.userId, req.body);
        res.status(201).json(message);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;
        const updated = await chatService.editMessage(req.userId, messageId, content);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        await chatService.deleteMessage(req.userId, messageId);
        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { reaction } = req.body;
        const result = await chatService.addReaction(req.userId, messageId, reaction);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getConversationInfo = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const info = await chatService.getConversationInfo(req.userId, conversationId);
        res.json(info);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getMessages,
    saveMessage,
    editMessage,
    deleteMessage,
    addReaction,
    getConversationInfo
};
