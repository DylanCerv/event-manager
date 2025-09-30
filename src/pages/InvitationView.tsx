import React from 'react';
import { useParams } from 'react-router-dom';
import { storage } from '../lib/storage';
import { finalizationStorage } from '../lib/finalization-storage';
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

  const loadGuestData = async () => {
    if (!qrCode) return;

    try {
      setLoading(true);
      setError(null);

      // Buscar el invitado por código QR en todos los eventos
      const events = await storage.getEvents();
      let foundGuest: Guest | null = null;
      let foundEvent: Event | null = null;

      for (const event of events) {
        const guests = await storage.getGuests(event.id);
        const guest = guests.find(g => g.qr_code === qrCode);
        if (guest) {
          foundGuest = guest;
          foundEvent = event;
          break;
        }
      }

      if (!foundGuest || !foundEvent) {
        setError('Invitación no encontrada. Verifica el enlace o código QR.');
        return;
      }

      // Cargar la tarjeta del evento y la finalización
      try {
        const [card, eventFinalization] = await Promise.all([
          storage.getEventCard(foundEvent.id),
          finalizationStorage.getEventFinalization(foundEvent.id)
        ]);
        
        setEventCard(card);
        setFinalization(eventFinalization);
      } catch (error) {
        console.error('Error loading event data:', error);
        // Continuar sin la tarjeta si no existe
      }

      setGuest(foundGuest);
      setEvent(foundEvent);

      // Verificar si el invitado ya completó sus datos básicos
      if (foundGuest.name && (foundGuest.email || foundGuest.phone)) {
        setShowDataForm(false);
      }

    } catch (error) {
      console.error('Error loading guest data:', error);
      setError('Error al cargar la invitación. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDataSubmitted = async (updatedGuest: Partial<Guest>) => {
    if (!guest || !event) return;

    try {
      // Actualizar los datos del invitado
      const guestData = {
        ...guest,
        ...updatedGuest
      };

      await storage.updateGuest(guestData);
      setGuest(guestData);
      setShowDataForm(false);
    } catch (error) {
      console.error('Error updating guest data:', error);
      setError('Error al guardar los datos. Inténtalo de nuevo.');
    }
  };

  const handleConfirmAttendance = async (guestId: string, confirmed: boolean) => {
    if (!guest) return;

    try {
      const updatedGuest = { ...guest, confirmed };
      await storage.updateGuest(updatedGuest);
      setGuest(updatedGuest);
    } catch (error) {
      console.error('Error confirming attendance:', error);
    }
  };

  const handleUpdateGuest = async (guestData: Partial<Guest>) => {
    if (!guest) return;

    try {
      const updatedGuest = { ...guest, ...guestData };
      await storage.updateGuest(updatedGuest);
      setGuest(updatedGuest);
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