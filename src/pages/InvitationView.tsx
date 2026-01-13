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
    // Keep compatibility: InvitationCard uses dietary_restrictions, GuestList uses health_info
    health_info: apiGuest.health_information || '',
    dietary_restrictions: apiGuest.health_information || '',
    mobility_restrictions: apiGuest.transportation_status || '',
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

        if (!apiGuest || !apiEvent) {
          throw new Error('Respuesta incompleta del servidor');
        }

        const mappedEvent = mapApiEventToLocal(apiEvent);
        const mappedGuest = mapApiGuestToLocal(apiGuest, mappedEvent.id);
        const mappedCard = apiCard ? mapApiCardToLocal(apiCard, mappedEvent.id) : null;

        setEvent(mappedEvent);
        setGuest(mappedGuest);
        setEventCard(mappedCard);

        // Finalization currently lives in local storage (legacy), keep as best-effort
        try {
          const eventFinalization = await finalizationStorage.getEventFinalization(mappedEvent.id);
          setFinalization(eventFinalization);
        } catch (finalizationError) {
          console.error('Error loading finalization data:', finalizationError);
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

      if (updatedGuest.age_category === 'minor') {
        payload.email = null;
        payload.phone = null;
      } else {
        if (updatedGuest.email !== undefined) payload.email = updatedGuest.email;
        if (updatedGuest.phone !== undefined) payload.phone = updatedGuest.phone;
      }

      // Completing the form implies "confirmed" (unless already attended)
      if (guest.confirmation_status !== 'attended') {
        payload.confirmation_status = 'confirmed';
      }

      const response = await updateInvitationGuestByQrCodeAPI(qrCode, payload);

      const apiGuest = response?.guest;
      const merged = apiGuest
        ? mapApiGuestToLocal(apiGuest, event.id)
        : ({
            ...guest,
            ...updatedGuest,
            ...(guest.confirmation_status !== 'attended' ? { confirmation_status: 'confirmed' as const } : {}),
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

  const handleUpdateGuest = async (guestData: Partial<Guest>) => {
    if (!qrCode || !guest) return;

    try {
      // Only sync known public fields to backend
      const payload: Record<string, any> = {};
      if (guestData.name !== undefined) payload.name = guestData.name;
      if (guestData.email !== undefined) payload.email = guestData.email;
      if (guestData.phone !== undefined) payload.phone = guestData.phone;
      // Keep shape compatible with GuestList: "health_info" + "mobility_restrictions"
      if (guestData.health_info !== undefined) payload.health_info = guestData.health_info;
      if (guestData.dietary_restrictions !== undefined) payload.health_info = guestData.dietary_restrictions;
      if (guestData.mobility_restrictions !== undefined) payload.mobility_restrictions = guestData.mobility_restrictions;
      if (guestData.confirmation_status !== undefined) {
        payload.confirmation_status = guestData.confirmation_status;
      } else if (guest.confirmation_status !== 'attended') {
        // Any interaction completing forms implies "confirmed"
        payload.confirmation_status = 'confirmed';
      }

      const response = Object.keys(payload).length > 0
        ? await updateInvitationGuestByQrCodeAPI(qrCode, payload)
        : null;

      const apiGuest = response?.guest;
      const merged = apiGuest && event ? mapApiGuestToLocal(apiGuest, event.id) : { ...guest, ...guestData };
      setGuest(merged);
    } catch (error) {
      console.error('Error updating guest:', error);
    }
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