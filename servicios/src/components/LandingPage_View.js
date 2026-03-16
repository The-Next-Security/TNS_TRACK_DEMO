import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Label } from './ui/label';
import { cn } from '../lib/utils';
import '../styles/globals.css';
import mapImage from '../assets/images/map-of-a-map.jpeg';
import tnsTrackLogo from '../assets/images/TNS Track blue.png';
import tnsLogo from '../assets/images/tns_logo_blanco.png';
import theNextLogo from '../assets/images/thenextlogo.png';
import storageImage from '../assets/images/storage-logo.png';
import thermometerIcon from '../assets/images/thermometer.png';
import axios from 'axios';
import analyticsService from '../services/analytics_Service';
import { Eye, EyeOff } from 'lucide-react';
import { getLogoutReason, clearLogoutReason } from '../utils/session_Utils';
import { getLogoutMessage } from '../constants/logoutReason_Constants';

const LandingPageV2 = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [logoutMessage, setLogoutMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Reloj en tiempo real
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Display logout message if present
  useEffect(() => {
    const reason = getLogoutReason();
    if (reason) {
      const message = getLogoutMessage(reason);
      setLogoutMessage(message);
      clearLogoutReason();

      // Track logout reason display
      analyticsService.trackEvent('logout_message_displayed', {
        reason,
        message,
        timestamp: Date.now()
      });
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/usuarios/login', { email, password });
      const data = response.data;

      // ✅ Guardar tokens en localStorage para uso en Authorization header
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userEmail', email);
      console.log('[Frontend] Login exitoso, tokens guardados en localStorage');

      // 🆕 ANALYTICS: Trackear login exitoso
      try {
        // Identificar usuario en PostHog
        analyticsService.identifyUser(data.userId || data.id_Usuario || email, {
          email: email,
          name: data.userName || data.nombre || email.split('@')[0]
        });

        // Trackear evento de login
        analyticsService.trackLogin();
      } catch (analyticsError) {
        console.error('[Analytics] Error tracking login:', analyticsError);
      }

      // ✅ FEATURE: 003-fix-session-expiry-handling
      // Dispatch login success event to trigger SessionManager
      window.dispatchEvent(new CustomEvent('auth:login_success', {
        detail: { userId: data.userId || data.id_Usuario || email }
      }));

      // ✅ NUEVO: Verificar si hay una URL guardada para redirigir (ej: desde notificación push)
      const redirectUrl = sessionStorage.getItem('redirectAfterLogin');
      if (redirectUrl) {
        console.log('[LandingPage] Redirigiendo a URL guardada:', redirectUrl);
        sessionStorage.removeItem('redirectAfterLogin'); // Limpiar para evitar loops
        navigate(redirectUrl);
      } else {
        // Navegar al dashboard por defecto
        navigate('/select-routine');
      }

    } catch (error) {
      setError('Invalid username or password');

      // 🆕 ANALYTICS: Trackear error de login
      try {
        analyticsService.trackError('Login failed', {
          email: email,
          error: error.message
        });
      } catch (analyticsError) {
        console.error('[Analytics] Error tracking login error:', analyticsError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full">
      {/* LEFT PANEL - Brand & Information */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-[#5a8ec3] via-[#6b9fd4] to-[#7caede] overflow-hidden">
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <img
            src={mapImage}
            alt="Map Background"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Decorative elements */}
        <div className="absolute top-20 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top Section - Client Logo & Company Logo */}
          <div className="flex justify-between items-center">
            <img
              src={storageImage}
              alt="Storage Logo"
              className="h-32 w-auto drop-shadow-lg"
            />
            <img
              src={tnsLogo}
              alt="The Next Security"
              className="h-12 w-auto drop-shadow-lg"
            />
          </div>

          {/* Middle Section - Product Branding */}
          <div className="space-y-8">
            <div className="space-y-4">
              <img
                src={tnsTrackLogo}
                alt="TNS Track"
                className="h-20 w-auto drop-shadow-2xl bg-white/90 px-6 py-3 rounded-lg"
              />
              <h1 className="text-4xl font-bold leading-tight">
                Sistema de Monitoreo<br />y Control Inteligente
              </h1>
              <p className="text-lg text-blue-100 max-w-md">
                Gestión avanzada de temperatura y consumos de energía en tiempo real para operaciones críticas.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 gap-4 max-w-md">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <img src={thermometerIcon} alt="Temperature" className="w-10 h-10" />
                <div>
                  <h3 className="font-semibold">Monitoreo de Temperatura</h3>
                  <p className="text-sm text-blue-100">Control de cámaras frigoríficas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 7H7v6h6V7z" />
                  <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd" />
                </svg>
                <div>
                  <h3 className="font-semibold">Consumo Eléctrico</h3>
                  <p className="text-sm text-blue-100">Análisis energético detallado</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Developer Credit */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-200">Desarrollado por</span>
            <img
              src={tnsLogo}
              alt="The Next Security"
              className="h-8 w-auto drop-shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logos */}
          <div className="lg:hidden flex flex-col items-center gap-4 mb-8">
            <img
              src={storageImage}
              alt="Storage Logo"
              className="h-16 w-auto"
            />
            <img
              src={theNextLogo}
              alt="The Next Security"
              className="h-12 w-auto"
            />
          </div>

          {/* Login Card */}
          <Card className="shadow-xl border-0">
            <CardHeader className="space-y-2 pb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-gradient-to-br from-[#5a8ec3] to-[#6b9fd4] p-4 rounded-2xl">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              <CardTitle className="text-center text-3xl font-bold text-gray-800">
                Bienvenido
              </CardTitle>
              <p className="text-center text-gray-500 text-sm">
                Ingresa tus credenciales para acceder
              </p>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Ingresa tu email"
                    autoComplete="email"
                    required
                    className="h-11 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 font-medium">
                    Contraseña
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      autoComplete="current-password"
                      required
                      className="h-11 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {logoutMessage && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertDescription className="text-blue-800">
                      {logoutMessage}
                    </AlertDescription>
                  </Alert>
                )}

                {error && (
                  <Alert variant="destructive" className="bg-red-50 border-red-200">
                    <AlertDescription className="text-red-800">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 bg-gradient-to-r from-[#5a8ec3] to-[#6b9fd4] hover:from-[#4a7eb3] hover:to-[#5a8ec3] text-white font-semibold shadow-lg transition-all duration-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Ingresando...
                    </span>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </Button>

                <Link
                  to="/forgot-password"
                  className="block text-center text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </form>
            </CardContent>
          </Card>

          {/* Footer */}
          <footer className="mt-8 text-center text-sm text-gray-500 space-y-1">
            <div className="flex items-center justify-center gap-4">
              <span>Version 2.05</span>
              <span>•</span>
              <span>{currentTime.toLocaleString()}</span>
            </div>
            <div className="lg:hidden text-xs flex items-center justify-center gap-2">
              <span>Powered by</span>
              <img src={theNextLogo} alt="The Next Security" className="h-4 inline-block" />
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default LandingPageV2;