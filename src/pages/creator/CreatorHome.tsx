import React, { useState, useEffect } from 'react';
import { Home, Bell, AlertCircle, CheckCircle, Clock, TrendingUp, Users, Calendar, BarChart3, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../lib/storage';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  date: string;
  read: boolean;
}

interface SystemUpdate {
  id: string;
  title: string;
  message: string;
  date: string;
}

interface QuickStat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<any>;
}

export default function CreatorHome() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [systemUpdates, setSystemUpdates] = useState<SystemUpdate[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<{text: string, timestamp: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'gestion' | 'calendario'>('gestion');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventConfigurations, setEventConfigurations] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load real notifications from communications system
      const { communicationsStorage } = await import('../../lib/communications-storage');
      const [systemNotifications, systemUpdates] = await Promise.all([
        communicationsStorage.getNotifications(),
        communicationsStorage.getSystemUpdates()
      ]);

      // Filter notifications for creators (only notifications, not system updates)
      const creatorNotifications = systemNotifications
        .filter(notif => notif.isActive && (notif.targetRole === 'CREATOR' || notif.targetRole === 'ALL'))
        .map(notif => ({
          id: notif.id,
          type: notif.type,
          title: notif.title,
          message: notif.message,
          date: notif.createdAt,
          read: false
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10); // Show only latest 10

      // Filter system updates for creators (separate from notifications)
      const creatorUpdates = systemUpdates
        .filter(update => update.isActive && (update.targetRole === 'CREATOR' || update.targetRole === 'ALL'))
        .map(update => ({
          id: update.id,
          title: update.title,
          message: update.message,
          date: update.createdAt
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5); // Show only latest 5

      // Load quick stats
      const allUsers = await storage.getUsers();
      const creatorUsers = allUsers.filter(u => u.createdBy === user.id);
      const loadedEvents = await storage.getEvents();
      
      // Set users and events for calendar
      setUsers(allUsers);
      setEvents(loadedEvents);
      const allRequests = await storage.getEventRequests();
      const creatorRequests = allRequests.filter(request => 
        creatorUsers.some(u => u.id === request.requested_by)
      );
      const approvedRequests = creatorRequests.filter(r => r.status === 'approved');

      // Calculate weekly changes
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Users created this week vs last week
      const usersThisWeek = creatorUsers.filter(u => new Date(u.createdAt) >= weekAgo).length;
      const usersLastWeek = creatorUsers.filter(u => {
        const userDate = new Date(u.createdAt);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return userDate >= twoWeeksAgo && userDate < weekAgo;
      }).length;

      // Requests this week vs last week
      const requestsThisWeek = approvedRequests.filter(r => new Date(r.created_at) >= weekAgo).length;
      const requestsLastWeek = approvedRequests.filter(r => {
        const requestDate = new Date(r.created_at);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        return requestDate >= twoWeeksAgo && requestDate < weekAgo;
      }).length;

      // Events this month vs last month
      const eventsThisMonth = new Set(approvedRequests.filter(r => new Date(r.created_at) >= monthAgo).map(r => r.event_id)).size;
      const eventsLastMonth = new Set(approvedRequests.filter(r => {
        const requestDate = new Date(r.created_at);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        return requestDate >= twoMonthsAgo && requestDate < monthAgo;
      }).map(r => r.event_id)).size;

      // Approval rate this month vs last month
      const requestsThisMonth = creatorRequests.filter(r => new Date(r.created_at) >= monthAgo);
      const approvedThisMonth = requestsThisMonth.filter(r => r.status === 'approved').length;
      const approvalRateThisMonth = requestsThisMonth.length > 0 ? (approvedThisMonth / requestsThisMonth.length) * 100 : 0;

      const requestsLastMonth = creatorRequests.filter(r => {
        const requestDate = new Date(r.created_at);
        const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        return requestDate >= twoMonthsAgo && requestDate < monthAgo;
      });
      const approvedLastMonth = requestsLastMonth.filter(r => r.status === 'approved').length;
      const approvalRateLastMonth = requestsLastMonth.length > 0 ? (approvedLastMonth / requestsLastMonth.length) * 100 : 0;

      // Generate dynamic change messages
      const getUserChange = () => {
        const diff = usersThisWeek - usersLastWeek;
        if (diff > 0) return { text: `+${diff} esta semana`, trend: 'up' as const };
        if (diff < 0) return { text: `${diff} esta semana`, trend: 'down' as const };
        return { text: 'Sin cambios', trend: 'neutral' as const };
      };

      const getRequestChange = () => {
        const diff = requestsThisWeek - requestsLastWeek;
        if (diff > 0) return { text: `+${diff} esta semana`, trend: 'up' as const };
        if (diff < 0) return { text: `${diff} esta semana`, trend: 'down' as const };
        return { text: 'Sin cambios', trend: 'neutral' as const };
      };

      const getEventChange = () => {
        const diff = eventsThisMonth - eventsLastMonth;
        if (diff > 0) return { text: `+${diff} este mes`, trend: 'up' as const };
        if (diff < 0) return { text: `${diff} este mes`, trend: 'down' as const };
        return { text: 'Sin cambios', trend: 'neutral' as const };
      };

      const getApprovalChange = () => {
        const diff = approvalRateThisMonth - approvalRateLastMonth;
        if (Math.abs(diff) < 1) return { text: 'Sin cambios', trend: 'neutral' as const };
        if (diff > 0) return { text: `+${Math.round(diff)}% vs mes anterior`, trend: 'up' as const };
        return { text: `${Math.round(diff)}% vs mes anterior`, trend: 'down' as const };
      };

      const userChange = getUserChange();
      const requestChange = getRequestChange();
      const eventChange = getEventChange();
      const approvalChange = getApprovalChange();

      const stats: QuickStat[] = [
        {
          label: 'Usuarios Activos',
          value: creatorUsers.length.toString(),
          change: userChange.text,
          trend: userChange.trend,
          icon: Users
        },
        {
          label: 'Solicitudes Aprobadas',
          value: approvedRequests.length.toString(),
          change: requestChange.text,
          trend: requestChange.trend,
          icon: CheckCircle
        },
        {
          label: 'Eventos Activos',
          value: new Set(approvedRequests.map(r => r.event_id)).size.toString(),
          change: eventChange.text,
          trend: eventChange.trend,
          icon: Calendar
        },
        {
          label: 'Tasa de Aprobación',
          value: creatorRequests.length > 0 ? `${Math.round((approvedRequests.length / creatorRequests.length) * 100)}%` : '0%',
          change: approvalChange.text,
          trend: approvalChange.trend,
          icon: TrendingUp
        }
      ];

      setNotifications(creatorNotifications);
      setSystemUpdates(creatorUpdates);
      setQuickStats(stats);
      
      // Generate recent activity based on real data with timestamps
      const activity = [];
      
      // Add recent requests
      const recentRequests = creatorRequests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 3);
      
      for (const request of recentRequests) {
        const user = creatorUsers.find(u => u.id === request.requested_by);
        const event = loadedEvents.find((e: any) => e.id === request.event_id);
        if (user && event) {
          activity.push({
            text: `${user.company} creó una nueva solicitud para "${event.name}"`,
            timestamp: request.created_at
          });
        }
      }
      
      // Add recent user registrations
      const recentUsers = creatorUsers
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 2);
      
      for (const user of recentUsers) {
        activity.push({
          text: `${user.company} se registró en el sistema`,
          timestamp: user.createdAt
        });
      }
      
      // Add recent approvals
      const recentApprovals = approvedRequests
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 2);
      
      for (const request of recentApprovals) {
        const user = creatorUsers.find(u => u.id === request.requested_by);
        if (user) {
          activity.push({
            text: `Se aprobó la solicitud de ${user.company}`,
            timestamp: request.created_at
          });
        }
      }
      
      // Sort all activities by timestamp and take the 6 most recent
      const sortedActivity = activity
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6);
      
      setRecentActivity(sortedActivity);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Bell className="h-5 w-5 text-blue-500" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Calendar functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getEventsForDate = (date: Date) => {
    if (!events || !users) return [];
    
    // Get users created by this creator
    const creatorUsers = users.filter(u => u.createdBy === user?.id);
    
    // Filter events created by creator's users for this specific date
    return events.filter(event => {
      const eventDate = new Date(event.date);
      const isCreatorUserEvent = creatorUsers.some(u => u.id === event.created_by);
      return isCreatorUserEvent && 
             eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear();
    });
  };

  const loadEventConfigurations = async (eventId: string) => {
    try {
      // Load real configuration data for the event
      const { finalizationStorage } = await import('../../lib/finalization-storage');
      const { eventBookStorage } = await import('../../lib/eventbook-storage');

      console.log('Loading configurations for event:', eventId);

      // Check if interactive card exists (from storage)
      const hasCard = !!(await storage.getEventCard(eventId));
      console.log('Has card:', hasCard);

      // Check if event is finalized
      const finalization = await finalizationStorage.getEventFinalization(eventId);
      const isFinalized = !!finalization?.is_finalized;
      console.log('Finalization object:', finalization);
      console.log('Is finalized:', isFinalized);

      // Check if EventBook exists - need to check all EventBooks, not just current user's
      const allEventBooks = await eventBookStorage.getAllEventBooks();
      const hasEventBook = allEventBooks.some((eb: any) => eb.event_id === eventId);
      console.log('All EventBooks:', allEventBooks);
      console.log('Has EventBook:', hasEventBook);

      // Check if moderator is assigned to this event
      const { rolesStorage } = await import('../../lib/roles-storage');
      const allUserAccesses = await rolesStorage.getUserAccesses('all');
      console.log('All user accesses:', allUserAccesses);
      
      // Check for moderator by assigned events OR by assigned EventBooks
      const moderatorAccess = allUserAccesses.find((access: any) => {
        if (access.accessType === 'moderador') {
          // Check if event is directly assigned
          const hasDirectEvent = access.assignedEvents?.includes(eventId);
          
          // Check if moderator has EventBook for this event
          const hasEventBookForEvent = access.assignedEventBooks?.some((ebId: string) => {
            const eventBook = allEventBooks.find((eb: any) => eb.id === ebId);
            return eventBook?.event_id === eventId;
          });
          
          console.log(`Moderator ${access.username}:`, {
            hasDirectEvent,
            hasEventBookForEvent,
            assignedEvents: access.assignedEvents,
            assignedEventBooks: access.assignedEventBooks
          });
          
          return hasDirectEvent || hasEventBookForEvent;
        }
        return false;
      });
      
      const hasModerator = !!moderatorAccess;
      console.log('Found moderator access:', moderatorAccess);
      console.log('Has moderator:', hasModerator);

      // Check if access control is assigned to this event
      const accessControlAccess = allUserAccesses.find((access: any) => 
        access.accessType === 'control_acceso' && 
        access.assignedEvents?.includes(eventId)
      );
      const hasAccessControl = !!accessControlAccess;
      console.log('Access control access:', accessControlAccess);
      console.log('Has access control:', hasAccessControl);

      const config = {
        hasCard,
        isFinalized,
        hasEventBook,
        hasModerator,
        hasAccessControl
      };

      console.log('Final config:', config);

      setEventConfigurations((prev: any) => ({
        ...prev,
        [eventId]: config
      }));

      return config;
    } catch (error) {
      console.error('Error loading event configurations:', error);
      return {
        hasCard: false,
        isFinalized: false,
        hasEventBook: false,
        hasModerator: false,
        hasAccessControl: false
      };
    }
  };

  const getUserById = (userId: string) => {
    return users.find(u => u.id === userId);
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
                  onClick={async () => {
                    await loadEventConfigurations(event.id);
                    setSelectedEvent(event);
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
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Home</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Bienvenido a tu panel de creador
        </p>
      </div>

      {/* Sub-tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('gestion')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'gestion'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="h-5 w-5 inline mr-2" />
              Gestión
            </button>
            <button
              onClick={() => setActiveTab('calendario')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendario'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Calendar className="h-5 w-5 inline mr-2" />
              Calendario
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'gestion' && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {quickStats.map((stat, index) => (
          <div key={index} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-3 sm:p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-5 w-5 sm:h-8 sm:w-8 text-indigo-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-lg sm:text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Notifications */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Bell className="h-5 w-5 mr-2 text-indigo-600" />
                    Notificaciones
                  </h3>
                  <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                    {notifications.filter(n => !n.read).length} nuevas
                  </span>
                </div>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        notification.read 
                          ? 'bg-gray-50 border-gray-200' 
                          : 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="ml-3 flex-1">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-700' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className={`text-sm mt-1 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-indigo-600" />
                  Actividad Reciente
                </h3>
                
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No hay actividad reciente
                    </p>
                  ) : (
                    recentActivity.map((activity, index) => {
                      const now = new Date();
                      const activityDate = new Date(activity.timestamp);
                      const diffInMs = now.getTime() - activityDate.getTime();
                      const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
                      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
                      
                      let timeText = '';
                      if (diffInDays > 0) {
                        timeText = `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
                      } else if (diffInHours > 0) {
                        timeText = `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
                      } else {
                        timeText = 'Hace menos de 1 hora';
                      }
                      
                      return (
                        <div key={index} className="flex items-start">
                          <div className="flex-shrink-0">
                            <div className="h-2 w-2 bg-indigo-600 rounded-full mt-2"></div>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm text-gray-700">{activity.text}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {timeText}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* System Updates */}
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Home className="h-5 w-5 mr-2 text-indigo-600" />
                  Actualizaciones del Sistema
                </h3>
                
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {systemUpdates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No hay actualizaciones del sistema disponibles
                    </p>
                  ) : (
                    systemUpdates.map((update) => (
                      <div key={update.id} className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <div className="flex items-start">
                          <div className="flex-shrink-0 mt-0.5">
                            <Home className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {update.title}
                            </p>
                            <p className="text-sm text-gray-700 mt-1">
                              {update.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(update.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendario' && (
        <>
          {/* Calendar Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-500 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-blue-100 truncate">
                        Total Eventos
                      </dt>
                      <dd className="text-3xl font-bold text-white">
                        {events ? events.filter(e => {
                          const creatorUsers = users?.filter(u => u.createdBy === user?.id) || [];
                          return creatorUsers.some(u => u.id === e.created_by);
                        }).length : 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-500 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-green-100 truncate">
                        Este Mes
                      </dt>
                      <dd className="text-3xl font-bold text-white">
                        {events ? events.filter(e => {
                          const creatorUsers = users?.filter(u => u.createdBy === user?.id) || [];
                          const eventDate = new Date(e.date);
                          const now = new Date();
                          return creatorUsers.some(u => u.id === e.created_by) &&
                                 eventDate.getMonth() === now.getMonth() &&
                                 eventDate.getFullYear() === now.getFullYear();
                        }).length : 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-500 overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-purple-100 truncate">
                        Próxima Semana
                      </dt>
                      <dd className="text-3xl font-bold text-white">
                        {events ? events.filter(e => {
                          const creatorUsers = users?.filter(u => u.createdBy === user?.id) || [];
                          const eventDate = new Date(e.date);
                          const now = new Date();
                          const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                          return creatorUsers.some(u => u.id === e.created_by) &&
                                 eventDate >= now && eventDate <= nextWeek;
                        }).length : 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Calendario de Eventos de tus Usuarios
                </h3>
                <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                </h2>
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-0 border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
                <div key={day} className="bg-gray-50 p-2 text-center text-xs font-medium text-gray-500 border-b border-gray-200">
                  {day}
                </div>
              ))}
              
              {/* Calendar Days */}
              {renderCalendar()}
            </div>
          </div>
        </div>
        </>
      )}

      {/* Event Details Modal */}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Nombre del Evento</h4>
                  <p className="text-sm text-gray-900">{selectedEvent.name}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Fecha</h4>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedEvent.date).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Invitados</h4>
                  <p className="text-sm text-gray-900">{selectedEvent.guest_count}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Ubicación</h4>
                  <p className="text-sm text-gray-900">{selectedEvent.location}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Creado por</h4>
                  <p className="text-sm text-gray-900">
                    {getUserById(selectedEvent.created_by)?.company || 'Usuario desconocido'}
                  </p>
                </div>
              </div>

              {/* Estado de Configuraciones */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Estado de Configuraciones</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tarjeta Interactiva:</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      eventConfigurations[selectedEvent.id]?.hasCard ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {eventConfigurations[selectedEvent.id]?.hasCard ? '✓ Creada' : '✗ No creada'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tarjeta de Finalización:</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      eventConfigurations[selectedEvent.id]?.isFinalized ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {eventConfigurations[selectedEvent.id]?.isFinalized ? '✓ Creada' : '✗ No creada'}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">EventBook:</span>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      eventConfigurations[selectedEvent.id]?.hasEventBook ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {eventConfigurations[selectedEvent.id]?.hasEventBook ? '✓ Creado' : '✗ No creado'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Event Features */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Moderador</h4>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    eventConfigurations[selectedEvent.id]?.hasModerator ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {eventConfigurations[selectedEvent.id]?.hasModerator ? 'Sí' : 'No'}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-1">Control de Acceso</h4>
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    eventConfigurations[selectedEvent.id]?.hasAccessControl ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {eventConfigurations[selectedEvent.id]?.hasAccessControl ? 'Sí' : 'No'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
