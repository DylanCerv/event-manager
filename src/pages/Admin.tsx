import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Bell, X, ArrowLeft, Pencil, Trash2, Calendar, Check, Users, QrCode, MessageSquare } from 'lucide-react';
import { EventForm } from '../components/EventForm';
import { GuestList } from '../components/GuestList';
import { AdminStats } from '../components/AdminStats';
import { InvitationCard } from '../components/InvitationCard';
import { EventCardPreview } from '../components/EventCardPreview';
import { NotificationForm } from '../components/NotificationForm';
import { EventCardForm } from '../components/EventCardForm';
import { QRAccessManager } from '../components/QRAccessManager';
import { EventFinalization } from '../components/EventFinalization';
import { storage } from '../lib/storage';
import { finalizationStorage } from '../lib/finalization-storage';
import { sendWhatsAppMessage } from '../lib/whatsapp';
import type { Event, EventFormData, Guest, EventCard } from '../types/event';

export default function Admin() {
  const navigate = useNavigate();
  const [showEventForm, setShowEventForm] = React.useState(false);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showNotificationForm, setShowNotificationForm] = React.useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = React.useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);
  const [editingEvent, setEditingEvent] = React.useState<Event | null>(null);
  const [userGuests, setUserGuests] = React.useState<Guest[]>([]);
  const [eventCard, setEventCard] = React.useState<EventCard | null>(null);
  const [showCardForm, setShowCardForm] = React.useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [showFullView, setShowFullView] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<EventCard | null>(null);
  const [activeTab, setActiveTab] = React.useState<'guests' | 'cards' | 'qr-access' | 'finalization'>('guests');
  const [eventStatuses, setEventStatuses] = React.useState<Record<string, {
    qrAccessActive: boolean;
    isFinalized: boolean;
    guestCount: number;
  }>>({});

  React.useEffect(() => {
    fetchEvents();
    fetchUserGuests();
  }, []);

  React.useEffect(() => {
    const loadEventStatuses = async () => {
      const statuses: Record<string, {
        qrAccessActive: boolean;
        isFinalized: boolean;
        guestCount: number;
      }> = {};

      for (const event of events) {
        try {
          const [accessSettings, finalization, eventGuests] = await Promise.all([
            storage.getAccessSettings(event.id),
            finalizationStorage.getEventFinalization(event.id),
            storage.getGuests(event.id)
          ]);

          statuses[event.id] = {
            qrAccessActive: accessSettings?.is_active || false,
            isFinalized: finalization?.is_finalized || false,
            guestCount: eventGuests.length
          };
        } catch (error) {
          console.error(`Error loading status for event ${event.id}:`, error);
        }
      }

      setEventStatuses(statuses);
    };

    if (events.length > 0) {
      loadEventStatuses();
    }
  }, [events]);

  React.useEffect(() => {
    const handleStorageUpdate = async (e: CustomEvent<{ type: string; eventId: string }>) => {
      const { type, eventId } = e.detail;
      
      try {
        const [accessSettings, finalization, eventGuests] = await Promise.all([
          storage.getAccessSettings(eventId),
          finalizationStorage.getEventFinalization(eventId),
          storage.getGuests(eventId)
        ]);

        setEventStatuses(prev => ({
          ...prev,
          [eventId]: {
            qrAccessActive: accessSettings?.is_active || false,
            isFinalized: finalization?.is_finalized || false,
            guestCount: eventGuests.length
          }
        }));
      } catch (error) {
        console.error(`Error updating event status for ${eventId}:`, error);
      }
    };

    window.addEventListener('storage_update', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage_update', handleStorageUpdate as EventListener);
  }, []);

  const fetchUserGuests = async () => {
    try {
      // Get all guests for the current user's events only
      const userEvents = await storage.getEvents();
      let allUserGuests: Guest[] = [];
      
      for (const event of userEvents) {
        const eventGuests = await storage.getGuests(event.id);
        allUserGuests = [...allUserGuests, ...eventGuests];
      }
      
      setUserGuests(allUserGuests);
    } catch (error) {
      console.error('Error fetching user guests:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const events = await storage.getEvents();
      setEvents(events.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchGuests = async (eventId: string) => {
    try {
      const guests = await storage.getGuests(eventId);
      setGuests(guests.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ));
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const handleCreateEvent = async (data: EventFormData) => {
    try {
      setIsLoading(true);
      console.log('Admin - Creating event with data:', data);

      const event = await storage.createEvent(data);
      console.log('Admin - Event created successfully:', event);
      
      await storage.createGuests(event.id, data.guest_count);
      console.log('Admin - Guests created successfully');

      // Refresh events list and close modal
      await fetchEvents();
      await fetchUserGuests();
      setShowEventForm(false);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error al crear el evento: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateGuest = async (guest: Guest) => {
    try {
      await storage.updateGuest(guest);
      // Refresh guest list
      if (selectedEvent) {
        await fetchGuests(selectedEvent.id);
      }
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  const handleUpdateEvent = async (data: EventFormData) => {
    try {
      setIsLoading(true);
      if (!editingEvent) return;

      const updatedEvent = {
        ...editingEvent,
        ...data,
      };

      const events = await storage.getEvents();
      const updatedEvents = events.map(event => 
        event.id === editingEvent.id ? updatedEvent : event
      );
      storage.setItem('events', updatedEvents);

      await fetchEvents();
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await storage.deleteEvent(eventId);
      await fetchEvents();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert(`Error al eliminar el evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const getDaysRemaining = (date: string) => {
    // Parse the event date and normalize to midnight
    const eventDate = new Date(date);
    const today = new Date();
    
    // Set both dates to midnight to compare only dates, not times
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = eventDateOnly.getTime() - todayOnly.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEventSelect = async (event: Event) => {
    navigate(`/events/${event.id}`);
  };

  const handleSendNotification = async (message: string) => {
    try {
      setIsLoading(true);
      // Get selected guests with phone numbers
      const guestsWithPhone = guests
        .filter(guest => selectedGuestIds.includes(guest.id))
        .filter(guest => guest.phone);

      // Generate WhatsApp links and open them
      for (const guest of guestsWithPhone) {
        try {
          const whatsappUrl = await sendWhatsAppMessage(guest.phone!, message);
          window.open(whatsappUrl, '_blank');
        } catch (error) {
          console.error(`Error sending WhatsApp message to ${guest.name}:`, error);
        }
      }

      setShowNotificationForm(false);
      setSelectedGuestIds([]);
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCard = () => {
    setEditingCard(eventCard);
    setShowCardForm(true);
  };

  const handleSaveEventCard = async (cardData: Omit<EventCard, 'id' | 'created_at'>) => {
    try {
      setIsLoading(true);
      const savedCard = await storage.saveEventCard({
        ...cardData,
        event_id: selectedEvent!.id,
      });
      setEventCard(savedCard);
      setShowCardForm(false);
      setEditingCard(null);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error saving event card:', error);
      alert('Error al guardar la tarjeta interactiva');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEventCard = async () => {
    if (!selectedEvent) return;
    
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await storage.deleteEventCard(selectedEvent.id);
      setEventCard(null);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error deleting event card:', error);
      alert('Error al eliminar la tarjeta interactiva');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Gestión de Eventos</h1>
        
        <AdminStats events={events} guests={userGuests} />
        
        <div className="space-y-6">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Crear Nuevo Evento</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Crea un nuevo evento y gestiona todos sus detalles desde un solo lugar.</p>
              </div>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setShowEventForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusCircle className="h-5 w-5 mr-2" />
                  Crear Evento
                </button>
              </div>
            </div>
          </div>

          {events.length > 0 && (
            <div className="bg-white shadow sm:rounded-lg overflow-hidden">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Tus Eventos</h3>
                <div className="mt-4 space-y-6">
                  {events.map((event) => (
                    <div key={event.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-lg font-medium text-gray-900">{event.name}</h4>
                            {(() => {
                              const daysRemaining = getDaysRemaining(event.date);
                              if (daysRemaining < 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    Evento finalizado
                                  </span>
                                );
                              } else if (daysRemaining === 0) {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    ¡HOY!
                                  </span>
                                );
                              } else {
                                return (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <Calendar className="w-3 h-3 mr-1" />
                                    {daysRemaining} días restantes
                                  </span>
                                );
                              }
                            })()}
                            {eventStatuses[event.id]?.isFinalized && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <Check className="w-3 h-3 mr-1" />
                                Finalizado
                              </span>
                            )}
                          </div>
                          <div className="mt-1">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-500">
                                {new Date(event.date).toLocaleDateString()} en {event.location}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  <Users className="w-3 h-3 mr-1" />
                                  {eventStatuses[event.id]?.guestCount || 0} invitados
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  eventStatuses[event.id]?.qrAccessActive
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  <QrCode className="w-3 h-3 mr-1" />
                                  QR Access {eventStatuses[event.id]?.qrAccessActive ? 'Activo' : 'Inactivo'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handleEventSelect(event)}
                            className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Gestionar
                          </button>
                          <div className="flex justify-center space-x-2">
                            <button
                              onClick={() => setEditingEvent(event)}
                              className="inline-flex items-center p-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(event.id)}
                              className="inline-flex items-center p-2 border border-red-300 rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Event Form Modal */}
        {showEventForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Crear Nuevo Evento</h3>
                <button
                  onClick={() => setShowEventForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <EventForm onSubmit={handleCreateEvent} isLoading={isLoading} />
            </div>
          </div>
        )}


        {/* Notification Form Modal */}
        {showNotificationForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Enviar Notificación</h3>
                <button
                  onClick={() => setShowNotificationForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <NotificationForm
                onSend={handleSendNotification}
                selectedCount={selectedGuestIds.length}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}


        {/* Edit Event Modal */}
        {editingEvent && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Editar Evento</h3>
                <button
                  onClick={() => setEditingEvent(null)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <EventForm 
                onSubmit={handleUpdateEvent}
                isLoading={isLoading}
                initialData={{
                  name: editingEvent.name,
                  date: editingEvent.date,
                  location: editingEvent.location,
                  contractor_name: editingEvent.contractor_name,
                  guest_count: editingEvent.guest_count,
                }}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Eliminar Evento
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer
                      
                      y eliminará permanentemente todos los datos de invitados asociados.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(showDeleteConfirm)}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Eliminar
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

export { Admin }