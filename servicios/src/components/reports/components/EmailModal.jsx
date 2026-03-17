/**
 * @fileoverview Email Modal Component - Modal para enviar reportes por email
 * @description Componente modal con formulario para enviar reportes generados
 * a múltiples destinatarios con asunto y mensaje personalizables.
 * @feature 004-reportes-base-core (T071, T074)
 * @version 1.0.0
 */

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import { Alert, AlertDescription } from "../../ui/alert";
import { Badge } from "../../ui/badge";
import { Loader2, AlertCircle, Mail, X, Plus } from "lucide-react";
import { cn } from "../../../lib/utils";

// Email regex validation (RFC 5322 compliant - simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const MAX_RECIPIENTS = 20;

/**
 * Email Modal Component
 * @param {boolean} isOpen - Modal visibility state
 * @param {Function} onClose - Callback to close modal
 * @param {Object} report - Report object to send
 * @param {number} report.id - Report ID
 * @param {string} report.name - Report name
 * @param {string} report.periodStart - Report period start date
 * @param {string} report.periodEnd - Report period end date
 * @param {Function} onSuccess - Callback after successful send
 */
const EmailModal = ({ isOpen, onClose, report, onSuccess }) => {
  const [recipients, setRecipients] = useState([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);

  // Initialize default subject when report changes
  useEffect(() => {
    if (report && isOpen) {
      setSubject(`Reporte: ${report.name}`);
    }
  }, [report, isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset after animation completes
      setTimeout(() => {
        setRecipients([]);
        setCurrentEmail("");
        setSubject("");
        setMessage("");
        setErrors({});
        setServerError(null);
        setIsSending(false);
      }, 200);
    }
  }, [isOpen]);

  /**
   * Validates email format
   */
  const isValidEmail = (email) => {
    return EMAIL_REGEX.test(email.trim().toLowerCase());
  };

  /**
   * Adds email to recipients list
   */
  const handleAddEmail = () => {
    const email = currentEmail.trim().toLowerCase();
    const newErrors = {};

    // Validate email format
    if (!email) {
      newErrors.currentEmail = "Por favor ingresa un email";
      setErrors(newErrors);
      return;
    }

    if (!isValidEmail(email)) {
      newErrors.currentEmail = "Formato de email inválido";
      setErrors(newErrors);
      return;
    }

    // Check for duplicates
    if (recipients.includes(email)) {
      newErrors.currentEmail = "Este email ya fue agregado";
      setErrors(newErrors);
      return;
    }

    // Check max recipients
    if (recipients.length >= MAX_RECIPIENTS) {
      newErrors.currentEmail = `Máximo ${MAX_RECIPIENTS} destinatarios permitidos`;
      setErrors(newErrors);
      return;
    }

    // Add email
    setRecipients([...recipients, email]);
    setCurrentEmail("");
    setErrors({});
  };

  /**
   * Removes email from recipients list
   */
  const handleRemoveEmail = (emailToRemove) => {
    setRecipients(recipients.filter(email => email !== emailToRemove));
    setErrors({});
  };

  /**
   * Handles Enter key press in email input
   */
  const handleEmailKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  /**
   * Validates form before submission
   */
  const validateForm = () => {
    const newErrors = {};

    if (recipients.length === 0) {
      newErrors.recipients = "Debes agregar al menos un destinatario";
    }

    if (!subject || subject.trim().length === 0) {
      newErrors.subject = "El asunto es requerido";
    } else if (subject.trim().length > 255) {
      newErrors.subject = "El asunto es demasiado largo (máximo 255 caracteres)";
    }

    if (message && message.length > 5000) {
      newErrors.message = "El mensaje es demasiado largo (máximo 5000 caracteres)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handles form submission
   */
  const handleSubmit = async () => {
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch('/api/reportes/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken') || ''}`
        },
        body: JSON.stringify({
          reportId: report.id,
          recipients: recipients,
          subject: subject.trim(),
          message: message.trim() || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success
        if (onSuccess) {
          onSuccess({
            sentCount: data.sentCount,
            recipients: data.recipients,
            reportName: data.reportName || report.name
          });
        }
        onClose();
      } else {
        // Server error
        setServerError(data.error || 'Error al enviar el email');
      }
    } catch (error) {
      console.error('[EmailModal] Send error:', error);
      setServerError('Error de conexión. Por favor intenta nuevamente.');
    } finally {
      setIsSending(false);
    }
  };

  if (!report) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-purple-600" />
            Enviar Reporte por Email
          </DialogTitle>
          <DialogDescription>
            Envía el reporte "{report.name}" a uno o más destinatarios
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Server Error Alert */}
          {serverError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          )}

          {/* Recipients Input */}
          <div className="space-y-2">
            <Label htmlFor="email-input">
              Destinatarios *
              <span className="text-xs text-gray-500 ml-2">
                ({recipients.length}/{MAX_RECIPIENTS})
              </span>
            </Label>

            <div className="flex gap-2">
              <Input
                id="email-input"
                type="email"
                placeholder="ejemplo@correo.com"
                value={currentEmail}
                onChange={(e) => {
                  setCurrentEmail(e.target.value);
                  if (errors.currentEmail) {
                    setErrors({ ...errors, currentEmail: null });
                  }
                }}
                onKeyPress={handleEmailKeyPress}
                disabled={isSending || recipients.length >= MAX_RECIPIENTS}
                className={cn(errors.currentEmail && "border-red-500")}
              />
              <Button
                type="button"
                onClick={handleAddEmail}
                disabled={isSending || recipients.length >= MAX_RECIPIENTS}
                className="shrink-0"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {errors.currentEmail && (
              <p className="text-sm text-red-600">{errors.currentEmail}</p>
            )}

            {/* Recipients List */}
            {recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-800">
                {recipients.map((email) => (
                  <Badge
                    key={email}
                    variant="secondary"
                    className="px-3 py-1 flex items-center gap-2 text-sm"
                  >
                    {email}
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      disabled={isSending}
                      className="ml-1 hover:text-red-600 disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {errors.recipients && (
              <p className="text-sm text-red-600">{errors.recipients}</p>
            )}
          </div>

          {/* Subject Input */}
          <div className="space-y-2">
            <Label htmlFor="subject-input">Asunto *</Label>
            <Input
              id="subject-input"
              type="text"
              placeholder="Asunto del correo"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) {
                  setErrors({ ...errors, subject: null });
                }
              }}
              disabled={isSending}
              maxLength={255}
              className={cn(errors.subject && "border-red-500")}
            />
            {errors.subject && (
              <p className="text-sm text-red-600">{errors.subject}</p>
            )}
          </div>

          {/* Message Textarea */}
          <div className="space-y-2">
            <Label htmlFor="message-input">
              Mensaje Personalizado (opcional)
            </Label>
            <Textarea
              id="message-input"
              placeholder="Agrega un mensaje personalizado que se incluirá en el email..."
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (errors.message) {
                  setErrors({ ...errors, message: null });
                }
              }}
              disabled={isSending}
              rows={4}
              maxLength={5000}
              className={cn(
                "resize-none",
                errors.message && "border-red-500"
              )}
            />
            <div className="flex justify-between items-center">
              {errors.message && (
                <p className="text-sm text-red-600">{errors.message}</p>
              )}
              <p className="text-xs text-gray-500 ml-auto">
                {message.length}/5000 caracteres
              </p>
            </div>
          </div>

          {/* Report Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              📄 Reporte a enviar
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Nombre:</strong> {report.name}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSending || recipients.length === 0}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailModal;
