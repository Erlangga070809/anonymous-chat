const rateLimit = require('express-rate-limit');
const config = require('../config');

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Message rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    authLimiter,
    apiLimiter,
    chatLimiter
};
