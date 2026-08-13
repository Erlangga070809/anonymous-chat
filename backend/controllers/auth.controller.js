const authService = require('../services/auth.service');

const register = async (req, res) => {
    try {
        const user = await authService.registerUser(req.body);
        res.status(201).json({ message: 'Registration successful', user });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

const logout = async (req, res) => {
    try {
        await authService.logoutUser(req.userId);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const me = async (req, res) => {
    try {
        const user = await authService.getCurrentUser(req.userId);
        res.json(user);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
};

module.exports = {
    register,
    login,
    logout,
    me
};
