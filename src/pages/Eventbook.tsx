import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Plus, 
  Check, 
  Settings, 
  Trash2, 
  ExternalLink, 
  Lock, 
  Share2, 
  Power, 
  Users, 
  MessageSquare, 
  Image, 
  Clock, 
  Palette, 
  Info, 
  Link, 
  Clipboard, 
  Mail, 
  Facebook, 
  Instagram, 
  MessageCircle, 
  Download,
  AlertTriangle,
  Shield,
  QrCode 
} from 'lucide-react';
import type { EventBook } from '../types/eventbook';
import { isEventBookClosed, checkAndProcessExpiredEventBooks, downloadEventBookBackup, generateEventBookPDF } from '../lib/eventbook-backup';
import type { Event } from '../types/event';
import type { UserAccess } from '../types/roles';
import { eventBookStorage } from '../lib/eventbook-storage';
import { storage } from '../lib/storage';
import { rolesStorage } from '../lib/roles-storage';
import { EventBookQRCode } from '../components/EventBookQRCode';

type TabType = 'config' | 'activation' | 'share' | 'backup';

export function Eventbook() {
  const [eventBooks, setEventBooks] = React.useState<EventBook[]>([]);
  const [availableEvents, setAvailableEvents] = React.useState<Event[]>([]);
  const [allEvents, setAllEvents] = React.useState<Event[]>([]);
  const [allUserAccesses, setAllUserAccesses] = React.useState<UserAccess[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedEventBook, setSelectedEventBook] = React.useState<EventBook | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<TabType>('config');
  const [newEventBook, setNewEventBook] = React.useState({
    name: '',
    maxParticipants: 100,
    event_id: ''
  });


  React.useEffect(() => {
    loadEventBooks();
    checkExpiredEventBooks();
  }, []);

  // Función para verificar EventBooks expirados
  const checkExpiredEventBooks = async () => {
    try {
      const expiredEventBooks = await checkAndProcessExpiredEventBooks();
      
      if (expiredEventBooks.length > 0) {
        // Mostrar notificación de EventBooks cerrados
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded max-w-sm z-50';
        notification.innerHTML = `
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm font-medium">
                ${expiredEventBooks.length} EventBook${expiredEventBooks.length > 1 ? 's' : ''} cerrado${expiredEventBooks.length > 1 ? 's' : ''} automáticamente
              </p>
              <p class="text-xs mt-1">
                Backup${expiredEventBooks.length > 1 ? 's' : ''} generado${expiredEventBooks.length > 1 ? 's' : ''} y disponible${expiredEventBooks.length > 1 ? 's' : ''} para descarga
              </p>
            </div>
          </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover notificación después de 8 segundos
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 8000);
        
        // Recargar EventBooks para mostrar el estado actualizado
        setTimeout(() => {
          loadEventBooks();
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking expired EventBooks:', error);
    }
  };

  // Cargar eventos disponibles solo después de que se carguen los EventBooks
  React.useEffect(() => {
    if (eventBooks.length >= 0) { // >= 0 para manejar el caso de 0 EventBooks también
      loadAvailableEvents();
    }
  }, [eventBooks]);

  const loadEventBooks = async () => {
    try {
      const books = await eventBookStorage.getEventBooksByUser();
      
      // Obtener información de moderadores asignados
      const userAccesses = await rolesStorage.getUserAccesses('all');
      setAllUserAccesses(userAccesses);
      
      // Obtener estadísticas reales para cada EventBook
      const booksWithStats = await Promise.all(
        books.map(async (book) => {
          try {
            // Obtener posts del EventBook
            const posts = await eventBookStorage.getAllPosts(book.id);
            
            // Obtener invitados del EventBook
            const { guestStorage } = await import('../lib/guest-storage');
            const guests = guestStorage.getAllGuests(book.id);
            
            // Contar fotos en los posts
            const photoCount = posts.reduce((count, post) => {
              return count + (post.mediaFiles?.filter(media => media.type === 'image').length || 0);
            }, 0);
            
            // Actualizar estadísticas
            return {
              ...book,
              stats: {
                participants: guests.length,
                posts: posts.length,
                photos: photoCount,
                reported: book.stats?.reported || 0
              }
            };
          } catch (error) {
            console.error(`Error loading stats for EventBook ${book.id}:`, error);
            return book; // Devolver el libro sin cambios si hay error
          }
        })
      );
      
      setEventBooks(booksWithStats);
    } catch (error) {
      console.error('Error loading EventBooks:', error);
    }
  };

  const loadAvailableEvents = async () => {
    try {
      // Obtener todos los eventos y solicitudes QR/links
      const events = await storage.getEvents();
      const requests = await storage.getEventRequests();
      setAllEvents(events); // Guardar todos los eventos para referencia
      
      // Filtrar eventos que:
      // 1. No han pasado (fecha futura)
      // 2. No tienen ya un EventBook creado
      // 3. No están finalizados
      // 4. Tienen solicitud QR/links aprobada
      const today = new Date();
      const filteredEvents = events.filter((event: Event) => {
        const eventDate = new Date(event.date);
        const hasEventBook = eventBooks.some(book => book.event_id === event.id);
        
        // Nueva condición: verificar que existe solicitud QR/links aprobada
        const hasApprovedQRRequest = requests.some(request => 
          request.event_id === event.id && request.status === 'approved'
        );
        
        // Un evento está disponible si:
        // - Su fecha es futura
        // - No tiene EventBook
        // - Su estado no es 'rejected'
        // - Tiene estado 'approved' o no tiene estado (compatibilidad)
        // - Tiene solicitud QR/links aprobada
        return (
          eventDate > today && 
          !hasEventBook && 
          event.request_status !== 'rejected' &&
          (!event.request_status || event.request_status === 'approved') &&
          hasApprovedQRRequest
        );
      });
      
      setAvailableEvents(filteredEvents);
      
      // Debug: Mostrar información sobre el filtrado
      console.log('Total eventos:', events.length);
      console.log('Total solicitudes QR:', requests.length);
      console.log('Eventos filtrados:', filteredEvents.length);
      console.log('Eventos descartados:', events.filter(e => {
        const eventDate = new Date(e.date);
        const hasEventBook = eventBooks.some(book => book.event_id === e.id);
        const hasApprovedQRRequest = requests.some(request => 
          request.event_id === e.id && request.status === 'approved'
        );
        return !(eventDate > today && !hasEventBook && e.request_status !== 'rejected' && (!e.request_status || e.request_status === 'approved') && hasApprovedQRRequest);
      }).map(e => ({
        nombre: e.name,
        fecha: e.date,
        tieneEventBook: eventBooks.some(book => book.event_id === e.id),
        estado: e.request_status,
        tieneQRAprobado: requests.some(request => 
          request.event_id === e.id && request.status === 'approved'
        )
      })));
    } catch (error) {
      console.error('Error loading available events:', error);
    }
  };

  const handleCreateEventBook = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newEventBook.event_id) {
      alert('Por favor selecciona un evento');
      return;
    }

    // Validación adicional: verificar que no existe ya un EventBook para este evento
    const existingEventBook = eventBooks.find(book => book.event_id === newEventBook.event_id);
    if (existingEventBook) {
      alert(`Ya existe un EventBook para este evento: "${existingEventBook.name}"`);
      return;
    }

    try {
      setIsLoading(true);
      await eventBookStorage.createEventBook({
        ...newEventBook,
        coverImage: 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
        isActive: false,
        moderationEnabled: true,
        settings: {
          functionality: {
            allowPosts: true,
            allowImageUploads: true,
            allowVideoUploads: false,
            allowComments: true,
            allowLikes: true,
            allowReactions: true,
            requirePostApproval: false
          },
          identity: {
            showRealNames: true,
            allowAliases: false,
            allowAnonymous: false
          },
          visibility: {
            openDate: undefined,
            closeDate: (() => {
              // Calcular fecha de cierre automática: 15 días después del evento
              const selectedEvent = availableEvents.find(e => e.id === newEventBook.event_id);
              if (selectedEvent) {
                const eventDate = new Date(selectedEvent.date);
                const closeDate = new Date(eventDate.getTime() + (15 * 24 * 60 * 60 * 1000)); // Sumar 15 días en milisegundos
                return closeDate.toISOString().split('T')[0]; // Formato YYYY-MM-DD
              }
              // Fallback: 15 días desde hoy si no se encuentra el evento
              const fallbackDate = new Date();
              const fallbackCloseDate = new Date(fallbackDate.getTime() + (15 * 24 * 60 * 60 * 1000));
              return fallbackCloseDate.toISOString().split('T')[0];
            })()
          },
          customization: {
            organizerDisplayName: 'Organizador',
            theme: 'light',
            welcomeMessage: '¡Bienvenidos al muro del evento! Comparte tus momentos favoritos.'
          },
          isConfigured: true
        }
      });
      await loadEventBooks();
      await loadAvailableEvents(); // Recargar eventos disponibles
      setShowCreateModal(false);
      setNewEventBook({
        name: '',
        maxParticipants: 100,
        event_id: ''
      });
    } catch (error) {
      console.error('Error creating EventBook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setIsLoading(true);
      await eventBookStorage.deleteEventBook(id);
      await loadEventBooks();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting EventBook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterEventBook = (book: EventBook) => {
    setSelectedEventBook(book);
    // setActiveTab('wall'); // Removed activeTab state
  };

  const handleExitEventBook = () => {
    setSelectedEventBook(null);
    // setActiveTab('wall'); // Removed activeTab state
  };

  const handleUpdateEventBook = async (updates: Partial<EventBook>) => {
    if (!selectedEventBook) return;
    try {
      setIsLoading(true);
      await eventBookStorage.updateEventBook(selectedEventBook.id, updates);
      await loadEventBooks();
    } catch (error) {
      console.error('Error updating EventBook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEventBookStatus = (eventBook: EventBook, event?: Event) => {
    const closeDate = eventBook.settings.visibility?.closeDate;
    const now = new Date();
    
    if (closeDate && new Date(closeDate) < now) {
    return {
      label: 'Cerrado',
      className: 'bg-red-100 text-red-800'
    };
  }
  
  return {
    label: 'Activo',
    className: 'bg-green-100 text-green-800'
  };
};

  // Función para obtener la fecha mínima de cierre (día del evento)
  const getMinCloseDate = (eventDate: string) => {
    if (!eventDate) return '';
    const date = new Date(eventDate);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Función para obtener la fecha máxima de cierre (15 días después del evento)
  const getMaxCloseDate = (eventDate: string) => {
    if (!eventDate) return '';
    const date = new Date(eventDate);
    if (isNaN(date.getTime())) return '';
    const maxDate = new Date(date.getTime() + (15 * 24 * 60 * 60 * 1000)); // Sumar 15 días en milisegundos
    return maxDate.toISOString().split('T')[0];
  };



  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {!selectedEventBook ? (
          <>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900">EventBook</h1>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Crear EventBook
              </button>
            </div>

            {/* Mensaje de bienvenida cuando no hay EventBooks */}
            {eventBooks.length === 0 && (
              <div className="text-center py-12">
                <div className="max-w-2xl mx-auto">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 mb-4">
                    <MessageSquare className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    ¡Crea tu primer EventBook!
                  </h3>
                  <p className="text-gray-500 mb-8">
                    Los EventBooks son muros interactivos donde los invitados pueden compartir fotos, mensajes y momentos especiales durante tus eventos.
                  </p>
                  
                  {/* Características principales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-blue-50 rounded-lg p-6">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Clock className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Control Temporal</h4>
                      <p className="text-sm text-gray-600">
                        Programa cuándo abrir y cerrar el muro. Máximo 15 días después del evento.
                      </p>
                    </div>
                    
                    <div className="bg-green-50 rounded-lg p-6">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Users className="h-5 w-5 text-green-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Fácil Acceso</h4>
                      <p className="text-sm text-gray-600">
                        Los invitados acceden con un enlace simple. No necesitan apps ni registros.
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-6">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <Settings className="h-5 w-5 text-purple-600" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-2">Personalizable</h4>
                      <p className="text-sm text-gray-600">
                        Configura funciones, temas, moderación y mensajes de bienvenida.
                      </p>
                    </div>
                  </div>

                  {/* Pasos para comenzar */}
                  <div className="bg-gray-50 rounded-lg p-6 text-left">
                    <h4 className="font-medium text-gray-900 mb-4 text-center">¿Cómo funciona?</h4>
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-indigo-600">1</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Selecciona un evento</strong> - Solo eventos futuros sin EventBook existente
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-indigo-600">2</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Configura las funciones</strong> - Decide qué pueden hacer los invitados
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-indigo-600">3</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Activa el EventBook</strong> - Los invitados podrán acceder al muro
                        </p>
                      </div>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-xs font-medium text-indigo-600">4</span>
                        </div>
                        <p className="text-sm text-gray-600">
                          <strong>Comparte el enlace</strong> - Los invitados empezarán a interactuar
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de EventBooks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eventBooks.map((book) => (
                <div key={book.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden">
                  {/* Imagen de portada */}
                  <div className="h-48 relative">
                    <img
                      src={book.coverImage}
                      alt={book.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
                    <div className="absolute top-4 right-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isEventBookClosed(book)
                          ? 'bg-red-100 text-red-800'
                          : book.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {isEventBookClosed(book) ? 'Cerrado' : book.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                  {/* Contenido */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{book.name}</h3>
                    
                    {/* Información del evento */}
                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        {book.eventDate}
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        90 invitados
                      </div>
                      {book.settings.visibility?.closeDate && (
                        <div className="flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                          <span className="text-orange-600">
                            Cierra: {new Date(book.settings.visibility.closeDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Estado del EventBook */}
                      <div className="flex items-center justify-between text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isEventBookClosed(book)
                            ? 'bg-red-100 text-red-800'
                            : book.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {isEventBookClosed(book) ? '🔒 Cerrado' : book.isActive ? '🟢 Activo' : '⚫ Inactivo'}
                        </span>
                        {allUserAccesses.some((userAccess: UserAccess) => 
                          userAccess.accessType === 'moderador' && 
                          userAccess.assignedEventBooks?.includes(book.id)
                        ) ? (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            ✅ Moderado
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                            ⚪ Sin Moderar
                          </span>
                        )}
                      </div>

                      {/* Botones */}
                      <div className="pt-4 space-y-2">
                        <button
                          onClick={() => {
                            setSelectedEventBook(book);
                            setSelectedTab('config');
                          }}
                          className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors duration-200"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Entrar
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(book.id)}
                          className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          // Vista de configuración en pantalla completa
          <div className="min-h-screen bg-gray-50">
            {/* Validación de selectedEventBook */}
            {!selectedEventBook ? (
              <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                  <p className="text-gray-500">Cargando EventBook...</p>
                  <button
                    onClick={() => setSelectedEventBook(null)}
                    className="mt-4 text-indigo-600 hover:text-indigo-500"
                  >
                    Volver a la lista
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="bg-white shadow">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                      <div className="flex items-center">
                        <button
                          onClick={() => setSelectedEventBook(null)}
                          className="mr-4 text-gray-400 hover:text-gray-500"
                        >
                          <X className="h-6 w-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedEventBook.name || 'EventBook'}</h2>
                      </div>
                    </div>
                  </div>
                </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                  <button
                    onClick={() => setSelectedTab('config')}
                    className={`${
                      selectedTab === 'config'
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    <Settings className="h-5 w-5 mr-2" />
                    Configuración
                  </button>
                <button
                    onClick={() => setSelectedTab('activation')}
                  className={`${
                      selectedTab === 'activation'
                      ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    <Power className="h-5 w-5 mr-2" />
                    Activación
                </button>
                <button
                    onClick={() => setSelectedTab('share')}
                  className={`${
                      selectedTab === 'share'
                      ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                    <Share2 className="h-5 w-5 mr-2" />
                    Compartir
                </button>
                <button
                    onClick={() => setSelectedTab('backup')}
                  className={`${
                      selectedTab === 'backup'
                      ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } flex whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Backup
                </button>
              </nav>
            </div>

              {/* Tab content */}
              <div className="mt-6">
                {selectedTab === 'config' && (
                  <div className="space-y-8">
                    {/* Mensaje de EventBook Cerrado */}
                    {selectedEventBook && isEventBookClosed(selectedEventBook) && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                        <div className="flex items-center">
                          <Shield className="h-5 w-5 text-red-500 mr-3" />
                          <div>
                            <h3 className="text-lg font-medium text-red-800">EventBook Cerrado</h3>
                            <p className="text-sm text-red-600 mt-1">
                              Este EventBook se cerró automáticamente y no se puede modificar. 
                              Las configuraciones están bloqueadas para preservar la integridad del backup.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Solo mostrar configuraciones si NO está cerrado */}
                    {selectedEventBook && !isEventBookClosed(selectedEventBook) && (
                      <>
                    {/* Opciones de Moderación */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Shield className="h-5 w-5 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Opciones de Moderación</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md">
                          <input
                            type="checkbox"
                            checked={selectedEventBook.settings.functionality?.requirePostApproval || false}
                            onChange={async (e) => {
                              const newSettings = {
                                ...selectedEventBook.settings,
                                functionality: {
                                  ...selectedEventBook.settings.functionality,
                                  requirePostApproval: e.target.checked
                                }
                              };
                              await handleUpdateEventBook({ settings: newSettings });
                              setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                          />
                          <label className="text-sm text-gray-700">
                            Requiere aprobación antes de publicar
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Funcionalidad */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Settings className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Funcionalidad</h3>
                      </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        ['allowPosts', 'Permitir publicaciones'],
                        ['allowImageUploads', 'Permitir subir imágenes'],
                        ['allowVideoUploads', 'Permitir subir videos'],
                        ['allowComments', 'Permitir comentarios'],
                        ['allowLikes', 'Permitir "me gusta"'],
                          ['allowReactions', 'Permitir reacciones']
                      ].map(([key, label]) => (
                          <div key={key} className="flex items-center space-x-3 bg-gray-50 p-3 rounded-md">
                          <input
                            type="checkbox"
                            checked={selectedEventBook.settings.functionality?.[key as keyof typeof selectedEventBook.settings.functionality] || false}
                            onChange={async (e) => {
                              const newSettings = {
                                ...selectedEventBook.settings,
                                functionality: {
                                  ...selectedEventBook.settings.functionality,
                                  [key]: e.target.checked
                                }
                              };
                              await handleUpdateEventBook({ settings: newSettings });
                              setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                            }}
                              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                            <label className="text-sm text-gray-700">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                    {/* Control de Visibilidad */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Control de Visibilidad</h3>
                      </div>
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-md">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de cierre
                          </label>
                          <input
                            type="date"
                            value={selectedEventBook.settings.visibility?.closeDate || ''}
                            min={getMinCloseDate(allEvents.find(e => e.id === selectedEventBook.event_id)?.date || '')}
                            max={getMaxCloseDate(allEvents.find(e => e.id === selectedEventBook.event_id)?.date || '')}
                            onChange={async (e) => {
                              const newSettings = {
                                ...selectedEventBook.settings,
                                visibility: {
                                  ...selectedEventBook.settings.visibility,
                                  closeDate: e.target.value
                                }
                              };
                              await handleUpdateEventBook({ settings: newSettings });
                              setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                            }}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          />
                          <p className="mt-2 text-sm text-gray-500">
                            El EventBook se cerrará automáticamente en esta fecha
                          </p>
                        </div>
                      </div>
                  </div>

                    {/* Personalización */}
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-pink-100 flex items-center justify-center">
                          <Palette className="h-5 w-5 text-pink-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Personalización</h3>
                      </div>
                      <div className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-md">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre del Moderador
                        </label>
                        <input
                            type="text"
                            value={selectedEventBook.settings.customization?.organizerDisplayName || ''}
                            onChange={async (e) => {
                            const newSettings = {
                              ...selectedEventBook.settings,
                                customization: {
                                  ...selectedEventBook.settings.customization,
                                  organizerDisplayName: e.target.value
                                }
                              };
                              await handleUpdateEventBook({ settings: newSettings });
                              setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                            }}
                            placeholder="Ej: Organizador del Evento"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                  </div>

                        <div className="bg-gray-50 p-4 rounded-md">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Imagen de Perfil del Moderador
                          </label>
                          <div className="mt-1 flex items-center space-x-3">
                            {selectedEventBook.settings.customization?.moderatorProfilePhoto ? (
                              <img
                                src={selectedEventBook.settings.customization.moderatorProfilePhoto}
                                alt="Perfil del moderador"
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                <span className="text-purple-600 font-semibold text-sm">
                                  {(selectedEventBook.settings.customization?.organizerDisplayName || 'M').charAt(0)}
                                </span>
                              </div>
                            )}
                            <div className="flex-1">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      if (event.target?.result) {
                                        const newSettings = {
                                          ...selectedEventBook.settings,
                                          customization: {
                                            ...selectedEventBook.settings.customization,
                                            moderatorProfilePhoto: event.target.result as string
                                          }
                                        };
                                        await handleUpdateEventBook({ settings: newSettings });
                                        setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                              />
                              {selectedEventBook.settings.customization?.moderatorProfilePhoto && (
                                <button
                                  onClick={async () => {
                                    const newSettings = {
                                      ...selectedEventBook.settings,
                                      customization: {
                                        ...selectedEventBook.settings.customization,
                                        moderatorProfilePhoto: undefined
                                      }
                                    };
                                    await handleUpdateEventBook({ settings: newSettings });
                                    setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                                  }}
                                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                                >
                                  Eliminar imagen
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-md">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tema
                        </label>
                        <select
                          value={selectedEventBook.settings.customization?.theme || 'light'}
                            onChange={async (e) => {
                            const newSettings = {
                              ...selectedEventBook.settings,
                              customization: {
                                ...selectedEventBook.settings.customization,
                                theme: e.target.value as 'light' | 'dark'
                              }
                            };
                              await handleUpdateEventBook({ settings: newSettings });
                              setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                          }}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        >
                          <option value="light">Claro</option>
                          <option value="dark">Oscuro</option>
                        </select>
                      </div>

                        <div className="bg-gray-50 p-4 rounded-md">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Mensaje de Bienvenida
                        </label>
                        <textarea
                          value={selectedEventBook.settings.customization?.welcomeMessage || ''}
                            onChange={async (e) => {
                            const newSettings = {
                              ...selectedEventBook.settings,
                              customization: {
                                ...selectedEventBook.settings.customization,
                                welcomeMessage: e.target.value
                              }
                            };
                              await handleUpdateEventBook({ settings: newSettings });
                              setSelectedEventBook(prev => prev ? { ...prev, settings: newSettings } : null);
                          }}
                          rows={3}
                            placeholder="Mensaje que verán los invitados al entrar al EventBook"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>

                    {/* Botón de guardar */}
                    <div className="flex justify-end pt-4">
                    <button
                      onClick={async () => {
                          await handleUpdateEventBook({ settings: selectedEventBook.settings });
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded';
                        successMessage.innerHTML = '✅ Configuración guardada';
                        document.body.appendChild(successMessage);
                        setTimeout(() => {
                          document.body.removeChild(successMessage);
                        }, 3000);
                      }}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Guardar cambios
                    </button>
                    </div>
                      </>
                    )}
                  </div>
                )}
                {selectedTab === 'activation' && (
                  <div className="space-y-8">
                    {/* Estado Actual */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                          <Power className="h-5 w-5 text-green-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Estado del EventBook</h3>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex h-3 w-3 rounded-full ${
                                isEventBookClosed(selectedEventBook) ? 'bg-red-500' : 
                                selectedEventBook.isActive ? 'bg-green-500' : 'bg-gray-400'
                              }`}></span>
                              <span className="text-lg font-medium text-gray-900">
                                {isEventBookClosed(selectedEventBook) ? 'EventBook Cerrado' :
                                 selectedEventBook.isActive ? 'EventBook Activo' : 'EventBook Inactivo'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500">
                              {isEventBookClosed(selectedEventBook) 
                                ? 'El EventBook se cerró automáticamente y ya no acepta nuevas interacciones'
                                : selectedEventBook.isActive 
                                ? 'El muro está visible y los invitados pueden interactuar'
                                : 'El muro está oculto y los invitados no pueden acceder'}
                            </p>
                          </div>
                    <button
                      onClick={async () => {
                        const newIsActive = !selectedEventBook.isActive;
                              await handleUpdateEventBook({ isActive: newIsActive });
                              setSelectedEventBook(prev => prev ? { ...prev, isActive: newIsActive } : null);
                              
                        const successMessage = document.createElement('div');
                        successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded';
                        successMessage.innerHTML = newIsActive 
                          ? '✅ EventBook activado con éxito'
                          : '✅ EventBook desactivado';
                        document.body.appendChild(successMessage);
                        setTimeout(() => {
                          document.body.removeChild(successMessage);
                        }, 3000);
                      }}
                      disabled={isEventBookClosed(selectedEventBook)}
                      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                        isEventBookClosed(selectedEventBook)
                          ? 'bg-gray-400 cursor-not-allowed'
                          : selectedEventBook.isActive
                          ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                          : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      } focus:outline-none focus:ring-2 focus:ring-offset-2`}
                    >
                      {isEventBookClosed(selectedEventBook) 
                        ? 'EventBook Cerrado' 
                        : selectedEventBook.isActive ? 'Desactivar EventBook' : 'Activar EventBook'}
                    </button>
                  </div>
                </div>
                        </div>

                    {/* Información Adicional */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Info className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Información</h3>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-md">
                        <div className="flex">
                          <div className="flex-shrink-0">
                            <Info className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              Acerca de la Activación
                            </h3>
                            <div className="mt-2 text-sm text-blue-700 space-y-1">
                              <p>• Al activar el EventBook, los invitados podrán acceder al muro y comenzar a interactuar.</p>
                              <p>• Puedes activar y desactivar el EventBook en cualquier momento.</p>
                              <p>• La desactivación es temporal y no elimina el contenido existente.</p>
                              <p>• El EventBook se cerrará automáticamente en la fecha establecida en la configuración.</p>
                            </div>
                          </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
                {selectedTab === 'share' && (
                  <div className="space-y-8">
                    {/* URL Pública */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Link className="h-5 w-5 text-indigo-600" />
            </div>
                        <h3 className="text-lg font-medium text-gray-900">URL del EventBook</h3>
            </div>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        {isEventBookClosed(selectedEventBook) ? (
                          <div className="text-center py-8">
                            <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                              <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">EventBook Cerrado</h3>
                            <p className="text-sm text-gray-500">
                              Este EventBook se cerró automáticamente y ya no está disponible públicamente.
                              Los invitados no pueden acceder al contenido.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center space-x-3">
                              <input
                                type="text"
                                readOnly
                                value={selectedEventBook.publicUrl}
                                onClick={(e) => e.currentTarget.select()}
                                className="flex-1 block w-full rounded-md border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(selectedEventBook.publicUrl);
                                  const successMessage = document.createElement('div');
                                  successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded';
                                  successMessage.innerHTML = '✅ URL copiada al portapapeles';
                                  document.body.appendChild(successMessage);
                                  setTimeout(() => {
                                    document.body.removeChild(successMessage);
                                  }, 3000);
                                }}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                <Clipboard className="h-4 w-4 mr-2" />
                                Copiar
                              </button>
                            </div>
                            <p className="mt-2 text-sm text-gray-500">
                              Comparte esta URL con los invitados para que puedan acceder al muro del evento
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Código QR - Solo si NO está cerrado */}
                    {selectedEventBook && !isEventBookClosed(selectedEventBook) && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-6">
                          <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                            <QrCode className="h-5 w-5 text-green-600" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">Código QR</h3>
                        </div>

                        <div className="bg-gray-50 p-6 rounded-lg">
                          <EventBookQRCode
                            publicUrl={selectedEventBook.publicUrl}
                            eventBookName={selectedEventBook.name}
                            showDownloadButton={true}
                            size="large"
                            description="Escanea este código QR para acceder directamente al EventBook"
                          />
                        </div>
                      </div>
                    )}

                    {/* Compartir en Redes Sociales - Solo si NO está cerrado */}
                    {selectedEventBook && !isEventBookClosed(selectedEventBook) && (
                      <div className="bg-white rounded-lg p-6 border border-gray-200">
                        <div className="flex items-center space-x-2 mb-6">
                          <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                            <Share2 className="h-5 w-5 text-purple-600" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900">Compartir en Redes Sociales</h3>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <button
                          onClick={() => {
                            window.open(`https://wa.me/?text=${encodeURIComponent(`¡Te invito al muro del evento! ${selectedEventBook.publicUrl}`)}`, '_blank');
                          }}
                          className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                        >
                          <MessageCircle className="h-5 w-5 mr-2 text-green-600" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => {
                            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(selectedEventBook.publicUrl)}`, '_blank');
                          }}
                          className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                        >
                          <Facebook className="h-5 w-5 mr-2 text-blue-600" />
                          Facebook
                        </button>
                          <button
                          onClick={() => {
                            window.location.href = `mailto:?subject=Muro del Evento&body=${encodeURIComponent(`¡Te invito al muro del evento! ${selectedEventBook.publicUrl}`)}`;
                          }}
                          className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                        >
                          <Mail className="h-5 w-5 mr-2 text-gray-600" />
                          Email
                          </button>
                          <button
                          onClick={() => {
                            window.open(`https://www.instagram.com/direct/new?text=${encodeURIComponent(`¡Te invito al muro del evento! ${selectedEventBook.publicUrl}`)}`, '_blank');
                            }}
                          className="flex items-center justify-center px-4 py-3 border border-gray-200 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                          >
                          <Instagram className="h-5 w-5 mr-2 text-pink-600" />
                          Instagram
                          </button>
                      </div>
                    </div>
                    )}
                  </div>
                )}
                {selectedTab === 'backup' && (
                  <div className="space-y-8">
                    {/* Estado del Backup */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <Download className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Estado del Backup</h3>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        {isEventBookClosed(selectedEventBook) && selectedEventBook.backupData?.generated ? (
                          // EventBook cerrado con backup disponible
                          <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Backup completado</p>
                                <p className="text-sm text-gray-500">
                                  Generado el {new Date(selectedEventBook.backupData.generatedAt).toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                              </div>
                              <div className="flex items-center">
                                <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-100 text-green-800">
                                  Disponible
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                                  <Download className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {selectedEventBook.name.replace(/[^a-zA-Z0-9]/g, '_')}_backup.pdf
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Backup visual del EventBook
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={async () => {
                                  try {
                                    await generateEventBookPDF(selectedEventBook);
                                    
                                    const successMessage = document.createElement('div');
                                    successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded';
                                    successMessage.innerHTML = '✅ PDF descargado exitosamente';
                                    document.body.appendChild(successMessage);
                                    setTimeout(() => {
                                      document.body.removeChild(successMessage);
                                    }, 3000);
                                  } catch (error) {
                                    const errorMessage = document.createElement('div');
                                    errorMessage.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded';
                                    errorMessage.innerHTML = '❌ Error al generar PDF';
                                    document.body.appendChild(errorMessage);
                                    setTimeout(() => {
                                      document.body.removeChild(errorMessage);
                                    }, 3000);
                                  }
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center space-x-2"
                              >
                                <Download className="h-4 w-4" />
                                <span>Descargar PDF</span>
                              </button>
                            </div>
                            
                            <div className="mt-4 text-sm text-gray-500">
                              <p>El PDF contiene una vista visual completa del EventBook con todos los posts, comentarios e imágenes.</p>
                            </div>
                          </div>
                        ) : (
                          // EventBook activo - backup pendiente
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Fecha programada de backup</p>
                                <p className="text-sm text-gray-500">{new Date(selectedEventBook.settings.visibility?.closeDate || '').toLocaleDateString('es-ES', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: '2-digit'
                                })}</p>
                              </div>
                              <div className="flex items-center">
                                <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800">
                                  Pendiente
                                </span>
                              </div>
                            </div>
                            <div className="mt-4 text-sm text-gray-500">
                              <p>El backup se realizará automáticamente cuando se alcance la fecha de cierre del EventBook.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Información del Backup */}
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-center space-x-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Info className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">Información del Backup</h3>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            <Check className="h-5 w-5 text-green-500" />
                          </div>
                          <p className="text-sm text-gray-600">
                            Se generará un archivo ZIP con todo el contenido del EventBook (posts, imágenes, comentarios).
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            <Check className="h-5 w-5 text-green-500" />
                          </div>
                          <p className="text-sm text-gray-600">
                            El backup se iniciará automáticamente en la fecha de cierre configurada.
                          </p>
                        </div>
                        <div className="flex items-start space-x-3">
                          <div className="mt-1">
                            <Check className="h-5 w-5 text-green-500" />
                          </div>
                          <p className="text-sm text-gray-600">
                            Una vez completado el backup, el contenido será eliminado del servidor.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Advertencia */}
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <p className="text-sm text-yellow-700">
                            <strong>Importante:</strong> Asegúrate de descargar el backup cuando esté disponible. Una vez eliminado el contenido del servidor, no podrá ser recuperado.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
              </>
            )}
          </div>
        )}

        {/* Modales */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Crear nuevo EventBook</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateEventBook} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Seleccionar Evento
                  </label>
                  <select
                    required
                    value={newEventBook.event_id}
                    onChange={(e) => {
                      const selectedEvent = availableEvents.find(event => event.id === e.target.value);
                      setNewEventBook({
                        ...newEventBook,
                        event_id: e.target.value,
                        name: selectedEvent ? `Muro de ${selectedEvent.name}` : ''
                      });
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Selecciona un evento</option>
                    {availableEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name} - {new Date(event.date).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit'
                        })}
                      </option>
                    ))}
                  </select>
                  {availableEvents.length === 0 && (
                    <p className="mt-2 text-sm text-gray-500">
                      No hay eventos disponibles para crear un EventBook. Los eventos deben tener QR/links aprobados, fecha futura y no tener un EventBook existente.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre del EventBook
                  </label>
                  <div className="mt-1 p-3 bg-indigo-50 border border-indigo-100 rounded-md">
                    <p className="text-lg font-semibold text-indigo-700">
                      {newEventBook.name}
                    </p>
                  </div>
                </div>

                <div>
                  <label htmlFor="maxParticipants" className="block text-sm font-medium text-gray-700">
                    Máximo de Participantes
                  </label>
                  <input
                    type="number"
                    id="maxParticipants"
                    value={newEventBook.maxParticipants}
                    onChange={(e) => setNewEventBook({ ...newEventBook, maxParticipants: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || availableEvents.length === 0}
                    className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isLoading ? 'Creando...' : 'Crear EventBook'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium text-gray-900">Eliminar EventBook</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar este EventBook? Esta acción eliminará todas las fotos y comentarios asociados.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={isLoading}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
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
    </div>
  );
}