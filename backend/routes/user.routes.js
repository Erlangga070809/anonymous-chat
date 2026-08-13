const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

router.use(authenticate, apiLimiter);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.put('/avatar', userController.updateAvatar);
router.put('/preferences', userController.updatePreferences);
router.get('/preferences', userController.getPreferences);
router.get('/blocked-users', userController.getBlockedUsers);
router.delete('/blocked-users/:blockedId', userController.unblockUser);
router.delete('/account', userController.deleteAccount);

module.exports = router;
