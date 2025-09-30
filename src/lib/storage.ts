import type { Event, Guest, EventRequest, EventCard, EventFinalization, GuestAccessSettings, GuestAccessVideo } from '../types/event';
import { configStorage } from './config-storage';

interface StoredUser {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  role: string;
  status: string;
  eventsCount: number;
  lastLogin: string;
  createdAt: string;
  createdBy: string;
  profilePhoto?: string;
}

class SessionStorage {
  private getItem<T>(key: string): T[] {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    sessionStorage.setItem(key, JSON.stringify(value));
  }

  // Event Finalization
  async getEventFinalization(eventId: string): Promise<EventFinalization | null> {
    const finalizations = this.getItem<EventFinalization>('event_finalizations');
    return finalizations.find(f => f.event_id === eventId) || null;
  }

  async saveEventFinalization(finalization: Omit<EventFinalization, 'id' | 'created_at'>): Promise<void> {
    const finalizations = this.getItem<EventFinalization>('event_finalizations');
    const existingIndex = finalizations.findIndex(f => f.event_id === finalization.event_id);
    
    const newFinalization = {
      ...finalization,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    
    if (existingIndex !== -1) {
      finalizations[existingIndex] = newFinalization;
    } else {
      finalizations.push(newFinalization);
    }
    
    this.setItem('event_finalizations', finalizations);
  }

  async deleteEventFinalization(eventId: string): Promise<void> {
    const finalizations = this.getItem<EventFinalization>('event_finalizations');
    const updatedFinalizations = finalizations.filter(f => f.event_id !== eventId);
    this.setItem('event_finalizations', updatedFinalizations);
  }
}

class LocalStorage {
  private getItem<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Users
  async getUsers(): Promise<StoredUser[]> {
    return this.getItem<StoredUser>('admin_users');
  }

  async saveUsers(users: StoredUser[]): Promise<void> {
    this.setItem('admin_users', users);
  }

  getAllGuests(): Promise<Guest[]> {
    return Promise.resolve(this.getItem<Guest>('guests'));
  }

  // Events
  async getEvents(): Promise<Event[]> {
    const events = this.getItem<Event>('events');
    // Para moderadores, devolver todos los eventos sin filtrar
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.role === 'MODERADOR') {
      console.log('Moderador accediendo a todos los eventos:', events.length);
      return events;
    }
    // Para creadores, devolver todos los eventos para poder ver comisiones
    if (currentUser && currentUser.role === 'CREATOR') {
      console.log('Creador accediendo a todos los eventos para comisiones:', events.length);
      return events;
    }
    // Filter events by current user if not super admin
    if (currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'ACCESS_CONTROL') {
      return events.filter(event => event.created_by === currentUser.id);
    }
    return events;
  }

  private getCurrentUser(): { id: string; role: string } | null {
    // This would be set when user logs in
    const userData = sessionStorage.getItem('current_user');
    return userData ? JSON.parse(userData) : null;
  }

  async getEventRequests(): Promise<EventRequest[]> {
    return this.getItem<EventRequest>('event_requests');
  }

  async getEventRequestsByUser(userId?: string): Promise<EventRequest[]> {
    const requests = this.getItem<EventRequest>('event_requests');
    const currentUser = this.getCurrentUser();
    const targetUserId = userId || currentUser?.id;
    
    if (!targetUserId) {
      return [];
    }
    
    return requests.filter(request => request.requested_by === targetUserId);
  }

  async createEventRequest(eventId: string): Promise<void> {
    const requests = this.getItem<EventRequest>('event_requests');
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('Usuario no autenticado');
    
    const newRequest: EventRequest = {
      id: crypto.randomUUID(),
      event_id: eventId,
      status: 'pending',
      requested_by: currentUser.id,
      created_at: new Date().toISOString(),
    };
    requests.push(newRequest);
    this.setItem('event_requests', requests);
  }

