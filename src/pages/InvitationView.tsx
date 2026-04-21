import React from 'react';
import { useParams } from 'react-router-dom';
import { storage } from '../lib/storage';
import { finalizationStorage } from '../lib/finalization-storage';
import { getInvitationByQrCodeAPI, updateInvitationGuestByQrCodeAPI } from '../endpoints/invitation';
import { InvitationCard } from '../components/InvitationCard';
import { GuestDataForm } from '../components/GuestDataForm';
import { GuestFinalizationView } from '../components/GuestFinalizationView';
import type { Event, Guest, EventCard, EventFinalization } from '../types/event';

export function InvitationView() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [guest, setGuest] = React.useState<Guest | null>(null);
  const [event, setEvent] = React.useState<Event | null>(null);
  const [eventCard, setEventCard] = React.useState<EventCard | null>(null);
  const [showDataForm, setShowDataForm] = React.useState(true);
  const [finalization, setFinalization] = React.useState<EventFinalization | null>(null);

  React.useEffect(() => {
    if (qrCode) {
      loadGuestData();
    }
  }, [qrCode]);

  const formatDateForInput = (isoDate: string): string => {
    if (!isoDate) return '';
    try {
      const date = new Date(isoDate);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const mapApiEventToLocal = (apiEvent: any): Event => ({
    id: String(apiEvent.id),
    name: apiEvent.name,
    date: formatDateForInput(apiEvent.start_at),
    location: apiEvent.location,
    contractor_name: apiEvent.host_name,
    guest_count: apiEvent.guest_count,
    created_at: apiEvent.created_at,
    created_by: String(apiEvent.user_id || ''),
    logo_url: apiEvent.logo || undefined,
    qr_access_active: !!apiEvent.qr_access_active,
    is_finalized: !!apiEvent.is_finalized,
    status: apiEvent.status,
    pre_activation_message: apiEvent.pre_activation_message,
    welcome_message: apiEvent.welcome_message,
    rejection_message: apiEvent.rejection_message,
  });

  const mapApiGuestToLocal = (apiGuest: any, eventId: string): Guest => ({
    id: String(apiGuest.id),
    event_id: String(apiGuest.event_id ?? eventId),
    name: apiGuest.name || '',
    guest_number: Number(apiGuest.guest_number) || 0,
    table_number: apiGuest.table_number ? Number(apiGuest.table_number) : undefined,
    email: apiGuest.email || undefined,
    phone: apiGuest.phone || undefined,
    qr_code: String(apiGuest.qr_code || ''),
    created_at: apiGuest.created_at || new Date().toISOString(),
    confirmation_status: (apiGuest.confirmation_status as any) || 'not confirmed',
    health_info: apiGuest.health_information || '',
    dietary_restrictions: apiGuest.health_information || '',
    mobility_restrictions: apiGuest.transportation_status || '',
    health_form_submitted: !!(apiGuest.health_information != null && apiGuest.health_information !== ''),
    mobility_form_submitted: !!(apiGuest.transportation_status != null && apiGuest.transportation_status !== ''),
    qr_code_status: apiGuest.qr_code_status ?? undefined,
    video_status: apiGuest.video_status ?? undefined,
    video_url: apiGuest.video_url || undefined,
    status: apiGuest.status || undefined,
  });

  const mapApiCardToLocal = (apiCard: any, eventId: string): EventCard => ({
    id: apiCard.id,
    bolt_event_id: Number(apiCard.bolt_event_id ?? eventId),
    event_id: String(eventId),
    event_type: apiCard.event_type || 'wedding',
    card_model: apiCard.card_model || 'cover',
    background_option: apiCard.background_option ?? 1,
    main_image: apiCard.main_image || '',
    gallery_images: apiCard.gallery_images || [],
    event_name: apiCard.event_name || '',
    event_location: apiCard.event_location || '',
    event_recommendations: apiCard.event_recommendations || [],
    event_schedule: apiCard.event_schedule || [],
    include_health_form: !!apiCard.include_health_form,
    include_mobility_form: !!apiCard.include_mobility_form,
    show_contact_footer: !!apiCard.show_contact_footer,
    contact_message: apiCard.contact_message || undefined,
    contact_whatsapp: apiCard.contact_whatsapp || undefined,
    contact_email: apiCard.contact_email || undefined,
    facebook_url: apiCard.facebook_url || undefined,
    instagram_url: apiCard.instagram_url || undefined,
    created_at: apiCard.created_at || new Date().toISOString(),
    updated_at: apiCard.updated_at || new Date().toISOString(),
  });

  const mapApiFinalizationToLocal = (apiFinalization: any, eventId: string): EventFinalization => ({
    id: String(apiFinalization.id ?? `auto-${eventId}`),
    event_id: String(apiFinalization.event_id ?? eventId),
    is_finalized: !!apiFinalization.is_finalized,
    final_message: String(apiFinalization.final_message || ''),
    final_title: apiFinalization.final_title || undefined,
    final_subtitle: apiFinalization.final_subtitle || undefined,
    cover_image: apiFinalization.cover_image || undefined,
    video_url: apiFinalization.video_url || undefined,
    video_message: apiFinalization.video_message || undefined,
    whatsapp_number: apiFinalization.whatsapp_number || undefined,
    whatsapp_button_text: apiFinalization.whatsapp_button_text || undefined,
    created_at: apiFinalization.created_at || new Date().toISOString(),
    event_type: apiFinalization.event_type || undefined,
    theme_colors: apiFinalization.theme_colors || undefined,
  });

  const loadGuestData = async () => {
    if (!qrCode) return;

    try {
      setLoading(true);
      setError(null);

      // Prefer backend (QR links are public and should not depend on localStorage)
      try {
        const response = await getInvitationByQrCodeAPI(qrCode);
        const apiGuest = response?.guest;
        const apiEvent = response?.event;
        const apiCard = response?.event_card;
        const apiFinalization = response?.event_finalization;

        if (!apiGuest || !apiEvent) {
          throw new Error('Respuesta incompleta del servidor');
        }

        const mappedEvent = mapApiEventToLocal(apiEvent);
        const mappedGuest = mapApiGuestToLocal(apiGuest, mappedEvent.id);
        const mappedCard = apiCard ? mapApiCardToLocal(apiCard, mappedEvent.id) : null;

        setEvent(mappedEvent);
        setGuest(mappedGuest);
        setEventCard(mappedCard);

        // Finalization comes from backend when event is finalized (public response)
        if (apiFinalization) {
          setFinalization(mapApiFinalizationToLocal(apiFinalization, mappedEvent.id));
        } else {
          setFinalization(null);
        }

        // Decide if we should show data form based on backend guest data
        if (mappedGuest.name && (mappedGuest.email || mappedGuest.phone)) {
          setShowDataForm(false);
        }
      } catch (backendError) {
        // Fallback to local storage (legacy)
        const events = await storage.getEvents();
        let foundGuest: Guest | null = null;
        let foundEvent: Event | null = null;

        for (const ev of events) {
          const guests = await storage.getGuests(ev.id);
          const g = guests.find(gg => gg.qr_code === qrCode);
          if (g) {
            foundGuest = g;
            foundEvent = ev;
            break;
          }
        }

        if (!foundGuest || !foundEvent) {
          setError('Invitación no encontrada. Verifica el enlace o código QR.');
          return;
        }

        try {
          const [card, eventFinalization] = await Promise.all([
            storage.getEventCard(foundEvent.id),
            finalizationStorage.getEventFinalization(foundEvent.id),
          ]);
          setEventCard(card);
          setFinalization(eventFinalization);
        } catch (storageError) {
          console.error('Error loading event data (storage):', storageError);
        }

        setGuest(foundGuest);
        setEvent(foundEvent);
      }

    } catch (error) {
      console.error('Error loading guest data:', error);
      setError('Error al cargar la invitación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDataSubmitted = async (updatedGuest: Partial<Guest>) => {
    if (!qrCode || !guest || !event) return;

    try {
      // Update in backend (public) and sync local state
      // IMPORTANT: for minors, we must clear email/phone so GuestList infers correctly.
      const payload: Record<string, any> = {};
      if (updatedGuest.name !== undefined) payload.name = updatedGuest.name;

      // Age mapping required by backend:
      // - "mayor de 16" => age: 30
      // - "menor de 16" => age: 10
      if (updatedGuest.age_category === 'minor') {
        payload.age = 10;
      } else if (updatedGuest.age_category === 'adult') {
        payload.age = 30;
      }

      if (updatedGuest.age_category === 'minor') {
        payload.email = null;
        payload.phone = null;
      } else {
        if (updatedGuest.email !== undefined) payload.email = updatedGuest.email;
        if (updatedGuest.phone !== undefined) payload.phone = updatedGuest.phone;
      }

      const response = await updateInvitationGuestByQrCodeAPI(qrCode, payload);

      const apiGuest = response?.guest;
      const merged = apiGuest
        ? mapApiGuestToLocal(apiGuest, event.id)
        : ({
            ...guest,
            ...updatedGuest,
            ...(updatedGuest.age_category === 'minor' ? { email: undefined, phone: undefined } : {}),
          } as Guest);
      setGuest(merged);
      setShowDataForm(false);
    } catch (error) {
      console.error('Error updating guest data:', error);
      setError('Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  const handleConfirmAttendance = async (_guestId: string, confirmed: boolean) => {
    if (!qrCode || !guest) return;

    try {
      const response = await updateInvitationGuestByQrCodeAPI(qrCode, {
        confirmation_status: confirmed ? 'confirmed' : 'not confirmed',
      });
      const apiGuest = response?.guest;
      const merged = apiGuest && event ? mapApiGuestToLocal(apiGuest, event.id) : guest;
      setGuest(merged);
    } catch (error) {
      console.error('Error confirming attendance:', error);
    }
  };

  const handleUpdateGuest = async (guestData: Partial<Guest>): Promise<void> => {
    if (!qrCode || !guest) return;

    const payload: Record<string, any> = {};
    if (guestData.name !== undefined) payload.name = guestData.name;
    if (guestData.email !== undefined) payload.email = guestData.email;
    if (guestData.phone !== undefined) payload.phone = guestData.phone;
    if (guestData.health_info !== undefined) payload.health_info = guestData.health_info;
    if (guestData.dietary_restrictions !== undefined) payload.health_info = guestData.dietary_restrictions;
    if (guestData.mobility_restrictions !== undefined) payload.mobility_restrictions = guestData.mobility_restrictions;
    if (guestData.confirmation_status !== undefined) {
      payload.confirmation_status = guestData.confirmation_status;
    }

    if (Object.keys(payload).length === 0) return;

    const response = await updateInvitationGuestByQrCodeAPI(qrCode, payload);
    const apiGuest = response?.guest;
    if (!apiGuest || !event) return;

    const mapped = mapApiGuestToLocal(apiGuest, event.id);
    setGuest((prev) => {
      if (!prev) return prev;
      const next: Guest = { ...prev };
      if (payload.health_info !== undefined) {
        next.dietary_restrictions = mapped.dietary_restrictions ?? prev.dietary_restrictions;
        next.health_info = mapped.health_info ?? prev.health_info;
        next.health_form_submitted = mapped.health_form_submitted ?? prev.health_form_submitted;
      }
      if (payload.mobility_restrictions !== undefined) {
        next.mobility_restrictions = mapped.mobility_restrictions ?? prev.mobility_restrictions;
        next.mobility_form_submitted = mapped.mobility_form_submitted ?? prev.mobility_form_submitted;
      }
      if (payload.name !== undefined) next.name = mapped.name ?? prev.name;
      if (payload.email !== undefined) next.email = mapped.email ?? prev.email;
      if (payload.phone !== undefined) next.phone = mapped.phone ?? prev.phone;
      if (payload.confirmation_status !== undefined) next.confirmation_status = (mapped.confirmation_status ?? prev.confirmation_status) as Guest['confirmation_status'];
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50">
      {loading ? (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando invitación...</p>
          </div>
        </div>
      ) : error ? (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      ) : !guest || !event ? (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="text-gray-400 text-6xl mb-4">🎫</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invitación no encontrada</h2>
            <p className="text-gray-600">No se pudo encontrar la invitación solicitada.</p>
          </div>
        </div>
      ) : finalization?.is_finalized ? (
        <GuestFinalizationView finalization={finalization} />
      ) : showDataForm ? (
        <GuestDataForm
          guest={guest}
          event={event}
          onDataSubmitted={handleDataSubmitted}
        />
      ) : (
        eventCard ? (
          <InvitationCard
            event={event}
            guest={guest}
            eventCard={eventCard}
            onConfirmAttendance={handleConfirmAttendance}
            onUpdateGuest={handleUpdateGuest}
          />
        ) : (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center p-8">
              <div className="text-indigo-500 text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Bienvenido!</h2>
              <p className="text-gray-600 mb-4">Invitado #{guest.guest_number}</p>
              <p className="text-gray-500">La tarjeta de invitación estará disponible pronto.</p>
            </div>
          </div>
        )
      )}
    </div>
  );
} 