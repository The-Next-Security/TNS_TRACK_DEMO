// authMiddleware.js
const configLoader = require('../config/js_files/config-loader');
const jwt = require('jsonwebtoken');
const { AuthenticationError, BusinessError } = require('../utils/errors');

class AuthMiddleware {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || '';
        this.jwtIssuer = process.env.JWT_ISSUER || '';
    }

    /**
     * Carga config JWT. Llamar desde boot() tras configLoader.initialize().
     */
    init() {
        const cfg = configLoader.getConfig().jwt || {};
        this.jwtSecret = process.env.JWT_SECRET || cfg.secret || this.jwtSecret;
        this.jwtIssuer = process.env.JWT_ISSUER || cfg.issuer || this.jwtIssuer;
    }

    generateToken(payload) {
        return jwt.sign(payload, this.jwtSecret, {
            issuer: this.jwtIssuer,
            expiresIn: '1h'
        });
    }

    setAuthCookies(req, res, access, refresh, opts = {}) {
        const isProduction = process.env.NODE_ENV === 'production';

        // ✅ Configuración de cookies más segura
        const common = {
            httpOnly: true, // ✅ Protección XSS
            secure: isProduction, // ✅ HTTPS obligatorio en producción
            sameSite: isProduction ? 'strict' : 'lax', // ✅ Más restrictivo en producción
            path: '/', // ✅ CRÍTICO: Cookie disponible en todas las rutas
            ...opts
        };

        // ✅ Tiempos de expiración ajustados
        res.cookie('access', access, {
            ...common,
            maxAge: 15 * 60 * 1000 // 15 minutos
        });

        res.cookie('refresh', refresh, {
            ...common,
            maxAge: 7 * 24 * 60 * 60 * 1000 // ✅ 7 días en vez de 30
        });
    }

    clearAuthCookies(res) {
        res.clearCookie('access');
        res.clearCookie('refresh');
    }

    async authenticate(req, res, next) {
        const cookieToken = req.cookies && req.cookies.access ? req.cookies.access : null;
        const authHeader = req.headers.authorization;
        const headerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
        const token = cookieToken || headerToken;

        // ✅ DEV BYPASS: Si no hay token y estamos en desarrollo, crear usuario mock
        if (!token) {
            const isProduction = process.env.NODE_ENV === 'production';
            if (!isProduction) {
                req.user = {
                    userId: 1,
                    id: 1,
                    email: 'dev@localhost',
                    username: 'dev-admin',
                    role: 'admin',
                    permissions: ['generate_reports', 'send_reports', 'schedule_reports', 'download_reports', 'admin'],
                    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
                };
                return next();
            }
            return next(new AuthenticationError('No authentication token provided or invalid format'));
        }

        try {
            const decoded = jwt.verify(token, this.jwtSecret, { issuer: this.jwtIssuer });

            // ✅ Validar tokenVersion si existe en el token
            if (decoded.tokenVersion !== undefined && decoded.userId) {
                const databaseService = require('../services/database-service');
                try {
                    const [users] = await databaseService.pool.query(
                        'SELECT tokenVersion FROM users WHERE id = ?',
                        [decoded.userId]
                    );

                    if (users && users[0]) {
                        const currentVersion = users[0].tokenVersion || 0;
                        if (decoded.tokenVersion !== currentVersion) {
                            return next(new AuthenticationError('Token has been revoked'));
                        }
                    }
                } catch (dbError) {
                    console.error('[Auth] ⚠️ Error validando tokenVersion:', dbError.message);
                    // Continuar si hay error de BD (fail-open para evitar lockout completo)
                }
            }

            req.user = decoded;
            next();
        } catch (error) {
            return next(new AuthenticationError('Invalid token'));
        }
    }


    async checkPermissions(requiredPermissions) {
        return async (req, res, next) => {
            try {
                if (!req.user) {
                    return next(new AuthenticationError('No user authenticated'));
                }

                const userPermissions = req.user.permissions || [];

                const hasAllPermissions = requiredPermissions.every(perm => userPermissions.includes(perm));

                if (!hasAllPermissions) {
                    return next(new BusinessError('Insufficient permissions', 'PERMISSION_DENIED'));
                }

                next();
            } catch (error) {
                next(error);
            }
        };
    }

    /**
     * Middleware to check if the authenticated user is an admin.
     * Checks for admin role in req.user.role or admin permission in req.user.permissions.
     *
     * Feature: 002-configurable-alert-schedules
     * Usage: Protect configuration modification endpoints
     */
    async requireAdmin(req, res, next) {
        try {
            if (!req.user) {
                return next(new AuthenticationError('No user authenticated'));
            }

            // Check if user has admin role or admin permission
            const isAdmin = req.user.role === 'admin' ||
                          req.user.role === 'administrator' ||
                          (req.user.permissions && req.user.permissions.includes('admin')) ||
                          (req.user.permissions && req.user.permissions.includes('config:write')) ||
                          (req.user.permissions && req.user.permissions.includes('view_configuration'));

            if (!isAdmin) {
                return next(new BusinessError('Admin privileges required', 'ADMIN_REQUIRED'));
            }

            next();
        } catch (error) {
            console.error('[Auth] ❌ requireAdmin error:', error);
            next(error);
        }
    }

    rateLimit(options = {}) {
        const {
            windowMs = 15 * 60 * 1000,
            max = 100,
        } = options;

        const requests = new Map();

        return (req, res, next) => {
            const clientIp = req.ip;
            const now = Date.now();
            const windowStart = now - windowMs;

            requests.forEach((timestamp, ip) => {
                if (timestamp < windowStart) {
                    requests.delete(ip);
                }
            });

            const clientRequests = Array.from(requests.entries()).filter(
                ([ip, timestamp]) => ip === clientIp && timestamp > windowStart
            ).length;

            if (clientRequests >= max) {
                return next(new BusinessError('Rate Limit Exceeded', 'RATE_LIMIT'));
            }

            requests.set(clientIp, now);
            next();
        };
    }
}

module.exports = new AuthMiddleware();