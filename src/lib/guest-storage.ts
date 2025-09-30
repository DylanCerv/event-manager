// Sistema de almacenamiento para invitados del EventBook

export interface EventBookGuest {
  id: string;
  eventBookId: string;
  firstName: string;
  lastName: string;
  profilePhoto?: string;
  deviceFingerprint: string;
  registeredAt: string;
  lastActiveAt: string;
  moderatorUserId?: string; // ID del usuario moderador si este guest representa a un moderador
}

// Generar fingerprint simple del dispositivo
const generateDeviceFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx?.fillText('fingerprint', 2, 2);
  
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset(),
    canvas.toDataURL()
  ].join('|');
  
  // Crear hash simple
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir a 32-bit
  }
  
  return Math.abs(hash).toString(36);
};

class GuestStorage {
  private getStorageKey(eventBookId: string): string {
    return `eventbook_guests_${eventBookId}`;
  }

  private getCurrentGuestKey(eventBookId: string): string {
    return `current_guest_${eventBookId}`;
  }

  private getGuests(eventBookId: string): EventBookGuest[] {
    const key = this.getStorageKey(eventBookId);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  }

  private saveGuests(eventBookId: string, guests: EventBookGuest[]): void {
    const key = this.getStorageKey(eventBookId);
    localStorage.setItem(key, JSON.stringify(guests));
  }

  // Verificar si el usuario ya está registrado en este EventBook
  getCurrentGuest(eventBookId: string): EventBookGuest | null {
    const fingerprint = generateDeviceFingerprint();
    const guests = this.getGuests(eventBookId);
    
    // Buscar por fingerprint del dispositivo
    const existingGuest = guests.find(guest => 
      guest.deviceFingerprint === fingerprint && guest.eventBookId === eventBookId
    );

    if (existingGuest) {
      // Actualizar última actividad
      existingGuest.lastActiveAt = new Date().toISOString();
      this.saveGuests(eventBookId, guests);
      
      // Guardar como invitado actual
      localStorage.setItem(
        this.getCurrentGuestKey(eventBookId), 
        JSON.stringify(existingGuest)
      );
    }

    return existingGuest || null;
  }

  // Registrar nuevo invitado
  registerGuest(
    eventBookId: string, 
    firstName: string, 
    lastName: string, 
    profilePhoto?: string
  ): EventBookGuest {
    const fingerprint = generateDeviceFingerprint();
    const guests = this.getGuests(eventBookId);

    const newGuest: EventBookGuest = {
      id: crypto.randomUUID(),
      eventBookId,
      firstName,
      lastName,
      profilePhoto,
      deviceFingerprint: fingerprint,
      registeredAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };

    guests.push(newGuest);
    this.saveGuests(eventBookId, guests);

    // Guardar como invitado actual
    localStorage.setItem(
      this.getCurrentGuestKey(eventBookId), 
      JSON.stringify(newGuest)
    );

    return newGuest;
  }

  // Obtener todos los invitados de un EventBook
  getAllGuests(eventBookId: string): EventBookGuest[] {
    return this.getGuests(eventBookId);
  }

  // Verificar si necesita registro
  needsRegistration(eventBookId: string): boolean {
    return this.getCurrentGuest(eventBookId) === null;
  }

  // Actualizar foto de perfil
  updateProfilePhoto(eventBookId: string, profilePhoto: string): boolean {
    const currentGuest = this.getCurrentGuest(eventBookId);
    if (!currentGuest) return false;

    const guests = this.getGuests(eventBookId);
    const guestIndex = guests.findIndex(g => g.id === currentGuest.id);
    
    if (guestIndex !== -1) {
      guests[guestIndex].profilePhoto = profilePhoto;
      guests[guestIndex].lastActiveAt = new Date().toISOString();
      this.saveGuests(eventBookId, guests);

      // Actualizar invitado actual
      currentGuest.profilePhoto = profilePhoto;
      localStorage.setItem(
        this.getCurrentGuestKey(eventBookId), 
        JSON.stringify(currentGuest)
      );

      return true;
    }

    return false;
  }
}

export const guestStorage = new GuestStorage();
