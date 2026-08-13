const matchService = require('../services/match.service');

const findMatch = async (req, res) => {
    try {
        const preferences = req.body;
        const match = await matchService.findMatch(req.userId, preferences);
        
        if (!match) {
            return res.json({ found: false, message: 'No match found' });
        }
        
        res.json({ found: true, match });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const cancelSearch = async (req, res) => {
    try {
        await matchService.cancelSearch(req.userId);
        res.json({ message: 'Search cancelled' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const endConversation = async (req, res) => {
    try {
        const { conversationId, reason } = req.body;
        await matchService.endConversation(req.userId, conversationId, reason);
        res.json({ message: 'Conversation ended' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    findMatch,
    cancelSearch,
    endConversation
};
