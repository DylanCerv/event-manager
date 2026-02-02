import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, QrCode, MessageSquare, PartyPopper, Check, X, Mail, Monitor, Smartphone } from 'lucide-react';
// import { useAuth } from '../contexts/AuthContext';
import { getInteractiveCardByEventId, deleteInteractiveCard } from '../endpoints/interactiveCard';
import { GuestList } from '../components/GuestList';
import { EventCardForm } from '../components/EventCardForm';
import { EventCardPreview } from '../components/EventCardPreview';
import { QRAccessManager } from '../components/QRAccessManager';
import { EventFinalization } from '../components/EventFinalization';
import { NotificationForm } from '../components/NotificationForm';
import { sendMassiveEmails, type EmailRecipient } from '../lib/email';
import type { Event, Guest, EventCard } from '../types/event';
import { updateEventGuestAPI, getEventGuestsByEventIdAPI } from '../endpoints/eventGuest';
import { useEvents } from '../contexts/EventContext';
import { InvitationCard } from '../components/InvitationCard';
import { notify } from '../lib/notify';
import { appConfirm } from '../lib/dialogs';

export function EventManagement() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEventById, refreshEvents } = useEvents();
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [eventCard, setEventCard] = useState<EventCard | null>(null);
  const [activeTab, setActiveTab] = useState<'guests' | 'cards' | 'qr-access' | 'finalization'>('guests');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<EventCard | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showFullView, setShowFullView] = useState(false);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  // Event status is now part of the event object from context

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  // Re-consultar datos al cambiar de tab (evita pantallas vacías sin recargar).
  useEffect(() => {
    if (!event) return;
    if (isLoading) return;

    const run = async () => {
      try {
        if (activeTab === 'guests') {
          await fetchGuests(event.id);
          return;
        }
        if (activeTab === 'cards') {
          try {
            const card = await getInteractiveCardByEventId(event.id);
            setEventCard(card);
          } catch (error) {
            // Si no existe la tarjeta, continuamos sin error al usuario
            console.error('Error fetching event card:', error);
            setEventCard(null);
          }
          return;
        }
        if (activeTab === 'qr-access') {
          await refreshEvents();
          const next = getEventById(event.id);
          if (next) setEvent(next);
          return;
        }
        if (activeTab === 'finalization') {
          await refreshEvents();
          const next = getEventById(event.id);
          if (next) setEvent(next);
        }
      } catch (e) {
        console.error('Error refreshing tab data:', e);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Event status is now handled by the EventContext

  // Storage updates are now handled by the EventContext

  const loadEvent = async () => {
    if (!id) return;
    
    try {
      setIsLoading(true);
      
      // Get event from context
      let foundEvent = getEventById(id);
      if (!foundEvent) {
        await refreshEvents();
        foundEvent = getEventById(id);
      }
      if (!foundEvent) {
        navigate('/events');
        return;
      }

      setEvent(foundEvent);
      await fetchGuests(foundEvent.id);
      
      try {
        const card = await getInteractiveCardByEventId(foundEvent.id);
        setEventCard(card);
      } catch (error) {
        console.error('Error fetching event card:', error);
        // Si no existe la tarjeta, simplemente continuamos sin mostrar error al usuario
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
      // Get event to know how many guests should be
      const eventData = getEventById(eventId);
      if (!eventData) return;
      
      const totalGuestCount = eventData.guest_count;
      
      // Fetch actual guests from API
      const response = await getEventGuestsByEventIdAPI(Number(eventId));
      const actualGuests = response?.data || [];
      console.log('actualGuests', actualGuests);
      
      const normalizeConfirmationStatus = (s: any): Guest['confirmation_status'] => {
        if (s === 'attended' || s === 'confirmed') return s;
        return 'not confirmed';
      };

      // Map API guests to our Guest interface
      const mappedGuests = actualGuests.map((apiGuest: any): Guest => ({
        id: String(apiGuest.id),
        event_id: String(apiGuest.event_id),
        name: apiGuest.name || '',
        guest_number: Number(apiGuest.guest_number) || 0,
        table_number: apiGuest.table_number ? Number(apiGuest.table_number) : undefined,
        email: apiGuest.email || undefined,
        phone: apiGuest.phone || undefined,
        qr_code: apiGuest.qr_code || '',
        qr_code_status: apiGuest.qr_code_status,
        video_status: apiGuest.video_status,
        video_url: apiGuest.video_url || undefined,
        status: apiGuest.status || undefined,
        confirmation_status: normalizeConfirmationStatus(apiGuest.confirmation_status),
        created_at: apiGuest.created_at || new Date().toISOString(),
        health_info: apiGuest.health_information || '',
        mobility_restrictions: apiGuest.transportation_status || '',
        health_form_submitted: !!apiGuest.health_information,
        mobility_form_submitted: !!apiGuest.transportation_status,
        forms_completed: !!apiGuest.health_information && !!apiGuest.transportation_status,
        age_category: apiGuest.age < 18 ? 'minor' : 'adult',
      }));
      
      // Create placeholder guests for the remaining count
      const existingGuestNumbers = new Set(mappedGuests.map((g: Guest) => g.guest_number));
      const placeholderGuests: Guest[] = [];
      
      // Start from 1 (UI shows 001, 002, ...)
      let guestNumber = 1;
      
      // Create placeholder guests until we reach the total count
      while (mappedGuests.length + placeholderGuests.length < totalGuestCount) {
        // Skip guest numbers that already exist
        while (existingGuestNumbers.has(guestNumber)) {
          guestNumber++;
        }
        
        placeholderGuests.push({
          id: `placeholder-${guestNumber}`,
          event_id: eventId,
          name: '',
          guest_number: guestNumber,
          // confirmed: false,
          // attended: false,
          qr_code: '',
          qr_code_status: true,
          video_status: true,
          confirmation_status: 'not confirmed',
          health_info: '',
          mobility_restrictions: '',
          health_form_submitted: false,
          mobility_form_submitted: false,
          forms_completed: false,
          created_at: new Date().toISOString(),
        });
        
        existingGuestNumbers.add(guestNumber);
        guestNumber++;
      }
      
      // Combine actual guests with placeholders and sort by guest number
      const allGuests = [...mappedGuests, ...placeholderGuests];
      allGuests.sort((a, b) => a.guest_number - b.guest_number);
      
      setGuests(allGuests);
    } catch (error) {
      console.error('Error fetching guests:', error);
    }
  };

  const handleUpdateGuest = async (guest: Guest) => {
    try {
      // Prepare common payload for both new and existing guests
      const payload: Record<string, any> = {
        event_id: Number(guest.event_id),
        guest_number: String(guest.guest_number),
      };

      if (guest.name !== undefined) payload.name = guest.name;
      if (guest.email !== undefined) payload.email = guest.email;
      if (guest.phone !== undefined) payload.phone = guest.phone;
      if (guest.table_number !== undefined) payload.table_number = String(guest.table_number);
      if (guest.health_info !== undefined) payload.health_information = guest.health_info;
      if (guest.mobility_restrictions !== undefined) payload.transportation_status = guest.mobility_restrictions;
      // Do not send empty qr_code; backend generates it when missing
      if (guest.qr_code !== undefined && String(guest.qr_code).trim() !== '') payload.qr_code = guest.qr_code;
      if (guest.qr_code_status !== undefined) payload.qr_code_status = guest.qr_code_status;
      if (guest.video_status !== undefined) payload.video_status = guest.video_status;
      if (guest.video_url !== undefined) payload.video_url = guest.video_url;
      if (guest.confirmation_status !== undefined) payload.confirmation_status = guest.confirmation_status;
      if (guest.status !== undefined) payload.status = guest.status;
      if (guest.age_category !== undefined) payload.age = guest.age_category === 'minor' ? 15 : 30;
      
      // Use updateEventGuestAPI with event ID and guest number
      // The backend will create a new guest if it doesn't exist
      const eventId = Number(guest.event_id);
      const guestNumber = guest.guest_number;
      
      // Si es un placeholder, necesitamos actualizar el estado después de la respuesta
      const response = await updateEventGuestAPI(eventId, guestNumber, payload);
      
      // Actualizar el invitado en la lista local con los datos de la respuesta
      const apiGuest = response.data;
      if (apiGuest) {
        const normalizeConfirmationStatus = (s: any): Guest['confirmation_status'] => {
          if (s === 'attended' || s === 'confirmed') return s;
          return 'not confirmed';
        };
        // Mapear la respuesta del API al formato Guest
        const updatedGuest: Guest = {
          id: String(apiGuest.id),
          event_id: String(apiGuest.event_id),
          name: apiGuest.name || '',
          guest_number: Number(apiGuest.guest_number) || 0,
          table_number: apiGuest.table_number ? Number(apiGuest.table_number) : undefined,
          email: apiGuest.email,
          phone: apiGuest.phone,
          // confirmed: apiGuest.confirmation_status === 'confirmed',
          // attended: apiGuest.attended || false,
          // attended_at: apiGuest.check_in_time,
          health_info: apiGuest.health_information || '',
          mobility_restrictions: apiGuest.transportation_status || '',
          qr_code: apiGuest.qr_code || '',
          qr_code_status: apiGuest.qr_code_status,
          video_status: apiGuest.video_status,
          video_url: apiGuest.video_url || undefined,
          confirmation_status: normalizeConfirmationStatus(apiGuest.confirmation_status),
          created_at: apiGuest.created_at || new Date().toISOString(),
          health_form_submitted: !!apiGuest.health_information,
          mobility_form_submitted: !!apiGuest.transportation_status,
          forms_completed: !!apiGuest.health_information && !!apiGuest.transportation_status,
          age_category: apiGuest.age < 18 ? 'minor' : 'adult',
        };
        
        // Actualizar el estado de invitados reemplazando el placeholder
        setGuests(currentGuests => {
          return currentGuests.map(g => 
            g.id === guest.id ? updatedGuest : g
          );
        });
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
        notify.info('No hay destinatarios con emails válidos.');
        return;
      }

      // Enviar emails masivos
      const subject = `Invitación a ${event?.name || 'nuestro evento'}`;
      const results = await sendMassiveEmails(recipients, subject, message);

      // Mostrar resultados
      if (results.failed === 0) {
        notify.success(`¡Emails enviados exitosamente a ${results.success} destinatario${results.success !== 1 ? 's' : ''}!`);
      } else {
        notify.info(`Envío completado:\n✅ ${results.success} exitosos\n❌ ${results.failed} fallidos\n\nRevisa la consola para más detalles.`);
      }

      setShowNotificationForm(false);
      setSelectedGuestIds([]);
    } catch (error) {
      console.error('Error enviando emails:', error);
      notify.error('Error al enviar emails. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCard = () => {
    console.log('🔍 EventManagement - eventCard antes de editar:', eventCard);
    console.log('🔍 EventManagement - recommendation_items:', eventCard?.event_recommendations);
    setEditingCard(eventCard);
    setShowCardForm(true);
  };

  const handleDeleteEventCard = async () => {
    if (!event || !eventCard) return;
    
    const confirmed = await appConfirm({
      title: 'Eliminar tarjeta',
      message: '¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) {
      return;
    }
    
    try {
      setIsLoading(true);
      await deleteInteractiveCard(eventCard.id);
      setEventCard(null);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error deleting event card:', error);
      notify.error('Error al eliminar la tarjeta interactiva');
    } finally {
      setIsLoading(false);
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
                    {event.is_finalized && (
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
                      {event.guest_count} invitados
                    </span>
                    <span>•</span>
                    <span className={`inline-flex items-center ${
                      event.qr_access_active ? 'text-green-600' : 'text-red-600'
                    }`}>
                      <QrCode className="w-4 h-4 mr-1" />
                      QR Access {event.qr_access_active ? 'Activo' : 'Inactivo'}
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
                        isLoading={isLoading}
                        initialData={editingCard || undefined}
                        onSuccess={(savedCard) => {
                          // Asegurar que el card tenga la estructura correcta
                          const formattedCard: EventCard = {
                            ...savedCard,
                            bolt_event_id: Number(event.id),
                            card_model: savedCard.card_model || 'circular',
                            event_schedule: savedCard.event_schedule || [],
                            include_health_form: savedCard.include_health_form || false,
                            include_mobility_form: savedCard.include_mobility_form || false,
                          };
                          
                          setEventCard(formattedCard);
                          setShowCardForm(false);
                          setShowSuccessMessage(true);
                          setTimeout(() => setShowSuccessMessage(false), 3000);
                        }}
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
                  // confirmed: false,
                  // attended: false,
                  qr_code: 'preview',
                  confirmation_status: 'not confirmed',
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