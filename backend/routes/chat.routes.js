const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { chatLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticate);

router.get('/conversations/:conversationId/messages', chatController.getMessages);
router.post('/messages', chatLimiter, chatController.saveMessage);
router.put('/messages/:messageId', chatController.editMessage);
router.delete('/messages/:messageId', chatController.deleteMessage);
router.post('/messages/:messageId/reactions', chatController.addReaction);
router.get('/conversations/:conversationId', chatController.getConversationInfo);

module.exports = router;
