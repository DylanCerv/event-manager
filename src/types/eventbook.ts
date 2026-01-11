export interface EventBook {
  id: string;
  event_id: string; // ID del evento asociado
  created_by: string; // ID del usuario que creó el EventBook
  name: string;
  description?: string;
  coverImage: string;
  isActive: boolean;
  createdAt: string;
  eventDate?: string; // Fecha del evento asociado
  maxParticipants: number;
  moderationEnabled: boolean;
  slug: string; // URL amigable para el EventBook
  publicUrl: string; // URL pública completa
  status?: 'active' | 'closed'; // Estado de cierre automático
  moderatorsCount?: number; // Cantidad de moderadores asignados (backend)
  settings: {
    functionality: {
      allowPosts?: boolean;
      allowImageUploads?: boolean;
      allowVideoUploads?: boolean;
      allowComments?: boolean;
      allowLikes?: boolean;
      allowReactions?: boolean;
      requirePostApproval?: boolean;
    };
    identity: {
      showRealNames?: boolean;
      allowAliases?: boolean;
      allowAnonymous?: boolean;
    };
    visibility: {
      openDate?: string;
      closeDate?: string;
    };
    customization: {
      organizerDisplayName?: string;
      theme?: 'light' | 'dark';
      welcomeMessage?: string;
      moderatorProfilePhoto?: string;
    };
    isConfigured: boolean;
  };
  stats: {
    participants: number;
    posts: number;
    photos: number;
    reported: number;
  };
  blockedParticipants?: ParticipantBlock[];
  backupData?: {
    generated: boolean;
    generatedAt: string;
    size: number;
    blob: string; // Base64 del ZIP
  };
}

// Interfaz para bloqueo de participantes
export interface ParticipantBlock {
  userId: string;
  blocked: boolean;
  blockedType: 'total' | 'partial';
  blockedReason?: string;
  blockedAt: string;
  blockedBy: string; // ID del moderador que aplicó el bloqueo
}

// Interfaz recursiva para respuestas anidadas
export interface EventBookReply {
  id: string;
  guestId: string;
  content: string;
  replyingTo: string; // nombre del usuario al que responde
  replyingToId: string; // ID del comentario/respuesta al que responde
  reactions: Record<string, string>; // guestId -> reactionType
  replies: EventBookReply[]; // Permite respuestas anidadas infinitas
  createdAt: string;
}

export interface EventBookPost {
  id: string;
  eventBookId: string;
  guestId: string;
  content: string;
  feeling?: {
    id: string;
    emoji: string;
    name: string;
    category: 'emotion';
  };
  mediaFiles?: {
    type: 'image' | 'video';
    url: string;
    thumbnail?: string;
  }[];
  reactions: Record<string, string>; // guestId -> reactionType
  comments: {
    id: string;
    guestId: string;
    content: string;
    reactions: Record<string, string>; // guestId -> reactionType
    replies: EventBookReply[]; // Ahora usa la interfaz recursiva
    createdAt: string;
  }[];
  createdAt: string;
  isModerated: boolean;
  status: 'pending' | 'published'; // Nuevo campo para el sistema de aprobación
  // Nuevos campos para posts del moderador
  moderatorPost?: boolean; // Indica si es un post del moderador
  isHighlighted?: boolean; // Post destacado
  isAnnouncement?: boolean; // Anuncio oficial
}