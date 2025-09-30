import React from 'react';
import { Users, Calendar, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3, CalendarDays, MapPin, Building2, User, X, ChevronLeft, ChevronRight, BookOpen, Activity } from 'lucide-react';
import { storage } from '../lib/storage';
import { creatorsStorage } from '../lib/creators-storage';
import { eventBookStorage } from '../lib/eventbook-storage';
import { rolesStorage } from '../lib/roles-storage';
import type { Creator } from '../types/creator';
import type { Event } from '../types/event';
// Definir el tipo StoredUser localmente
interface StoredUser {
  id: string;
  name: string;
  company: string;
  role: string;
  createdBy?: string;
  country?: string;
  firstName?: string;
  lastName?: string;
}

export function SuperAdmin() {
  const [activeTab, setActiveTab] = React.useState<'statistics' | 'calendar'>('statistics');
  const [allEvents, setAllEvents] = React.useState<Event[]>([]);
  const [allUsers, setAllUsers] = React.useState<StoredUser[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [creatorNames, setCreatorNames] = React.useState<{[key: string]: string}>({});
  const [dateFilter, setDateFilter] = React.useState<string>('all');
  const [specificDate, setSpecificDate] = React.useState<string>('');
  
  const [userStats, setUserStats] = React.useState({
    totalUsers: 0,
    adminUsers: 0,
    creatorUsers: 0,
    moderatorUsers: 0,
    accessControlUsers: 0,
    topCreators: [] as Array<{ name: string; company: string; eventCount: number }>,
    topAdmins: [] as Array<{ name: string; company: string; eventCount: number }>
  });

  const [eventStats, setEventStats] = React.useState({
    totalEvents: 0,
    activeEvents: 0,
    finishedEvents: 0,
    averageGuests: 0,
    upcomingThisWeek: 0,
    topEvents: [] as Array<{ name: string; guestCount: number; createdBy: string }>
  });

  const [eventBookStats, setEventBookStats] = React.useState({
    totalEventBooks: 0,
    activeEventBooks: 0,
    unconfiguredEventBooks: 0,
    totalPosts: 0,
    totalPhotos: 0,
    pendingReports: 0,
    topEventBooks: [] as Array<{ name: string; createdBy: string; posts: number; photos: number; participants: number; likes: number; comments: number }>
  });


  interface AppUsageStats {
    topUsersByEvents: Array<{ company: string; creator: string; country: string; eventCount: number }>;
    topUsersByEventBooks: Array<{ company: string; creator: string; country: string; eventBookCount: number }>;
    topUsersByRoleCreation: Array<{ company: string; creator: string; country: string; roleCount: number }>;
    topUsersByApprovedRequests: Array<{ company: string; creator: string; country: string; approvedCount: number }>;
    topUsersByGuests: Array<{ company: string; creator: string; country: string; totalGuests: number }>;
  }

  const [appUsageStats, setAppUsageStats] = React.useState<AppUsageStats>({
    topUsersByEvents: [],
    topUsersByEventBooks: [],
    topUsersByRoleCreation: [],
    topUsersByApprovedRequests: [],
    topUsersByGuests: []
  });

  React.useEffect(() => {
    loadUserStats();
    loadEventStats();
    loadEventBookStats();
    loadAppUsageStats();
    loadAllEvents();
    loadAllUsers();
    loadCreatorNames();
  }, [dateFilter, specificDate]);

  const loadAllEvents = async () => {
    try {
      const events = await storage.getEvents();
      setAllEvents(events);
    } catch (error) {
      console.error('Error loading all events:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const users = await storage.getUsers();
      setAllUsers(users as any);
    } catch (error) {
      console.error('Error loading all users:', error);
    }
  };

  const getDateFilterRange = (filter: string, specificDate: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (filter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'specific':
        if (!specificDate) return null;
        const specificDateTime = new Date(specificDate);
        startDate = new Date(specificDateTime.getFullYear(), specificDateTime.getMonth(), specificDateTime.getDate());
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        return { startDate, endDate };
      default:
        return null;
    }
    
    return { startDate, endDate: now };
  };

  const filterByDateRange = (items: any[], dateField: string, dateRange: any) => {
    if (!dateRange) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
    });
  };

  const loadUserStats = async () => {
    try {
      const users = await storage.getUsers();
      const creators = await creatorsStorage.getCreators();
      const events = await storage.getEvents();
      
      const dateRange = getDateFilterRange(dateFilter, specificDate);
      let filteredEvents = events;
      
      if (dateRange) {
        filteredEvents = filterByDateRange(events, 'date', dateRange);
      }
      
      // Contar usuarios por rol (admin_users)
      const adminUsers = users.filter(u => u.role === 'ADMIN').length;
      const moderatorUsers = users.filter(u => u.role === 'MODERADOR').length;
      const accessControlUsers = users.filter(u => u.role === 'ACCESS_CONTROL').length;
      
      // Contar creadores desde creators-storage
      const creatorUsers = creators.length;
      
      // Calcular creadores más productivos usando creators-storage
      const creatorStats = creators
        .map((creator: any) => {
          // Buscar usuarios creados por este creador
          const usersCreatedByCreator = users.filter(u => u.createdBy === creator.id);
          // Contar eventos de esos usuarios
          const creatorEvents = events.filter(e => 
            usersCreatedByCreator.some(user => user.id === e.created_by)
          );
          return {
            name: `${creator.firstName} ${creator.lastName}`,
            company: creator.email, // Usar email como "company" para creadores
            eventCount: creatorEvents.length
          };
        })
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 3);

      // Calcular administradores más productivos
      const adminStats = users
        .filter(u => u.role === 'ADMIN')
        .map(admin => {
          const adminEvents = events.filter(e => e.created_by === admin.id);
          return {
            name: `${admin.firstName} ${admin.lastName}`,
            company: admin.company,
            eventCount: adminEvents.length
          };
        })
        .sort((a, b) => b.eventCount - a.eventCount)
        .slice(0, 3);

      setUserStats({
        totalUsers: users.length + creators.length, // Sumar ambos tipos de usuarios
        adminUsers,
        creatorUsers,
        moderatorUsers,
        accessControlUsers,
        topCreators: creatorStats,
        topAdmins: adminStats
      });
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const loadEventStats = async () => {
    try {
      const events = await storage.getEvents();
      const users = await storage.getUsers();
      
      const dateRange = getDateFilterRange(dateFilter, specificDate);
      let filteredEvents = events;
      
      if (dateRange) {
        filteredEvents = filterByDateRange(events, 'date', dateRange);
      }
      
      // Calcular estadísticas básicas
      const totalEvents = filteredEvents.length;
      const activeEvents = filteredEvents.filter(e => new Date(e.date) >= new Date()).length;
      const finishedEvents = filteredEvents.filter(e => new Date(e.date) < new Date()).length;
      
      // Calcular promedio de invitados
      const totalGuests = filteredEvents.reduce((sum, event) => sum + (event.guest_count || 0), 0);
      const averageGuests = totalEvents > 0 ? Math.round(totalGuests / totalEvents) : 0;
      
      // Calcular eventos próximos esta semana
      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const upcomingThisWeek = filteredEvents.filter(event => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        return eventDate >= now && eventDate <= weekFromNow;
      }).length;
      
      // Top 3 eventos ACTIVOS con más invitados
      const topEvents = events
        .filter(e => new Date(e.date) >= new Date() && e.guest_count && e.guest_count > 0)
        .sort((a, b) => (b.guest_count || 0) - (a.guest_count || 0))
        .slice(0, 3)
        .map(event => {
          // Buscar el administrador que creó el evento
          const creator = users.find((u: any) => u.id === event.created_by);
          return {
            name: event.name,
            guestCount: event.guest_count || 0,
            createdBy: creator ? creator.company : 'Administrador desconocido'
          };
        });

      setEventStats({
        totalEvents,
        activeEvents,
        finishedEvents,
        averageGuests,
        upcomingThisWeek,
        topEvents
      });
    } catch (error) {
      console.error('Error loading event stats:', error);
    }
  };

  const loadEventBookStats = async () => {
    try {
      const eventBooks = await eventBookStorage.getAllEventBooks();
      const allPosts = [];
      let totalPhotos = 0;
      let pendingReports = 0;

      // Obtener todos los posts y calcular estadísticas
      for (const eventBook of eventBooks) {
        const posts = await eventBookStorage.getAllPosts(eventBook.id);
        allPosts.push(...posts);
        
        // Contar fotos
        const photosInEventBook = posts.filter(post => 
          post.mediaFiles && post.mediaFiles.length > 0
        ).length;
        totalPhotos += photosInEventBook;
      }

      // Obtener reportes pendientes
      const reports = JSON.parse(localStorage.getItem('post_reports') || '[]');
      pendingReports = reports.filter((report: any) => report.status === 'pending').length;

      // Calcular estadísticas básicas
      const totalEventBooks = eventBooks.length;
      const activeEventBooks = eventBooks.filter(eb => eb.isActive).length;
      const unconfiguredEventBooks = eventBooks.filter(eb => !eb.settings?.isConfigured).length;

      // Top 3 EventBooks con más interacción
      const eventBooksWithStats = await Promise.all(
        eventBooks.map(async (eventBook) => {
          const posts = await eventBookStorage.getAllPosts(eventBook.id);
          const photos = posts.filter(post => post.mediaFiles && post.mediaFiles.length > 0).length;
          const stats = await eventBookStorage.getEventBookStats(eventBook.id);
          
          
          // Buscar el administrador que creó el EventBook
          const users = await storage.getUsers();
          const creator = users.find((u: any) => u.id === eventBook.created_by);
          
          return {
            name: eventBook.name,
            createdBy: creator ? creator.company : 'Administrador desconocido',
            posts: posts.length,
            photos,
            participants: stats.participants,
            likes: 0, // Placeholder - agregar lógica si existe
            comments: 0 // Placeholder - agregar lógica si existe
          };
        })
      );

      const topEventBooks = eventBooksWithStats
        .sort((a, b) => (b.posts + b.photos + b.participants) - (a.posts + a.photos + a.participants))
        .slice(0, 3);

      setEventBookStats({
        totalEventBooks,
        activeEventBooks,
        unconfiguredEventBooks,
        totalPosts: allPosts.length,
        totalPhotos,
        pendingReports,
        topEventBooks
      });
    } catch (error) {
      console.error('Error loading EventBook stats:', error);
    }
  };


  const loadAppUsageStats = async () => {
    try {
      const users = await storage.getUsers();
      const events = await storage.getEvents();
      const eventBooks = await eventBookStorage.getAllEventBooks();
      const requests = await storage.getEventRequests();
      const creators = await creatorsStorage.getCreators();
      const userAccesses = await rolesStorage.getUserAccesses('all');

      // 1. Usuarios con más eventos
      const userEventCounts = users.map(user => {
        const userEvents = events.filter(e => e.created_by === user.id);
        const creator = creators.find((c: Creator) => c.id === user.createdBy);
        return {
          company: user.company || 'Sin empresa',
          creator: creator ? `${creator.firstName} ${creator.lastName}` : 'Sin creador',
          country: user.country || 'No especificado',
          eventCount: userEvents.length
        };
      }).sort((a, b) => b.eventCount - a.eventCount).slice(0, 3);

      // 2. Usuarios con más EventBooks
      const userEventBookCounts = users.map(user => {
        const userEventBooks = eventBooks.filter(eb => {
          const event = events.find(e => e.id === eb.event_id);
          return event && event.created_by === user.id;
        });
        const creator = creators.find((c: Creator) => c.id === user.createdBy);
        return {
          company: user.company || 'Sin empresa',
          creator: creator ? `${creator.firstName} ${creator.lastName}` : 'Sin creador',
          country: user.country || 'No especificado',
          eventBookCount: userEventBooks.length
        };
      }).sort((a, b) => b.eventBookCount - a.eventBookCount).slice(0, 3);

      // 3. Usuarios con más creación de roles (basado en datos reales)
      const userRoleCounts = users.map(user => {
        // Contar roles reales creados por este usuario
        const roleCount = userAccesses.filter(access => access.createdBy === user.id).length;
        const creator = creators.find((c: Creator) => c.id === user.createdBy);
        return {
          company: user.company || 'Sin empresa',
          creator: creator ? `${creator.firstName} ${creator.lastName}` : 'Sin creador',
          country: user.country || 'No especificado',
          roleCount
        };
      }).sort((a, b) => b.roleCount - a.roleCount).slice(0, 3);

      // 4. Usuarios con más solicitudes aceptadas
      const userApprovedCounts = users.map(user => {
        const userRequests = requests.filter(r => r.requested_by === user.id && r.status === 'approved');
        const creator = creators.find((c: Creator) => c.id === user.createdBy);
        return {
          company: user.company || 'Sin empresa',
          creator: creator ? `${creator.firstName} ${creator.lastName}` : 'Sin creador',
          country: user.country || 'No especificado',
          approvedCount: userRequests.length
        };
      }).sort((a, b) => b.approvedCount - a.approvedCount).slice(0, 3);

      // 5. Usuarios con más invitados
      const userGuestCounts = users.map(user => {
        const userEvents = events.filter(e => e.created_by === user.id);
        const totalGuests = userEvents.reduce((sum, event) => sum + (event.guest_count || 0), 0);
        const creator = creators.find((c: Creator) => c.id === user.createdBy);
        return {
          company: user.company || 'Sin empresa',
          creator: creator ? `${creator.firstName} ${creator.lastName}` : 'Sin creador',
          country: user.country || 'No especificado',
          totalGuests
        };
      }).sort((a, b) => b.totalGuests - a.totalGuests).slice(0, 3);

      setAppUsageStats({
        topUsersByEvents: userEventCounts,
        topUsersByEventBooks: userEventBookCounts,
        topUsersByRoleCreation: userRoleCounts,
        topUsersByApprovedRequests: userApprovedCounts,
        topUsersByGuests: userGuestCounts
      });
    } catch (error) {
      console.error('Error loading app usage stats:', error);
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
    return allEvents.filter(event => event.date.split('T')[0] === dateStr);
  };

  const getUserById = (userId: string) => {
    return allUsers.find(u => u.id === userId);
  };

  const loadCreatorNames = async () => {
    try {
      const creators = await creatorsStorage.getCreators();
      const names: {[key: string]: string} = {};
      creators.forEach(creator => {
        names[creator.id] = `${creator.firstName} ${creator.lastName}`;
      });
      setCreatorNames(names);
    } catch (error) {
      console.error('Error loading creators:', error);
    }
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
                  onClick={() => setSelectedEvent(event)}
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
      <div className="px-4 py-6 sm:px-0">
        {/* Modal de Detalles del Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Detalles del Evento</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-gray-600"
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
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Ubicación</h4>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 text-gray-400 mr-1" />
                  <p className="text-sm text-gray-900">{selectedEvent.location}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Contratista</h4>
                  <p className="text-sm text-gray-900">{selectedEvent.contractor_name}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">País</h4>
                  <p className="text-sm text-gray-900">
                    {getUserById(selectedEvent.created_by)?.country || 'No especificado'}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Empresa Administradora</h4>
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 text-gray-400 mr-1" />
                  <p className="text-sm text-gray-900">
                    {getUserById(selectedEvent.created_by)?.company || 'Sin empresa'}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Creador</h4>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-1" />
                  <p className="text-sm text-gray-900">
                    {creatorNames[getUserById(selectedEvent.created_by)?.createdBy || ''] || 'Creador desconocido'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-900 mb-8">Super Admin Dashboard</h1>
      
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
            <div className="max-w-7xl mx-auto">
              {/* Filtros de Fecha */}
              <div className="mb-6 p-4 bg-white rounded-lg shadow-sm border">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Filtrar estadísticas por fecha:</span>
                  
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las fechas</option>
                    <option value="week">Última semana</option>
                    <option value="month">Último mes</option>
                    <option value="3months">Últimos 3 meses</option>
                    <option value="year">Último año</option>
                    <option value="specific">Fecha específica</option>
                  </select>

                  {dateFilter === 'specific' && (
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  {dateFilter !== 'all' && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {dateFilter === 'week' && 'Mostrando últimos 7 días'}
                      {dateFilter === 'month' && 'Mostrando últimos 30 días'}
                      {dateFilter === '3months' && 'Mostrando últimos 90 días'}
                      {dateFilter === 'year' && 'Mostrando últimos 365 días'}
                      {dateFilter === 'specific' && specificDate && `Mostrando: ${new Date(specificDate).toLocaleDateString('es-ES')}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Sección Usuarios */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-center mb-6">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <h2 className="text-xl font-medium text-gray-900">Usuarios</h2>
              </div>
              <div className="space-y-4">
                {/* Total de usuarios */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Usuarios</p>
                      <p className="text-2xl font-bold text-blue-900">{userStats.totalUsers}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-400" />
                  </div>
                </div>

                {/* Usuarios por rol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">ADMIN</p>
                    <p className="text-lg sm:text-xl font-semibold text-gray-900">{userStats.adminUsers}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-purple-600 font-medium">CREATOR</p>
                    <p className="text-lg sm:text-xl font-semibold text-purple-900">{userStats.creatorUsers}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-green-600 font-medium">MODERADOR</p>
                    <p className="text-lg sm:text-xl font-semibold text-green-900">{userStats.moderatorUsers}</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-orange-600 font-medium">ACCESO</p>
                    <p className="text-lg sm:text-xl font-semibold text-orange-900">{userStats.accessControlUsers}</p>
                  </div>
                </div>

                {/* Top 3 Creadores más productivos */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Creadores Más Productivos</h3>
                  {userStats.topCreators.length > 0 ? (
                    <div className="space-y-2">
                      {userStats.topCreators.map((creator, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {index + 1}
                            </span>
                            <div className="ml-2">
                              <p className="text-sm font-medium text-gray-900">{creator.company}</p>
                              <p className="text-xs text-gray-500">{creator.name}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-blue-600">{creator.eventCount} eventos</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay creadores registrados</p>
                  )}
                </div>

                {/* Top 3 Administradores más productivos */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Administradores Más Productivos</h3>
                  {userStats.topAdmins.length > 0 ? (
                    <div className="space-y-2">
                      {userStats.topAdmins.map((admin, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {index + 1}
                            </span>
                            <div className="ml-2">
                              <p className="text-sm font-medium text-gray-900">{admin.company}</p>
                              <p className="text-xs text-gray-500">{admin.name}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-green-600">{admin.eventCount} eventos</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay administradores registrados</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. Sección Eventos */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-center mb-6">
                <Calendar className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-xl font-medium text-gray-900">Eventos</h2>
              </div>
              
              <div className="space-y-6">
                {/* Total Eventos */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600">Total Eventos</p>
                      <p className="text-2xl font-bold text-green-900">{eventStats.totalEvents}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                {/* Grid de estadísticas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">ACTIVOS</p>
                    <p className="text-lg sm:text-xl font-semibold text-blue-900">{eventStats.activeEvents}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    <p className="text-xs sm:text-sm text-gray-600 font-medium">FINALIZADOS</p>
                    <p className="text-lg sm:text-xl font-semibold text-gray-900">{eventStats.finishedEvents}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3 sm:p-4 sm:col-span-2">
                    <p className="text-xs sm:text-sm text-purple-600 font-medium">PROMEDIO INVITADOS</p>
                    <p className="text-lg sm:text-xl font-semibold text-purple-900">{eventStats.averageGuests}</p>
                  </div>
                </div>

                {/* Eventos próximos esta semana */}
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <p className="text-sm sm:text-base text-orange-600 font-medium">Próximos esta semana</p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-900">{eventStats.upcomingThisWeek}</p>
                </div>

                {/* Top 3 Eventos Activos con más invitados */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Top 3 Eventos Activos por Invitados</h3>
                  {eventStats.topEvents.length > 0 ? (
                    <div className="space-y-2">
                      {eventStats.topEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                          <div className="flex items-center">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              'bg-orange-100 text-orange-800'
                            }`}>
                              {index + 1}
                            </span>
                            <div className="ml-2">
                              <p className="text-sm font-medium text-gray-900">{event.name}</p>
                              <p className="text-xs text-gray-500">Creado por: {event.createdBy}</p>
                            </div>
                          </div>
                          <span className="text-sm font-medium text-green-600">{event.guestCount} invitados</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No hay eventos activos con invitados registrados</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Sección EventBooks */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-center mb-6">
                <BookOpen className="h-8 w-8 text-purple-600 mr-3" />
                <h2 className="text-xl font-medium text-gray-900">EventBooks</h2>
              </div>
              
              <div className="space-y-4">
                {/* Total EventBooks */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-purple-600">{eventBookStats.totalEventBooks}</p>
                    <p className="text-sm text-purple-600 font-medium">Total EventBooks</p>
                  </div>
                </div>

                {/* Grid 2x2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                    <p className="text-lg sm:text-xl font-bold text-green-600">{eventBookStats.activeEventBooks}</p>
                    <p className="text-xs sm:text-sm text-green-600 font-medium">ACTIVOS</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 sm:p-4">
                    <p className="text-lg sm:text-xl font-bold text-red-600">{eventBookStats.unconfiguredEventBooks}</p>
                    <p className="text-xs sm:text-sm text-red-600 font-medium">SIN CONFIGURAR</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                    <p className="text-lg sm:text-xl font-bold text-blue-600">{eventBookStats.totalPosts}</p>
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">POSTS TOTALES</p>
                  </div>
                  <div className="bg-indigo-50 rounded-lg p-3 sm:p-4">
                    <p className="text-lg sm:text-xl font-bold text-indigo-600">{eventBookStats.totalPhotos}</p>
                    <p className="text-xs sm:text-sm text-indigo-600 font-medium">FOTOS TOTALES</p>
                  </div>
                </div>

                {/* Reportes pendientes */}
                <div className="bg-orange-50 rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm sm:text-base text-orange-700 font-medium">Reportes pendientes</span>
                    <span className="text-lg sm:text-xl font-bold text-orange-600">{eventBookStats.pendingReports}</span>
                  </div>
                </div>

                {/* Top 3 EventBooks por interacción */}
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Top 3 EventBooks por Interacción</h3>
                  <div className="space-y-2">
                    {eventBookStats.topEventBooks.map((eventBook, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-xs font-medium ${
                            index === 0 ? 'bg-yellow-100 text-yellow-800' :
                            index === 1 ? 'bg-gray-100 text-gray-800' :
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="ml-2">
                            <p className="text-sm font-medium text-gray-900">{eventBook.name}</p>
                            <p className="text-xs text-gray-500">Creado por: {eventBook.createdBy}</p>
                            <p className="text-xs text-gray-500">
                              {eventBook.posts} posts • {eventBook.photos} fotos • {eventBook.participants} participantes
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-purple-600">
                          {eventBook.posts + eventBook.photos + eventBook.participants} total
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Sección Uso de App */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-6">
              <div className="flex items-center mb-6">
                <Activity className="h-8 w-8 text-indigo-600 mr-3" />
                <h2 className="text-xl font-medium text-gray-900">Uso de App</h2>
              </div>
              <div className="space-y-6">
                {/* Top usuarios por solicitudes aceptadas */}
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Top Usuarios por Solicitudes Aceptadas</h3>
                  <div className="space-y-2">
                    {appUsageStats.topUsersByApprovedRequests.map((user, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-yellow-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <div className="font-medium text-yellow-900 text-sm sm:text-base">{user.company}</div>
                          <div className="text-xs sm:text-sm text-yellow-600">{user.creator} • {user.country}</div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-yellow-600 self-end sm:self-auto">{user.approvedCount}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top usuarios por creación de roles */}
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Top Usuarios por Creación de Roles</h3>
                  <div className="space-y-2">
                    {appUsageStats.topUsersByRoleCreation.map((user, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-orange-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <div className="font-medium text-orange-900 text-sm sm:text-base">{user.company}</div>
                          <div className="text-xs sm:text-sm text-orange-600">{user.creator} • {user.country}</div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-orange-600 self-end sm:self-auto">{user.roleCount}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top usuarios por eventos */}
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Top Usuarios por Eventos</h3>
                  <div className="space-y-2">
                    {appUsageStats.topUsersByEvents.map((user, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-blue-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <div className="font-medium text-blue-900 text-sm sm:text-base">{user.company}</div>
                          <div className="text-xs sm:text-sm text-blue-600">{user.creator} • {user.country}</div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-blue-600 self-end sm:self-auto">{user.eventCount}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top usuarios por EventBooks */}
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Top Usuarios por EventBooks</h3>
                  <div className="space-y-2">
                    {appUsageStats.topUsersByEventBooks.map((user, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-green-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <div className="font-medium text-green-900 text-sm sm:text-base">{user.company}</div>
                          <div className="text-xs sm:text-sm text-green-600">{user.creator} • {user.country}</div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-green-600 self-end sm:self-auto">{user.eventBookCount}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top usuarios por invitados */}
                <div>
                  <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-3">Top Usuarios por Invitados</h3>
                  <div className="space-y-2">
                    {appUsageStats.topUsersByGuests.map((user, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-purple-50 rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
                        <div className="flex-1">
                          <div className="font-medium text-purple-900 text-sm sm:text-base">{user.company}</div>
                          <div className="text-xs sm:text-sm text-purple-600">{user.creator} • {user.country}</div>
                        </div>
                        <div className="text-lg sm:text-xl font-bold text-purple-600 self-end sm:self-auto">{user.totalGuests}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
          )}

          {activeTab === 'calendar' && (
            <div>
              {/* Estadísticas del Calendario */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Total Eventos</p>
                      <p className="text-2xl font-bold">{allEvents.length}</p>
                    </div>
                    <CalendarDays className="h-8 w-8 text-blue-200" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Este Mes</p>
                      <p className="text-2xl font-bold">
                        {allEvents.filter(event => {
                          const eventDate = new Date(event.date);
                          return eventDate.getMonth() === currentDate.getMonth() && 
                                 eventDate.getFullYear() === currentDate.getFullYear();
                        }).length}
                      </p>
                    </div>
                    <BarChart3 className="h-8 w-8 text-green-200" />
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100 text-sm">Próxima Semana</p>
                      <p className="text-2xl font-bold">
                        {allEvents.filter(event => {
                          const eventDate = new Date(event.date);
                          const nextWeek = new Date();
                          nextWeek.setDate(nextWeek.getDate() + 7);
                          return eventDate >= new Date() && eventDate <= nextWeek;
                        }).length}
                      </p>
                    </div>
                    <Users className="h-8 w-8 text-purple-200" />
                  </div>
                </div>
              </div>

              {/* Navegación del Calendario */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                  }).charAt(0).toUpperCase() + currentDate.toLocaleDateString('es-ES', { 
                    month: 'long', 
                    year: 'numeric' 
                  }).slice(1)}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Calendario */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Encabezados de días */}
                <div className="grid grid-cols-7 bg-gray-50">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                    <div key={day} className="px-4 py-3 text-center text-sm font-medium text-gray-700 border-b border-gray-200">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Días del calendario */}
                <div className="grid grid-cols-7">
                  {renderCalendar()}
                </div>
              </div>

              {/* Leyenda */}
              <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded mr-2"></div>
                  <span>Día actual</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-indigo-100 rounded mr-2"></div>
                  <span>Días con eventos</span>
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
