import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Video, MessageSquare, UserX, Upload, Check, X, AlertTriangle } from 'lucide-react';
import type { Guest, GuestAccessSettings, GuestAccessVideo } from '../types/event';
import { QRAccessPreview } from './QRAccessPreview';
import { storage } from '../lib/storage';
import { updateBoltEventSilentAPI, getBoltEventByIdSilentAPI } from '../endpoints/boltEvent';
import { uploadEventGuestVideoWithProgressAPI } from '../endpoints/eventGuest';

interface QRAccessManagerProps {
  eventId: string;
  guests: Guest[];
  onUpdateGuest: (guest: Guest) => void;
}

export function QRAccessManager({ eventId, guests, onUpdateGuest }: QRAccessManagerProps) {
  const [accessType, setAccessType] = useState<'video' | 'message'>('message');
  const defaultWelcomeMessage = "Gracias por venir ! estamos muy emocionados !";
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [isAccessActive, setIsAccessActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoUploadingByGuestId, setIsVideoUploadingByGuestId] = useState<Record<string, boolean>>({});
  const [videoUploadProgressByGuestId, setVideoUploadProgressByGuestId] = useState<Record<string, number>>({});
  const [rejectionMessage, setRejectionMessage] = useState('Lo sentimos, pero tu acceso no está autorizado para este evento. Si crees que esto es un error, por favor contacta al organizador.');
  const [previewType, setPreviewType] = useState<'welcome' | 'rejection' | 'pre-activation'>('welcome');
  const [search, setSearch] = useState('');
  const [accessSettings, setAccessSettings] = useState<GuestAccessSettings | null>(null);
  const [guestVideos, setGuestVideos] = useState<Record<string, GuestAccessVideo>>({});
  const preActivationMessage = 'El acceso aún no está disponible para este evento.';
  
  // Referencias para los timers de debounce
  const welcomeMessageTimerRef = useRef<number | null>(null);
  const rejectionMessageTimerRef = useRef<number | null>(null);
  const lastEventDataRef = useRef<any>(null); // Almacenar la última respuesta del evento
  
  // Función de debounce para retrasar las actualizaciones
  const debounce = (func: Function, delay: number, timerRef: React.MutableRefObject<number | null>) => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      func();
      timerRef.current = null;
    }, delay);
  };

  const previewGuest: Guest = {
    id: 'preview',
    event_id: eventId,
    name: 'María García',
    guest_number: 101,
    table_number: 5,
    status: 'confirmed',
    qr_code: 'preview',
    confirmation_status: 'confirmed',
    created_at: new Date().toISOString(),
  };

  // Cargar configuración inicial
  useEffect(() => {
    loadInitialData();
  }, [eventId]);

  // Listener para cambios de configuración de acceso hechos desde otros paneles
  useEffect(() => {
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
      // Primero intentamos cargar desde el backend
      try {
        const response = await getBoltEventByIdSilentAPI(Number(eventId));
        const eventData = response?.data;
        
        if (eventData) {
          // Guardamos los datos del evento para uso futuro
          lastEventDataRef.current = eventData;
          
          // Configuramos los estados según los datos del backend
          setIsAccessActive(eventData.qr_access_active || false);
          
          // Determinamos el tipo de acceso basado en los mensajes disponibles
          if (eventData.welcome_message) {
            // setAccessType('message');
            setWelcomeMessage(eventData.welcome_message || '');
          }
          
          // Configuramos el mensaje de rechazo si existe
          if (eventData.rejection_message) {
            setRejectionMessage(eventData.rejection_message);
          }
          
          // Creamos un objeto de configuración para compatibilidad con el código existente
          const settings: GuestAccessSettings = {
            id: `backend_${eventId}`,
            event_id: eventId,
            access_type: eventData.welcome_message ? 'message' : 'video',
            is_active: eventData.qr_access_active || false,
            welcome_message: eventData.welcome_message || '',
            rejection_message: eventData.rejection_message || 'Lo sentimos, pero tu acceso no está autorizado para este evento. Si crees que esto es un error, por favor contacta al organizador.',
            created_at: new Date().toISOString(),
          };
          
          setAccessSettings(settings);
          return;
        }
      } catch (backendError) {
        console.log('No se pudo cargar desde el backend, intentando con almacenamiento local', backendError);
      }
    } catch (error) {
      console.error('Error loading access settings:', error);
    }
  };

  const handleAccessActivation = async (isActive: boolean) => {
    try {
      setIsLoading(true);
      setIsAccessActive(isActive);
      
      // Crear objeto de configuración para almacenamiento local
      const settings: GuestAccessSettings = {
        id: accessSettings?.id || crypto.randomUUID(),
        event_id: eventId,
        access_type: accessType,
        is_active: isActive,
        welcome_message: welcomeMessage,
        rejection_message: rejectionMessage,
        created_at: new Date().toISOString(),
      };
      
      // Actualizar en el backend
      try {
        // Verificar si el estado ha cambiado realmente
        const eventData = lastEventDataRef.current;
        const needsUpdate = !eventData || eventData.qr_access_active !== isActive;
        
        if (needsUpdate) {
          // Solo enviar los campos que han cambiado
          const updateData: Record<string, any> = {
            qr_access_active: isActive
          };
          
          await updateBoltEventSilentAPI(Number(eventId), updateData);
          
          // Actualizar los datos guardados
          if (lastEventDataRef.current) {
            lastEventDataRef.current.qr_access_active = isActive;
          }
          
          console.log('QR access settings updated in backend');
        } else {
          console.log('QR access state unchanged, skipping backend update');
        }
      } catch (backendError) {
        console.error('Error updating QR access settings in backend:', backendError);
      }
      
      // Guardar también en almacenamiento local como respaldo
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error activating access:', error);
      setIsAccessActive(!isActive); // Revert state on error
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGuests = useMemo(() => {
    return guests.filter(guest => 
      guest.name?.toLowerCase().includes(search.toLowerCase()) ||
      guest.guest_number?.toString().includes(search)
    ).sort((a, b) => (a.guest_number || 0) - (b.guest_number || 0));
  }, [guests, search]);

  const handleAccessTypeChange = async (type: 'video' | 'message') => {
    // Si el tipo no ha cambiado, no hacemos nada
    if (type === accessType) return;
    
    setAccessType(type);
    try {
      setIsLoading(true);
      
      // Crear objeto de configuración para almacenamiento local
      const settings: GuestAccessSettings = {
        id: accessSettings?.id || crypto.randomUUID(),
        event_id: eventId,
        access_type: type,
        is_active: isAccessActive,
        welcome_message: type === 'message' ? welcomeMessage : undefined,
        rejection_message: rejectionMessage,
        created_at: new Date().toISOString(),
      };
      
      // Para el backend, solo actualizamos el mensaje de bienvenida si es tipo mensaje
      if (type === 'message') {
        try {
          // Verificar si el mensaje de bienvenida ha cambiado
          const eventData = lastEventDataRef.current;
          const currentWelcomeMessage = eventData?.welcome_message || '';
          
          if (currentWelcomeMessage !== welcomeMessage) {
            await updateBoltEventSilentAPI(Number(eventId), {
              welcome_message: welcomeMessage
            });
            
            // Actualizar los datos guardados
            if (lastEventDataRef.current) {
              lastEventDataRef.current.welcome_message = welcomeMessage;
            }
            
            console.log('Access type updated in backend');
          } else {
            console.log('Welcome message unchanged, skipping backend update');
          }
        } catch (backendError) {
          console.error('Error updating access type in backend:', backendError);
        }
      }
      
      // Guardar en almacenamiento local
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error saving access settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Manejador de cambio de mensaje de bienvenida con debounce
  const handleWelcomeMessageChange = (message: string) => {
    // Actualizar el estado inmediatamente para la interfaz de usuario
    setWelcomeMessage(message);
    
    // Debounce para la actualización en el backend
    debounce(() => {
      saveWelcomeMessage(message);
    }, 1000, welcomeMessageTimerRef);
  };
  
  // Función para guardar el mensaje de bienvenida
  const saveWelcomeMessage = async (message: string) => {
    if (!accessSettings) return;
    if (isLoading) return; // Evitar actualizaciones mientras está cargando

    try {
      setIsLoading(true);
      
      // Actualizar en el backend
      try {
        // Usar los datos del evento guardados si están disponibles
        const eventData = lastEventDataRef.current;
        
        // Solo actualizar si el mensaje ha cambiado
        if (!eventData || eventData.welcome_message !== message) {
          await updateBoltEventSilentAPI(Number(eventId), {
            welcome_message: message
          });
          
          // Actualizar los datos guardados
          if (lastEventDataRef.current) {
            lastEventDataRef.current.welcome_message = message;
          }
          
          console.log('Welcome message updated in backend');
        }
      } catch (backendError) {
        console.error('Error updating welcome message in backend:', backendError);
      }
      
      // Actualizar en almacenamiento local
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

  // Manejador de cambio de mensaje de rechazo con debounce
  const handleRejectionMessageChange = (message: string) => {
    // Actualizar el estado inmediatamente para la interfaz de usuario
    setRejectionMessage(message);
    
    // Debounce para la actualización en el backend
    debounce(() => {
      saveRejectionMessage(message);
    }, 1000, rejectionMessageTimerRef);
  };
  
  // Función para guardar el mensaje de rechazo
  const saveRejectionMessage = async (message: string) => {
    if (!accessSettings) return;
    if (isLoading) return; // Evitar actualizaciones mientras está cargando

    try {
      setIsLoading(true);
      
      // Actualizar en el backend
      try {
        // Usar los datos del evento guardados si están disponibles
        const eventData = lastEventDataRef.current;
        
        // Solo actualizar si el mensaje ha cambiado
        if (!eventData || eventData.rejection_message !== message) {
          await updateBoltEventSilentAPI(Number(eventId), {
            rejection_message: message
          });
          
          // Actualizar los datos guardados
          if (lastEventDataRef.current) {
            lastEventDataRef.current.rejection_message = message;
          }
          
          console.log('Rejection message updated in backend');
        }
      } catch (backendError) {
        console.error('Error updating rejection message in backend:', backendError);
      }
      
      // Actualizar en almacenamiento local
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
      setIsVideoUploadingByGuestId(prev => ({ ...prev, [guestId]: true }));
      setVideoUploadProgressByGuestId(prev => ({ ...prev, [guestId]: 0 }));
      const guest = guests.find(g => g.id === guestId);
      if (!guest) return;

      const response = await uploadEventGuestVideoWithProgressAPI(
        Number(eventId),
        guest.guest_number,
        file,
        (percent) => setVideoUploadProgressByGuestId(prev => ({ ...prev, [guestId]: percent }))
      );
      const apiGuest = response?.data;

      const uploadedVideoUrl: string | undefined = apiGuest?.video_url;
      if (!uploadedVideoUrl) return;

      const video: GuestAccessVideo = {
        id: crypto.randomUUID(),
        guest_id: guestId,
        video_url: uploadedVideoUrl,
        created_at: new Date().toISOString(),
      };

      setGuestVideos(prev => ({ ...prev, [guestId]: video }));

      // Mantener sincronizado en el estado principal (y backend)
      onUpdateGuest({
        ...guest,
        video_url: uploadedVideoUrl,
        video_status: apiGuest?.video_status ?? true,
      });
    } catch (error) {
      console.error('Error uploading video:', error);
    } finally {
      setIsVideoUploadingByGuestId(prev => ({ ...prev, [guestId]: false }));
      setVideoUploadProgressByGuestId(prev => ({ ...prev, [guestId]: 0 }));
    }
  };

  // Referencia para almacenar los temporizadores por ID de invitado
  const guestUpdateTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
  // Estado local para mantener los cambios en los invitados antes de enviarlos al API
  const [localGuestUpdates, setLocalGuestUpdates] = useState<Record<string, Guest>>({});
  
  // Combinar los invitados originales con las actualizaciones locales
  const mergedGuests = useMemo(() => {
    return filteredGuests.map(guest => {
      return localGuestUpdates[guest.id] ? { ...guest, ...localGuestUpdates[guest.id] } : guest;
    });
  }, [filteredGuests, localGuestUpdates]);
  
  // Función para actualizar localmente un invitado
  const updateLocalGuest = useCallback((guest: Guest) => {
    setLocalGuestUpdates(prev => ({
      ...prev,
      [guest.id]: { ...prev[guest.id], ...guest }
    }));
  }, []);
  
  const toggleGuestAccess = async (guest: Guest) => {
    try {
      if (accessType === 'video') {
        // video_status controla el acceso en "Video de Recepción"
        const currentStatus = guest.video_status === undefined ? true : guest.video_status;
        const nextStatus = !currentStatus;
        // Si se quita acceso en video, también se quita en QR (y viceversa)
        const updatedGuest = { ...guest, video_status: nextStatus, qr_code_status: nextStatus };
        updateLocalGuest(updatedGuest);

        const guestId = guest.id;
        if (guestUpdateTimersRef.current[guestId]) {
          clearTimeout(guestUpdateTimersRef.current[guestId]);
        }
        guestUpdateTimersRef.current[guestId] = setTimeout(() => {
          onUpdateGuest(updatedGuest);
          delete guestUpdateTimersRef.current[guestId];
        }, 500);
        return;
      }

      // qr_code_status controla el acceso en "Mensaje Interactivo"
      const currentStatus = guest.qr_code_status === undefined ? true : guest.qr_code_status;
      const nextStatus = !currentStatus;
      // Si se quita acceso en QR, también se quita en video (y viceversa)
      const updatedGuest = { ...guest, qr_code_status: nextStatus, video_status: nextStatus };
      
      // Actualizar inmediatamente en la UI
      updateLocalGuest(updatedGuest);
      
      // Cancelar el temporizador anterior para este invitado si existe
      const guestId = guest.id;
      if (guestUpdateTimersRef.current[guestId]) {
        clearTimeout(guestUpdateTimersRef.current[guestId]);
      }
      
      // Crear un nuevo temporizador para este invitado
      guestUpdateTimersRef.current[guestId] = setTimeout(() => {
        // Enviar al API después del delay
        onUpdateGuest(updatedGuest);
        // Limpiar la referencia del temporizador
        delete guestUpdateTimersRef.current[guestId];
      }, 500); // 500ms de delay
      
    } catch (error) {
      console.error('Error updating guest access:', error);
    }
  };

  const getGuestAccessStatus = (guest: Guest): boolean => {
    if (accessType === 'video') {
      return guest.video_status === undefined ? true : guest.video_status;
    }
    return guest.qr_code_status === undefined ? true : guest.qr_code_status;
  };

  // Función para formatear el mensaje de bienvenida con los datos del invitado
  const formatWelcomeMessage = (message: string, guest: Guest) => {
    if (!message) return '';
    return message
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
                      : formatWelcomeMessage(welcomeMessage || defaultWelcomeMessage, previewGuest)
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
          <div className="flex items-center space-x-2">
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
                {mergedGuests.map((guest) => {
                  // Verificar si el registro del invitado está completo
                  const isGuestComplete = guest.name && guest.name.trim() !== '' && guest.guest_number !== undefined;
                  
                  return (
                    <tr 
                      key={guest.id} 
                      className={!isGuestComplete ? 'opacity-60 bg-gray-50' : ''}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{guest.guest_number?.toString().padStart(3, '0') || '???'}
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
                            {!isGuestComplete ? (
                              <span className="inline-flex items-center text-gray-500">
                                <AlertTriangle className="h-5 w-5 mr-2 text-gray-500" />
                                No disponible
                              </span>
                            ) : !getGuestAccessStatus(guest) ? (
                              <span className="inline-flex items-center text-gray-500">
                                <X className="h-5 w-5 mr-2 text-red-500" />
                                No disponible - Acceso denegado
                              </span>
                            ) : guestVideos[guest.id] || guest.video_url ? (
                              <div className="flex items-center space-x-2">
                                <Check className="h-5 w-5 text-green-500" />
                                <span>Video cargado</span>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <label className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer ${
                                isVideoUploadingByGuestId[guest.id] ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'
                              }`}>
                                <Upload className="h-4 w-4 mr-2" />
                                {isVideoUploadingByGuestId[guest.id] ? 'Subiendo...' : 'Subir Video'}
                                <input
                                  type="file"
                                  accept="video/*"
                                  className="hidden"
                                  disabled={!!isVideoUploadingByGuestId[guest.id]}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file && !isVideoUploadingByGuestId[guest.id]) handleVideoUpload(guest.id, file);
                                  }}
                                />
                                </label>
                                {isVideoUploadingByGuestId[guest.id] && (
                                  <div className="w-48">
                                    <div className="h-2 w-full bg-gray-200 rounded">
                                      <div
                                        className="h-2 bg-indigo-600 rounded transition-all"
                                        style={{ width: `${videoUploadProgressByGuestId[guest.id] || 0}%` }}
                                      />
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                      {videoUploadProgressByGuestId[guest.id] || 0}%
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      ) : (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {!isGuestComplete ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <AlertTriangle className="w-4 h-4 mr-1" />
                              No disponible
                            </span>
                          ) : !guest.qr_code_status ? (
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
                        {!isGuestComplete ? (
                          <div className="flex space-x-2">
                            <button
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 bg-gray-50 rounded-md focus:outline-none cursor-not-allowed opacity-80"
                              disabled
                            >
                              <AlertTriangle className="h-4 w-4 mr-2 text-gray-500" />
                              No disponible
                            </button>
                          </div>
                        ) : (
                          (() => {
                            const currentStatus = getGuestAccessStatus(guest);
                            return (
                          <button
                            onClick={() => toggleGuestAccess(guest)}
                            className={`inline-flex items-center px-3 py-2 border ${
                              !currentStatus
                                ? 'border-red-300 text-red-700 hover:bg-red-50'
                                : 'border-green-300 text-green-700 hover:bg-green-50'
                            } rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                          >
                            {!currentStatus ? (
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
                            );
                          })()
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}