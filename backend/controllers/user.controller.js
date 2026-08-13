const userService = require('../services/user.service');

const getProfile = async (req, res) => {
    try {
        const profile = await userService.getUserProfile(req.userId);
        res.json(profile);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const updated = await userService.updateProfile(req.userId, req.body);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updateAvatar = async (req, res) => {
    try {
        const { avatarUrl } = req.body;
        const result = await userService.updateAvatar(req.userId, avatarUrl);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const updatePreferences = async (req, res) => {
    try {
        const prefs = await userService.updatePreferences(req.userId, req.body);
        res.json(prefs);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getPreferences = async (req, res) => {
    try {
        const prefs = await userService.getPreferences(req.userId);
        res.json(prefs);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const getBlockedUsers = async (req, res) => {
    try {
        const blocked = await userService.getBlockedUsers(req.userId);
        res.json(blocked);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const unblockUser = async (req, res) => {
    try {
        const { blockedId } = req.params;
        await userService.unblockUser(req.userId, blockedId);
        res.json({ message: 'User unblocked' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const deleteAccount = async (req, res) => {
    try {
        await userService.deleteAccount(req.userId);
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    updateAvatar,
    updatePreferences,
    getPreferences,
    getBlockedUsers,
    unblockUser,
    deleteAccount
};
