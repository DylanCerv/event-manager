import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, QrCode, MessageSquare, PartyPopper, Check, X, Mail, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';
import { finalizationStorage } from '../lib/finalization-storage';
import { GuestList } from '../components/GuestList';
import { EventCardForm } from '../components/EventCardForm';
import { EventCardPreview } from '../components/EventCardPreview';
import { QRAccessManager } from '../components/QRAccessManager';
import { EventFinalization } from '../components/EventFinalization';
import { NotificationForm } from '../components/NotificationForm';
import { InvitationCard } from '../components/InvitationCard';
import { sendMassiveEmails, type EmailRecipient } from '../lib/email';
import type { Event, Guest, EventCard } from '../types/event';

export function EventManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [event, setEvent] = React.useState<Event | null>(null);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [eventCard, setEventCard] = React.useState<EventCard | null>(null);
  const [activeTab, setActiveTab] = React.useState<'guests' | 'cards' | 'qr-access' | 'finalization'>('guests');
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = React.useState<string[]>([]);
  const [showNotificationForm, setShowNotificationForm] = React.useState(false);
  const [showCardForm, setShowCardForm] = React.useState(false);
  const [editingCard, setEditingCard] = React.useState<EventCard | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [showFullView, setShowFullView] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'desktop' | 'mobile'>('desktop');
  const [eventStatus, setEventStatus] = React.useState({
    qrAccessActive: false,
    isFinalized: false,
    guestCount: 0
  });

  React.useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  React.useEffect(() => {
    const loadEventStatus = async () => {
      if (!event) return;
      
      try {
        const [accessSettings, finalization, eventGuests] = await Promise.all([
          storage.getAccessSettings(event.id),
          finalizationStorage.getEventFinalization(event.id),
          storage.getGuests(event.id)
        ]);

        setEventStatus({
          qrAccessActive: accessSettings?.is_active || false,
          isFinalized: finalization?.is_finalized || false,
          guestCount: eventGuests.length
        });
      } catch (error) {
        console.error(`Error loading status for event ${event.id}:`, error);
      }
    };

    loadEventStatus();
  }, [event]);

  React.useEffect(() => {
    const handleStorageUpdate = async (e: CustomEvent<{ type: string; eventId: string }>) => {
      if (!event || e.detail.eventId !== event.id) return;
      
      try {
        const [accessSettings, finalization, eventGuests] = await Promise.all([
          storage.getAccessSettings(event.id),
          finalizationStorage.getEventFinalization(event.id),
          storage.getGuests(event.id)
        ]);

        setEventStatus({
          qrAccessActive: accessSettings?.is_active || false,
          isFinalized: finalization?.is_finalized || false,
          guestCount: eventGuests.length
        });
      } catch (error) {
        console.error(`Error updating event status:`, error);
      }
    };

    window.addEventListener('storage_update', handleStorageUpdate as EventListener);
    return () => window.removeEventListener('storage_update', handleStorageUpdate as EventListener);
  }, [event]);

  const loadEvent = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      const events = await storage.getEvents();
      const foundEvent = events.find(e => e.id === id);
      
      if (!foundEvent) {
        navigate('/events');
        return;
      }

      setEvent(foundEvent);
      await fetchGuests(foundEvent.id);
      
      try {
        const card = await storage.getEventCard(foundEvent.id);
        setEventCard(card);
      } catch (error) {
        console.error('Error fetching event card:', error);
      }
    } catch (error) {
      console.error('Error loading event:', error);
      navigate('/events');
    } finally {
      setIsLoading(false);
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

  const handleUpdateGuest = async (guest: Guest) => {
    try {
      await storage.updateGuest(guest);
      if (event) {
        await fetchGuests(event.id);
      }
    } catch (error) {
      console.error('Error updating guest:', error);
    }
  };

  const handleSendEmails = async (message: string, additionalEmails: string[]) => {
    try {
      setIsLoading(true);
      
      // Obtener emails de invitados seleccionados
      const guestsWithEmail = guests
        .filter(guest => selectedGuestIds.includes(guest.id))
        .filter(guest => guest.email);

      // Combinar emails de invitados + emails adicionales
      const recipients: EmailRecipient[] = [
        ...guestsWithEmail.map(guest => ({ 
          email: guest.email!, 
          name: guest.name || `Invitado #${guest.guest_number}` 
        })),
        ...additionalEmails.map(email => ({ 
          email: email.trim(), 
          name: 'Invitado adicional' 
        }))
      ];

      if (recipients.length === 0) {
        alert('No hay destinatarios con emails válidos.');
        return;
      }

      // Enviar emails masivos
      const subject = `Invitación a ${event?.name || 'nuestro evento'}`;
      const results = await sendMassiveEmails(recipients, subject, message);

      // Mostrar resultados
      if (results.failed === 0) {
        alert(`¡Emails enviados exitosamente a ${results.success} destinatario${results.success !== 1 ? 's' : ''}! 🎉`);
      } else {
        alert(`Envío completado:\n✅ ${results.success} exitosos\n❌ ${results.failed} fallidos\n\nRevisa la consola para más detalles.`);
      }

      setShowNotificationForm(false);
      setSelectedGuestIds([]);
    } catch (error) {
      console.error('Error enviando emails:', error);
      alert('Error al enviar emails. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEventCard = async (cardData: Omit<EventCard, 'id' | 'created_at'>) => {
    if (!event) return;
    
    try {
      setIsLoading(true);
      const savedCard = await storage.saveEventCard({
        ...cardData,
        event_id: event.id,
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

  const handleEditCard = () => {
    console.log('🔍 EventManagement - eventCard antes de editar:', eventCard);
    console.log('🔍 EventManagement - recommendation_items:', eventCard?.recommendation_items);
    setEditingCard(eventCard);
    setShowCardForm(true);
  };

  const handleDeleteEventCard = async () => {
    if (!event) return;
    
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      await storage.deleteEventCard(event.id);
      setEventCard(null);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error deleting event card:', error);
      alert('Error al eliminar la tarjeta interactiva');
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

  if (isLoading && !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Evento no encontrado</h2>
          <button
            onClick={() => navigate('/events')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Eventos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate('/events')}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-2"
                >
                  <ArrowLeft className="h-6 w-6" />
                </button>
                <div>
                  <div className="flex items-center space-x-3">
                    <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {(() => {
                        const daysRemaining = getDaysRemaining(event.date);
                        if (daysRemaining < 0) {
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
                    {eventStatus.isFinalized && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Check className="w-3 h-3 mr-1" />
                        Finalizado
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-500">
                    <span>{new Date(event.date).toLocaleDateString()} en {event.location}</span>
                    <span>•</span>
                    <span className="inline-flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {eventStatus.guestCount} invitados
                    </span>
                    <span>•</span>
                    <span className={`inline-flex items-center ${
                      eventStatus.qrAccessActive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <QrCode className="w-4 h-4 mr-1" />
                      QR Access {eventStatus.qrAccessActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
              {activeTab === 'guests' && (
                <button
                  onClick={() => setShowNotificationForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  disabled={!selectedGuestIds.length}
                >
                  <Mail className="h-5 w-5 mr-2" />
                  E-mails Masivos
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white shadow rounded-lg mb-6 relative">
            <div className="border-b border-gray-200 relative">
              {/* Left fade indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none opacity-0 transition-opacity duration-300" id="left-fade" />
              
              {/* Right fade indicator */}
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none opacity-100 transition-opacity duration-300" id="right-fade" />
              
              <nav 
                className="-mb-px flex space-x-8 px-6 overflow-x-auto scrollbar-hide scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                onScroll={(e) => {
                  const target = e.target as HTMLElement;
                  const leftFade = document.getElementById('left-fade');
                  const rightFade = document.getElementById('right-fade');
                  
                  if (leftFade && rightFade) {
                    // Show/hide left fade based on scroll position
                    leftFade.style.opacity = target.scrollLeft > 0 ? '1' : '0';
                    
                    // Show/hide right fade based on remaining scroll
                    const isAtEnd = target.scrollLeft >= (target.scrollWidth - target.clientWidth - 1);
                    rightFade.style.opacity = isAtEnd ? '0' : '1';
                  }
                }}
              >
                <button
                  onClick={() => setActiveTab('guests')}
                  className={`flex-shrink-0 ${
                    activeTab === 'guests'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Users className="h-5 w-5 mr-2" />
                  Lista de Invitados
                </button>
                <button
                  onClick={() => setActiveTab('cards')}
                  className={`flex-shrink-0 ${
                    activeTab === 'cards'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  Tarjetas Interactivas
                </button>
                <button
                  onClick={() => setActiveTab('qr-access')}
                  className={`flex-shrink-0 ${
                    activeTab === 'qr-access'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <QrCode className="h-5 w-5 mr-2" />
                  QR Access
                </button>
                <button
                  onClick={() => setActiveTab('finalization')}
                  className={`flex-shrink-0 ${
                    activeTab === 'finalization'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <PartyPopper className="h-5 w-5 mr-2" />
                  Finalización
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              {showSuccessMessage && (
                <div className="rounded-md bg-green-50 p-4 mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800">
                        ¡La tarjeta de invitación ha sido guardada exitosamente!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'guests' && (
                <GuestList 
                  guests={guests} 
                  onUpdateGuest={handleUpdateGuest}
                  onSelectionChange={setSelectedGuestIds}
                />
              )}

              {activeTab === 'cards' && (
                <div className="space-y-6">
                  {showCardForm ? (
                    <div className="max-w-2xl mx-auto">
                      <EventCardForm
                        eventId={event.id}
                        onSubmit={handleSaveEventCard}
                        isLoading={isLoading}
                        initialData={editingCard || undefined}
                      />
                    </div>
                  ) : eventCard ? (
                    <div className="max-w-2xl mx-auto">
                      <EventCardPreview
                        card={eventCard}
                        onEdit={handleEditCard}
                        onFullView={() => setShowFullView(true)}
                        onDelete={handleDeleteEventCard}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-gray-500">No hay tarjeta interactiva creada</p>
                      <button
                        onClick={() => setShowCardForm(true)}
                        className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Crear Tarjeta
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'qr-access' && (
                <QRAccessManager
                  eventId={event.id}
                  guests={guests}
                  onUpdateGuest={handleUpdateGuest}
                />
              )}

              {activeTab === 'finalization' && (
                <EventFinalization event={event} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Form Modal */}
      {showNotificationForm && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">E-mails Masivos</h3>
              <button
                onClick={() => setShowNotificationForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <NotificationForm
              onSend={handleSendEmails}
              selectedCount={selectedGuestIds.length}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* Full View Modal */}
      {showFullView && eventCard && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className={viewMode === 'mobile' 
            ? "max-w-sm w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg" 
            : "max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg"
          }>
            <div className="sticky top-0 z-50 bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center shadow-sm">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-medium text-gray-900">Vista Previa</h3>
                <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('desktop')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'desktop'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Monitor className="h-4 w-4" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setViewMode('mobile')}
                    className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'mobile'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Smartphone className="h-4 w-4" />
                    <span>Móvil</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowFullView(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <InvitationCard
                event={event}
                eventCard={eventCard}
                guest={{
                  id: 'preview',
                  event_id: event.id,
                  name: 'Invitado de Ejemplo',
                  guest_number: 100,
                  confirmed: false,
                  attended: false,
                  qr_code: 'preview',
                  created_at: new Date().toISOString(),
                }}
                onConfirmAttendance={() => {}}
                onUpdateGuest={() => {}}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}