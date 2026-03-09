// UserRegistrationV2.js - Refactorización completa con flujos separados (Crear/Modificar)
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import HeaderV2 from './Header_View';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Users,
  UserPlus,
  Key,
  Shield,
  Search,
  Save,
  CheckCircle2,
  AlertCircle,
  Info,
  Brain
} from 'lucide-react';

const UserRegistrationV2 = () => {
  const navigate = useNavigate();

  // ========== TAB CONTROL ==========
  const [activeTab, setActiveTab] = useState('create');

  // Handler para cambio de tabs con limpieza de formularios
  const handleTabChange = (newTab) => {
    if (newTab === 'create') {
      // Limpiar todos los campos del formulario de creación
      setCreateUsername('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePermissions([]);
      setCreateAIAnalysis(false);
      setMessage('');
    } else if (newTab === 'modify') {
      // Limpiar búsqueda y resultados de modificación
      setSearchEmail('');
      setFoundUser(null);
      setModifiedPermissions([]);
      setOriginalPermissions([]);
      setModifiedAIAnalysis(false);
      setOriginalAIAnalysis(false);
      setSearchError('');
      setMessage('');
    }
    setActiveTab(newTab);
  };

  // ========== ESTADOS PARA CREAR ==========
  const [createUsername, setCreateUsername] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPermissions, setCreatePermissions] = useState([]);
  const [createAIAnalysis, setCreateAIAnalysis] = useState(false);

  // ========== ESTADOS PARA MODIFICAR ==========
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [modifiedPermissions, setModifiedPermissions] = useState([]);
  const [originalPermissions, setOriginalPermissions] = useState([]);
  const [modifiedAIAnalysis, setModifiedAIAnalysis] = useState(false);
  const [originalAIAnalysis, setOriginalAIAnalysis] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // ========== ESTADOS COMPARTIDOS ==========
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // ========== PERMISOS DISPONIBLES ==========
  const availablePermissions = [
    { label: 'Crear Usuarios', value: 'create_users', category: 'Usuarios y Sistema' },
    { label: 'Ver Dashboard', value: 'view_dashboard', category: 'Usuarios y Sistema' },
    { label: 'Configuración', value: 'view_configuration', category: 'Usuarios y Sistema' },
    { label: 'Ubicación en Interiores Tiempo Real', value: 'view_interior', category: 'Ubicación y Seguimiento' },
    { label: 'Búsqueda Histórica en Interiores', value: 'search_interior', category: 'Ubicación y Seguimiento' },
    { label: 'Presencia Personal por Interiores', value: 'view_presence', category: 'Ubicación y Seguimiento' },
    { label: 'Ubicación en Exteriores Tiempo Real', value: 'view_exterior', category: 'Ubicación y Seguimiento' },
    { label: 'Búsqueda Histórica en Exteriores', value: 'search_exterior', category: 'Ubicación y Seguimiento' },
    { label: 'Ver Intrusiones Blind Spot', value: 'view_blind_spot_intrusions', category: 'Seguridad' },
    { label: 'Estado de Puertas por Sector', value: 'view_door_status', category: 'Seguridad' },
    { label: 'Ver Temperatura', value: 'view_temperature', category: 'Temperatura' },
    { label: 'Ver Temperaturas Cámaras de Frío', value: 'view_temperature_camaras', category: 'Temperatura' },
    { label: 'Ver Dashboard de Temperatura', value: 'view_temperature_dashboard', category: 'Temperatura' },
    { label: 'Ver y Editar Parámetros de Temperatura de Cámaras', value: 'view_temp_params', category: 'Temperatura' },
    { label: 'Análisis de Deshielo de Cámaras', value: 'view_defrost_analysis', category: 'Temperatura' },
    { label: 'Generar Reportes de Temperatura', value: 'view_temperature_reports', category: 'Temperatura' },
    { label: 'Inteligencia de Datos', value: 'view_data_intelligence', category: 'Datos e Inteligencia' },
    { label: 'Inteligencia de Datos Temperatura', value: 'view_temperature_data_intelligence', category: 'Datos e Inteligencia' },
    { label: 'Visualización Mensajes SMS', value: 'view_sms', category: 'Comunicación' }
  ];

  // ========== AGRUPAR PERMISOS POR CATEGORÍA ==========
  const groupedPermissions = useMemo(() => {
    const groups = {};
    availablePermissions.forEach(perm => {
      if (!groups[perm.category]) {
        groups[perm.category] = [];
      }
      groups[perm.category].push(perm);
    });
    return groups;
  }, []);

  // ========== VALIDACIÓN DE PASSWORD (MODO CREAR) ==========
  const passwordRequirements = useMemo(() => {
    return {
      minLength: {
        label: "Mínimo 8 caracteres",
        satisfied: createPassword.length >= 8
      },
      hasLowercase: {
        label: "Al menos una letra minúscula (a-z)",
        satisfied: /[a-z]/.test(createPassword)
      },
      hasUppercase: {
        label: "Al menos una letra mayúscula (A-Z)",
        satisfied: /[A-Z]/.test(createPassword)
      },
      hasNumber: {
        label: "Al menos un número (0-9)",
        satisfied: /\d/.test(createPassword)
      },
      hasSymbol: {
        label: "Al menos un símbolo especial (@$!%*?&.)",
        satisfied: /[@$!%*?&.]/.test(createPassword)
      }
    };
  }, [createPassword]);

  const allRequirementsMet = useMemo(() => {
    return Object.values(passwordRequirements).every(req => req.satisfied);
  }, [passwordRequirements]);

  const passwordStrength = useMemo(() => {
    const satisfiedCount = Object.values(passwordRequirements).filter(r => r.satisfied).length;
    if (satisfiedCount === 0) return { label: '', color: '' };
    if (satisfiedCount === 1) return { label: 'Débil', color: 'text-red-600' };
    if (satisfiedCount === 2) return { label: 'Aceptable', color: 'text-orange-600' };
    if (satisfiedCount === 3) return { label: 'Buena', color: 'text-yellow-600' };
    if (satisfiedCount === 4) return { label: 'Fuerte', color: 'text-blue-600' };
    return { label: 'Excelente', color: 'text-green-600' };
  }, [passwordRequirements]);

  // ========== FETCH USUARIOS ==========
  const fetchUsers = async () => {
    try {
      const config = { withCredentials: true };
      const response = await axios.get('/api/usuarios/users', config);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        navigate('/');
      }
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ========== BUSCAR USUARIO POR EMAIL ==========
  const handleSearchUser = async () => {
    setIsSearching(true);
    setSearchError('');
    setFoundUser(null);

    try {
      const config = { withCredentials: true };
      const response = await axios.get('/api/usuarios/users', config);
      const user = response.data.find(u =>
        u.email.toLowerCase() === searchEmail.toLowerCase().trim()
      );

      if (user) {
        setFoundUser(user);
        // Limpiar comillas simples que puedan venir de la BD y parsear permisos
        let permissionsString = user.permissions || '';
        // Remover comillas simples al inicio y final si existen
        permissionsString = permissionsString.replace(/^'|'$/g, '');
        const userPerms = permissionsString ? permissionsString.split(',').map(p => p.trim()) : [];
        setModifiedPermissions(userPerms);
        setOriginalPermissions(userPerms);
        // Cargar ai_analysis del usuario encontrado
        const aiAnalysisValue = user.ai_analysis === true || user.ai_analysis === 1 || user.ai_analysis === '1';
        setModifiedAIAnalysis(aiAnalysisValue);
        setOriginalAIAnalysis(aiAnalysisValue);
        setSearchError('');
      } else {
        setSearchError('No existe ningún usuario con ese email');
        setFoundUser(null);
      }
    } catch (error) {
      setSearchError('Error al buscar usuario: ' + error.message);
      if (error.response?.status === 401) {
        navigate('/');
      }
    } finally {
      setIsSearching(false);
    }
  };

  // ========== TOGGLE PERMISOS EN MODO CREAR ==========
  const handleCreatePermissionChange = (value, checked) => {
    setCreatePermissions(
      checked
        ? [...createPermissions, value]
        : createPermissions.filter(p => p !== value)
    );
  };

  // ========== TOGGLE PERMISOS EN MODO MODIFICAR ==========
  const handleModifyPermissionChange = (value, checked) => {
    setModifiedPermissions(
      checked
        ? [...modifiedPermissions, value]
        : modifiedPermissions.filter(p => p !== value)
    );
  };

  // ========== CREAR USUARIO NUEVO ==========
  const handleCreateUser = async (e) => {
    e.preventDefault();

    try {
      const config = {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      };

      const userData = {
        username: createUsername,
        password: createPassword,
        email: createEmail,
        permissions: createPermissions.join(','),
        ai_analysis: createAIAnalysis
      };

      await axios.post('/api/usuarios/register', userData, config);
      setMessage('Usuario creado con éxito');

      // Limpiar formulario
      setCreateUsername('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePermissions([]);
      setCreateAIAnalysis(false);

      // Refrescar lista de usuarios
      await fetchUsers();

      setTimeout(() => {
        navigate('/select-routine');
      }, 2000);
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // ========== ACTUALIZAR SOLO PERMISOS ==========
  const handleUpdatePermissions = async () => {
    setShowConfirmDialog(false);

    try {
      const config = {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      };

      // Actualizar usuario usando endpoint PUT (NO requiere password)
      const updateData = {
        username: foundUser.username, // Mantener igual
        email: foundUser.email, // Mantener igual
        permissions: modifiedPermissions.join(','),
        ai_analysis: modifiedAIAnalysis
      };

      console.log('=== DEBUG UPDATE PERMISSIONS ===');
      console.log('[Frontend] foundUser:', foundUser);
      console.log('[Frontend] modifiedPermissions:', modifiedPermissions);
      console.log('[Frontend] URL:', `/api/usuarios/${foundUser.id}`);
      console.log('[Frontend] updateData:', updateData);
      console.log('[Frontend] config:', config);
      console.log('================================');

      // Usar endpoint PUT /api/usuarios/:userId (creado en refactorización backend)
      await axios.put(`/api/usuarios/${foundUser.id}`, updateData, config);
      setMessage('Permisos actualizados con éxito');

      // Limpiar estado de modificar
      setSearchEmail('');
      setFoundUser(null);
      setModifiedPermissions([]);
      setOriginalPermissions([]);
      setModifiedAIAnalysis(false);
      setOriginalAIAnalysis(false);

      // Refrescar lista
      await fetchUsers();

      setTimeout(() => {
        navigate('/select-routine');
      }, 2000);
    } catch (error) {
      setMessage('Error: ' + (error.response?.data?.message || error.message));
    }
  };

  // ========== CALCULAR ESTADO DE CADA PERMISO (MODO MODIFICAR) ==========
  const getPermissionStatus = (permValue) => {
    if (!foundUser) return 'none';

    const wasSelected = originalPermissions.includes(permValue);
    const isSelected = modifiedPermissions.includes(permValue);

    if (!wasSelected && isSelected) return 'added';
    if (wasSelected && !isSelected) return 'removed';
    if (wasSelected && isSelected) return 'current';
    return 'none';
  };

  // ========== CALCULAR CAMBIOS PENDIENTES ==========
  const getPendingChanges = () => {
    if (!foundUser) return { added: [], removed: [], count: 0, aiAnalysisChanged: false };

    const added = modifiedPermissions.filter(p =>
      !originalPermissions.includes(p)
    );
    const removed = originalPermissions.filter(p =>
      !modifiedPermissions.includes(p)
    );
    const aiAnalysisChanged = modifiedAIAnalysis !== originalAIAnalysis;

    return {
      added,
      removed,
      count: added.length + removed.length + (aiAnalysisChanged ? 1 : 0),
      aiAnalysisChanged
    };
  };

  // ========== OBTENER LABEL DE PERMISO ==========
  const getPermissionLabel = (permValue) => {
    const perm = availablePermissions.find(p => p.value === permValue);
    return perm ? perm.label : permValue;
  };

  // ========== COMPONENTE: GRID DE PERMISOS ==========
  const PermissionsGrid = ({
    permissions,
    selectedPermissions,
    onPermissionChange,
    mode = 'create', // 'create' | 'modify'
    getPermissionStatus = () => 'none'
  }) => {
    return (
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([category, perms]) => (
          <div key={category} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                {category}
              </h4>
              <Badge variant="secondary" className="text-xs">
                {perms.length} permisos
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {perms.map(perm => {
                const status = mode === 'modify' ? getPermissionStatus(perm.value) : 'none';
                const isChecked = selectedPermissions.includes(perm.value);

                return (
                  <Card
                    key={perm.value}
                    className={cn(
                      "relative cursor-pointer transition-all hover:shadow-lg hover:-translate-y-0.5",
                      status === 'added' && "border-green-500 bg-green-50",
                      status === 'removed' && "border-red-500 bg-red-50",
                      status === 'current' && "border-blue-500 bg-blue-50",
                      isChecked && status === 'none' && "border-[#6b9fd4] bg-[#6b9fd4]/5"
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`${mode}-${perm.value}`}
                          checked={isChecked}
                          onCheckedChange={(checked) => onPermissionChange(perm.value, checked)}
                          className={cn(
                            status === 'added' && "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600",
                            status === 'removed' && "border-red-600",
                            status === 'current' && "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                          )}
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`${mode}-${perm.value}`}
                            className="text-sm font-medium cursor-pointer block leading-relaxed"
                          >
                            {perm.label}
                          </label>
                          {status === 'current' && (
                            <Badge variant="outline" className="mt-1 text-[10px] bg-blue-100 border-blue-600 text-blue-700">
                              ACTUAL
                            </Badge>
                          )}
                          {status === 'added' && (
                            <Badge className="mt-1 text-[10px] bg-green-600">
                              + NUEVO
                            </Badge>
                          )}
                          {status === 'removed' && (
                            <Badge className="mt-1 text-[10px] bg-red-600">
                              - REMOVIDO
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ========== COMPONENTE: INDICADOR DE FORTALEZA DE PASSWORD ==========
  const PasswordStrengthIndicator = ({ password }) => {
    if (!password) return null;

    return (
      <div className={cn(
        "bg-gradient-to-br from-white to-gray-50 border rounded-xl p-5 space-y-4 mt-3 shadow-sm",
        allRequirementsMet ? "border-green-200 animate-pulse-once" : "border-gray-200"
      )}>
        {/* Header con icono de escudo */}
        <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
          <div className={cn(
            "p-2 rounded-lg",
            allRequirementsMet
              ? "bg-gradient-to-br from-green-500/10 to-green-600/10"
              : "bg-gradient-to-br from-gray-100 to-gray-200/50"
          )}>
            <Shield
              className={cn(
                "w-5 h-5 transition-colors duration-300",
                allRequirementsMet ? "text-green-600" : "text-gray-500"
              )}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Requisitos de Seguridad
            </p>
            {passwordStrength.label && (
              <p className={cn("text-xs font-medium mt-0.5 transition-colors", passwordStrength.color)}>
                Fortaleza: {passwordStrength.label}
              </p>
            )}
          </div>
        </div>

        {/* Lista de requisitos */}
        <div className="space-y-2.5">
          {Object.entries(passwordRequirements).map(([key, req]) => (
            <div
              key={key}
              className={cn(
                "flex items-center gap-3 text-sm transition-all duration-300 transform",
                req.satisfied
                  ? "text-green-700 translate-x-1"
                  : "text-gray-500"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-300",
                  req.satisfied
                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-sm scale-110"
                    : "bg-gray-200 text-gray-400"
                )}
              >
                {req.satisfied ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-current" />
                )}
              </div>
              <span className={cn(
                "transition-all duration-300",
                req.satisfied ? "font-medium" : "font-normal"
              )}>
                {req.label}
              </span>
            </div>
          ))}
        </div>

        {/* Barra de progreso segmentada */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Progreso
            </span>
            <span className={cn(
              "text-xs font-bold transition-colors",
              allRequirementsMet ? "text-green-600" : "text-gray-600"
            )}>
              {Object.values(passwordRequirements).filter(r => r.satisfied).length} / {Object.keys(passwordRequirements).length}
            </span>
          </div>

          <div className="flex gap-1">
            {Object.values(passwordRequirements).map((req, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-2 flex-1 rounded-full transition-all duration-500",
                  req.satisfied
                    ? allRequirementsMet
                      ? "bg-gradient-to-r from-green-500 to-green-600"
                      : "bg-gradient-to-r from-yellow-400 to-yellow-500"
                    : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <HeaderV2 title="Gestión de Usuarios" />

      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-6xl mx-auto shadow-xl">
          {/* Premium gradient accent line */}
          <div className="h-1 bg-gradient-to-r from-[#6b9fd4] to-[#5a87b8]" />

          <CardHeader className="pb-6">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Users className="h-6 w-6 text-[#6b9fd4]" />
              Gestión de Usuarios
            </CardTitle>
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {/* TABS PRINCIPALES */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Crear Usuario
                </TabsTrigger>
                <TabsTrigger value="modify" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Modificar Permisos
                </TabsTrigger>
              </TabsList>

              {/* ==================== TAB 1: CREAR USUARIO ==================== */}
              <TabsContent value="create" className="space-y-6">
                <form onSubmit={handleCreateUser} className="space-y-6">
                  {/* Sección: Información del Usuario */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Users className="h-5 w-5 text-[#6b9fd4]" />
                      Información del Usuario
                    </h3>

                    <div className="space-y-2">
                      <Label htmlFor="create-username">Nombre de Usuario *</Label>
                      <Input
                        id="create-username"
                        value={createUsername}
                        onChange={(e) => setCreateUsername(e.target.value)}
                        placeholder="john_doe"
                        required
                        minLength={3}
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-email">Correo Electrónico *</Label>
                      <Input
                        id="create-email"
                        type="email"
                        value={createEmail}
                        onChange={(e) => setCreateEmail(e.target.value)}
                        placeholder="usuario@empresa.com"
                        required
                        className="h-12"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="create-password">Contraseña *</Label>
                      <Input
                        id="create-password"
                        type="password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="Ingrese la contraseña"
                        required
                        className="h-12"
                      />
                      <PasswordStrengthIndicator password={createPassword} />
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Sección: Permisos */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Shield className="h-5 w-5 text-[#6b9fd4]" />
                        Permisos de Acceso
                      </h3>
                      <Badge variant="secondary">
                        {createPermissions.length} seleccionados
                      </Badge>
                    </div>

                    <PermissionsGrid
                      permissions={availablePermissions}
                      selectedPermissions={createPermissions}
                      onPermissionChange={handleCreatePermissionChange}
                      mode="create"
                    />
                  </div>

                  <Separator className="my-6" />

                  {/* Sección: AI Analysis */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Brain className="h-5 w-5 text-[#6b9fd4]" />
                        Análisis AI
                      </h3>
                    </div>
                    <Card className="p-4">
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="create-ai-analysis"
                          checked={createAIAnalysis}
                          onCheckedChange={(checked) => setCreateAIAnalysis(checked === true)}
                        />
                        <div className="flex-1">
                          <Label htmlFor="create-ai-analysis" className="text-base font-medium cursor-pointer">
                            🤖 Análisis AI Cámaras
                          </Label>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Permite al usuario acceder a la funcionalidad de análisis inteligente de datos históricos de temperatura usando IA
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>

                  <Separator className="my-6" />

                  {/* Botón submit */}
                  <Button
                    type="submit"
                    size="lg"
                    className={cn(
                      "w-full h-14 bg-gradient-to-r from-[#6b9fd4] to-[#5a87b8]",
                      "hover:from-[#5a87b8] hover:to-[#4a759e]",
                      "shadow-lg hover:shadow-xl transition-all duration-300"
                    )}
                    disabled={!allRequirementsMet || createUsername.length < 3 || createPermissions.length === 0}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Crear Nuevo Usuario
                  </Button>
                </form>
              </TabsContent>

              {/* ==================== TAB 2: MODIFICAR PERMISOS ==================== */}
              <TabsContent value="modify" className="space-y-6">
                {/* PASO 1: Búsqueda */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Search className="h-5 w-5 text-[#6b9fd4]" />
                    Buscar Usuario
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Ingrese el email del usuario para modificar sus permisos
                  </p>

                  <div className="flex gap-2">
                    <Input
                      type="email"
                      value={searchEmail}
                      onChange={(e) => setSearchEmail(e.target.value)}
                      placeholder="usuario@empresa.com"
                      className="flex-1 h-12"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && searchEmail.trim()) {
                          handleSearchUser();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSearchUser}
                      disabled={isSearching || !searchEmail.trim()}
                      className="h-12 bg-gradient-to-r from-[#6b9fd4] to-[#5a87b8] hover:from-[#5a87b8] hover:to-[#4a759e]"
                    >
                      {isSearching ? (
                        <>Buscando...</>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Buscar
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Alert de error */}
                  {searchError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{searchError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* PASO 2: Usuario encontrado */}
                {foundUser && (
                  <>
                    <Separator />

                    <Alert variant="default" className="bg-green-50 border-green-200">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Usuario encontrado correctamente
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Datos del Usuario</h3>

                      <div className="space-y-2">
                        <Label>Nombre de Usuario (Solo lectura)</Label>
                        <Input
                          value={foundUser.username}
                          disabled
                          className="bg-gray-100 cursor-not-allowed h-12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Correo Electrónico (Solo lectura)</Label>
                        <Input
                          value={foundUser.email}
                          disabled
                          className="bg-gray-100 cursor-not-allowed h-12"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Permisos modificables */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Shield className="h-5 w-5 text-[#6b9fd4]" />
                          Modificar Permisos
                        </h3>
                        <div className="flex gap-2">
                          {getPendingChanges().added.length > 0 && (
                            <Badge variant="outline" className="bg-green-50 border-green-600 text-green-700">
                              ✅ {getPendingChanges().added.length} Agregados
                            </Badge>
                          )}
                          {getPendingChanges().removed.length > 0 && (
                            <Badge variant="outline" className="bg-red-50 border-red-600 text-red-700">
                              ❌ {getPendingChanges().removed.length} Removidos
                            </Badge>
                          )}
                        </div>
                      </div>

                      <PermissionsGrid
                        permissions={availablePermissions}
                        selectedPermissions={modifiedPermissions}
                        onPermissionChange={handleModifyPermissionChange}
                        mode="modify"
                        getPermissionStatus={getPermissionStatus}
                      />
                    </div>

                    <Separator />

                    {/* Sección: AI Analysis */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Brain className="h-5 w-5 text-[#6b9fd4]" />
                          Análisis AI
                        </h3>
                        {(modifiedAIAnalysis !== originalAIAnalysis) && (
                          <Badge variant="outline" className={modifiedAIAnalysis ? "bg-green-50 border-green-600 text-green-700" : "bg-red-50 border-red-600 text-red-700"}>
                            {modifiedAIAnalysis ? "✅ Habilitado" : "❌ Deshabilitado"}
                          </Badge>
                        )}
                      </div>
                      <Card className={cn(
                        "p-4 transition-all",
                        modifiedAIAnalysis !== originalAIAnalysis && (modifiedAIAnalysis ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50")
                      )}>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="modify-ai-analysis"
                            checked={modifiedAIAnalysis}
                            onCheckedChange={(checked) => setModifiedAIAnalysis(checked === true)}
                            className={modifiedAIAnalysis !== originalAIAnalysis && (modifiedAIAnalysis ? "data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600" : "border-red-600")}
                          />
                          <div className="flex-1">
                            <Label htmlFor="modify-ai-analysis" className="text-base font-medium cursor-pointer">
                              🤖 Análisis AI Cámaras
                            </Label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              Permite al usuario acceder a la funcionalidad de análisis inteligente de datos históricos de temperatura usando IA
                            </p>
                            {originalAIAnalysis && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                Estado actual: Habilitado
                              </p>
                            )}
                          </div>
                        </div>
                      </Card>
                    </div>

                    <Separator />

                    {/* Botón actualizar */}
                    <Button
                      size="lg"
                      className={cn(
                        "w-full h-14 bg-gradient-to-r from-[#6b9fd4] to-[#5a87b8]",
                        "hover:from-[#5a87b8] hover:to-[#4a759e]",
                        "shadow-lg hover:shadow-xl transition-all duration-300"
                      )}
                      onClick={() => setShowConfirmDialog(true)}
                      disabled={getPendingChanges().count === 0}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Actualizar Permisos y Configuración ({getPendingChanges().count} cambios)
                    </Button>
                  </>
                )}

                {/* Mensaje si no hay usuario buscado */}
                {!foundUser && !searchError && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Utilice el campo de búsqueda para encontrar un usuario por su email
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            {/* Mensaje de éxito/error */}
            {message && (
              <Alert className={cn(
                "mt-6",
                message.startsWith('Error')
                  ? "bg-red-50 border-red-300"
                  : "bg-green-50 border-green-300"
              )}>
                <AlertDescription className={cn(
                  message.startsWith('Error') ? 'text-red-700' : 'text-green-700'
                )}>
                  {message}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog de confirmación */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Modificación de Permisos</DialogTitle>
            <DialogDescription>
              Usuario: {foundUser?.username} ({foundUser?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Permisos agregados */}
            {getPendingChanges().added.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-600 mb-2">
                  ✅ Permisos Agregados ({getPendingChanges().added.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getPendingChanges().added.map(perm => (
                    <Badge key={perm} variant="outline" className="bg-green-50 border-green-600 text-green-700">
                      {getPermissionLabel(perm)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Permisos removidos */}
            {getPendingChanges().removed.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-600 mb-2">
                  ❌ Permisos Removidos ({getPendingChanges().removed.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {getPendingChanges().removed.map(perm => (
                    <Badge key={perm} variant="outline" className="bg-red-50 border-red-600 text-red-700">
                      {getPermissionLabel(perm)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Sin cambios */}
            {getPendingChanges().count === 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Info className="h-4 w-4" />
                No se detectaron cambios en los permisos
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePermissions}
              disabled={getPendingChanges().count === 0}
              className="bg-gradient-to-r from-[#6b9fd4] to-[#5a87b8] hover:from-[#5a87b8] hover:to-[#4a759e]"
            >
              Confirmar y Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRegistrationV2;
