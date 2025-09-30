import React from 'react';
import { Video, MessageSquare, UserX, Upload, Check, X, AlertTriangle } from 'lucide-react';
import type { Guest, GuestAccessSettings, GuestAccessVideo } from '../types/event';
import { QRAccessPreview } from './QRAccessPreview';
import { storage } from '../lib/storage';

interface QRAccessManagerProps {
  eventId: string;
  guests: Guest[];
  onUpdateGuest: (guest: Guest) => void;
}

export function QRAccessManager({ eventId, guests, onUpdateGuest }: QRAccessManagerProps) {
  const [accessType, setAccessType] = React.useState<'video' | 'message'>('message');
  const defaultWelcomeMessage = "Gracias por venir ! estamos muy emocionados !";
  const [welcomeMessage, setWelcomeMessage] = React.useState('');
  const [isAccessActive, setIsAccessActive] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [rejectionMessage, setRejectionMessage] = React.useState(
    'Lo sentimos, pero tu acceso no está autorizado para este evento. Si crees que esto es un error, por favor contacta al organizador.'
  );
  const [previewType, setPreviewType] = React.useState<'welcome' | 'rejection' | 'pre-activation'>('welcome');
  const [search, setSearch] = React.useState('');
  const [accessSettings, setAccessSettings] = React.useState<GuestAccessSettings | null>(null);
  const [guestVideos, setGuestVideos] = React.useState<Record<string, GuestAccessVideo>>({});
  const preActivationMessage = 'El acceso aún no está disponible para este evento.';

  const previewGuest: Guest = {
    id: 'preview',
    event_id: eventId,
    name: 'María García',
    guest_number: 101,
    table_number: 5,
    confirmed: true,
    attended: false,
    qr_code: 'preview',
    created_at: new Date().toISOString(),
  };

  // Cargar configuración inicial
  React.useEffect(() => {
    loadInitialData();
  }, [eventId]);

  // Listener para cambios de configuración de acceso hechos desde otros paneles
  React.useEffect(() => {
    const handleStorageUpdate = async (e: CustomEvent<{ type: string; eventId: string }>) => {
      const { type, eventId: updatedEventId } = e.detail;
      
      // Solo reaccionar a cambios en configuración de acceso para este evento
      if (type === 'access_settings_updated' && updatedEventId === eventId) {
        await loadInitialData();
      }
    };

    window.addEventListener('storage_update', handleStorageUpdate as any);
    return () => window.removeEventListener('storage_update', handleStorageUpdate as any);
  }, [eventId]);

  const loadInitialData = async () => {
    try {
      const settings = await storage.getAccessSettings(eventId);
      if (settings) {
        setAccessSettings(settings);
        setIsAccessActive(settings.is_active);
        setAccessType(settings.access_type);
        setWelcomeMessage(settings.welcome_message || '');
        setRejectionMessage(settings.rejection_message || 'Lo sentimos, pero tu acceso no está autorizado para este evento. Si crees que esto es un error, por favor contacta al organizador.');
      }
    } catch (error) {
      console.error('Error loading access settings:', error);
    }
  };

  const handleAccessActivation = async (isActive: boolean) => {
    try {
      setIsLoading(true);
      setIsAccessActive(isActive);
      
      const settings: GuestAccessSettings = {
        id: accessSettings?.id || crypto.randomUUID(),
        event_id: eventId,
        access_type: accessType,
        is_active: isActive,
        welcome_message: welcomeMessage,
        rejection_message: rejectionMessage,
        created_at: new Date().toISOString(),
      };
      
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error activating access:', error);
      setIsAccessActive(!isActive); // Revert state on error
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGuests = React.useMemo(() => {
    return guests.filter(guest => 
      guest.name?.toLowerCase().includes(search.toLowerCase()) ||
      guest.guest_number?.toString().includes(search)
    ).sort((a, b) => (a.guest_number || 0) - (b.guest_number || 0));
  }, [guests, search]);

  const handleAccessTypeChange = async (type: 'video' | 'message') => {
    setAccessType(type);
    try {
      setIsLoading(true);
      const settings: GuestAccessSettings = {
        id: crypto.randomUUID(),
        event_id: eventId,
        access_type: type,
        is_active: isAccessActive,
        welcome_message: type === 'message' ? welcomeMessage : undefined,
        created_at: new Date().toISOString(),
      };
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error saving access settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWelcomeMessageChange = async (message: string) => {
    setWelcomeMessage(message);
    if (!accessSettings) return;

    try {
      setIsLoading(true);
      const settings: GuestAccessSettings = {
        ...accessSettings,
        welcome_message: message,
        rejection_message: rejectionMessage,
      };
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error saving welcome message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectionMessageChange = async (message: string) => {
    setRejectionMessage(message);
    if (!accessSettings) return;

    try {
      setIsLoading(true);
      const settings: GuestAccessSettings = {
        ...accessSettings,
        welcome_message: welcomeMessage,
        rejection_message: message,
      };
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error saving rejection message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoUpload = async (guestId: string, file: File) => {
    try {
      setIsLoading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const videoUrl = e.target?.result as string;
        const video: GuestAccessVideo = {
          id: crypto.randomUUID(),
          guest_id: guestId,
          video_url: videoUrl,
          created_at: new Date().toISOString(),
        };
        await storage.saveGuestVideo(video);
        setGuestVideos(prev => ({ ...prev, [guestId]: video }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGuestAccess = async (guest: Guest) => {
    try {
      const updatedGuest = {
        ...guest,
        access_denied: !guest.access_denied,
      };
      await onUpdateGuest(updatedGuest);
    } catch (error) {
      console.error('Error updating guest access:', error);
    }
  };

  const previewMessage = (guest: Guest) => {
    if (!welcomeMessage) return '';
    return welcomeMessage
      .replace('{name}', guest.name || 'Invitado')
      .replace('{table}', guest.table_number?.toString() || '--');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Tipo de Acceso</h3>
          <div className="flex items-center">
            <button
              onClick={() => handleAccessActivation(!isAccessActive)}
              disabled={isLoading}
              className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                isAccessActive
                  ? 'bg-green-600 text-white hover:bg-green-700 border-transparent'
                  : 'bg-red-600 text-white hover:bg-red-700 border-transparent'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                isAccessActive ? 'focus:ring-green-500' : 'focus:ring-red-500'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                'Guardando...'
              ) : isAccessActive ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Activado
                </>
              ) : (
                'Desactivado'
              )}
            </button>
          </div>
        </div>
        
        {!isAccessActive && (
          <div className="mb-6 rounded-md bg-amber-50 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">
                  Acceso QR desactivado
                </h3>
                <div className="mt-2 text-sm text-amber-700">
                  Para un seguimiento preciso de la asistencia, se recomienda activar el acceso unos minutos antes del evento o antes de que lleguen los invitados.
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isAccessActive && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <Check className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Acceso QR activado
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>Los QR de los invitados ya pueden ser escaneados para acceder al evento.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            onClick={() => handleAccessTypeChange('message')}
            className={`${
              accessType === 'message'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            } p-4 border-2 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>Mensaje Interactivo</span>
          </button>

          <button
            onClick={() => handleAccessTypeChange('video')}
            className={`${
              accessType === 'video'
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            } p-4 border-2 rounded-lg flex items-center justify-center space-x-2 transition-colors duration-200`}
          >
            <Video className="h-5 w-5" />
            <span>Video de Recepción</span>
          </button>
        </div>
        {accessType === 'video' && (
          <div className="mt-3 rounded-md bg-amber-50/50 border border-amber-100 p-2">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div className="ml-2">
                <p className="text-xs text-amber-700">
                  Los invitados con acceso denegado no verán ningún video. En su lugar, recibirán el mensaje de rechazo predeterminado.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {accessType === 'message' && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Configuración de Mensajes</h3>
                <div className="space-y-4">
                  {/* Pre-activation Message Section */}
                  <div>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700">Mensaje Pre-Activación</label>
                      <div className="mt-2 p-2 bg-amber-50/50 rounded-md border border-amber-100">
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mr-2" />
                          <span className="text-xs font-medium text-amber-700">No editable</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1">{preActivationMessage}</p>
                      </div>
                    </div>
                  </div>

                  {/* Welcome Message Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mensaje de Bienvenida</label>
                    <p className="text-sm text-gray-500 mb-2">
                      El mensaje se mostrará después del nombre del invitado y su número de mesa. No es necesario incluir estos datos en el mensaje.
                    </p>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => handleWelcomeMessageChange(e.target.value)}
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder={defaultWelcomeMessage}
                    />
                  </div>
                  
                  {/* Rejection Message Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Mensaje de Rechazo</label>
                    <p className="text-sm text-gray-500 mb-2">
                      Usa {'{name}'} para personalizar el mensaje de rechazo.
                    </p>
                    <textarea
                      value={rejectionMessage}
                      onChange={(e) => handleRejectionMessageChange(e.target.value)}
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                      placeholder="Lo sentimos {name}, pero tu acceso no está autorizado."
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Vista Previa */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa</h3>
              <div className="flex space-x-2 mb-4">
                <button
                  onClick={() => setPreviewType('pre-activation')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    previewType === 'pre-activation'
                      ? 'bg-amber-100 text-amber-700'
                      : 'text-gray-500 hover:text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Pre-Activación
                </button>
                <button
                  onClick={() => setPreviewType('welcome')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    previewType === 'welcome'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  Bienvenida
                </button>
                <button
                  onClick={() => setPreviewType('rejection')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${
                    previewType === 'rejection'
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-500 hover:text-red-700 hover:bg-red-50'
                  }`}
                >
                  Rechazo
                </button>
              </div>
              
              <QRAccessPreview
                message={
                  previewType === 'pre-activation'
                    ? preActivationMessage
                    : previewType === 'rejection'
                    ? rejectionMessage
                    : welcomeMessage || defaultWelcomeMessage
                }
                guest={previewGuest}
                isRejected={previewType === 'rejection'}
                isPreActivation={previewType === 'pre-activation'}
              />
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Lista de Invitados</h3>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar invitados..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitado #
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mesa
                  </th>
                  {accessType === 'video' ? (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Video
                    </th>
                  ) : (
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mensaje Preview
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acceso
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{guest.guest_number?.toString().padStart(3, '0')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.name || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {guest.table_number || '--'}
                    </td>
                    {accessType === 'video' ? (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {guest.access_denied ? (
                            <span className="inline-flex items-center text-gray-500">
                              <X className="h-5 w-5 mr-2 text-red-500" />
                              No disponible - Acceso denegado
                            </span>
                          ) : guestVideos[guest.id] ? (
                            <div className="flex items-center space-x-2">
                              <Check className="h-5 w-5 text-green-500" />
                              <span>Video cargado</span>
                            </div>
                          ) : (
                            <label className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                              <Upload className="h-4 w-4 mr-2" />
                              Subir Video
                              <input
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleVideoUpload(guest.id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </td>
                    ) : (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guest.access_denied ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <X className="w-4 h-4 mr-1" />
                            Acceso Denegado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check className="w-4 h-4 mr-1" />
                            Acceso Permitido
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => toggleGuestAccess(guest)}
                        className={`inline-flex items-center px-3 py-2 border ${
                          guest.access_denied
                            ? 'border-red-300 text-red-700 hover:bg-red-50'
                            : 'border-green-300 text-green-700 hover:bg-green-50'
                        } rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                      >
                        {guest.access_denied ? (
                          <>
                            <UserX className="h-4 w-4 mr-2" />
                            Acceso Denegado
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Acceso Permitido
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}