  async updateEventRequest(requestId: string, status: 'approved' | 'rejected'): Promise<void> {
    const requests = this.getItem<EventRequest>('event_requests');
    const index = requests.findIndex(r => r.id === requestId);
    
    if (index !== -1) {
      requests[index] = {
        ...requests[index],
        status,
        processed_by: 'local-user',
        processed_at: new Date().toISOString(),
      };
      this.setItem('event_requests', requests);
      
      // If approved, generate QR codes for all guests
      if (status === 'approved') {
        const guests = this.getItem<Guest>('guests');
        const eventGuests = guests.filter(g => g.event_id === requests[index].event_id);
        
        // Update QR codes
        eventGuests.forEach(guest => {
          const guestIndex = guests.findIndex(g => g.id === guest.id);
          if (guestIndex !== -1) {
            guests[guestIndex] = {
              ...guest,
              qr_code: crypto.randomUUID()
            };
          }
        });
        
        this.setItem('guests', guests);
        
        // Asignar puntos automáticamente al administrador y su creador
        await this.assignPointsForApprovedRequest(requests[index]);
      }
    }
  }

  // Función para asignar puntos automáticamente
  private async assignPointsForApprovedRequest(request: EventRequest): Promise<void> {
    try {
      console.log('Iniciando asignación de puntos para solicitud:', request.id);
      
      // Obtener la configuración de puntos
      const pointsConfig = await configStorage.getPointsConfig();
      console.log('Configuración de puntos:', pointsConfig);
      
      // Obtener el evento para saber cuántos invitados tiene
      const events = this.getItem<Event>('events');
      const event = events.find(e => e.id === request.event_id);
      if (!event) {
        console.warn('Evento no encontrado:', request.event_id);
        return;
      }

      // Validar que el evento tenga invitados
      const guestCount = event.guest_count || 0;
      if (guestCount <= 0) {
        console.warn('Evento sin invitados, no se asignan puntos:', event.name);
        return;
      }

      console.log(`Evento encontrado: ${event.name} con ${guestCount} invitados`);

      // Obtener información del usuario administrador que creó el evento
      const users = this.getItem<StoredUser>('admin_users');
      const adminUser = users.find(u => u.id === event.created_by);
      if (!adminUser) {
        console.warn('Usuario administrador no encontrado:', event.created_by);
        return;
      }

      console.log(`Administrador encontrado: ${adminUser.firstName} ${adminUser.lastName}`);

      // Calcular y asignar puntos al administrador
      const adminPoints = pointsConfig.admin * guestCount;
      await this.assignPointsToUser(adminUser.id, adminPoints, `Aprobación de links - ${guestCount} invitados`);
      console.log(`Puntos asignados al administrador: ${adminPoints}`);

      // Buscar al creador del administrador en la colección de creadores
      if (adminUser.createdBy) {
        const creators = this.getItem<any>('creators_data');
        const creatorUser = creators.find((c: any) => c.id === adminUser.createdBy);
        if (creatorUser) {
          const creatorPoints = pointsConfig.creator * guestCount;
          await this.assignPointsToUser(creatorUser.id, creatorPoints, `Aprobación de links - ${guestCount} invitados (Admin: ${adminUser.firstName})`);
          console.log(`Puntos asignados al creador ${creatorUser.firstName} ${creatorUser.lastName}: ${creatorPoints}`);
        } else {
          console.warn('Creador no encontrado en creators_data:', adminUser.createdBy);
        }
      } else {
        console.log('El administrador no tiene creador asignado');
      }

      console.log('Asignación de puntos completada exitosamente');
    } catch (error) {
      console.error('Error asignando puntos automáticamente:', error);
    }
  }

  // Función para asignar puntos a un usuario específico
  private async assignPointsToUser(userId: string, points: number, reason: string): Promise<void> {
    try {
      if (!userId || points <= 0) {
        console.warn('Parámetros inválidos para asignar puntos:', { userId, points });
        return;
      }

      console.log(`Asignando ${points} puntos al usuario ${userId}: ${reason}`);

      // Obtener puntos actuales del localStorage
      const userPoints = JSON.parse(localStorage.getItem('userPoints') || '{}');
      const currentPoints = Number(userPoints[userId] || 0);
      const newPoints = currentPoints + points;

      // Actualizar puntos
      userPoints[userId] = newPoints;
      localStorage.setItem('userPoints', JSON.stringify(userPoints));
      console.log(`Puntos actualizados: ${currentPoints} -> ${newPoints}`);

      // Registrar transacción
      const allTransactions = JSON.parse(localStorage.getItem('userTransactions') || '{}');
      const transaction = {
        id: crypto.randomUUID(),
        userId,
        points,
        type: 'earned',
        reason,
        timestamp: new Date().toISOString(),
        previousBalance: currentPoints,
        newBalance: newPoints
      };
      
      // Asegurar que existe el array para este usuario
      if (!allTransactions[userId]) {
        allTransactions[userId] = [];
      }
      
      allTransactions[userId].push(transaction);
      localStorage.setItem('userTransactions', JSON.stringify(allTransactions));
      console.log('Transacción registrada:', transaction.id);

      // Disparar evento personalizado para notificar cambios
      window.dispatchEvent(new CustomEvent('localStorageUpdate'));

    } catch (error) {
      console.error('Error asignando puntos al usuario:', error);
      // No lanzar el error para no interrumpir el flujo de aprobación
    }
  }

