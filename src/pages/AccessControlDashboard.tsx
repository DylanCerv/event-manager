import React from 'react';
import { Calendar, MapPin, Users, Clock, Shield, AlertTriangle, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEvents } from '../contexts/EventContext';
import type { Event } from '../types/event';
import type { UserAccess } from '../types/roles';

export function AccessControlDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { events } = useEvents();
  const [userAccess, setUserAccess] = React.useState<UserAccess | null>(null);
  const [assignedEvents, setAssignedEvents] = React.useState<Event[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const API_BASE = import.meta.env.VITE_API_URL as string;
  const getAuthHeaders = (): Record<string, string> => {
    const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  React.useEffect(() => {
    loadUserData();
  }, [user, events]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);

      // Get assigned events from backend (persisted)
      const res = await fetch(`${API_BASE}/access-control/assignments/me`, {
        method: 'GET',
        headers: { Accept: 'application/json', ...getAuthHeaders() },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as any)?.message || 'Error loading assignments');

      const assignedIds = (json as any).data as string[];
      setAssignedEvents(events.filter(evt => assignedIds.includes(evt.id)));
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const getDaysUntilEvent = (dateString: string) => {
    // Parse only the date part to avoid timezone issues
    const eventDate = new Date(dateString);
    const today = new Date();
    
    // Set both dates to midnight to compare only dates, not times
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = eventDateOnly.getTime() - todayOnly.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Welcome Section - Simplified for Access Control */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex-shrink-0">
              <div className="h-12 w-12 sm:h-16 sm:w-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
                <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
                Bienvenido, {user?.name}
              </h1>
              <p className="text-sm sm:text-base text-gray-500 mt-1">
                Control de Acceso • {new Date().toLocaleDateString('es-ES', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats - Show only if there are events */}
        {assignedEvents.length > 0 && (
          <div className="mb-4 sm:mb-6 grid grid-cols-1 gap-3 sm:gap-6 sm:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Eventos Totales
                      </dt>
                      <dd className="text-base sm:text-lg font-semibold text-gray-900">
                        {assignedEvents.length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Próximos Eventos
                      </dt>
                      <dd className="text-base sm:text-lg font-semibold text-gray-900">
                        {assignedEvents.filter(e => getDaysUntilEvent(e.date) >= 0).length}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-3 sm:p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-400" />
                  </div>
                  <div className="ml-3 sm:ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                        Total Invitados
                      </dt>
                      <dd className="text-base sm:text-lg font-semibold text-gray-900">
                        {assignedEvents.reduce((total, event) => total + event.guest_count, 0)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Events Section - Main content for Access Control users */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium text-gray-900">Eventos Asignados</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                {assignedEvents.length} evento{assignedEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {assignedEvents.length === 0 ? (
              <div className="text-center py-16">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-6">
                  <Shield className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-3">
                  No hay eventos asignados
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Aún no tienes eventos asignados para el control de acceso. 
                  Contacta al administrador para que te asigne eventos.
                </p>
              </div>
            ) : (
              assignedEvents.map((event) => {
                const { date, time } = formatDate(event.date);
                const daysUntil = getDaysUntilEvent(event.date);
                const isPastEvent = daysUntil < 0;
                const isToday = daysUntil === 0;
                const isUpcoming = daysUntil > 0;

                return (
                  <div key={event.id} className={`p-8 ${isPastEvent ? 'opacity-60' : ''} hover:bg-gray-50 transition-colors duration-200`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-2xl font-medium text-gray-900">
                            {event.name}
                          </h3>
                          {isToday && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              ¡HOY!
                            </span>
                          )}
                          {isUpcoming && daysUntil <= 7 && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              En {daysUntil} día{daysUntil !== 1 ? 's' : ''}
                            </span>
                          )}
                          {isPastEvent && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Finalizado
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <div className="flex-shrink-0">
                              <Calendar className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{date}</p>
                              <p className="text-xs text-gray-500">Fecha del evento</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-gray-600">
                            <div className="flex-shrink-0">
                              <Clock className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{time}</p>
                              <p className="text-xs text-gray-500">Horario</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-gray-600">
                            <div className="flex-shrink-0">
                              <MapPin className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{event.location}</p>
                              <p className="text-xs text-gray-500">Ubicación</p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 text-gray-600">
                            <div className="flex-shrink-0">
                              <Users className="h-5 w-5 text-indigo-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {event.guest_count} invitado{event.guest_count !== 1 ? 's' : ''}
                              </p>
                              <p className="text-xs text-gray-500">Total de invitados</p>
                            </div>
                          </div>
                        </div>

                        {/* Event Status - Enhanced for Access Control */}
                        <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4 text-indigo-600" />
                              <span className="text-sm font-medium text-indigo-800">
                                Control de Acceso Asignado
                              </span>
                            </div>
                            <span className="text-sm text-indigo-600 font-medium">
                              Contratista: {event.contractor_name}
                            </span>
                          </div>
                          {isPastEvent && (
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              <span>Este evento ya finalizó</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={() => navigate(`/access-control/gestionar/${event.id}`)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:scale-105 transition-all duration-200"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Gestionar Acceso
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}