const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const configLoader = require('../config/js_files/config-loader');

// Tiempos de vida por defecto
const ACCESS_TTL_SECONDS = 15 * 60;          // 15 minutos
const REFRESH_TTL_SECONDS = 30 * 24 * 3600;  // 30 días

// Almacenamiento en memoria para refresh tokens (usar BD en producción)
const refreshStore = new Map(); // key: jti, value: { userId, exp, revoked }

function getJwtConfig() {
  const cfg = configLoader.getConfig();
  const jwtCfg = cfg && cfg.jwt ? cfg.jwt : {};
  const secret = process.env.JWT_SECRET || jwtCfg.secret;
  const issuer = process.env.JWT_ISSUER || jwtCfg.issuer;
  if (!secret || !issuer) {
    throw new Error('JWT config missing (secret/issuer)');
  }
  return { secret, issuer };
}

function signAccess(payload) {
  const { secret, issuer } = getJwtConfig();
  return jwt.sign(payload, secret, {
    issuer,
    algorithm: 'HS256',
    expiresIn: ACCESS_TTL_SECONDS,
  });
}

function signRefresh(payload) {
  const { secret, issuer } = getJwtConfig();
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti, typ: 'refresh' }, secret, {
    issuer,
    algorithm: 'HS256',
    expiresIn: REFRESH_TTL_SECONDS,
  });
  const decoded = jwt.decode(token);
  const userId = payload.userId ?? payload.id_Usuario ?? payload.id;
  refreshStore.set(jti, {
    userId,
    exp: decoded && decoded.exp ? decoded.exp : Math.floor(Date.now() / 1000) + REFRESH_TTL_SECONDS,
    revoked: false,
  });
  return token;
}

function verifyAccess(token) {
  const { secret, issuer } = getJwtConfig();
  return jwt.verify(token, secret, { issuer, algorithms: ['HS256'] });
}

function verifyRefresh(token) {
  const { secret, issuer } = getJwtConfig();
  const decoded = jwt.verify(token, secret, { issuer, algorithms: ['HS256'] });
  if (decoded.typ !== 'refresh' || !decoded.jti) {
    throw new jwt.JsonWebTokenError('Invalid refresh token');
  }
  const record = refreshStore.get(decoded.jti);
  if (!record || record.revoked) {
    throw new jwt.JsonWebTokenError('Refresh token revoked/unknown');
  }
  return decoded;
}

function revokeRefresh(jti) {
  const record = refreshStore.get(jti);
  if (record) record.revoked = true;
}

module.exports = {
  signAccess,
  signRefresh,
  verifyAccess,
  verifyRefresh,
  revokeRefresh,
  ACCESS_TTL_SECONDS,
  REFRESH_TTL_SECONDS,
};


