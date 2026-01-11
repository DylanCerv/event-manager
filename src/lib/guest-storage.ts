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

const API_BASE = import.meta.env.VITE_API_URL as string;

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:([^;]+);base64/i);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

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
  private getCurrentGuestKey(eventBookId: string): string {
    return `current_guest_${eventBookId}`;
  }

  private async uploadProfilePhoto(eventBookId: string, dataUrl: string): Promise<string> {
    const form = new FormData();
    form.append('type', 'image');
    form.append('file', dataUrlToFile(dataUrl, 'profile.jpg'));

    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/uploads`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error uploading profile photo');
    }
    const relative = String(json.data.path || json.data.url || '');
    if (!relative.startsWith('/')) return relative;
    return new URL(API_BASE).origin + relative;
  }

  // Verificar si el usuario ya está registrado en este EventBook
  getCurrentGuest(eventBookId: string): EventBookGuest | null {
    const stored = localStorage.getItem(this.getCurrentGuestKey(eventBookId));
    if (!stored) return null;
    try {
      const guest = JSON.parse(stored) as EventBookGuest;
      // Ping activity (best-effort)
      fetch(`${API_BASE}/event-books/${eventBookId}/participants/${guest.id}/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      }).catch(() => {});
      return guest;
    } catch {
      localStorage.removeItem(this.getCurrentGuestKey(eventBookId));
      return null;
    }
  }

  // Registrar nuevo invitado
  async registerGuest(
    eventBookId: string, 
    firstName: string, 
    lastName: string, 
    profilePhoto?: string
  ): Promise<EventBookGuest> {
    const fingerprint = generateDeviceFingerprint();

    // If it's a base64 data URL, upload it and store the URL (avoid DB bloat)
    let profilePhotoUrl = profilePhoto;
    if (profilePhotoUrl && profilePhotoUrl.startsWith('data:')) {
      profilePhotoUrl = await this.uploadProfilePhoto(eventBookId, profilePhotoUrl);
    }

    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/participants/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        profile_photo: profilePhotoUrl,
        device_fingerprint: fingerprint,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error registering guest');
    }
    const p = json.data;
    const guest: EventBookGuest = {
      id: String(p.id),
      eventBookId: String(p.eventBookId || eventBookId),
      firstName: p.firstName,
      lastName: p.lastName || '',
      profilePhoto: p.profilePhoto || undefined,
      deviceFingerprint: p.deviceFingerprint || fingerprint,
      registeredAt: p.registeredAt,
      lastActiveAt: p.lastActiveAt,
      moderatorUserId: p.moderatorUserId || undefined,
    };
    localStorage.setItem(this.getCurrentGuestKey(eventBookId), JSON.stringify(guest));
    return guest;
  }

  // Obtener todos los invitados de un EventBook
  async getAllGuests(eventBookId: string): Promise<EventBookGuest[]> {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/participants`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error loading participants');
    }
    return (json.data || []).map((p: any) => ({
      id: String(p.id),
      eventBookId: String(p.eventBookId || eventBookId),
      firstName: p.firstName,
      lastName: p.lastName || '',
      profilePhoto: p.profilePhoto || undefined,
      deviceFingerprint: p.deviceFingerprint || '',
      registeredAt: p.registeredAt,
      lastActiveAt: p.lastActiveAt,
      moderatorUserId: p.moderatorUserId || undefined,
    })) as EventBookGuest[];
  }

  // Verificar si necesita registro
  needsRegistration(eventBookId: string): boolean {
    return this.getCurrentGuest(eventBookId) === null;
  }

  // Actualizar foto de perfil
  async updateProfilePhoto(eventBookId: string, profilePhoto: string): Promise<boolean> {
    const currentGuest = this.getCurrentGuest(eventBookId);
    if (!currentGuest) return false;
    try {
      const updated = await this.registerGuest(
        eventBookId,
        currentGuest.firstName,
        currentGuest.lastName,
        profilePhoto
      );
      localStorage.setItem(this.getCurrentGuestKey(eventBookId), JSON.stringify(updated));
      return true;
    } catch {
      return false;
    }
  }
}

export const guestStorage = new GuestStorage();
