import { useEffect, useState } from 'react';
import { InboxIcon, Clock, CheckCircle, XCircle, QrCode, Loader2, Download, Trash2, Archive, RotateCcw, Filter, Calendar, Users, CalendarCheck, UserCheck, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import { generateGuestQRPDF } from '../lib/qr';
import { getEventGuestsByEventIdAPI } from '../endpoints/eventGuest';
import { createEventRequestAPI, updateEventRequestStatusAPI, deleteEventRequestAPI } from '../endpoints/eventRequest';

// Definir interfaces para trabajar con la respuesta del API
interface Creator {
  id: number;
  name?: string;
  last_name?: string;
  company?: string;
  country?: string;
  phone?: string;
  email?: string;
  username?: string;
}

interface EventRequest {
  id: number;
  bolt_event_id: number;
  creator_id: number;
  status: 'pending' | 'approved' | 'rejected';
  processed: boolean;
  created_at: string;
  updated_at: string;
  creator?: Creator;
  request_details?: string;
  bolt_event?: BoltEvent;
}

interface BoltEvent {
  id: number;
  name: string;
  location: string;
  start_at: string;
  end_at: string;
  host_name: string;
  guest_count: number;
  logo: string | null;
  description: string;
  is_public: boolean;
  is_finalized: boolean;
  user_id: number;
  creator_id: number;
  qr_access_active: boolean;
  welcome_message: string | null;
  rejection_message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  request: EventRequest | null;
  creator?: {
    id: number;
    first_name?: string;
    last_name?: string;
    company?: string;
    country?: string;
    phone?: string;
    email?: string;
  };
}

import type { Event as CustomEvent } from '../types/event';

export function Requests() {
  const { role } = useAuth();
  const { events, refreshEvents } = useEvents();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | undefined | null>(undefined);
  const [deleteType, setDeleteType] = useState<'event' | 'request'>('event');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [archivedRequests, setArchivedRequests] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<'all' | 'week' | 'month' | 'year' | 'specific'>('all');
  const [specificDate, setSpecificDate] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [mainTab, setMainTab] = useState<'eventos' | 'canjes'>('eventos');
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [prizeRequests, setPrizeRequests] = useState<any[]>([]);
  const [prizeRequestsStats, setPrizeRequestsStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [eventsStats, setEventsStats] = useState({
    totalEvents: 0,
    totalGuests: 0,
    monthEvents: 0,
    monthGuests: 0
  });

  useEffect(() => {
    refreshEvents();
    loadArchivedRequests();
    loadPrizeRequests();
    refreshEvents(); // Cargar eventos desde el contexto
  }, []);
  
  // Usar eventos del contexto
  useEffect(() => {
    if (events && events.length > 0) {
      
      // Calcular estadísticas de eventos
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const thisMonthEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
      });
      
      setEventsStats({
        totalEvents: events.length,
        totalGuests: events.reduce((acc, event) => acc + event.guest_count, 0),
        monthEvents: thisMonthEvents.length,
        monthGuests: thisMonthEvents.reduce((acc, event) => acc + event.guest_count, 0)
      });

      console.log('events', events);
      setStatistics({
        total: events.length,
        pending: events.filter(event => event.request?.status === 'pending').length,
        approved: events.filter(event => event.request?.status === 'approved').length,
        rejected: events.filter(event => event.request?.status === 'rejected').length
      });
    }
  }, [events]);

  // Cargar solicitudes de premios desde localStorage
  const loadPrizeRequests = () => {
    try {
      const storedRequests = localStorage.getItem('prizeRequests');
      if (storedRequests) {
        const requests = JSON.parse(storedRequests);
        setPrizeRequests(requests);
        
        // Calcular estadísticas
        setPrizeRequestsStats({
          total: requests.length,
          pending: requests.filter((r: any) => r.status === 'pending').length,
          approved: requests.filter((r: any) => r.status === 'approved').length,
          rejected: requests.filter((r: any) => r.status === 'rejected').length
        });
      } else {
        setPrizeRequests([]);
        setPrizeRequestsStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    } catch (error) {
      console.error('Error loading prize requests:', error);
      setPrizeRequests([]);
      setPrizeRequestsStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
    }
  };

  // Procesar solicitud de premio (aprobar/rechazar)
  const handleProcessPrizeRequest = async (requestId: string, action: 'approved' | 'rejected') => {
    setIsLoading(true);
    try {
      const storedRequests = localStorage.getItem('prizeRequests');
      if (!storedRequests) return;

      const requests = JSON.parse(storedRequests);
      const requestIndex = requests.findIndex((r: any) => r.id === requestId);
      
      if (requestIndex === -1) {
        alert('Solicitud no encontrada');
        return;
      }

      const request = requests[requestIndex];
      
      
      // Actualizar el estado de la solicitud
      requests[requestIndex] = {
        ...request,
        status: action,
        processedDate: new Date().toISOString(),
        processedBy: 'SuperAdmin' // En el futuro usar el ID del usuario actual
      };

      // Manejar puntos reservados
      const reservedPoints = JSON.parse(localStorage.getItem('reservedPoints') || '{}');
      const userTransactions = JSON.parse(localStorage.getItem('userTransactions') || '{}');
      
      if (!userTransactions[request.userId]) {
        userTransactions[request.userId] = [];
      }

      if (action === 'approved') {
        // Confirmar descuento: Los puntos ya están reservados, solo confirmar la transacción
        const userPoints = JSON.parse(localStorage.getItem('userPoints') || '{}');
        const currentPoints = userPoints[request.userId] || 0;
        
        // Descontar puntos reales (los reservados ya no están disponibles)
        userPoints[request.userId] = currentPoints - request.prizePoints;
        localStorage.setItem('userPoints', JSON.stringify(userPoints));
        
        // Liberar puntos reservados
        if (reservedPoints[request.userId]) {
          reservedPoints[request.userId] -= request.prizePoints;
          if (reservedPoints[request.userId] <= 0) {
            delete reservedPoints[request.userId];
          }
        }
        
        // Registrar transacción de canje aprobado
        userTransactions[request.userId].push({
          id: Date.now().toString(),
          type: 'deduction',
          amount: request.prizePoints,
          reason: `Canje aprobado - ${request.prizeTitle}`,
          date: new Date().toISOString(),
          processedBy: 'SuperAdmin',
          requestId: requestId
        });
        
        // Eliminar transacción de reserva anterior
        userTransactions[request.userId] = userTransactions[request.userId].filter(
          (transaction: any) => transaction.requestId !== requestId || transaction.type !== 'reservation'
        );
        
      } else if (action === 'rejected') {
        // Devolver puntos reservados
        if (reservedPoints[request.userId]) {
          reservedPoints[request.userId] -= request.prizePoints;
          if (reservedPoints[request.userId] <= 0) {
            delete reservedPoints[request.userId];
          }
        }
        
        // Registrar transacción de devolución
        userTransactions[request.userId].push({
          id: Date.now().toString(),
          type: 'refund',
          amount: request.prizePoints,
          reason: `Solicitud rechazada - Devolución de ${request.prizeTitle}`,
          date: new Date().toISOString(),
          processedBy: 'SuperAdmin',
          requestId: requestId
        });
        
        // Eliminar transacción de reserva anterior
        userTransactions[request.userId] = userTransactions[request.userId].filter(
          (transaction: any) => transaction.requestId !== requestId || transaction.type !== 'reservation'
        );
      }

      // Guardar cambios
      localStorage.setItem('reservedPoints', JSON.stringify(reservedPoints));
      localStorage.setItem('userTransactions', JSON.stringify(userTransactions));
      localStorage.setItem('prizeRequests', JSON.stringify(requests));
      
      // Disparar evento para actualizar otras partes de la aplicación
      window.dispatchEvent(new CustomEvent('localStorageUpdate', {
        detail: { type: 'prizeRedemption', userId: request.userId }
      }));
      
      // Recargar datos
      loadPrizeRequests();
      
      const actionText = action === 'approved' ? 'aprobada' : 'rechazada';
      const pointsText = action === 'approved' ? 'descontados' : 'devueltos';
      alert(`Solicitud ${actionText} exitosamente. Puntos ${pointsText}.`);
      
    } catch (error) {
      console.error('Error processing prize request:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar solicitudes archivadas desde sessionStorage
  const loadArchivedRequests = () => {
    const archived = sessionStorage.getItem('archived_requests');
    if (archived) {
      setArchivedRequests(JSON.parse(archived));
    }
  };

  // Guardar solicitudes archivadas en sessionStorage
  const saveArchivedRequests = (archivedIds: string[]) => {
    sessionStorage.setItem('archived_requests', JSON.stringify(archivedIds));
    setArchivedRequests(archivedIds);
  };

  const handleRequestAccess = async (eventId: string) => {
    try {
      setIsLoading(true);
      
      // Obtener el ID del usuario actual del sessionStorage
      const userData = sessionStorage.getItem('user');
      if (!userData) {
        throw new Error('Usuario no autenticado');
      }
      
      const user = JSON.parse(userData);
      const userId = parseInt(user.id);
      
      console.log('Solicitando acceso para evento:', eventId, 'con usuario:', userId);
      
      // Crear la solicitud de evento usando el endpoint
      const response = await createEventRequestAPI({
        bolt_event_id: parseInt(eventId),
        creator_id: userId,
        request_details: 'Solicitud de acceso a evento'
      });
      
      console.log('Respuesta de la solicitud:', response);
      
      await refreshEvents();
      
      // Mostrar mensaje de éxito
      alert('Solicitud enviada correctamente');
    } catch (error) {
      console.error('Error requesting access:', error);
      alert('Error al solicitar acceso al evento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      setIsLoading(true);
      
      // Actualizar el estado de la solicitud usando el endpoint
      await updateEventRequestStatusAPI(parseInt(requestId), status, true);
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  // La generación de comisiones ahora se maneja en el backend

  // Función helper para sanitizar nombres de archivo
  const sanitizeFileName = (name: string) => {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^a-zA-Z0-9\s]/g, '')  // Solo letras, números y espacios
      .replace(/\s+/g, '-')            // Espacios a guiones
      .substring(0, 30);               // Máximo 30 caracteres
  };

  const handleGenerateQRCodes = async (eventId: string) => {
    try {
      setIsLoading(true);
      
      // Obtener todos los invitados para este evento usando el endpoint
      const response = await getEventGuestsByEventIdAPI(parseInt(eventId));
      const guests = response?.data || [];
      
      // Obtener detalles del evento para el PDF
      const event = events.find(e => e.id === eventId) as CustomEvent | undefined;
      
      // Generar PDF con códigos QR
      const pdfBlob = await generateGuestQRPDF(guests, event?.name);
      
      // Crear enlace de descarga
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generar nombre descriptivo del archivo
      if (event) {
        const eventDate = new Date(event.date).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '-');
        
        const sanitizedName = sanitizeFileName(event.name);
        link.download = `QR-LINKS-${sanitizedName}-${eventDate}.zip`;
      } else {
        // Fallback al nombre original si no se encuentra el evento
        link.download = `qr-codes-and-links-${eventId}.zip`;
      }
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating QR codes:', error);
      alert('Error al generar los códigos QR');
    } finally {
      setIsLoading(false);
    }
  };

  // Esta función ya no es necesaria porque usamos los endpoints directamente

  // Archivar solicitud en lugar de eliminar
  const handleArchiveRequest = async (requestId: string) => {
    try {
      setIsLoading(true);
      const newArchivedRequests = [...archivedRequests, requestId];
      saveArchivedRequests(newArchivedRequests);
      await refreshEvents();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error archiving request:', error);
      alert('Error al archivar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  // Desarchivar solicitud
  const handleUnarchiveRequest = async (requestId: string) => {
    try {
      setIsLoading(true);
      const newArchivedRequests = archivedRequests.filter(id => id !== requestId);
      saveArchivedRequests(newArchivedRequests);
      await refreshEvents();
    } catch (error) {
      console.error('Error unarchiving request:', error);
      alert('Error al desarchivar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar solicitudes por fecha
  const filterRequestsByDate = (events: CustomEvent[]) => {
    const now = new Date();
    
    return events.filter(event => {
      // Solo considerar eventos que tienen solicitudes
      if (!event.request) return false;
      
      const requestDate = new Date(event.request.created_at);
      
      switch (dateFilter) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return requestDate >= weekAgo;
        case 'month':
          return requestDate.getMonth() === selectedMonth - 1 && requestDate.getFullYear() === selectedYear;
        case 'year':
          return requestDate.getFullYear() === selectedYear;
        case 'specific':
          if (!specificDate) return true;
          const targetDate = new Date(specificDate);
          return requestDate.toDateString() === targetDate.toDateString();
        default:
          return true;
      }
    });
  };
  
  // Obtener solicitudes filtradas según pestaña activa y filtros de fecha
  const getFilteredRequests = () => {
    // Primero filtrar eventos que tienen solicitudes
    const eventsWithRequests = events.filter(event => event.request !== null);
    
    // Luego aplicar filtro de archivado/activo
    let filteredEvents;
    
    if (activeTab === 'active') {
      filteredEvents = eventsWithRequests.filter(event => 
        event.request && !archivedRequests.includes(event.request.id.toString())
      );
    } else {
      filteredEvents = eventsWithRequests.filter(event => 
        event.request && archivedRequests.includes(event.request.id.toString())
      );
    }
    
    // Finalmente aplicar filtros de fecha
    return filterRequestsByDate(filteredEvents);
  };

  // Renderizar botones de acción para cada evento
  const renderEventActions = (event: CustomEvent) => {
    // Verificar si existe una solicitud para este evento
    const request = event.request;
    const isPastEvent = new Date(event.date) < new Date();

    if (!request) {
      // No hay solicitud, mostrar botón para solicitar
      return (
        <button
          onClick={() => handleRequestAccess(event.id)}
          disabled={isLoading || isPastEvent}
          className={`inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white ${
            isPastEvent
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
          }`}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <QrCode className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          )}
          Solicitar Links y QR
        </button>
      );
    } else if (request) {
      // Hay una solicitud, mostrar su estado
      switch (request.status) {
        case 'pending':
          return (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Clock className="h-4 w-4 mr-1" />
                Pendiente
              </span>
            </>
          );
        case 'approved':
          return (
            <button
              onClick={() => handleGenerateQRCodes(event.id)}
              disabled={isLoading || isPastEvent}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isPastEvent
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              }`}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Descargar QR y Enlaces
            </button>
          );
        case 'rejected':
          return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle className="h-4 w-4 mr-1" />
              Rechazado
            </span>
          );
        default:
          return null;
      }
    }
    
    return null;
  };

  const handleDeleteRequest = async (requestId: number) => {
    try {
      setIsLoading(true);
      
      // Eliminar la solicitud usando el endpoint
      await deleteEventRequestAPI(requestId);
      
      // Recargar datos
      await refreshEvents();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Error al eliminar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  if (role?.name === 'SUPER_ADMIN') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Solicitudes</h1>
          
          {/* Estadísticas de eventos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
              <div className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Total de Eventos
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {eventsStats.totalEvents}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
              <div className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Total de Invitados
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {eventsStats.totalGuests}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
              <div className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarCheck className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Eventos Este Mes
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {eventsStats.monthEvents}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
              <div className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserCheck className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Invitados Este Mes
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {eventsStats.monthGuests}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Pestañas principales: Eventos / Canjes */}
          <div className="border-b border-gray-200 mb-8">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setMainTab('eventos')}
                className={`py-2 px-1 border-b-2 font-medium text-lg ${
                  mainTab === 'eventos'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Eventos
              </button>
              <button
                onClick={() => setMainTab('canjes')}
                className={`py-2 px-1 border-b-2 font-medium text-lg ${
                  mainTab === 'canjes'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Canjes
              </button>
            </nav>
          </div>

          {/* Contenido de Eventos (funcionalidad existente) */}
          {mainTab === 'eventos' && (
            <>
              {/* Estadísticas de eventos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Calendar className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                            Total de Eventos
                          </dt>
                          <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                            {eventsStats.totalEvents}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                            Total de Invitados
                          </dt>
                          <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                            {eventsStats.totalGuests}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CalendarCheck className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                            Eventos Este Mes
                          </dt>
                          <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                            {eventsStats.monthEvents}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                  <div className="p-3 sm:p-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <UserCheck className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="ml-3 w-0 flex-1">
                        <dl>
                          <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                            Invitados Este Mes
                          </dt>
                          <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                            {eventsStats.monthGuests}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Gestión de Solicitudes
                  </h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Gestiona las solicitudes de acceso y generación de QR.
                  </p>
                </div>
              </div>

              {/* Pestañas Activas/Archivadas */}
              <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'active'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <InboxIcon className="h-4 w-4 mr-2" />
                      Activas ({events.filter(e => e.request && !archivedRequests.includes(e.request.id.toString())).length})
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('archived')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'archived'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <Archive className="h-4 w-4 mr-2" />
                      Archivadas ({archivedRequests.length})
                    </div>
                  </button>
                </nav>
              </div>

              {/* Filtros de Fecha */}
              <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filtros:</span>
                </div>
                
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as 'all' | 'week' | 'month' | 'year' | 'specific')}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">Todas las fechas</option>
                  <option value="week">Última semana</option>
                  <option value="month">Por mes</option>
                  <option value="year">Por año</option>
                  <option value="specific">Fecha específica</option>
                </select>

                {dateFilter === 'month' && (
                  <>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(2024, i).toLocaleDateString('es-ES', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {Array.from({ length: 5 }, (_, i) => (
                        <option key={2022 + i} value={2022 + i}>
                          {2022 + i}
                        </option>
                      ))}
                    </select>
                  </>
                )}

                {dateFilter === 'year' && (
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <option key={2022 + i} value={2022 + i}>
                        {2022 + i}
                      </option>
                    ))}
                  </select>
                )}

                {dateFilter === 'specific' && (
                  <input
                    type="date"
                    value={specificDate}
                    onChange={(e) => setSpecificDate(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200">
              {/* Sección de eventos desde el contexto */}
              <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Eventos Disponibles</h3>
                <p className="mt-1 text-sm text-gray-500">Eventos que puedes gestionar como solicitudes</p>
              </div>
              
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No hay eventos disponibles
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No se encontraron eventos en el sistema.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {events.slice(0, 5).map((event) => {
                    const isPastEvent = new Date(event.date) < new Date();
                    const daysRemaining = (() => {
                      const eventDate = new Date(event.date);
                      const today = new Date();
                      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
                      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                      const diffTime = eventDateOnly.getTime() - todayOnly.getTime();
                      return Math.round(diffTime / (1000 * 60 * 60 * 24));
                    })();
                    
                    return (
                      <li key={event.id} className="px-3 py-4 sm:px-6">
                        <div className={`bg-gray-50 rounded-lg p-4 ${isPastEvent ? 'opacity-60' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                                <h4 className="text-base sm:text-lg font-medium text-gray-900">{event.name}</h4>
                                <div className="flex items-center space-x-2">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {(() => {
                                      if (isPastEvent) {
                                        return (
                                          <>
                                            <Calendar className="w-3 h-3 mr-1" />
                                            Evento finalizado
                                          </>
                                        );
                                      } else if (daysRemaining === 0) {
                                        return (
                                          <>
                                            <Calendar className="w-3 h-3 mr-1" />
                                            ¡HOY!
                                          </>
                                        );
                                      } else {
                                        return (
                                          <>
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {daysRemaining} días restantes
                                          </>
                                        );
                                      }
                                    })()}
                                  </span>
                                  {event.is_finalized && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      <Check className="w-3 h-3 mr-1" />
                                      Finalizado
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-2 text-xs sm:text-sm text-gray-600">
                                <span className="font-medium">Fecha:</span> {new Date(event.date).toLocaleDateString('es-ES')}
                                <span className="mx-2">•</span>
                                <span className="font-medium">Ubicación:</span> {event.location || 'No especificada'}
                                <span className="mx-2">•</span>
                                <span className="font-medium">Invitados:</span> {event.guest_count}
                              </div>
                              
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md ${
                                  event.request?.status === 'approved' ? 'bg-green-100 text-green-800' : 
                                  event.request?.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {event.request?.status === 'approved' ? (
                                    <><CheckCircle className="h-3 w-3 mr-1" /> Aprobado</>
                                  ) : event.request?.status === 'rejected' ? (
                                    <><XCircle className="h-3 w-3 mr-1" /> Rechazado</>
                                  ) : (
                                    <><Clock className="h-3 w-3 mr-1" /> Pendiente</>
                                  )}
                                </span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-md ${
                                  event.qr_access_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  <QrCode className="h-3 w-3 mr-1" />
                                  QR Access {event.qr_access_active ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              
              {/* Sección de solicitudes existentes */}
              <div className="px-4 py-5 sm:px-6 border-t border-b border-gray-200 mt-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Solicitudes de Eventos</h3>
                <p className="mt-1 text-sm text-gray-500">Solicitudes de acceso a eventos</p>
              </div>
              
              {getFilteredRequests().length === 0 ? (
                <div className="text-center py-12">
                  <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    {activeTab === 'active' ? 'No hay solicitudes activas' : 'No hay solicitudes archivadas'}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {activeTab === 'active' 
                      ? 'No hay solicitudes activas en este momento.' 
                      : 'No hay solicitudes archivadas con los filtros seleccionados.'}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {getFilteredRequests().map((event) => {
                    // Asegurarnos de que el evento tiene una solicitud
                    if (!event.request) return null;
                    
                    const request = event.request;
                    const isPastEvent = new Date(event.date) < new Date();
                    
                    return (
                      <li key={request.id} className="px-3 py-4 sm:px-6">
                        <div className={`bg-gray-50 rounded-lg p-4 ${isPastEvent ? 'opacity-60' : ''}`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                                <h4 className="text-base sm:text-lg font-medium text-gray-900">{event.name}</h4>
                                <span className="text-xs sm:text-sm font-medium text-indigo-600">
                                  Solicitado por: <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md font-bold">
                                    {request.creator?.company || 'N/A'}
                                  </span>
                                </span>
                              </div>
                              
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">País:</span> {request.creator?.country || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Teléfono:</span> {request.creator?.phone || 'N/A'}
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="font-medium">Email:</span> {request.creator?.email || 'N/A'}
                                </div>
                              </div>
                              
                              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                                  📅 {new Date(event.date).toLocaleDateString('es-ES')}
                                </span>
                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-medium">
                                  👥 {event.guest_count} invitados
                                </span>
                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                                  🕒 {new Date(request.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              
                              {isPastEvent && (
                                <div className="mt-2 text-xs sm:text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded-md">
                                  ⚠️ Esta solicitud ya no está disponible. El evento ha pasado.
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                              {request.status === 'pending' ? (
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                  {!isPastEvent ? (
                                    <>
                                      <button
                                        onClick={() => handleProcessRequest(request.id.toString(), 'approved')}
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                      >
                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                        Aprobar
                                      </button>
                                      <button
                                        onClick={() => handleProcessRequest(request.id.toString(), 'rejected')}
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                      >
                                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                        Rechazar
                                      </button>
                                    </>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Evento Pasado
                                    </span>
                                  )}
                                </div>
                              ) : request.status === 'approved' ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Aprobado
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rechazado
                                </span>
                              )}
                              
                              {activeTab === 'active' ? (
                                <button
                                  onClick={() => handleArchiveRequest(request.id.toString())}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center px-3 py-2 border border-orange-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                  <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  {isLoading ? 'Archivando...' : 'Archivar'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnarchiveRequest(request.id.toString())}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center px-3 py-2 border border-green-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  {isLoading ? 'Desarchivando...' : 'Desarchivar'}
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm(request.id);
                                  setDeleteType('request');
                                }}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Eliminar
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
            </>
          )}

          {/* Contenido de Canjes (nueva funcionalidad) */}
          {mainTab === 'canjes' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Solicitudes de Canjes de Premios
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Gestiona las solicitudes de canje de premios de administradores y creadores.
                    </p>
                  </div>
                </div>
                
                {/* Estadísticas de canjes */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <InboxIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        </div>
                        <div className="ml-2 sm:ml-3 w-0 flex-1">
                          <dl>
                            <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                              Total Solicitudes
                            </dt>
                            <dd className="text-base sm:text-lg font-semibold text-gray-900">
                              {prizeRequestsStats.total}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                        </div>
                        <div className="ml-2 sm:ml-3 w-0 flex-1">
                          <dl>
                            <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                              Pendientes
                            </dt>
                            <dd className="text-base sm:text-lg font-semibold text-gray-900">
                              {prizeRequestsStats.pending}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                        </div>
                        <div className="ml-2 sm:ml-3 w-0 flex-1">
                          <dl>
                            <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                              Aprobadas
                            </dt>
                            <dd className="text-base sm:text-lg font-semibold text-gray-900">
                              {prizeRequestsStats.approved}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                        </div>
                        <div className="ml-2 sm:ml-3 w-0 flex-1">
                          <dl>
                            <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                              Rechazadas
                            </dt>
                            <dd className="text-base sm:text-lg font-semibold text-gray-900">
                              {prizeRequestsStats.rejected}
                            </dd>
                          </dl>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de solicitudes */}
                {prizeRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No hay solicitudes de canjes
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Las solicitudes de canje aparecerán aquí cuando los usuarios soliciten premios.
                    </p>
                  </div>
                ) : (
                  <div className="border-t border-gray-200">
                    <ul className="divide-y divide-gray-200">
                      {prizeRequests.map((request) => (
                        <li key={request.id} className="px-3 py-4 sm:px-6">
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                                  <h4 className="text-base sm:text-lg font-medium text-gray-900">{request.prizeTitle}</h4>
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-800">
                                    🏆 {request.prizePoints} puntos
                                  </span>
                                </div>
                                
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    <span className="font-medium">🏢 Empresa:</span> 
                                    <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md font-bold ml-1">
                                      {request.company || 'N/A'}
                                    </span>
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    <span className="font-medium">👤 Solicitante:</span> {request.userName || 'N/A'}
                                  </div>
                                  <div className="text-xs sm:text-sm text-purple-600">
                                    <span className="font-medium">👨‍💼 Creado por:</span> {request.creatorName || 'N/A'}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-500">
                                    <span className="font-medium">📧 Email:</span> {request.email || 'N/A'}
                                  </div>
                                </div>
                                
                                <div className="mt-2 flex items-center space-x-4">
                                  <span className="inline-flex items-center text-xs sm:text-sm text-gray-500">
                                    <span className="font-medium">🕒 Solicitado:</span>
                                    <span className="ml-1">{new Date(request.requestDate).toLocaleDateString('es-ES')}</span>
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                    {request.userType || 'Usuario'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                                {request.status === 'pending' ? (
                                  <>
                                    <button
                                      onClick={() => handleProcessPrizeRequest(request.id, 'approved')}
                                      disabled={isLoading}
                                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                    >
                                      <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      Aprobar
                                    </button>
                                    <button
                                      onClick={() => handleProcessPrizeRequest(request.id, 'rejected')}
                                      disabled={isLoading}
                                      className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    >
                                      <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                      Rechazar
                                    </button>
                                  </>
                                ) : request.status === 'approved' ? (
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Aprobado
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    Rechazado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Solicitudes</h1>
        
        <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <InboxIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Solicitudes
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Pendientes
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.pending}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Aprobadas
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.approved}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <XCircle className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Rechazadas
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {statistics.rejected}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          {events.sort((a, b) => new Date(b.created_at || b.date).getTime() - new Date(a.created_at || a.date).getTime()).map((event) => (
            <div key={event.id} className={`bg-white shadow overflow-hidden sm:rounded-lg ${
              new Date(event.date) < new Date() ? 'opacity-60' : ''
            }`}>
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {event.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Fecha: {new Date(event.date).toLocaleDateString('es-ES')} • {event.guest_count} invitados
                    </p>
                    {new Date(event.date) < new Date() ? (
                      <div className="mt-2 text-sm text-red-600 font-medium">
                        Esta solicitud ya no está disponible. El evento ha pasado.
                      </div>
                    ) : (
                      <>
                        {event.request && (
                            <button
                              onClick={() => {
                                setShowDeleteConfirm(event?.request?.id);
                                setDeleteType('request');
                              }}
                              disabled={isLoading}
                              className="inline-flex mt-3 items-center justify-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar Solicitud
                            </button>
                          )}
                      </>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">                    
                    {/* Renderizar botones de acción según el estado de la solicitud */}
                    {renderEventActions(event)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium text-gray-900">Eliminar Evento</h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {deleteType === 'request' 
                      ? '¿Estás seguro que deseas eliminar esta solicitud? Esta acción no se puede deshacer.'
                      : '¿Estás seguro de que deseas eliminar este evento de tu lista? Esta acción no se puede deshacer.'
                    }
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                onClick={() => {
                    handleDeleteRequest(showDeleteConfirm);
                }}
                disabled={isLoading}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {isLoading ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(null)}
                className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}