  async deleteEventRequest(requestId: string): Promise<void> {
    const requests = this.getItem<EventRequest>('event_requests');
    const updatedRequests = requests.filter(request => request.id !== requestId);
    this.setItem('event_requests', updatedRequests);
  }

  async deleteEventRequestsByEventId(eventId: string): Promise<void> {
    const requests = this.getItem<EventRequest>('event_requests');
    const updatedRequests = requests.filter(request => request.event_id !== eventId);
    this.setItem('event_requests', updatedRequests);
  }

  // Función segura para eliminar eventos que verifica permisos de usuario
  async deleteEvent(eventId: string): Promise<void> {
    const events = this.getItem<Event>('events');
    const currentUser = this.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }

    // Encontrar el evento a eliminar
    const eventToDelete = events.find(event => event.id === eventId);
    if (!eventToDelete) {
      throw new Error('Evento no encontrado');
    }

    // Verificar permisos: solo el creador del evento o un SUPER_ADMIN puede eliminarlo
    if (eventToDelete.created_by !== currentUser.id && currentUser.role !== 'SUPER_ADMIN') {
      throw new Error('No tienes permisos para eliminar este evento');
    }

    // Eliminar el evento
    const updatedEvents = events.filter(event => event.id !== eventId);
    this.setItem('events', updatedEvents);

    // Eliminar invitados asociados
    const allGuests = this.getItem<Guest>('guests');
    const updatedGuests = allGuests.filter(guest => guest.event_id !== eventId);
    this.setItem('guests', updatedGuests);

    // Eliminar solicitudes asociadas
    await this.deleteEventRequestsByEventId(eventId);

    // Eliminar tarjeta del evento si existe
    try {
      await this.deleteEventCard(eventId);
    } catch (error) {
      console.warn('No se pudo eliminar la tarjeta del evento:', error);
    }

    // Eliminar configuraciones de acceso
    const accessSettings = this.getItem<GuestAccessSettings>('access_settings');
    const updatedAccessSettings = accessSettings.filter(setting => setting.event_id !== eventId);
    this.setItem('access_settings', updatedAccessSettings);

    // Eliminar videos de invitados
    const guestVideos = this.getItem<GuestAccessVideo>('guest_videos');
    const eventGuestIds = allGuests.filter(g => g.event_id === eventId).map(g => g.id);
    const updatedGuestVideos = guestVideos.filter(video => !eventGuestIds.includes(video.guest_id));
    this.setItem('guest_videos', updatedGuestVideos);

