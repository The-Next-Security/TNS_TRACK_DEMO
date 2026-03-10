/**
 * Email Validator Utility
 * Validates email addresses for report sending
 *
 * @module emailValidator
 */

const configLoader = require('../../config/js_files/configLoader_Config');

// RFC 5322 compliant email regex (simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Get max recipients from config or use default
const DEFAULT_MAX_RECIPIENTS = 20;

/**
 * Get maximum allowed recipients from configuration
 * @returns {number} Maximum number of recipients allowed
 */
function getMaxRecipients() {
  try {
    const emailConfig = configLoader.getValue('email.reports');
    return emailConfig?.max_recipients_per_email || DEFAULT_MAX_RECIPIENTS;
  } catch (error) {
    console.warn('[EmailValidator] Could not load config, using default max recipients:', DEFAULT_MAX_RECIPIENTS);
    return DEFAULT_MAX_RECIPIENTS;
  }
}

/**
 * Validates a single email address format
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email format is valid
 */
function isValidEmailFormat(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Check basic requirements
  if (trimmedEmail.length === 0 || trimmedEmail.length > 254) {
    return false;
  }

  // Check format using regex
  return EMAIL_REGEX.test(trimmedEmail);
}

/**
 * Validates an array of email addresses
 * @param {string[]} emails - Array of email addresses to validate
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - True if all emails are valid
 * @returns {string[]} result.invalidEmails - Array of invalid email addresses
 * @returns {string} result.error - Error message if validation fails
 */
function validateEmails(emails) {
  // Check if emails is an array
  if (!Array.isArray(emails)) {
    return {
      valid: false,
      invalidEmails: [],
      error: 'Recipients must be provided as an array'
    };
  }

  // Check if array is empty
  if (emails.length === 0) {
    return {
      valid: false,
      invalidEmails: [],
      error: 'At least one recipient email is required'
    };
  }

  // Check max recipients limit
  const maxRecipients = getMaxRecipients();
  if (emails.length > maxRecipients) {
    return {
      valid: false,
      invalidEmails: [],
      error: `Too many recipients. Maximum allowed: ${maxRecipients}, provided: ${emails.length}`
    };
  }

  // Validate each email format
  const invalidEmails = [];
  for (const email of emails) {
    if (!isValidEmailFormat(email)) {
      invalidEmails.push(email);
    }
  }

  // Return validation result
  if (invalidEmails.length > 0) {
    return {
      valid: false,
      invalidEmails,
      error: `Invalid email format: ${invalidEmails.join(', ')}`
    };
  }

  return {
    valid: true,
    invalidEmails: [],
    error: null
  };
}

/**
 * Normalizes and deduplicates email addresses
 * @param {string[]} emails - Array of email addresses
 * @returns {string[]} Normalized and deduplicated array of emails
 */
function normalizeEmails(emails) {
  if (!Array.isArray(emails)) {
    return [];
  }

  // Trim, lowercase, and deduplicate
  const normalized = emails
    .map(email => typeof email === 'string' ? email.trim().toLowerCase() : '')
    .filter(email => email.length > 0);

  // Remove duplicates using Set
  return [...new Set(normalized)];
}

/**
 * Validates and normalizes email addresses for report sending
 * @param {string[]} emails - Array of email addresses to validate
 * @returns {Object} Result object
 * @returns {boolean} result.valid - True if validation passes
 * @returns {string[]} result.emails - Normalized and deduplicated emails
 * @returns {string} result.error - Error message if validation fails
 */
function validateAndNormalize(emails) {
  // First normalize the emails
  const normalizedEmails = normalizeEmails(emails);

  // Then validate
  const validationResult = validateEmails(normalizedEmails);

  if (!validationResult.valid) {
    return {
      valid: false,
      emails: [],
      error: validationResult.error,
      invalidEmails: validationResult.invalidEmails
    };
  }

  return {
    valid: true,
    emails: normalizedEmails,
    error: null,
    invalidEmails: []
  };
}

/**
 * Validates email subject
 * @param {string} subject - Email subject to validate
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - True if subject is valid
 * @returns {string} result.error - Error message if validation fails
 */
function validateSubject(subject) {
  if (!subject || typeof subject !== 'string') {
    return {
      valid: false,
      error: 'Email subject is required and must be a string'
    };
  }

  const trimmedSubject = subject.trim();

  if (trimmedSubject.length === 0) {
    return {
      valid: false,
      error: 'Email subject cannot be empty'
    };
  }

  if (trimmedSubject.length > 255) {
    return {
      valid: false,
      error: 'Email subject is too long (max 255 characters)'
    };
  }

  return {
    valid: true,
    error: null
  };
}

/**
 * Validates optional message
 * @param {string|null} message - Email message to validate
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - True if message is valid
 * @returns {string} result.error - Error message if validation fails
 */
function validateMessage(message) {
  // Message is optional
  if (message === null || message === undefined || message === '') {
    return {
      valid: true,
      error: null
    };
  }

  if (typeof message !== 'string') {
    return {
      valid: false,
      error: 'Email message must be a string'
    };
  }

  const trimmedMessage = message.trim();

  // Check max length (allow up to 5000 characters)
  if (trimmedMessage.length > 5000) {
    return {
      valid: false,
      error: 'Email message is too long (max 5000 characters)'
    };
  }

  return {
    valid: true,
    error: null
  };
}

/**
 * Validates complete email sending request
 * @param {Object} params - Email parameters
 * @param {string[]} params.recipients - Array of recipient email addresses
 * @param {string} params.subject - Email subject
 * @param {string} [params.message] - Optional custom message
 * @param {number} params.reportId - Report ID to send
 * @returns {Object} Validation result
 * @returns {boolean} result.valid - True if all validations pass
 * @returns {Object} result.validated - Validated and normalized data
 * @returns {string} result.error - Error message if validation fails
 */
function validateEmailRequest(params) {
  const errors = [];

  // Validate recipients
  const recipientsValidation = validateAndNormalize(params.recipients);
  if (!recipientsValidation.valid) {
    errors.push(recipientsValidation.error);
  }

  // Validate subject
  const subjectValidation = validateSubject(params.subject);
  if (!subjectValidation.valid) {
    errors.push(subjectValidation.error);
  }

  // Validate message (optional)
  const messageValidation = validateMessage(params.message);
  if (!messageValidation.valid) {
    errors.push(messageValidation.error);
  }

  // Validate reportId
  if (!params.reportId || typeof params.reportId !== 'number' || params.reportId <= 0) {
    errors.push('Valid report ID is required');
  }

  // Return validation result
  if (errors.length > 0) {
    return {
      valid: false,
      validated: null,
      error: errors.join('; ')
    };
  }

  return {
    valid: true,
    validated: {
      recipients: recipientsValidation.emails,
      subject: params.subject.trim(),
      message: params.message ? params.message.trim() : null,
      reportId: params.reportId
    },
    error: null
  };
}

module.exports = {
  isValidEmailFormat,
  validateEmails,
  normalizeEmails,
  validateAndNormalize,
  validateSubject,
  validateMessage,
  validateEmailRequest,
  getMaxRecipients,
  EMAIL_REGEX
};
