import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Info, QrCode, Check, X, AlertTriangle, MessageSquare, Video, Search, UserCheck, UserX, ClipboardCheck, ClipboardX, Users, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';
import { rolesStorage } from '../lib/roles-storage';
import { QRAccessScanner } from '../components/QRAccessScanner';
import { ScreensaverOverlay } from '../components/ScreensaverOverlay';
import type { Event, Guest, GuestAccessSettings } from '../types/event';
import type { UserAccess } from '../types/roles';

export function AccessControlEventManagement() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'info' | 'qr-scan'>('info');
  const [userAccess, setUserAccess] = React.useState<UserAccess | null>(null);
  const [assignedEvents, setAssignedEvents] = React.useState<Event[]>([]);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [accessSettings, setAccessSettings] = React.useState<GuestAccessSettings | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [isAccessActive, setIsAccessActive] = React.useState(false);
  
  // Estados para screensaver (NUEVOS - no interfieren con QRAccessScanner)
  const [lastActivity, setLastActivity] = React.useState(Date.now());
  const [currentMethod, setCurrentMethod] = React.useState<string>('');
  const [hasOpenModals, setHasOpenModals] = React.useState(false);
  const [screensaverEnabled, setScreensaverEnabled] = React.useState(true);
  const [isScanning, setIsScanning] = React.useState(false);

  React.useEffect(() => {
    if (user?.id && eventId) {
      loadData();
    }
  }, [user, eventId]);

  // Listener para cambios de configuración de acceso hechos desde otros paneles
  React.useEffect(() => {
    const handleStorageUpdate = async (e: CustomEvent<{ type: string; eventId: string }>) => {
      const { type, eventId } = e.detail;
      
      // Solo reaccionar a cambios en configuración de acceso
      if (type === 'access_settings_updated' && assignedEvents.some(evt => evt.id === eventId)) {
        try {
          // Recargar configuración de acceso
          const settings = await storage.getAccessSettings(eventId);
          setAccessSettings(settings);
          setIsAccessActive(settings?.is_active || false);
        } catch (error) {
          console.error('Error updating access settings:', error);
        }
      }
    };

    window.addEventListener('storage_update', handleStorageUpdate as any);
    return () => window.removeEventListener('storage_update', handleStorageUpdate as any);
  }, [assignedEvents]);

  const loadData = async () => {
    if (!user?.id || !eventId) return;
    
    try {
      // Get user access data
      const allAccesses = await rolesStorage.getUserAccesses('all');
      const currentUserAccess = allAccesses.find(access => access.id === user.id);
      
      if (currentUserAccess) {
        // Verificar si el usuario tiene acceso a este evento específico
        if (!currentUserAccess.assignedEvents.includes(eventId)) {
          navigate('/access-control');
          return;
        }

        setUserAccess(currentUserAccess);
        
        // Cargar el evento específico
        const allEvents = await storage.getEvents();
        const targetEvent = allEvents.find(event => event.id === eventId);
        
        if (!targetEvent) {
          navigate('/access-control');
          return;
        }

        setAssignedEvents([targetEvent]); // Solo guardamos el evento actual
        await loadEventData(targetEvent.id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      navigate('/access-control');
    }
  };

  const loadEventData = async (eventId: string) => {
    try {
      const [eventGuests, settings] = await Promise.all([
        storage.getGuests(eventId),
        storage.getAccessSettings(eventId)
      ]);
      
      setGuests(eventGuests.sort((a: Guest, b: Guest) => (a.guest_number || 0) - (b.guest_number || 0)));
      setAccessSettings(settings);
      setIsAccessActive(settings?.is_active || false);
    } catch (error) {
      console.error('Error loading event data:', error);
    }
  };

  const handleAccessActivation = async (isActive: boolean) => {
    if (!eventId) return;
    
    try {
      setIsLoading(true);
      setIsAccessActive(isActive);
      
      const settings: GuestAccessSettings = {
        id: accessSettings?.id || crypto.randomUUID(),
        event_id: eventId,
        access_type: accessSettings?.access_type || 'message',
        is_active: isActive,
        welcome_message: accessSettings?.welcome_message || '',
        rejection_message: accessSettings?.rejection_message || '',
        created_at: new Date().toISOString(),
      };
      
      await storage.saveAccessSettings(settings);
      setAccessSettings(settings);
    } catch (error) {
      console.error('Error activating access:', error);
      setIsAccessActive(!isActive);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGuests = React.useMemo(() => {
    return guests.filter(guest => 
      guest.name?.toLowerCase().includes(search.toLowerCase()) ||
      guest.guest_number?.toString().includes(search)
    ).sort((a: Guest, b: Guest) => (a.guest_number || 0) - (b.guest_number || 0));
  }, [guests, search]);

  const stats = React.useMemo(() => {
    return {
      complete: guests.filter(guest => 
        guest.name && 
        guest.email && 
        guest.phone && 
        guest.table_number
      ).length,
      incomplete: guests.filter(guest => 
        !guest.name || 
        !guest.email || 
        !guest.phone || 
        !guest.table_number
      ).length,
      confirmed: guests.filter(guest => guest.confirmed).length,
      notConfirmed: guests.filter(guest => !guest.confirmed).length,
      accessDenied: guests.filter(guest => guest.access_denied).length,
    };
  }, [guests]);

  const handleGuestProcessed = (updatedGuest: Guest) => {
    // Actualizar la lista de invitados con el invitado procesado
    setGuests(prevGuests => 
      prevGuests.map(guest => 
        guest.id === updatedGuest.id ? updatedGuest : guest
      )
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/access-control')}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-2"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Gestión de Acceso</h1>
                <p className="text-gray-500 mt-1">
                  Control de acceso para eventos
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`${
                    activeTab === 'info'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Info className="h-5 w-5 mr-2" />
                  Info del Evento
                </button>
                <button
                  onClick={() => setActiveTab('qr-scan')}
                  className={`${
                    activeTab === 'qr-scan'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  Escaneo QR
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              {activeTab === 'info' && (
                <div className="space-y-6">
                  {/* Access Settings Summary */}
                  <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-lg font-medium text-gray-900">Estado del Acceso</h3>
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
                              Ingreso Activado
                            </>
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Ingreso Desactivado
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Access Type Summary */}
                    {accessSettings && (
                      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            {accessSettings.access_type === 'video' ? (
                              <Video className="h-5 w-5 text-blue-400" />
                            ) : (
                              <MessageSquare className="h-5 w-5 text-blue-400" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-blue-700">
                              <strong>Tipo de acceso configurado:</strong> {
                                accessSettings.access_type === 'video' 
                                  ? 'Video de Recepción' 
                                  : 'Mensaje Interactivo'
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {!isAccessActive && (
                      <div className="mt-4 rounded-md bg-amber-50 p-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-amber-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-amber-800">
                              Acceso QR desactivado
                            </h3>
                            <div className="mt-2 text-sm text-amber-700">
                              Los códigos QR de los invitados no pueden ser escaneados hasta que se active el ingreso.
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {isAccessActive && (
                      <div className="mt-4 rounded-md bg-green-50 p-4">
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
                  </div>

                  {/* Guest List */}
                  <div className="bg-white shadow rounded-lg overflow-hidden">
                    <div className="p-6">
                     {/* Event Statistics */}
                     <div className="mb-6 sm:mb-8">
                       <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3 sm:mb-4">Estadísticas del Evento</h3>
                       <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                         <div className="bg-indigo-50 rounded-lg p-3 sm:p-4 border border-indigo-100">
                           <div className="flex items-center">
                             <div className="flex-shrink-0">
                               <Users className="h-5 w-5 sm:h-8 sm:w-8 text-indigo-600" />
                             </div>
                             <div className="ml-2 sm:ml-3">
                               <p className="text-xs sm:text-sm font-medium text-indigo-600">Total de Invitados</p>
                               <p className="text-lg sm:text-2xl font-bold text-indigo-900">{guests.length}</p>
                             </div>
                           </div>
                         </div>

                         <div className="bg-green-50 rounded-lg p-3 sm:p-4 border border-green-100">
                           <div className="flex items-center">
                             <div className="flex-shrink-0">
                               <UserCheck className="h-5 w-5 sm:h-8 sm:w-8 text-green-600" />
                             </div>
                             <div className="ml-2 sm:ml-3">
                               <p className="text-xs sm:text-sm font-medium text-green-600">Confirmados</p>
                               <p className="text-lg sm:text-2xl font-bold text-green-900">{stats.confirmed}</p>
                             </div>
                           </div>
                         </div>

                         <div className="bg-purple-50 rounded-lg p-3 sm:p-4 border border-purple-100">
                           <div className="flex items-center">
                             <div className="flex-shrink-0">
                               <QrCode className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600" />
                             </div>
                             <div className="ml-2 sm:ml-3">
                               <p className="text-xs sm:text-sm font-medium text-purple-600">Ingresaron</p>
                               <p className="text-lg sm:text-2xl font-bold text-purple-900">{guests.filter(guest => guest.attended).length}</p>
                             </div>
                           </div>
                         </div>

                         <div className="bg-amber-50 rounded-lg p-3 sm:p-4 border border-amber-100">
                           <div className="flex items-center">
                             <div className="flex-shrink-0">
                               <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-amber-600" />
                             </div>
                             <div className="ml-2 sm:ml-3">
                               <p className="text-xs sm:text-sm font-medium text-amber-600">Faltan Ingresar</p>
                               <p className="text-lg sm:text-2xl font-bold text-amber-900">{guests.length - guests.filter(guest => guest.attended).length}</p>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>

                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">Lista de Invitados</h3>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar invitados..."
                            className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          />
                        </div>
                      </div>

                      {/* Stats - Mobile Optimized */}
                      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4">
                        <div className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
                          <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                          <span className="ml-1 sm:ml-1.5 text-xs text-gray-500">Completos:</span>
                          <span className="ml-1 text-xs sm:text-sm font-semibold text-gray-900">{stats.complete}</span>
                        </div>
                        <div className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
                          <ClipboardX className="h-3 w-3 sm:h-4 sm:w-4 text-amber-500" />
                          <span className="ml-1 sm:ml-1.5 text-xs text-gray-500">Incompletos:</span>
                          <span className="ml-1 text-xs sm:text-sm font-semibold text-gray-900">{stats.incomplete}</span>
                        </div>
                        <div className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
                          <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-500" />
                          <span className="ml-1 sm:ml-1.5 text-xs text-gray-500">Confirmados:</span>
                          <span className="ml-1 text-xs sm:text-sm font-semibold text-gray-900">{stats.confirmed}</span>
                        </div>
                        <div className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
                          <UserX className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />
                          <span className="ml-1 sm:ml-1.5 text-xs text-gray-500">No Confirmados:</span>
                          <span className="ml-1 text-xs sm:text-sm font-semibold text-gray-900">{stats.notConfirmed}</span>
                        </div>
                        <div className="inline-flex items-center px-2 sm:px-2.5 py-1 sm:py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
                          <X className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                          <span className="ml-1 sm:ml-1.5 text-xs text-gray-500">Acceso Denegado:</span>
                          <span className="ml-1 text-xs sm:text-sm font-semibold text-gray-900">{stats.accessDenied}</span>
                        </div>
                      </div>

                      {/* Guest Table */}
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
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Movilidad
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Estado
                              </th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Acceso
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredGuests.map((guest) => (
                              <tr key={guest.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  #{guest.guest_number?.toString().padStart(3, '0')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {guest.name || 'Sin nombre'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {guest.table_number || '--'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {guest.mobility_restrictions || '--'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    guest.attended ? 'bg-purple-100 text-purple-800' :
                                    guest.confirmed ? 'bg-green-100 text-green-800' : 
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {guest.attended ? 'Asistió' : guest.confirmed ? 'Confirmado' : 'No Confirmado'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    guest.access_denied ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                  }`}>
                                    {guest.access_denied ? (
                                      <>
                                        <X className="w-4 h-4 mr-1" />
                                        Denegado
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-4 h-4 mr-1" />
                                        Permitido
                                      </>
                                    )}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {filteredGuests.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                  {search ? 'No se encontraron invitados' : 'No hay invitados cargados'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                   {/* Mobility Assistance Indicator */}
                   <div className="mt-6 flex items-center justify-center">
                     <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                       <div className="flex-shrink-0">
                         <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <div className="ml-2">
                         <span className="text-sm font-medium text-blue-800">
                           ♿ Invitados que requieren asistencia de movilidad: {
                             guests.filter(guest => 
                               guest.mobility_restrictions && 
                               guest.mobility_restrictions.trim() !== '' && 
                               guest.mobility_restrictions.toLowerCase() !== 'ninguna'
                             ).length
                           }
                         </span>
                       </div>
                     </div>
                   </div>
                </div>
              )}

              {activeTab === 'qr-scan' && assignedEvents.length > 0 && (
                <QRAccessScanner
                  eventId={assignedEvents[0].id}
                  guests={guests}
                  accessSettings={accessSettings}
                  onGuestProcessed={handleGuestProcessed}
                  onActivity={() => setLastActivity(Date.now())}
                  onMethodChange={setCurrentMethod}
                  onModalStateChange={setHasOpenModals}
                  onScreensaverToggle={setScreensaverEnabled}
                  onScanningStateChange={setIsScanning}
                />
              )}

              {activeTab === 'qr-scan' && assignedEvents.length === 0 && (
                <div className="text-center py-12">
                  <QrCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay eventos asignados
                  </h3>
                  <p className="text-gray-500">
                    No tienes eventos asignados para controlar el acceso.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Screensaver independiente - NO interfiere con QRAccessScanner */}
      {activeTab === 'qr-scan' && (
        <ScreensaverOverlay
          isActive={(currentMethod === 'manual' || currentMethod === 'reader') && screensaverEnabled && isScanning}
          lastActivity={lastActivity}
          hasOpenModals={hasOpenModals}
          onWakeUp={() => setLastActivity(Date.now())}
        />
      )}
    </div>
  );
}