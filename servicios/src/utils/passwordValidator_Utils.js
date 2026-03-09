// src/utils/passwordValidator.js

const MIN_LENGTH = 8; // Mínimo 8 caracteres para seguridad
const MAX_LENGTH = 128; // Límite razonable

/**
 * Valida la fortaleza de una contraseña según estándares de seguridad
 * @param {string} password - Contraseña a validar
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];

  // Validar que existe
  if (!password) {
    errors.push('La contraseña es requerida');
    return { isValid: false, errors };
  }

  // Validar longitud mínima
  if (password.length < MIN_LENGTH) {
    errors.push(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
  }

  // Validar longitud máxima (prevenir ataques DoS)
  if (password.length > MAX_LENGTH) {
    errors.push(`La contraseña no debe exceder ${MAX_LENGTH} caracteres`);
  }

  // Validar al menos una letra minúscula
  if (!/[a-z]/.test(password)) {
    errors.push('Debe incluir al menos una letra minúscula (a-z)');
  }

  // Validar al menos una letra mayúscula
  if (!/[A-Z]/.test(password)) {
    errors.push('Debe incluir al menos una letra mayúscula (A-Z)');
  }

  // Validar al menos un número
  if (!/\d/.test(password)) {
    errors.push('Debe incluir al menos un número (0-9)');
  }

  // Validar al menos un símbolo especial
  if (!/[@$!%*?&.]/.test(password)) {
    errors.push('Debe incluir al menos un símbolo especial (@$!%*?&.)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Genera un mensaje de error formateado para el usuario
 * @param {string[]} errors - Array de errores de validación
 * @returns {string} - Mensaje formateado
 */
function formatPasswordErrors(errors) {
  if (errors.length === 0) return '';

  return 'Contraseña inválida:\n' + errors.map((err, i) => `${i + 1}. ${err}`).join('\n');
}

module.exports = {
  validatePassword,
  formatPasswordErrors,
  MIN_LENGTH,
  MAX_LENGTH
};
