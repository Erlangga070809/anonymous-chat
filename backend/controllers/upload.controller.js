const path = require('path');
const { validateImage, validateFile, validateVoice } = require('../utils/fileHandler');

const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        validateImage(req.file);
        
        const fileUrl = `/uploads/images/${req.file.filename}`;
        
        res.status(201).json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const uploadVoice = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        validateVoice(req.file);
        
        const fileUrl = `/uploads/voice/${req.file.filename}`;
        
        res.status(201).json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        validateFile(req.file);
        
        const fileUrl = `/uploads/files/${req.file.filename}`;
        
        res.status(201).json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }
        
        if (!req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ error: 'Avatar must be an image' });
        }
        
        if (req.file.size > 2 * 1024 * 1024) {
            return res.status(400).json({ error: 'Avatar too large' });
        }
        
        const fileUrl = `/uploads/avatars/${req.file.filename}`;
        
        res.status(201).json({ fileUrl });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

module.exports = {
    uploadImage,
    uploadVoice,
    uploadFile,
    uploadAvatar
};
