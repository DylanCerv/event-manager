import React from 'react';
import { Calendar, Users, MapPin, Building2, Bell, ExternalLink, CalendarDays, Info, X, MessageSquare, Check, BookOpen, BarChart3, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';
import { finalizationStorage } from '../lib/finalization-storage';
import { communicationsStorage } from '../lib/communications-storage';
import { eventBookStorage } from '../lib/eventbook-storage';
import type { Event } from '../types/event';
import type { Notification, SystemUpdate } from '../types/communications';
import type { EventBook } from '../types/eventbook';
import type { StoredUser } from '../types/user';

export function Home() {
  const { user, role } = useAuth();

  const [activeTab, setActiveTab] = React.useState<'statistics' | 'calendar'>('statistics');
  const [companyName, setCompanyName] = React.useState<string>('');
  const [events, setEvents] = React.useState<Event[]>([]);
  const [allUsers, setAllUsers] = React.useState<StoredUser[]>([]);
  const [stats, setStats] = React.useState({
    total: 0,
    active: 0,
    finalized: 0
  });
  const [reminders, setReminders] = React.useState({
    eventsThisWeek: 0,
    eventsWithoutCards: 0,
    eventsWithoutFinalization: 0
  });
  const [eventBookAlerts, setEventBookAlerts] = React.useState({
    eventsWithoutEventBook: 0,
    withoutConfig: 0,
    closingSoon: 0,
    totalVsActive: { total: 0, active: 0 }
  });
  const [weeklyRequests, setWeeklyRequests] = React.useState<Array<{
    eventName: string;
    status: 'pending' | 'approved' | 'rejected';
    requestDate: string;
  }>>([]);
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [systemUpdates, setSystemUpdates] = React.useState<SystemUpdate[]>([]);
  const [recentActivities, setRecentActivities] = React.useState<Array<{
    id: string;
    type: 'login' | 'event_created' | 'eventbook_created' | 'card_created' | 'finalization_created' | 'access_control' | 'role_created';
    description: string;
    timestamp: string;
    icon: string;
  }>>([]);
  const [showWelcomeModal, setShowWelcomeModal] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [eventConfigurations, setEventConfigurations] = React.useState<{
    has_card: boolean;
    is_finalized: boolean;
    has_eventbook: boolean;
  }>({
    has_card: false,
    is_finalized: false,
    has_eventbook: false
  });
  const [currentDate, setCurrentDate] = React.useState(new Date());

  React.useEffect(() => {
    loadEvents();
    loadCompanyName();
    loadWeeklyRequests();
    loadCommunications();
    loadEventBookAlerts();
    loadUsers();
    loadRecentActivities();
  }, []);

  const loadCompanyName = async () => {
    try {
      if (role?.name === 'ADMIN') {
        if (user) {
          setCompanyName(user.company || '');
        }
      }
    } catch (error) {
      console.error('Error loading company name:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await storage.getUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadCommunications = async () => {
    try {
      const [activeNotifications, activeUpdates] = await Promise.all([
        communicationsStorage.getActiveNotifications(),
        communicationsStorage.getActiveSystemUpdates()
      ]);
      setNotifications(activeNotifications);
      setSystemUpdates(activeUpdates);
      
      // Verificar si hay contenido realmente nuevo
      const lastVisit = localStorage.getItem('lastCommunicationsVisit');
      const lastVisitDate = lastVisit ? new Date(lastVisit) : new Date(0);
      
      const newNotifications = activeNotifications.filter(n => 
        new Date(n.createdAt) > lastVisitDate
      );
      const newUpdates = activeUpdates.filter(u => 
        new Date(u.createdAt) > lastVisitDate
      );
      
      // Mostrar modal solo si hay contenido realmente nuevo
      if (newNotifications.length > 0 || newUpdates.length > 0) {
        setShowWelcomeModal(true);
      }
    } catch (error) {
      console.error('Error loading communications:', error);
    }
  };

  const loadWeeklyRequests = async () => {
    try {
      const allRequests = await storage.getEventRequests();
      const allEvents = await storage.getEvents();
      
      // Calculate date range for this week
      const today = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(today.getDate() - 7);
      
      // Filter requests from the last 7 days
      const weeklyRequestsData = allRequests
        .filter(request => {
          const requestDate = new Date(request.created_at);
          
          // Para solicitudes pendientes y rechazadas: mostrar de los últimos 7 días
          if (request.status === 'pending' || request.status === 'rejected') {
            return requestDate >= weekAgo && requestDate <= today;
          }
          
          // Para solicitudes aprobadas: solo mostrar por 7 días después de ser aprobadas
          if (request.status === 'approved') {
            const approvedDate = new Date(request.updated_at || request.created_at);
            const sevenDaysAfterApproval = new Date(approvedDate);
            sevenDaysAfterApproval.setDate(approvedDate.getDate() + 7);
            return today <= sevenDaysAfterApproval;
          }
          
          return false;
        })
        .filter(request => {
          // Only include requests for events that still exist
          const event = allEvents.find(e => e.id === request.event_id);
          return event !== undefined;
        })
        .map(request => {
          const event = allEvents.find(e => e.id === request.event_id);
          return {
            eventName: event!.name, // We know event exists due to filter above
            status: request.status,
            requestDate: request.created_at
          };
        })
        .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
        .slice(0, 5); // Limitar a máximo 5 solicitudes
      
      setWeeklyRequests(weeklyRequestsData);
    } catch (error) {
      console.error('Error loading weekly requests:', error);
    }
  };

  const loadEvents = async () => {
    try {
      const allEvents = await storage.getEvents();
      setEvents(allEvents);

      let activeCount = 0;
      let finalizedCount = 0;
      let eventsThisWeek = 0;
      let eventsWithoutCards = 0;
      let eventsWithoutFinalization = 0;

      // Calculate date range for this week
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      for (const event of allEvents) {
        // Check if event is this week
        const eventDate = new Date(event.date);
        if (eventDate >= today && eventDate <= nextWeek) {
          eventsThisWeek++;
        }

        // Check if event has invitation card
        try {
          const eventCard = await storage.getEventCard(event.id);
          if (!eventCard) {
            eventsWithoutCards++;
          }
        } catch (error) {
          eventsWithoutCards++;
        }

        // Check finalization status
        const finalization = await finalizationStorage.getEventFinalization(event.id);
        if (finalization?.is_finalized) {
          finalizedCount++;
        } else {
          activeCount++;
          eventsWithoutFinalization++;
        }
      }

      setStats({
        total: allEvents.length,
        active: activeCount,
        finalized: finalizedCount
      });

      setReminders({
        eventsThisWeek,
        eventsWithoutCards,
        eventsWithoutFinalization
      });
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const activities = [];
      
      // Obtener eventos reales del usuario actual
      const userEvents = await storage.getEvents();
      for (const event of userEvents) {
        activities.push({
          id: 'event-' + event.id,
          type: 'event_created' as const,
          description: `Evento creado: ${event.name}`,
          timestamp: event.created_at,
          icon: '📅'
        });
      }

      // Obtener EventBooks reales del usuario actual
      try {
        const eventBooks = await eventBookStorage.getEventBooksByUser();
        for (const eventBook of eventBooks) {
          // Verificar que tenga los campos necesarios
          if (eventBook && eventBook.id) {
            activities.push({
              id: 'eventbook-' + eventBook.id,
              type: 'eventbook_created' as const,
              description: `EventBook creado: ${eventBook.title || eventBook.name || 'Sin título'}`,
              timestamp: eventBook.created_at || eventBook.createdAt || new Date().toISOString(),
              icon: '📖'
            });
          }
        }
      } catch (error) {
        console.log('EventBooks not available:', error);
      }

      // Obtener tarjetas interactivas reales
      for (const event of userEvents) {
        try {
          const eventCard = await storage.getEventCard(event.id);
          if (eventCard) {
            activities.push({
              id: 'card-' + eventCard.id,
              type: 'card_created' as const,
              description: `Tarjeta interactiva creada para: ${event.name}`,
              timestamp: eventCard.created_at,
              icon: '🎨'
            });
          }
        } catch (error) {
          // Tarjeta no existe para este evento
        }
      }

      // Obtener finalizaciones reales
      for (const event of userEvents) {
        try {
          const finalization = await finalizationStorage.getEventFinalization(event.id);
          if (finalization) {
            activities.push({
              id: 'finalization-' + event.id,
              type: 'finalization_created' as const,
              description: `Finalización creada para: ${event.name}`,
              timestamp: finalization.created_at || event.created_at,
              icon: '✅'
            });
          }
        } catch (error) {
          // Finalización no existe para este evento
        }
      }

      // Obtener configuraciones de acceso QR reales
      for (const event of userEvents) {
        try {
          const accessSettings = await storage.getAccessSettings(event.id);
          if (accessSettings) {
            activities.push({
              id: 'access-' + event.id,
              type: 'access_control' as const,
              description: `Control de acceso QR configurado para: ${event.name}`,
              timestamp: accessSettings.created_at || event.created_at,
              icon: '🔐'
            });
          }
        } catch (error) {
          // Configuración de acceso no existe
        }
      }

      // Ordenar por timestamp descendente y tomar las 5 más recientes
      const sortedActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

      setRecentActivities(sortedActivities);
    } catch (error) {
      console.error('Error loading recent activities:', error);
    }
  };

  const loadEventBookAlerts = async () => {
    try {
      const eventBooks = await eventBookStorage.getEventBooksByUser();
      const allEvents = await storage.getEvents();
      const today = new Date();
      
      let eventsWithoutEventBook = 0;
      let withoutConfig = 0;
      let closingSoon = 0;
      
      // Calcular eventos sin EventBook asociado
      for (const event of allEvents) {
        const hasEventBook = eventBooks.some(eb => eb.event_id === event.id);
        if (!hasEventBook) {
          eventsWithoutEventBook++;
        }
      }
      
      for (const eventBook of eventBooks) {
        // EventBooks sin configuración completa
        if (!eventBook.settings?.isConfigured) {
          withoutConfig++;
        }
        
        // EventBooks próximos a cerrar (dentro de una semana)
        if (eventBook.settings?.visibility?.closeDate) {
          const closeDate = new Date(eventBook.settings.visibility.closeDate);
          const daysUntilClose = Math.ceil((closeDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (daysUntilClose <= 7 && daysUntilClose > 0) {
            closingSoon++;
          }
        }
      }
      
      setEventBookAlerts({
        eventsWithoutEventBook,
        withoutConfig,
        closingSoon,
        totalVsActive: {
          total: eventBooks.length,
          active: eventBooks.filter(eb => eb.isActive).length
        }
      });
    } catch (error) {
      console.error('Error loading EventBook alerts:', error);
    }
  };

  // Funciones del calendario
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => event.date.split('T')[0] === dateStr);
  };

  const loadEventConfigurations = async (event: Event) => {
    try {
      const [eventCard, finalization, eventBooks] = await Promise.all([
        storage.getEventCard(event.id).catch(() => null),
        finalizationStorage.getEventFinalization(event.id).catch(() => null),
        eventBookStorage.getEventBooksByUser().catch(() => [])
      ]);

      const hasEventBook = eventBooks.some((eb: any) => eb.event_id === event.id);

      setEventConfigurations({
        has_card: !!eventCard,
        is_finalized: !!finalization?.is_finalized,
        has_eventbook: hasEventBook
      });
    } catch (error) {
      console.error('Error loading event configurations:', error);
      setEventConfigurations({
        has_card: false,
        is_finalized: false,
        has_eventbook: false
      });
    }
  };

  const getUserById = (userId: string) => {
    return allUsers.find(u => u.id === userId);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];
    const today = new Date();

    // Días vacíos al inicio
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32"></div>);
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      const isToday = date.toDateString() === today.toDateString();

      days.push(
        <div
          key={day}
          className={`h-32 border border-gray-200 p-2 overflow-hidden ${
            isToday ? 'bg-blue-50 border-blue-300' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <div className={`text-sm font-medium mb-1 ${
            isToday ? 'text-blue-600' : 'text-gray-900'
          }`}>
            {day}
          </div>
          <div className="space-y-1">
            {dayEvents.slice(0, 3).map((event) => {
              const eventUser = getUserById(event.created_by);
              return (
                <div
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    loadEventConfigurations(event);
                  }}
                  className="text-xs p-1 bg-indigo-100 text-indigo-800 rounded cursor-pointer hover:bg-indigo-200 truncate"
                  title={`${event.name} - ${eventUser?.company || 'Sin empresa'}`}
                >
                  {event.name}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 font-medium">
                +{dayEvents.length - 3} más
              </div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* Modal de Detalles del Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
          <div className="bg-gradient-to-br from-white via-blue-50 to-indigo-50 rounded-2xl shadow-2xl max-w-md w-full p-4 border border-blue-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gradient-to-r from-blue-200 via-indigo-200 to-purple-200">
              <h3 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Detalles del Evento</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all duration-200 hover:scale-110"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Nombre del Evento</h4>
                <p className="text-sm text-gray-900">{selectedEvent.name}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Fecha</h4>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEvent.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Invitados</h4>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">{selectedEvent.guest_count}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Ubicación</h4>
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                    <p className="text-sm text-gray-900">{selectedEvent.location}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Contratista</h4>
                  <p className="text-sm text-gray-900">{selectedEvent.contractor_name}</p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Empresa</h4>
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-400 mr-1" />
                  <p className="text-sm text-gray-900">
                    {getUserById(selectedEvent.created_by)?.company || 'Sin empresa'}
                  </p>
                </div>
              </div>
              
              {/* Estado de Configuraciones */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Estado de Configuraciones</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Tarjeta de Invitación</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all duration-200 hover:scale-105 ${
                      eventConfigurations.has_card ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white' : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700'
                    }`}>
                      {eventConfigurations.has_card ? '✓ Creada' : '✗ No creada'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Check className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">Finalización</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all duration-200 hover:scale-105 ${
                      eventConfigurations.is_finalized ? 'bg-gradient-to-r from-purple-400 to-violet-500 text-white' : 'bg-gradient-to-r from-orange-300 to-amber-400 text-orange-800'
                    }`}>
                      {eventConfigurations.is_finalized ? '✓ Finalizado' : '⏳ Pendiente'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm text-gray-600">EventBook</span>
                    </div>
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold shadow-sm transition-all duration-200 hover:scale-105 ${
                      eventConfigurations.has_eventbook ? 'bg-gradient-to-r from-blue-400 to-cyan-500 text-white' : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-700'
                    }`}>
                      {eventConfigurations.has_eventbook ? '✓ Creado' : '✗ No creado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Bienvenida */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                <Bell className="h-6 w-6 text-indigo-600" />
              </div>
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-4">¡Tienes contenido nuevo!</h3>
              
              <div className="space-y-3 mb-6">
                {notifications.length > 0 && (
                  <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <Bell className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="text-sm text-blue-800">Notificaciones</span>
                    </div>
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {notifications.length}
                    </span>
                  </div>
                )}
                
                {systemUpdates.length > 0 && (
                  <div className="flex items-center justify-between bg-green-50 rounded-lg p-3">
                    <div className="flex items-center">
                      <Info className="h-4 w-4 text-green-500 mr-2" />
                      <span className="text-sm text-green-800">Actualizaciones del Sistema</span>
                    </div>
                    <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      {systemUpdates.length}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    // Marcar como visto al cerrar
                    localStorage.setItem('lastCommunicationsVisit', new Date().toISOString());
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ver después
                </button>
                <button
                  onClick={() => {
                    setShowWelcomeModal(false);
                    // Marcar como visto al ir a notificaciones
                    localStorage.setItem('lastCommunicationsVisit', new Date().toISOString());
                    const notificationsSection = document.querySelector('[data-section="notifications"]');
                    if (notificationsSection) {
                      notificationsSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Ir a notificaciones
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="px-4 py-6 sm:px-0">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Bienvenido de nuevo, {companyName || user?.name}!
          </h1>
          <p className="text-gray-500 mt-2">
            {new Date().toLocaleDateString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>







        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('statistics')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'statistics'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Estadísticas
                </div>
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'calendar'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <CalendarDays className="h-5 w-5 mr-2" />
                  Calendario
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'statistics' && (
              <div className="space-y-8">
                {/* Fila 1: Recordatorios Importantes / Alertas de EventBooks */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Recordatorios Importantes */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Recordatorios Importantes</h2>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${
                  reminders.eventsThisWeek > 0 
                    ? 'bg-amber-50 border-amber-100' 
                    : 'bg-green-50 border-green-100'
                }`}>
                  <div className="flex items-start">
                    {reminders.eventsThisWeek > 0 ? (
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                    )}
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        reminders.eventsThisWeek > 0 ? 'text-amber-800' : 'text-green-800'
                      }`}>
                        {reminders.eventsThisWeek > 0 ? 'Eventos esta semana' : 'Sin eventos esta semana'}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        reminders.eventsThisWeek > 0 ? 'text-amber-700' : 'text-green-700'
                      }`}>
                        {reminders.eventsThisWeek > 0 
                          ? `Tienes ${reminders.eventsThisWeek} eventos programados para esta semana.`
                          : 'No hay eventos programados para esta semana.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Tarjetas de invitación pendientes</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {reminders.eventsWithoutCards} eventos no tienen tarjeta de invitación.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Finalización pendiente</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {reminders.eventsWithoutFinalization} eventos no tienen tarjeta de finalización.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 text-center">
                <Link
                  to="/events"
                  className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Ver todos los eventos
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          </div>

                  {/* Alertas de EventBooks */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-6">
                      <h2 className="text-xl font-medium text-gray-900 mb-6">Alertas de EventBooks</h2>
                      <div className="space-y-4">
                        {/* Total vs Activos */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                          <div className="flex items-start">
                            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-blue-800">EventBooks: Total vs Activos</h3>
                              <p className="text-sm text-blue-700 mt-1">
                                {eventBookAlerts.totalVsActive.total} EventBooks creados, {eventBookAlerts.totalVsActive.active} activos 
                                ({eventBookAlerts.totalVsActive.total > 0 ? Math.round((eventBookAlerts.totalVsActive.active / eventBookAlerts.totalVsActive.total) * 100) : 0}% activación)
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Eventos sin EventBook */}
                        <div className={`p-4 rounded-lg border ${
                          eventBookAlerts.eventsWithoutEventBook > 0 
                            ? 'bg-red-50 border-red-100' 
                            : 'bg-green-50 border-green-100'
                        }`}>
                          <div className="flex items-start">
                            {eventBookAlerts.eventsWithoutEventBook > 0 ? (
                              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            )}
                            <div className="ml-3">
                              <h3 className={`text-sm font-medium ${
                                eventBookAlerts.eventsWithoutEventBook > 0 ? 'text-red-800' : 'text-green-800'
                              }`}>
                                Eventos sin EventBook
                              </h3>
                              <p className={`text-sm mt-1 ${
                                eventBookAlerts.eventsWithoutEventBook > 0 ? 'text-red-700' : 'text-green-700'
                              }`}>
                                {eventBookAlerts.eventsWithoutEventBook > 0 
                                  ? `${eventBookAlerts.eventsWithoutEventBook} eventos no tienen EventBook asociado.`
                                  : 'Todos los eventos tienen su EventBook asociado.'
                                }
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* EventBooks próximos a cerrar */}
                        <div className={`p-4 rounded-lg border ${
                          eventBookAlerts.closingSoon > 0 
                            ? 'bg-amber-50 border-amber-100' 
                            : 'bg-green-50 border-green-100'
                        }`}>
                          <div className="flex items-start">
                            {eventBookAlerts.closingSoon > 0 ? (
                              <Clock className="h-5 w-5 text-amber-500 mt-0.5" />
                            ) : (
                              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                            )}
                            <div className="ml-3">
                              <h3 className={`text-sm font-medium ${
                                eventBookAlerts.closingSoon > 0 ? 'text-amber-800' : 'text-green-800'
                              }`}>
                                EventBooks próximos a cerrar
                              </h3>
                              <p className={`text-sm mt-1 ${
                                eventBookAlerts.closingSoon > 0 ? 'text-amber-700' : 'text-green-700'
                              }`}>
                                {eventBookAlerts.closingSoon > 0 
                                  ? `${eventBookAlerts.closingSoon} EventBooks cerrarán en los próximos 7 días.`
                                  : 'No hay EventBooks próximos a cerrar.'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-gray-200 text-center">
                        <Link
                          to="/eventbook"
                          className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                          Ver todos los EventBooks
                          <ExternalLink className="h-4 w-4 ml-1" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fila 2: Solicitudes Pendientes / Layout Nuevo */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Solicitudes Pendientes */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Solicitudes Pendientes</h2>
              {weeklyRequests.length > 0 ? (
                <div className="space-y-3">
                  {weeklyRequests.map((request, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center space-x-3">
                        <Bell className={`h-5 w-5 ${
                          request.status === 'pending' ? 'text-amber-500' : 
                          request.status === 'approved' ? 'text-green-500' : 'text-red-500'
                        }`} />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{request.eventName}</span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(request.requestDate).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        request.status === 'pending' 
                          ? 'bg-amber-100 text-amber-800' 
                          : request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status === 'pending' ? 'Solicitud pendiente' :
                         request.status === 'approved' ? 'Solicitud aprobada' : 'Solicitud rechazada'}
                      </span>
                    </div>
                  ))}
                  <div className="pt-4 border-t border-gray-200">
                    <Link
                      to="/requests"
                      className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Ver todas las solicitudes
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay solicitudes esta semana.</p>
                  <div className="pt-4">
                    <Link
                      to="/requests"
                      className="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                      Ver todas las solicitudes
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>

                  {/* Actividad Reciente */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-6">
                      <h2 className="text-xl font-medium text-gray-900 mb-6">Actividad Reciente</h2>
                      {recentActivities.length > 0 ? (
                        <div className="space-y-3">
                          {recentActivities.map((activity) => (
                            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                              <div className="flex-shrink-0 text-lg">
                                {activity.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {activity.description}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(activity.timestamp).toLocaleDateString('es-ES', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="mx-auto h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
                            <BarChart3 className="h-6 w-6 text-gray-400" />
                          </div>
                          <p className="text-gray-500">No hay actividad reciente</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fila 3: Notificaciones / Actualizaciones del Sistema */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Notificaciones */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden" data-section="notifications">
            <div className="px-6 py-6">
              <h2 className="text-xl font-medium text-gray-900 mb-6">Notificaciones</h2>
              {notifications.length > 0 ? (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div key={notification.id} className={`p-4 rounded-lg border ${
                      notification.type === 'info' ? 'bg-blue-50 border-blue-100' :
                      notification.type === 'warning' ? 'bg-amber-50 border-amber-100' :
                      notification.type === 'success' ? 'bg-green-50 border-green-100' :
                      'bg-red-50 border-red-100'
                    }`}>
                      <div className="flex items-start">
                        <Bell className={`h-5 w-5 mt-0.5 ${
                          notification.type === 'info' ? 'text-blue-500' :
                          notification.type === 'warning' ? 'text-amber-500' :
                          notification.type === 'success' ? 'text-green-500' :
                          'text-red-500'
                        }`} />
                        <div className="ml-3">
                          <h3 className={`text-sm font-medium ${
                            notification.type === 'info' ? 'text-blue-800' :
                            notification.type === 'warning' ? 'text-amber-800' :
                            notification.type === 'success' ? 'text-green-800' :
                            'text-red-800'
                          }`}>
                            {notification.title}
                          </h3>
                          <p className={`text-sm mt-1 ${
                            notification.type === 'info' ? 'text-blue-700' :
                            notification.type === 'warning' ? 'text-amber-700' :
                            notification.type === 'success' ? 'text-green-700' :
                            'text-red-700'
                          }`}>
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">No hay notificaciones nuevas</p>
                </div>
              )}
            </div>
          </div>

                  {/* Actualizaciones del Sistema */}
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="px-6 py-6">
                      <h2 className="text-xl font-medium text-gray-900 mb-6">Actualizaciones del Sistema</h2>
                      <div className="space-y-4">
                        {systemUpdates.map((update) => (
                          <div key={update.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                            <Info className={`h-5 w-5 ${
                              update.type === 'feature' ? 'text-indigo-500' : 'text-amber-500'
                            }`} />
                            <div>
                              <h3 className="text-sm font-medium text-gray-900">{update.title}</h3>
                              <p className="text-sm text-gray-500">{update.message}</p>
                              <p className="text-xs text-gray-400 mt-1">{new Date(update.date).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                        {systemUpdates.length === 0 && (
                          <div className="text-center py-8">
                            <Info className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">No hay actualizaciones del sistema</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div>
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-medium text-gray-900">
                    {currentDate.toLocaleDateString('es-ES', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </h2>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigateMonth('prev')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => navigateMonth('next')}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Calendar Stats - Moved up */}
                <div className="mb-6 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Resumen del Mes</h3>
                  <div className="grid grid-cols-3 gap-2 md:gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">{events.length}</div>
                      <div className="text-sm text-gray-500">Total Eventos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {events.filter(e => new Date(e.date).getMonth() === currentDate.getMonth()).length}
                      </div>
                      <div className="text-sm text-gray-500">Este Mes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-amber-600">
                        {events.filter(e => {
                          const eventDate = new Date(e.date);
                          const today = new Date();
                          const nextWeek = new Date();
                          nextWeek.setDate(today.getDate() + 7);
                          return eventDate >= today && eventDate <= nextWeek;
                        }).length}
                      </div>
                      <div className="text-sm text-gray-500">Próxima Semana</div>
                    </div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Days of Week Header */}
                  <div className="grid grid-cols-7 bg-gray-50">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                      <div key={day} className="px-4 py-3 text-sm font-medium text-gray-700 text-center border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7">
                    {renderCalendar()}
                  </div>
                </div>

                {/* Calendar Legend */}
                <div className="mt-4 flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-100 rounded mr-2"></div>
                    <span>Día actual</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-indigo-100 rounded mr-2"></div>
                    <span>Eventos programados</span>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}