    console.log(`Evento ${eventId} eliminado correctamente por usuario ${currentUser.id}`);
  }



  async createEvent(event: Omit<Event, 'id' | 'created_at' | 'created_by'>): Promise<Event> {
    const events = this.getItem<Event>('events');
    const newEvent: Event = {
      ...event,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      created_by: this.getCurrentUser()?.id || 'local-user',
    };
    events.push(newEvent);
    this.setItem('events', events);
    return newEvent;
  }

  // Guests
  async getGuests(eventId: string): Promise<Guest[]> {
    const guests = this.getItem<Guest>('guests');
    const filteredGuests = guests.filter(guest => guest.event_id === eventId);
    return filteredGuests;
  }

  async createGuests(eventId: string, count: number): Promise<void> {
    const guests = this.getItem<Guest>('guests');
    const maxGuestNumber = Math.max(
      ...guests.map(g => g.guest_number || 99),
      99
    );
    const newGuests: Guest[] = Array.from({ length: count }, () => ({
      id: crypto.randomUUID(),
      event_id: eventId,
      confirmed: false,
      attended: false,
      guest_number: 0,  // Will be set in the loop below
      qr_code: crypto.randomUUID(),
      created_at: new Date().toISOString()
    }));
    // Assign unique guest numbers sequentially across all events
    newGuests.forEach((guest, index) => {
      guest.guest_number = maxGuestNumber + index + 1;
    });
    guests.push(...newGuests);
    this.setItem('guests', guests);
  }

  async updateGuest(guest: Partial<Guest> & { id: string }): Promise<void> {
    const guests = this.getItem<Guest>('guests');
    const index = guests.findIndex(g => g.id === guest.id);
    if (index !== -1) {
      guests[index] = { ...guests[index], ...guest };
      this.setItem('guests', guests);
    }
  }

  // Event Cards
  async getEventCard(eventId: string): Promise<EventCard | null> {
    const cards = this.getItem<EventCard>('event_cards');
    return cards.find(card => card.event_id === eventId) || null;
  }

  async saveEventCard(cardData: Omit<EventCard, 'id' | 'created_at'>): Promise<EventCard> {
    const cards = this.getItem<EventCard>('event_cards');
    const existingCardIndex = cards.findIndex(card => card.event_id === cardData.event_id);
    const existingCard = existingCardIndex !== -1 ? cards[existingCardIndex] : null;

    const newCard: EventCard = {
      ...cardData,
      show_contact_footer: cardData.show_contact_footer || false,
      contact_message: cardData.contact_message || '',
      contact_whatsapp: cardData.contact_whatsapp || '',
      contact_email: cardData.contact_email || '',
      facebook_url: cardData.facebook_url || '',
      instagram_url: cardData.instagram_url || '',
      recommendation_items: cardData.recommendation_items || [],
      id: existingCard?.id || crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };

    if (existingCardIndex !== -1) {
      cards[existingCardIndex] = newCard;
    } else {
      cards.push(newCard);
    }

    this.setItem('event_cards', cards);
    return newCard;
  }

  async deleteEventCard(eventId: string): Promise<void> {
    const cards = this.getItem<EventCard>('event_cards');
    const updatedCards = cards.filter(card => card.event_id !== eventId);
    this.setItem('event_cards', updatedCards);
  }

  // QR Access Management
  async saveAccessSettings(settings: GuestAccessSettings): Promise<void> {
    const allSettings = this.getItem<GuestAccessSettings>('access_settings');
    const existingIndex = allSettings.findIndex(s => s.event_id === settings.event_id);
    
    if (existingIndex !== -1) {
      allSettings[existingIndex] = settings;
    } else {
      allSettings.push(settings);
    }
    
    this.setItem('access_settings', allSettings);
    this.dispatchStorageEvent('access_settings_updated', settings.event_id);
  }

  async getAccessSettings(eventId: string): Promise<GuestAccessSettings | null> {
    const allSettings = this.getItem<GuestAccessSettings>('access_settings');
    return allSettings.find(s => s.event_id === eventId) || null;
  }

  async saveGuestVideo(video: GuestAccessVideo): Promise<void> {
    const videos = this.getItem<GuestAccessVideo>('guest_videos');
    const existingIndex = videos.findIndex(v => v.guest_id === video.guest_id);
    
    if (existingIndex !== -1) {
      videos[existingIndex] = video;
    } else {
      videos.push(video);
    }
    
    this.setItem('guest_videos', videos);
  }

  async getGuestVideo(guestId: string): Promise<GuestAccessVideo | null> {
    const videos = this.getItem<GuestAccessVideo>('guest_videos');
    return videos.find(v => v.guest_id === guestId) || null;
  }
  
  async getEventGuests(eventId: string): Promise<Guest[]> {
    const guests = this.getItem<Guest>('guests');
    return guests.filter(guest => guest.event_id === eventId);
  }



  private dispatchStorageEvent(type: string, eventId: string) {
    window.dispatchEvent(new CustomEvent('storage_update', {
      detail: { type, eventId }
    }));
  }

  setCurrentUser(user: { id: string; role: string }): void {
    sessionStorage.setItem('current_user', JSON.stringify(user));
  }
}

export const storage = new LocalStorage();