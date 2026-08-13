const express = require('express');
const router = express.Router();
const matchController = require('../controllers/match.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticate, apiLimiter);

router.post('/find', matchController.findMatch);
router.post('/cancel', matchController.cancelSearch);
router.post('/end-conversation', matchController.endConversation);

module.exports = router;
