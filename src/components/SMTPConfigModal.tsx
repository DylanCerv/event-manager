import React from 'react';
import { X, Mail, Server, Eye, EyeOff, TestTube, Check, AlertCircle } from 'lucide-react';
import { configStorage, type SMTPConfig } from '../lib/config-storage';

interface SMTPConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SMTPConfig) => void;
  editingConfig?: SMTPConfig | null;
}

export function SMTPConfigModal({ isOpen, onClose, onSave, editingConfig }: SMTPConfigModalProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    provider: 'gmail' as 'gmail' | 'hostinger' | 'custom',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromEmail: '',
    fromName: 'Event Manager',
    isActive: true
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (editingConfig) {
      setFormData({
        name: editingConfig.name,
        provider: editingConfig.provider,
        host: editingConfig.host,
        port: editingConfig.port,
        secure: editingConfig.secure,
        user: editingConfig.user,
        password: editingConfig.password,
        fromEmail: editingConfig.fromEmail,
        fromName: editingConfig.fromName,
        isActive: editingConfig.isActive
      });
    } else {
      // Reset form for new config
      const presets = configStorage.getSMTPPresets();
      const preset = presets[formData.provider];
      setFormData(prev => ({
        ...prev,
        ...preset,
        name: preset.name || '',
        host: preset.host || '',
        port: preset.port || 587,
        secure: preset.secure || false
      }));
    }
  }, [editingConfig, isOpen]);

  const handleProviderChange = (provider: 'gmail' | 'hostinger' | 'custom') => {
    const presets = configStorage.getSMTPPresets();
    const preset = presets[provider];
    
    setFormData(prev => ({
      ...prev,
      provider,
      ...preset,
      name: preset.name || '',
      host: preset.host || '',
      port: preset.port || 587,
      secure: preset.secure || false
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Nombre es requerido';
    if (!formData.host.trim()) newErrors.host = 'Servidor SMTP es requerido';
    if (!formData.user.trim()) newErrors.user = 'Usuario es requerido';
    if (!formData.password.trim()) newErrors.password = 'Contraseña es requerida';
    if (!formData.fromEmail.trim()) newErrors.fromEmail = 'Email remitente es requerido';
    if (!formData.fromName.trim()) newErrors.fromName = 'Nombre remitente es requerido';
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.fromEmail && !emailRegex.test(formData.fromEmail)) {
      newErrors.fromEmail = 'Formato de email inválido';
    }

    // Validar puerto
    if (formData.port < 1 || formData.port > 65535) {
      newErrors.port = 'Puerto debe estar entre 1 y 65535';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setTestResult(null);

    try {
      const result = await configStorage.testSMTPConnection(formData);
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Error al probar la conexión'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      let savedConfig: SMTPConfig;
      
      if (editingConfig) {
        savedConfig = await configStorage.updateSMTPConfig(editingConfig.id, formData) as SMTPConfig;
      } else {
        savedConfig = await configStorage.createSMTPConfig(formData);
      }

      onSave(savedConfig);
      onClose();
    } catch (error) {
      console.error('Error saving SMTP config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setTestResult(null); // Reset test result when config changes
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Mail className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingConfig ? 'Editar' : 'Nueva'} Configuración SMTP
              </h3>
              <p className="text-sm text-gray-500">Configura el servidor de email para envíos masivos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor de Email
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['gmail', 'hostinger', 'custom'] as const).map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => handleProviderChange(provider)}
                  className={`p-3 border rounded-lg text-sm font-medium transition-colors ${
                    formData.provider === provider
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {provider === 'gmail' && '📧 Gmail'}
                  {provider === 'hostinger' && '🌐 Hostinger'}
                  {provider === 'custom' && '⚙️ Personalizado'}
                </button>
              ))}
            </div>
          </div>

          {/* Configuration Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Configuración *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Mi configuración SMTP"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* SMTP Server Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servidor SMTP *
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.host ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="smtp.gmail.com"
              />
              {errors.host && <p className="mt-1 text-sm text-red-600">{errors.host}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puerto *
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => handleInputChange('port', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.port ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="587"
                min="1"
                max="65535"
              />
              {errors.port && <p className="mt-1 text-sm text-red-600">{errors.port}</p>}
            </div>
          </div>

          {/* Security */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.secure}
                onChange={(e) => handleInputChange('secure', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Conexión segura (SSL/TLS)
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Usar para puerto 465. Dejar desactivado para STARTTLS (puerto 587)
            </p>
          </div>

          {/* Credentials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuario/Email *
              </label>
              <input
                type="email"
                value={formData.user}
                onChange={(e) => handleInputChange('user', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.user ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="eventos@midominio.com"
              />
              {errors.user && <p className="mt-1 text-sm text-red-600">{errors.user}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña/App Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>
          </div>

          {/* From Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Remitente *
              </label>
              <input
                type="email"
                value={formData.fromEmail}
                onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.fromEmail ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="eventos@midominio.com"
              />
              {errors.fromEmail && <p className="mt-1 text-sm text-red-600">{errors.fromEmail}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre Remitente *
              </label>
              <input
                type="text"
                value={formData.fromName}
                onChange={(e) => handleInputChange('fromName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.fromName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Event Manager"
              />
              {errors.fromName && <p className="mt-1 text-sm text-red-600">{errors.fromName}</p>}
            </div>
          </div>

          {/* Active Configuration */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => handleInputChange('isActive', e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Activar esta configuración
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              Solo una configuración puede estar activa a la vez
            </p>
          </div>

          {/* Test Connection Result */}
          {testResult && (
            <div className={`p-4 rounded-lg border ${
              testResult.success 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-center space-x-2">
                {testResult.success ? (
                  <Check className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <span className="font-medium">{testResult.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <TestTube className="w-4 h-4 mr-2" />
            {isLoading ? 'Probando...' : 'Probar Conexión'}
          </button>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 border border-transparent text-sm font-medium rounded-lg text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Guardando...' : (editingConfig ? 'Actualizar' : 'Guardar')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 