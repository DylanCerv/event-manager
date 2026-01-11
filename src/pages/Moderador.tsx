import React from 'react';
import { Calendar, Users, Clock, Crown, AlertTriangle, Settings, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { eventBookStorage } from '../lib/eventbook-storage';
import type { EventBook } from '../types/eventbook';

export function Moderador() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignedEventBooks, setAssignedEventBooks] = React.useState<EventBook[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);

      // Backend already enforces assigned EventBooks for MODERATOR via scope=assigned
      const assigned = await eventBookStorage.getAllEventBooks();
      setAssignedEventBooks(assigned);
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

  const getEventDateForEventBook = (eventBook: EventBook) => {
    // Buscar en localStorage donde se almacenan los eventos
    try {
      const eventsRaw = localStorage.getItem('events');
      const events = eventsRaw ? JSON.parse(eventsRaw) : [];
      const associatedEvent = events.find((e: any) => e.id === eventBook.event_id);
      return associatedEvent?.date || eventBook.createdAt;
    } catch {
      return eventBook.createdAt;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Welcome Section - Adapted for Moderator */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900">
              Bienvenido, {user?.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Moderador • {new Date().toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Quick Stats - Show only if there are EventBooks */}
        {assignedEventBooks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      <span className="hidden sm:inline">EventBooks Asignados</span>
                      <span className="sm:hidden">EventBooks</span>
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {assignedEventBooks.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      <span className="hidden sm:inline">Total Participantes</span>
                      <span className="sm:hidden">Participantes</span>
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {assignedEventBooks.reduce((total, eb) => total + eb.stats.participants, 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                </div>
                <div className="ml-3 sm:ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      <span className="hidden sm:inline">Posts Reportados</span>
                      <span className="sm:hidden">Reportados</span>
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {assignedEventBooks.reduce((total, eb) => total + eb.stats.reported, 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EventBooks List */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">EventBooks Asignados</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              <span className="hidden sm:inline">Gestiona la moderación de los EventBooks que tienes asignados</span>
              <span className="sm:hidden">Gestiona tus EventBooks asignados</span>
            </p>
          </div>

          <div className="p-4 sm:p-6">
            {assignedEventBooks.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No tenés EventBooks asignados todavía
                </h3>
                <p className="text-gray-500">
                  Cuando un administrador te asigne EventBooks, aparecerán aquí para que puedas moderarlos.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {assignedEventBooks.map((eventBook) => {
                  // Obtener la fecha del evento asociado usando la función helper
                  const eventDate = getEventDateForEventBook(eventBook);
                  const { date, time } = formatDate(eventDate);

                  return (
                    <div key={eventBook.id} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow duration-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                            {eventBook.name}
                          </h3>
                          
                          {eventBook.description && (
                            <p className="text-gray-600 mb-3 sm:mb-4 text-xs sm:text-sm">
                              {eventBook.description}
                            </p>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                            <div className="flex items-center space-x-2 text-gray-600">
                              <div className="flex-shrink-0">
                                <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{date}</p>
                                <p className="text-xs text-gray-500">Fecha del evento</p>
                              </div>
                            </div>

                            {eventBook.settings?.visibility?.closeDate ? (
                              <div className="flex items-center space-x-2 text-gray-600">
                                <div className="flex-shrink-0">
                                  <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm font-medium text-orange-900 truncate">
                                    {new Date(eventBook.settings.visibility.closeDate).toLocaleDateString('es-ES')}
                                  </p>
                                  <p className="text-xs text-orange-600">Cierra</p>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2 text-gray-600">
                                <div className="flex-shrink-0">
                                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{time}</p>
                                  <p className="text-xs text-gray-500">Horario</p>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center space-x-2 text-gray-600">
                              <div className="flex-shrink-0">
                                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900">
                                  {eventBook.stats?.participants || 0} participante{(eventBook.stats?.participants || 0) !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-gray-500">
                                  <span className="hidden sm:inline">Total de participantes</span>
                                  <span className="sm:hidden">Participantes</span>
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2 text-gray-600">
                              <div className="flex-shrink-0">
                                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs sm:text-sm font-medium text-gray-900">
                                  {eventBook.stats?.posts || 0} post{(eventBook.stats?.posts || 0) !== 1 ? 's' : ''}
                                </p>
                                <p className="text-xs text-gray-500">
                                  <span className="hidden sm:inline">Total de posts</span>
                                  <span className="sm:hidden">Posts</span>
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* EventBook Status - Enhanced for Moderator */}
                          <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                              <div className="flex items-center space-x-2">
                                <Crown className="h-4 w-4 text-purple-600" />
                                <span className="text-xs sm:text-sm font-medium text-purple-800">
                                  <span className="hidden sm:inline">Moderación Asignada</span>
                                  <span className="sm:hidden">Asignado</span>
                                </span>
                              </div>
                              <span className="text-xs sm:text-sm text-purple-600 font-medium">
                                Estado: {eventBook.isActive ? 'Activo' : 'Inactivo'}
                              </span>
                            </div>
                            {eventBook.stats.reported > 0 && (
                              <div className="mt-2 flex items-center text-xs sm:text-sm text-orange-600">
                                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                <span>{eventBook.stats.reported} post{eventBook.stats.reported !== 1 ? 's' : ''} reportado{eventBook.stats.reported !== 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Button */}
                      <div className="mt-4 sm:mt-6 flex justify-end">
                        <button
                          onClick={() => navigate(`/moderador/eventbook/${eventBook.id}`)}
                          className="inline-flex items-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transform hover:scale-105 transition-all duration-200 w-full sm:w-auto justify-center sm:justify-start"
                        >
                          <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                          <span className="hidden sm:inline">Gestionar EventBook</span>
                          <span className="sm:hidden">Gestionar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
