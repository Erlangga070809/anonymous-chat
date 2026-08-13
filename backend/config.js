require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000,
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    sessionSecret: process.env.SESSION_SECRET,
    adminEmail: process.env.ADMIN_EMAIL,
    adminPassword: process.env.ADMIN_PASSWORD,
    nodeEnv: process.env.NODE_ENV || 'development',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880,
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX) || 100
};
