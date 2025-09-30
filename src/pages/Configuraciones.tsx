import React from 'react';
import { Settings, Mail, Plus, Edit, Trash2, CheckCircle, XCircle, Palette, DollarSign, Star, Users, Crown, Shield } from 'lucide-react';
import { SMTPConfigModal } from '../components/SMTPConfigModal';
import { EmailTemplateSelector } from '../components/EmailTemplateSelector';
import { configStorage, type SMTPConfig } from '../lib/config-storage';

export function Configuraciones() {
  const [activeConfigTab, setActiveConfigTab] = React.useState<'emails' | 'finances' | 'puntos'>('emails');
  const [showSMTPModal, setShowSMTPModal] = React.useState(false);
  const [editingSMTP, setEditingSMTP] = React.useState<SMTPConfig | null>(null);
  const [smtpConfigs, setSMTPConfigs] = React.useState<SMTPConfig[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [pricePerGuest, setPricePerGuest] = React.useState<number>(1);
  const [isSavingPrice, setIsSavingPrice] = React.useState(false);
  
  // Estados para configuración de puntos
  const [adminPoints, setAdminPoints] = React.useState<number>(2);
  const [creatorPoints, setCreatorPoints] = React.useState<number>(1);
  const [moderatorPoints, setModeratorPoints] = React.useState<number>(1);
  const [accessControlPoints, setAccessControlPoints] = React.useState<number>(1);
  const [isSavingPoints, setIsSavingPoints] = React.useState(false);

  React.useEffect(() => {
    loadSMTPConfigs();
    loadFinancialConfig();
    loadPointsConfig();
  }, []);

  const loadSMTPConfigs = async () => {
    try {
      const configs = await configStorage.getSMTPConfigs();
      setSMTPConfigs(configs);
    } catch (error) {
      console.error('Error loading SMTP configs:', error);
    }
  };

  const handleSMTPSave = (config: SMTPConfig) => {
    loadSMTPConfigs();
    setEditingSMTP(null);
  };

  const handleEditSMTP = (config: SMTPConfig) => {
    setEditingSMTP(config);
    setShowSMTPModal(true);
  };

  const handleDeleteSMTP = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta configuración SMTP?')) {
      try {
        await configStorage.deleteSMTPConfig(id);
        loadSMTPConfigs();
      } catch (error) {
        console.error('Error deleting SMTP config:', error);
      }
    }
  };

  const handleToggleActive = async (config: SMTPConfig) => {
    try {
      await configStorage.updateSMTPConfig(config.id, { isActive: !config.isActive });
      loadSMTPConfigs();
    } catch (error) {
      console.error('Error updating SMTP config:', error);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    console.log('Template changed to:', templateId);
  };

  const loadFinancialConfig = async () => {
    try {
      const price = await configStorage.getPricePerGuest();
      setPricePerGuest(price);
    } catch (error) {
      console.error('Error loading financial config:', error);
    }
  };

  const loadPointsConfig = async () => {
    try {
      const config = await configStorage.getPointsConfig();
      setAdminPoints(config.admin);
      setCreatorPoints(config.creator);
      setModeratorPoints(config.moderator);
      setAccessControlPoints(config.accessControl);
    } catch (error) {
      console.error('Error loading points config:', error);
    }
  };

  const handleSavePricePerGuest = async () => {
    try {
      setIsSavingPrice(true);
      await configStorage.setPricePerGuest(pricePerGuest);
      alert('Precio por invitado actualizado correctamente');
    } catch (error) {
      console.error('Error saving price per guest:', error);
      alert('Error al guardar el precio por invitado');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const handleSavePointsConfiguration = async () => {
    try {
      setIsSavingPoints(true);
      await configStorage.savePointsConfig({
        admin: adminPoints,
        creator: creatorPoints,
        moderator: moderatorPoints,
        accessControl: accessControlPoints
      });
      alert('Configuración de puntos actualizada correctamente');
    } catch (error) {
      console.error('Error saving points configuration:', error);
      alert('Error al guardar la configuración de puntos');
    } finally {
      setIsSavingPoints(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Settings className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Configuraciones</h1>
              <p className="text-gray-600">Gestiona las configuraciones del sistema</p>
            </div>
          </div>
          
          {/* Configuration Sub-tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveConfigTab('emails')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeConfigTab === 'emails'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Mail className="w-4 h-4 inline mr-2" />
                Emails
              </button>
              <button
                onClick={() => setActiveConfigTab('finances')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeConfigTab === 'finances'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <DollarSign className="w-4 h-4 inline mr-2" />
                Finanzas
              </button>
              <button
                onClick={() => setActiveConfigTab('puntos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeConfigTab === 'puntos'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Star className="w-4 h-4 inline mr-2" />
                Puntos
              </button>
            </nav>
          </div>
        </div>

        {/* Email Configuration */}
        {activeConfigTab === 'emails' && (
          <div className="space-y-8">
            {/* SMTP Configuration Section */}
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Configuración SMTP</h3>
                  <p className="text-sm text-gray-500">Gestiona las configuraciones de servidor para envíos masivos</p>
                </div>
                <button
                  onClick={() => {
                    setEditingSMTP(null);
                    setShowSMTPModal(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Configuración
                </button>
              </div>

              {/* SMTP Configurations List */}
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                {smtpConfigs.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin configuraciones</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Comienza creando tu primera configuración SMTP para envíos masivos
                    </p>
                    <div className="mt-6">
                      <button
                        onClick={() => {
                          setEditingSMTP(null);
                          setShowSMTPModal(true);
                        }}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Crear Primera Configuración
                      </button>
                    </div>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {smtpConfigs.map((config) => (
                      <li key={config.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${
                              config.provider === 'gmail' ? 'bg-red-100' :
                              config.provider === 'hostinger' ? 'bg-blue-100' :
                              'bg-gray-100'
                            }`}>
                              <Mail className={`w-5 h-5 ${
                                config.provider === 'gmail' ? 'text-red-600' :
                                config.provider === 'hostinger' ? 'text-blue-600' :
                                'text-gray-600'
                              }`} />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h4 className="text-sm font-medium text-gray-900">{config.name}</h4>
                                {config.isActive && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Activa
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {config.fromEmail} • {config.host}:{config.port}
                              </p>
                              <p className="text-xs text-gray-400">
                                Actualizada: {new Date(config.updatedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleToggleActive(config)}
                              className={`p-2 rounded-lg transition-colors ${
                                config.isActive
                                  ? 'text-green-600 hover:bg-green-50'
                                  : 'text-gray-400 hover:bg-gray-50'
                              }`}
                              title={config.isActive ? 'Desactivar' : 'Activar'}
                            >
                              {config.isActive ? (
                                <CheckCircle className="w-5 h-5" />
                              ) : (
                                <XCircle className="w-5 h-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleEditSMTP(config)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSMTP(config.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200"></div>

            {/* Email Templates Section */}
            <div className="space-y-6">
              <EmailTemplateSelector onTemplateChange={handleTemplateChange} />
            </div>
          </div>
        )}

        {/* Financial Configuration */}
        {activeConfigTab === 'finances' && (
          <div className="space-y-8">
            {/* Price Per Guest Configuration */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Configuración de Precios</h3>
                    <p className="text-sm text-gray-500">Define el valor por invitado para el cálculo de ingresos y comisiones</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <div className="max-w-md">
                    <label htmlFor="pricePerGuest" className="block text-sm font-medium text-gray-700 mb-2">
                      Precio por Invitado (USD)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        id="pricePerGuest"
                        min="0.01"
                        step="0.01"
                        value={pricePerGuest}
                        onChange={(e) => setPricePerGuest(parseFloat(e.target.value) || 0)}
                        className="block w-full pl-10 pr-12 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="1.00"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">USD</span>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Este valor se utiliza para calcular los ingresos totales y las comisiones de los creadores.
                    </p>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={handleSavePricePerGuest}
                      disabled={isSavingPrice || pricePerGuest <= 0}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingPrice ? (
                        <>
                          <div className="animate-spin -ml-1 mr-3 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Guardando...
                        </>
                      ) : (
                        'Guardar Configuración'
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Preview Section */}
                <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Vista Previa de Cálculos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500">Evento con 50 invitados</div>
                      <div className="font-semibold text-green-600">${(pricePerGuest * 50).toFixed(2)} USD</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500">Evento con 100 invitados</div>
                      <div className="font-semibold text-green-600">${(pricePerGuest * 100).toFixed(2)} USD</div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-gray-500">Comisión 15% (100 inv.)</div>
                      <div className="font-semibold text-blue-600">${((pricePerGuest * 100) * 0.15).toFixed(2)} USD</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Points Configuration */}
        {activeConfigTab === 'puntos' && (
          <div className="space-y-8">

            {/* Configuración de Puntos por Rol */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Puntos por Invitado según Rol</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Define cuántos puntos obtiene cada tipo de usuario cuando se aprueba un invitado a sus eventos.
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Administradores */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Users className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Administradores</h4>
                        <p className="text-sm text-gray-500">Usuarios con rol ADMIN</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Puntos por invitado aprobado
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={adminPoints}
                            onChange={(e) => setAdminPoints(parseFloat(e.target.value) || 0.1)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <span className="text-sm text-gray-500">puntos</span>
                        </div>
                      </div>
                      <div className="bg-indigo-50 p-3 rounded-md">
                        <p className="text-sm text-indigo-700">
                          <strong>Ejemplo:</strong> Con 100 invitados aprobados = {(adminPoints * 100).toFixed(1)} puntos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Creadores */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">Creadores</h4>
                        <p className="text-sm text-gray-500">Usuarios con rol CREATOR</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Puntos por invitado aprobado
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={creatorPoints}
                            onChange={(e) => setCreatorPoints(parseFloat(e.target.value) || 0.1)}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <span className="text-sm text-gray-500">puntos</span>
                        </div>
                      </div>
                      <div className="bg-green-50 p-3 rounded-md">
                        <p className="text-sm text-green-700">
                          <strong>Ejemplo:</strong> Con 100 invitados aprobados = {(creatorPoints * 100).toFixed(1)} puntos
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Moderadores - Desactivado */}
                  <div className="border border-gray-200 rounded-lg p-4 opacity-60 bg-gray-50">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Crown className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-500">Moderadores</h4>
                        <p className="text-sm text-gray-400">Usuarios con rol MODERATOR</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Puntos por invitado aprobado
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={moderatorPoints}
                            onChange={(e) => setModeratorPoints(parseFloat(e.target.value) || 0.1)}
                            disabled
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-400">puntos</span>
                        </div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <p className="text-sm text-gray-500">
                          <strong>Próximamente:</strong> Funcionalidad en desarrollo
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Control de Acceso - Desactivado */}
                  <div className="border border-gray-200 rounded-lg p-4 opacity-60 bg-gray-50">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Shield className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-500">Control de Acceso</h4>
                        <p className="text-sm text-gray-400">Usuarios con rol ACCESS_CONTROL</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-500 mb-1">
                          Puntos por invitado aprobado
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            min="0.1"
                            max="10"
                            step="0.1"
                            value={accessControlPoints}
                            onChange={(e) => setAccessControlPoints(parseFloat(e.target.value) || 0.1)}
                            disabled
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                          />
                          <span className="text-sm text-gray-400">puntos</span>
                        </div>
                      </div>
                      <div className="bg-gray-100 p-3 rounded-md">
                        <p className="text-sm text-gray-500">
                          <strong>Próximamente:</strong> Funcionalidad en desarrollo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón Guardar */}
                <div className="mt-8 flex justify-end">
                  <button
                    onClick={handleSavePointsConfiguration}
                    disabled={isSavingPoints}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingPoints ? (
                      <>
                        <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar'
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Información del Sistema */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Información del Sistema</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <h4 className="font-medium text-blue-900">Cuándo se otorgan puntos</h4>
                    </div>
                    <p className="text-sm text-blue-700">
                      Los puntos se otorgan UNA SOLA VEZ por evento al aprobar solicitudes de QR/links, no al aprobar el evento.
                    </p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <h4 className="font-medium text-green-900">Política de cancelación</h4>
                    </div>
                    <p className="text-sm text-green-700">
                      Si un evento se cancela después de otorgar puntos, los puntos NO se descuentan (ya pagaron por QR/links).
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <h4 className="font-medium text-yellow-900">Configuración flexible</h4>
                    </div>
                    <p className="text-sm text-yellow-700">
                      Cada tipo de usuario puede tener diferentes puntos por invitado según su rol y responsabilidades.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Configuration Modal */}
        <SMTPConfigModal
          isOpen={showSMTPModal}
          onClose={() => {
            setShowSMTPModal(false);
            setEditingSMTP(null);
          }}
          onSave={handleSMTPSave}
          editingConfig={editingSMTP}
        />
      </div>
    </div>
  );
} 