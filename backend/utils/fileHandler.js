const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed'
];
const allowedVoiceTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'];

const maxImageSize = 5 * 1024 * 1024;
const maxFileSize = 10 * 1024 * 1024;
const maxVoiceSize = 5 * 1024 * 1024;

const validateImage = (file) => {
    if (!file) {
        throw new Error('No file provided');
    }
    
    if (!allowedImageTypes.includes(file.mimetype)) {
        throw new Error('Invalid image type');
    }
    
    if (file.size > maxImageSize) {
        throw new Error('Image too large');
    }
    
    return true;
};

const validateFile = (file) => {
    if (!file) {
        throw new Error('No file provided');
    }
    
    if (!allowedFileTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type');
    }
    
    if (file.size > maxFileSize) {
        throw new Error('File too large');
    }
    
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.dll', '.jar'];
    const fileName = file.originalname.toLowerCase();
    
    for (const ext of dangerousExtensions) {
        if (fileName.endsWith(ext)) {
            throw new Error('File type not allowed');
        }
    }
    
    return true;
};

const validateVoice = (file) => {
    if (!file) {
        throw new Error('No file provided');
    }
    
    if (!allowedVoiceTypes.includes(file.mimetype)) {
        throw new Error('Invalid voice type');
    }
    
    if (file.size > maxVoiceSize) {
        throw new Error('Voice message too large');
    }
    
    return true;
};

const saveFile = async (file, type) => {
    const ext = path.extname(file.originalname);
    const fileName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const uploadDir = path.join(__dirname, '../uploads', type);
    
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filePath = path.join(uploadDir, fileName);
    
    await file.mv(filePath);
    
    return `/uploads/${type}/${fileName}`;
};

module.exports = {
    validateImage,
    validateFile,
    validateVoice,
    saveFile
};
