import React from 'react';
import { InboxIcon, Clock, CheckCircle, XCircle, QrCode, AlertTriangle, Loader2, Download, Eye, Trash2, Users, Calendar, MapPin, Building2, Mail, Phone, Globe, User, Archive, RotateCcw, Filter, CalendarDays } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';
import { generateGuestQRPDF } from '../lib/qr';
import { commissionsStorage } from '../lib/commissions-storage';
import { creatorsStorage } from '../lib/creators-storage';
import type { Event as CustomEvent, EventRequest } from '../types/event';

export function Requests() {
  const { user } = useAuth();
  const [events, setEvents] = React.useState<CustomEvent[]>([]);
  const [requests, setRequests] = React.useState<EventRequest[]>([]);
  const [users, setUsers] = React.useState<any[]>([]);
  const [creators, setCreators] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);
  const [deleteType, setDeleteType] = React.useState<'event' | 'request'>('event');
  const [activeTab, setActiveTab] = React.useState<'active' | 'archived'>('active');
  const [archivedRequests, setArchivedRequests] = React.useState<string[]>([]);
  const [dateFilter, setDateFilter] = React.useState<'all' | 'week' | 'month' | 'year' | 'specific'>('all');
  const [specificDate, setSpecificDate] = React.useState<string>('');
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = React.useState<number>(new Date().getMonth() + 1);
  const [mainTab, setMainTab] = React.useState<'eventos' | 'canjes'>('eventos');
  const [adminStats, setAdminStats] = React.useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [superAdminStats, setSuperAdminStats] = React.useState({
    total: 0,
    approved: 0,
    rejected: 0,
    pending: 0
  });
  const [prizeRequests, setPrizeRequests] = React.useState<any[]>([]);
  const [prizeRequestsStats, setPrizeRequestsStats] = React.useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });

  React.useEffect(() => {
    loadEvents();
    loadArchivedRequests();
    loadPrizeRequests();
  }, []);

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

  // Función para obtener información del usuario dueño del evento
  const getEventOwnerInfo = (eventCreatedBy: string) => {
    const owner = users.find(u => u.id === eventCreatedBy);
    if (owner) {
      return {
        name: `${owner.firstName} ${owner.lastName}`,
        company: owner.company,
        email: owner.email,
        username: owner.username,
        createdBy: owner.createdBy,
        country: owner.country,
        phone: owner.phone
      };
    }
    return {
      name: eventCreatedBy,
      company: 'N/A',
      email: 'N/A', 
      username: 'N/A',
      createdBy: 'N/A',
      country: 'N/A',
      phone: 'N/A'
    };
  };

  // Función para obtener información del creador del usuario
  const getUserCreatorInfo = (createdBy: string) => {
    const creator = creators.find(c => c.id === createdBy || c.username === createdBy);
    if (creator) {
      return `${creator.firstName} ${creator.lastName}`;
    }
    return createdBy || 'Sin información';
  };

  // Función para obtener información del usuario que solicita el canje
  const getPrizeRequestUserInfo = (userId: string) => {
    // Buscar en admin_users
    const adminUser = users.find(u => u.id === userId);
    if (adminUser) {
      return {
        name: `${adminUser.firstName} ${adminUser.lastName}`,
        company: adminUser.company,
        email: adminUser.email,
        type: 'Administrador',
        createdBy: adminUser.createdBy
      };
    }
    
    // Buscar en creators_data
    const creator = creators.find(c => c.id === userId);
    if (creator) {
      return {
        name: `${creator.firstName} ${creator.lastName}`,
        company: creator.company || 'N/A',
        email: creator.email,
        type: 'Creador',
        createdBy: creator.createdBy || 'N/A'
      };
    }
    
    return {
      name: userId,
      company: 'N/A',
      email: 'N/A',
      type: 'Desconocido',
      createdBy: 'N/A'
    };
  };

  const loadEvents = async () => {
    try {
      const allEvents = await storage.getEvents();
      
      // Cargar usuarios para mostrar información completa
      const allUsers = await storage.getUsers();
      setUsers(allUsers);
      
      // Cargar creadores para mostrar información completa
      const allCreators = await creatorsStorage.getCreators();
      setCreators(allCreators);
      
      // Para SUPER_ADMIN mostrar todas las solicitudes, para otros usuarios solo las suyas
      let requestsToShow;
      let allRequestsForStats;
      
      if (user?.role === 'SUPER_ADMIN') {
        allRequestsForStats = await storage.getEventRequests();
        requestsToShow = allRequestsForStats;
        
        const approvedRequests = allRequestsForStats.filter(r => r.status === 'approved');
        
        setSuperAdminStats({
          total: allRequestsForStats.length,
          approved: approvedRequests.length,
          rejected: allRequestsForStats.filter(r => r.status === 'rejected').length,
          pending: allRequestsForStats.filter(r => r.status === 'pending').length
        });
      } else {
        requestsToShow = await storage.getEventRequestsByUser();
        allRequestsForStats = requestsToShow;
        
        setAdminStats({
          total: requestsToShow.length,
          pending: requestsToShow.filter(r => r.status === 'pending').length,
          approved: requestsToShow.filter(r => r.status === 'approved').length,
          rejected: requestsToShow.filter(r => r.status === 'rejected').length
        });
      }
      
      setEvents(allEvents);
      // Sort requests by creation date (newest first)
      const sortedRequests = requestsToShow.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRequests(sortedRequests);
      
      // Update event status based on user's requests only
      const updatedEvents = allEvents.map(event => ({
        ...event,
        request_status: requestsToShow.find(r => r.event_id === event.id)?.status
      }));
      
      setEvents(updatedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const handleRequestAccess = async (eventId: string) => {
    try {
      setIsLoading(true);
      await storage.createEventRequest(eventId);
      await loadEvents();
    } catch (error) {
      console.error('Error requesting access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessRequest = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      setIsLoading(true);
      await storage.updateEventRequest(requestId, status);
      
      // Generate commission automatically when request is approved
      if (status === 'approved') {
        await generateCommissionForRequest(requestId);
      }
      
      await loadEvents();
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Error al procesar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCommissionForRequest = async (requestId: string) => {
    try {
      // Find the request and event
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        console.warn('Request not found for commission generation');
        return;
      }

      const event = events.find(e => e.id === request.event_id) as CustomEvent | undefined;
      if (!event) {
        console.warn('Event not found for commission generation');
        return;
      }

      // Validate event has guests
      if (!event.guest_count || event.guest_count <= 0) {
        console.warn('No commission generated: event has no guests');
        return;
      }

      // Get event owner info
      const eventOwner = getEventOwnerInfo(event.created_by);
      if (!eventOwner.createdBy) {
        console.warn('No commission generated: user has no creator assigned');
        return;
      }

      // Get creator info to get commission percentage
      const creators = await creatorsStorage.getCreators();
      const creator = creators.find(c => c.id === eventOwner.createdBy);
      if (!creator) {
        console.warn('No commission generated: creator not found');
        return;
      }

      // Check if creator is active
      if (creator.status !== 'active') {
        console.warn('No commission generated: creator is not active');
        return;
      }

      // Generate commission
      await commissionsStorage.generateCommissionFromRequest(
        requestId,
        event.id,
        request.requested_by,
        creator.id,
        event.guest_count,
        creator.commissionPercentage
      );

      console.log(`Commission generated for creator ${creator.firstName} ${creator.lastName}: ${creator.commissionPercentage}% of ${event.guest_count} guests`);
    } catch (error) {
      console.error('Error generating commission:', error);
      // Don't throw error to avoid breaking the approval process
    }
  };

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
      
      // Get all guests for this event
      const guests = await storage.getEventGuests(eventId);
      
      // Get event details for the PDF
      const event = events.find(e => e.id === eventId) as CustomEvent | undefined;
      
      // Generate PDF with QR codes
      const pdfBlob = await generateGuestQRPDF(guests, event?.name);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate descriptive filename
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

  const handleDeleteEvent = async (eventId: string) => {
    try {
      setIsLoading(true);
      await storage.deleteEvent(eventId);
      await loadEvents();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Archivar solicitud en lugar de eliminar
  const handleArchiveRequest = async (requestId: string) => {
    try {
      setIsLoading(true);
      const newArchivedRequests = [...archivedRequests, requestId];
      saveArchivedRequests(newArchivedRequests);
      await loadEvents();
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
      await loadEvents();
    } catch (error) {
      console.error('Error unarchiving request:', error);
      alert('Error al desarchivar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar solicitudes por fecha
  const filterRequestsByDate = (requests: EventRequest[]) => {
    const now = new Date();
    
    return requests.filter(request => {
      const requestDate = new Date(request.created_at);
      
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

  // Obtener solicitudes filtradas según pestaña activa
  const getFilteredRequests = () => {
    let filteredRequests;
    
    if (activeTab === 'active') {
      filteredRequests = requests.filter(request => !archivedRequests.includes(request.id));
    } else {
      filteredRequests = requests.filter(request => archivedRequests.includes(request.id));
    }
    
    return filterRequestsByDate(filteredRequests);
  };

  const handleDeleteRequest = async (eventId: string) => {
    try {
      setIsLoading(true);
      
      // Find and delete the request for this event
      await storage.deleteEventRequestsByEventId(eventId);
      
      // Reload all data to ensure consistency across the system
      await loadEvents();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('Error al eliminar la solicitud');
    } finally {
      setIsLoading(false);
    }
  };

  if (user?.role === 'SUPER_ADMIN') {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Solicitudes</h1>
          
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
              <div className="p-3 sm:p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <InboxIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Total de Solicitudes
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {superAdminStats.total}
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
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Solicitudes Pendientes
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {superAdminStats.pending}
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
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Solicitudes Aprobadas
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {superAdminStats.approved}
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
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Solicitudes Rechazadas
                      </dt>
                      <dd className="text-lg sm:text-xl font-semibold text-gray-900">
                        {superAdminStats.rejected}
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
                      Activas ({requests.filter(r => !archivedRequests.includes(r.id)).length})
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
                  onChange={(e) => setDateFilter(e.target.value as any)}
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
                  {getFilteredRequests().map((request) => {
                    const event = events.find(e => e.id === request.event_id);
                    if (!event) return null; // Skip requests for non-existent events
                    
                    return (
                      <li key={request.id} className="px-3 py-4 sm:px-6">
                        <div className={`bg-gray-50 rounded-lg p-4 ${
                          new Date(event.date) < new Date() ? 'opacity-60' : ''
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                                <h4 className="text-base sm:text-lg font-medium text-gray-900">{event.name}</h4>
                                <span className="text-xs sm:text-sm font-medium text-indigo-600">
                                  Solicitado por: <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md font-bold">
                                    {getEventOwnerInfo(event.created_by).company}
                                  </span>
                                </span>
                              </div>
                              
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-gray-600">
                                <div>
                                  <span className="font-medium">País:</span> {getEventOwnerInfo(event.created_by).country || 'N/A'}
                                </div>
                                <div>
                                  <span className="font-medium">Teléfono:</span> {getEventOwnerInfo(event.created_by).phone || 'N/A'}
                                </div>
                                <div className="sm:col-span-2">
                                  <span className="font-medium">Email:</span> {getEventOwnerInfo(event.created_by).email}
                                </div>
                                <div className="sm:col-span-2 text-purple-600">
                                  <span className="font-medium">Creado por:</span> {getUserCreatorInfo(getEventOwnerInfo(event.created_by).createdBy)}
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
                              
                              {new Date(event.date) < new Date() && (
                                <div className="mt-2 text-xs sm:text-sm text-red-600 font-medium bg-red-50 px-2 py-1 rounded-md">
                                  ⚠️ Esta solicitud ya no está disponible. El evento ha pasado.
                                </div>
                              )}
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                              {request.status === 'pending' ? (
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                                  {new Date(event.date) >= new Date() ? (
                                    <>
                                      <button
                                        onClick={() => handleProcessRequest(request.id, 'approved')}
                                        disabled={isLoading}
                                        className="inline-flex items-center justify-center px-3 py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                      >
                                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                        Aprobar
                                      </button>
                                      <button
                                        onClick={() => handleProcessRequest(request.id, 'rejected')}
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
                                  onClick={() => handleArchiveRequest(request.id)}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center px-3 py-2 border border-orange-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-orange-700 bg-white hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                                >
                                  <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  {isLoading ? 'Archivando...' : 'Archivar'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnarchiveRequest(request.id)}
                                  disabled={isLoading}
                                  className="inline-flex items-center justify-center px-3 py-2 border border-green-300 rounded-md shadow-sm text-xs sm:text-sm font-medium text-green-700 bg-white hover:bg-green-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  {isLoading ? 'Desarchivando...' : 'Desarchivar'}
                                </button>
                              )}
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
                                      {getPrizeRequestUserInfo(request.userId).company}
                                    </span>
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-600">
                                    <span className="font-medium">👤 Solicitante:</span> {getPrizeRequestUserInfo(request.userId).name}
                                  </div>
                                  <div className="text-xs sm:text-sm text-purple-600">
                                    <span className="font-medium">👨‍💼 Creado por:</span> {getUserCreatorInfo(getPrizeRequestUserInfo(request.userId).createdBy)}
                                  </div>
                                  <div className="text-xs sm:text-sm text-gray-500">
                                    <span className="font-medium">📧 Email:</span> {getPrizeRequestUserInfo(request.userId).email}
                                  </div>
                                </div>
                                
                                <div className="mt-2 flex items-center space-x-4">
                                  <span className="inline-flex items-center text-xs sm:text-sm text-gray-500">
                                    <span className="font-medium">🕒 Solicitado:</span>
                                    <span className="ml-1">{new Date(request.requestDate).toLocaleDateString('es-ES')}</span>
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                    {getPrizeRequestUserInfo(request.userId).type}
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
                      {adminStats.total}
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
                      {adminStats.pending}
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
                      {adminStats.approved}
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
                      {adminStats.rejected}
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
                    {new Date(event.date) < new Date() && (
                      <div className="mt-2 text-sm text-red-600 font-medium">
                        Esta solicitud ya no está disponible. El evento ha pasado.
                      </div>
                    )}
                  </div>
                  
                  {!event.request_status ? (
                    <button
                      disabled={new Date(event.date) < new Date()}
                      onClick={() => handleRequestAccess(event.id)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        new Date(event.date) < new Date()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      {new Date(event.date) < new Date() ? 'Evento Pasado' : 'Solicitar Links y QR'}
                    </button>
                  ) : event.request_status === 'pending' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Clock className="h-4 w-4 mr-1" />
                      Pendiente
                    </span>
                  ) : event.request_status === 'approved' ? (
                    <button
                      disabled={new Date(event.date) < new Date()}
                      onClick={() => handleGenerateQRCodes(event.id)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                        new Date(event.date) < new Date()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                      }`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      {new Date(event.date) < new Date() ? 'Evento Pasado' : 'Descargar QR y Enlaces'}
                    </button>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazado
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-4">
                  <button
                    onClick={() => {
                      setDeleteType('request');
                      setShowDeleteConfirm(event.id);
                    }}
                    className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar Solicitud
                  </button>
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
                  if (deleteType === 'request') {
                    handleDeleteRequest(showDeleteConfirm);
                  } else {
                    handleDeleteEvent(showDeleteConfirm);
                  }
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