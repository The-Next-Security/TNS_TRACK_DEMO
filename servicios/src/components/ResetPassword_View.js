import React, { useState, useMemo } from "react";
import axios from "axios";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Label } from "./ui/label";
import { cn } from "../lib/utils";

const ResetPasswordV2 = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  // ✅ Validación en tiempo real de requisitos de contraseña
  const passwordRequirements = useMemo(() => {
    return {
      minLength: {
        label: "Mínimo 8 caracteres",
        satisfied: newPassword.length >= 8
      },
      hasLowercase: {
        label: "Al menos una letra minúscula (a-z)",
        satisfied: /[a-z]/.test(newPassword)
      },
      hasUppercase: {
        label: "Al menos una letra mayúscula (A-Z)",
        satisfied: /[A-Z]/.test(newPassword)
      },
      hasNumber: {
        label: "Al menos un número (0-9)",
        satisfied: /\d/.test(newPassword)
      },
      hasSymbol: {
        label: "Al menos un símbolo especial (@$!%*?&.)",
        satisfied: /[@$!%*?&.]/.test(newPassword)
      }
    };
  }, [newPassword]);

  // Verificar si todos los requisitos están cumplidos
  const allRequirementsMet = useMemo(() => {
    return Object.values(passwordRequirements).every(req => req.satisfied);
  }, [passwordRequirements]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setMessage("Las contraseñas no coinciden.");
      setIsError(true);
      return;
    }

    // Validar que cumple todos los requisitos
    if (!allRequirementsMet) {
      setMessage("La contraseña no cumple con todos los requisitos de seguridad.");
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const response = await axios.post("/api/usuarios/reset-password", {
        token,
        newPassword,
      });
      setMessage(response.data);
      setIsError(false);

      // Navigate to login after 3 seconds on success
      setTimeout(() => navigate("/"), 3000);
    } catch (error) {
      // Mostrar mensaje de error detallado del backend
      const errorMsg = error.response?.data?.details
        ? `Error: ${error.response.data.details.join(', ')}`
        : "Error al restablecer la contraseña.";
      setMessage(errorMsg);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
          <CardDescription>
            Ingrese su nueva contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nueva contraseña"
                required
                className="mt-1"
              />
            </div>

            {/* ✅ Indicador visual de requisitos de contraseña */}
            {newPassword && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Requisitos de seguridad:
                </p>
                {Object.entries(passwordRequirements).map(([key, req]) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-2 text-sm transition-colors",
                      req.satisfied ? "text-green-600" : "text-gray-500"
                    )}
                  >
                    {/* Checkmark o círculo */}
                    <div
                      className={cn(
                        "flex items-center justify-center w-5 h-5 rounded-full transition-all",
                        req.satisfied
                          ? "bg-green-500 text-white"
                          : "bg-gray-300 text-gray-500"
                      )}
                    >
                      {req.satisfied ? (
                        <svg
                          className="w-3 h-3"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-2 h-2"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <circle cx="10" cy="10" r="3" />
                        </svg>
                      )}
                    </div>
                    <span className={req.satisfied ? "font-medium" : ""}>
                      {req.label}
                    </span>
                  </div>
                ))}

                {/* Barra de progreso */}
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">
                      Fortaleza de contraseña
                    </span>
                    <span className="text-xs font-medium text-gray-600">
                      {Object.values(passwordRequirements).filter(r => r.satisfied).length} / {Object.keys(passwordRequirements).length}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        "h-2 rounded-full transition-all duration-300",
                        allRequirementsMet
                          ? "bg-green-500"
                          : Object.values(passwordRequirements).filter(r => r.satisfied).length >= 3
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      )}
                      style={{
                        width: `${(Object.values(passwordRequirements).filter(r => r.satisfied).length / Object.keys(passwordRequirements).length) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirmar nueva contraseña"
                required
                className="mt-1"
              />
              {/* Indicador de coincidencia */}
              {confirmPassword && (
                <div className="mt-2">
                  {newPassword === confirmPassword ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Las contraseñas coinciden</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-red-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>Las contraseñas no coinciden</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {message && (
              <Alert variant={isError ? "destructive" : "default"}>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !allRequirementsMet || newPassword !== confirmPassword}
            >
              {isLoading ? "Restableciendo..." : "Restablecer contraseña"}
            </Button>

            <Link
              to="/"
              className="block text-center text-blue-600 hover:underline mt-4 text-sm"
            >
              Volver al inicio de sesión
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPasswordV2;
