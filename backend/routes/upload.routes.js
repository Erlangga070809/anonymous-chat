const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticate, apiLimiter);

router.post('/image', upload.single('file'), uploadController.uploadImage);
router.post('/voice', upload.single('file'), uploadController.uploadVoice);
router.post('/file', upload.single('file'), uploadController.uploadFile);
router.post('/avatar', upload.single('file'), uploadController.uploadAvatar);

module.exports = router;
