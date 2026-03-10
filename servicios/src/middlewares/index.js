// index.js
const errorMiddleware = require('./error_Middleware');
const authMiddleware = require('./auth_Middleware');
const validationMiddleware = require('./validation_Middleware');

module.exports = {
    errorMiddleware,
    authMiddleware,
    validationMiddleware,

    setup: (app) => {
        // Rate limiting global
        app.use(authMiddleware.rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100 // límite de solicitudes por ventana
        }));

        // Middleware de manejo de errores (debe ir al final)
        app.use(errorMiddleware.handle.bind(errorMiddleware));
        app.use(errorMiddleware.handleNotFound.bind(errorMiddleware));
    }
};