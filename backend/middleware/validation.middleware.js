const { validateEmail, validateUsername, validatePassword, validateName } = require('../utils/validators');

const validateRegistration = (req, res, next) => {
    const { name, username, email, password, gender, dateOfBirth } = req.body;
    
    if (!name || !username || !email || !password || !gender || !dateOfBirth) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    if (!validateName(name)) {
        return res.status(400).json({ error: 'Invalid name' });
    }
    
    if (!validateUsername(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 characters, alphanumeric or underscore' });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    if (!validatePassword(password)) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    if (!['male', 'female', 'other'].includes(gender)) {
        return res.status(400).json({ error: 'Invalid gender' });
    }
    
    next();
};

const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (!validateEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
    }
    
    next();
};

module.exports = {
    validateRegistration,
    validateLogin
};
