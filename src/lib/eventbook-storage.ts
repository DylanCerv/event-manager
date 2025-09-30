import type { EventBook, EventBookPost } from '../types/eventbook';
import { storage } from './storage';

// Función para generar slug
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[áéíóúñ]/g, c => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// Función para generar slug del usuario basado en el nombre de la empresa
const generateUserSlug = (companyName: string) => {
  return companyName
    .toLowerCase()
    .replace(/[áéíóúñ]/g, c => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ñ: 'n' }[c] || c))
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

// Función para generar URL pública
const generatePublicUrl = (userSlug: string, eventSlug: string) => {
  // En desarrollo usamos localhost, en producción usaríamos el dominio real
  return `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}/${userSlug}/${eventSlug}`;
};

class EventBookStorage {
  constructor() {
    this.migratePostsToStatusField();
    this.migrateCloseDates();
    this.migrateCreatedByField();
  }

  private getItem<T>(key: string): T[] {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : [];
  }

  private setItem<T>(key: string, value: T[]): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  private getCurrentUser(): { id: string; role: string } | null {
    const userData = sessionStorage.getItem('current_user');
    return userData ? JSON.parse(userData) : null;
  }

  // Migración para agregar el campo status a posts existentes
  private migratePostsToStatusField(): void {
    try {
      const posts = this.getItem<EventBookPost>('eventbook_posts');
      let needsUpdate = false;
      
      const updatedPosts = posts.map(post => {
        if (!post.status) {
          needsUpdate = true;
          // Si el post ya está moderado, se considera publicado
          // Si no está moderado, se considera pendiente
          return {
            ...post,
            status: post.isModerated ? 'published' : 'pending'
          } as EventBookPost;
        }
        return post;
      });
      
      if (needsUpdate) {
        this.setItem('eventbook_posts', updatedPosts);
        console.log('Posts migrated to include status field');
      }
    } catch (error) {
      console.error('Error migrating posts:', error);
    }
  }

  // Migración para corregir fechas de cierre incorrectas
  private async migrateCloseDates(): Promise<void> {
    try {
      const eventBooks = this.getItem<EventBook>('eventbooks');
      let needsUpdate = false;
      
      const updatedEventBooks = eventBooks.map(eventBook => {
        if (eventBook.eventDate && eventBook.settings?.visibility?.closeDate) {
          const eventDate = new Date(eventBook.eventDate);
          const currentCloseDate = new Date(eventBook.settings.visibility.closeDate);
          
          // Si la fecha de cierre es antes del evento, corregirla
          if (currentCloseDate < eventDate) {
            needsUpdate = true;
            // Asegurar zona horaria consistente
            eventDate.setHours(12, 0, 0, 0);
            const correctCloseDate = new Date(eventDate.getTime() + (15 * 24 * 60 * 60 * 1000));
            
            return {
              ...eventBook,
              settings: {
                ...eventBook.settings,
                visibility: {
                  ...eventBook.settings.visibility,
                  closeDate: correctCloseDate.toISOString().split('T')[0]
                }
              }
            };
          }
        }
        return eventBook;
      });
      
      if (needsUpdate) {
        this.setItem('eventbooks', updatedEventBooks);
        console.log('EventBooks migrated: close dates corrected to be 15 days after event date');
      }
    } catch (error) {
      console.error('Error migrating close dates:', error);
    }
  }

  // Migración para agregar campo created_by a EventBooks existentes
  private async migrateCreatedByField(): Promise<void> {
    try {
      const eventBooks = this.getItem<EventBook>('eventbooks');
      let needsUpdate = false;
      
      const updatedEventBooks = eventBooks.map(eventBook => {
        if (!eventBook.created_by) {
          needsUpdate = true;
          // Para EventBooks existentes sin propietario, asignar al usuario actual
          const currentUser = this.getCurrentUser();
          if (currentUser) {
            return {
              ...eventBook,
              created_by: currentUser.id
            };
          } else {
            // Si no hay usuario logueado, usar un ID temporal
            return {
              ...eventBook,
              created_by: 'unknown-user'
            };
          }
        }
        return eventBook;
      });
      
      if (needsUpdate) {
        this.setItem('eventbooks', updatedEventBooks);
        console.log('EventBooks migrated to include created_by field');
      }
    } catch (error) {
      console.error('Error migrating created_by field:', error);
    }
  }

  async getAllEventBooks(): Promise<EventBook[]> {
    return this.getItem<EventBook>('eventbooks');
  }

  async getEventBooksByUser(userId?: string): Promise<EventBook[]> {
    const allEventBooks = this.getItem<EventBook>('eventbooks');
    
    // Si no se proporciona userId, usar el usuario actual
    const targetUserId = userId || this.getCurrentUser()?.id;
    
    if (!targetUserId) {
      console.warn('No se pudo determinar el usuario para filtrar EventBooks');
      return [];
    }
    
    return allEventBooks.filter(eventBook => eventBook.created_by === targetUserId);
  }

  async createEventBook(data: Omit<EventBook, 'id' | 'createdAt' | 'stats' | 'slug' | 'publicUrl' | 'created_by'>): Promise<EventBook> {
    const eventbooks = this.getItem<EventBook>('eventbooks');
    const slug = generateSlug(data.name);
    
    // Obtener información del usuario logueado
    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      throw new Error('Usuario no autenticado');
    }
    
    let userSlug = 'default-user';
    
    if (currentUser) {
      const users = await storage.getUsers();
      const userInfo = users.find(u => u.id === currentUser.id);
      if (userInfo && userInfo.company) {
        userSlug = generateUserSlug(userInfo.company);
      }
    }
    
    // Obtener la fecha del evento asociado
    let eventDate = new Date().toISOString(); // Por defecto fecha actual
    try {
      const events = await storage.getEvents();
      const associatedEvent = events.find(e => e.id === data.event_id);
      if (associatedEvent?.date) {
        eventDate = associatedEvent.date;
      }
    } catch (error) {
      console.warn('No se pudo obtener la fecha del evento:', error);
    }

    const newEventBook: EventBook = {
      ...data,
      id: crypto.randomUUID(),
      created_by: currentUser.id, // Agregar el ID del usuario propietario
      createdAt: new Date().toISOString(),
      eventDate, // Guardar la fecha del evento
      coverImage: 'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg',
      isActive: false,
      moderationEnabled: true,
      slug,
      publicUrl: generatePublicUrl(userSlug, slug),
      settings: {
        functionality: {
          allowPosts: true,
          allowImageUploads: true,
          allowVideoUploads: false,
          allowComments: true,
          allowLikes: true,
          allowReactions: true,
          requirePostApproval: false
        },
        identity: {
          showRealNames: true,
          allowAliases: false,
          allowAnonymous: false
        },
        visibility: {
          openDate: undefined,
          closeDate: (() => {
            // Calcular 15 días después de la fecha del evento
            const eventDateObj = new Date(eventDate);
            // Asegurar que usamos la misma zona horaria y evitar problemas de UTC
            eventDateObj.setHours(12, 0, 0, 0); // Establecer mediodía para evitar problemas de zona horaria
            const closeDate = new Date(eventDateObj.getTime() + (15 * 24 * 60 * 60 * 1000)); // 15 días después del evento
            return closeDate.toISOString().split('T')[0];
          })()
        },
        customization: {
          organizerDisplayName: 'Organizador',
          theme: 'light',
          welcomeMessage: '¡Bienvenidos al muro del evento! Comparte tus momentos favoritos.'
        },
        isConfigured: true
      },
      stats: {
        participants: 0,
        posts: 0,
        photos: 0,
        reported: 0
      }
    };
    
    eventbooks.push(newEventBook);
    this.setItem('eventbooks', eventbooks);
    return newEventBook;
  }

  async updateEventBook(id: string, updates: Partial<EventBook>): Promise<EventBook | null> {
    const eventbooks = this.getItem<EventBook>('eventbooks');
    const index = eventbooks.findIndex(book => book.id === id);
    
    if (index === -1) return null;
    
    // Si se actualiza el event_id, también actualizar la fecha del evento
    if (updates.event_id) {
      try {
        const events = await storage.getEvents();
        const associatedEvent = events.find(e => e.id === updates.event_id);
        if (associatedEvent?.date) {
          updates.eventDate = associatedEvent.date;
        }
      } catch (error) {
        console.warn('No se pudo obtener la fecha del evento al actualizar:', error);
      }
    }
    
    eventbooks[index] = { ...eventbooks[index], ...updates };
    this.setItem('eventbooks', eventbooks);
    
    return eventbooks[index];
  }

  async deleteEventBook(id: string): Promise<void> {
    const eventbooks = this.getItem<EventBook>('eventbooks');
    const filtered = eventbooks.filter(eb => eb.id !== id);
    this.setItem('eventbooks', filtered);
    
    // Also delete associated posts
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const remainingPosts = posts.filter(post => post.eventBookId !== id);
    this.setItem('eventbook_posts', remainingPosts);
    
    // Also delete associated reports
    const reports = this.getItem<any>('post_reports');
    const postIds = posts.filter(p => p.eventBookId === id).map(p => p.id);
    const remainingReports = reports.filter((report: any) => !postIds.includes(report.postId));
    this.setItem('post_reports', remainingReports);
  }

  // Función para archivar posts de un EventBook (eliminar datos públicos pero mantener EventBook)
  async archiveEventBookPosts(eventBookId: string): Promise<void> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const remainingPosts = posts.filter(post => post.eventBookId !== eventBookId);
    this.setItem('eventbook_posts', remainingPosts);
    
    // También eliminar reportes asociados
    const reports = this.getItem<any>('post_reports');
    const postIds = posts.filter(p => p.eventBookId === eventBookId).map(p => p.id);
    const remainingReports = reports.filter((report: any) => !postIds.includes(report.postId));
    this.setItem('post_reports', remainingReports);
  }

  // Función para limpiar duplicados basados en event_id
  async cleanupDuplicates(): Promise<{ removed: number; kept: number }> {
    const eventbooks = this.getItem<EventBook>('eventbooks');
    const seen = new Set<string>();
    const uniqueEventbooks: EventBook[] = [];
    let removedCount = 0;

    for (const book of eventbooks) {
      if (!seen.has(book.event_id)) {
        seen.add(book.event_id);
        uniqueEventbooks.push(book);
      } else {
        removedCount++;
        console.log(`Eliminando EventBook duplicado: ${book.name} (ID: ${book.id})`);
        
        // También eliminar posts asociados al EventBook duplicado
        const posts = this.getItem<EventBookPost>('eventbook_posts');
        const remainingPosts = posts.filter(post => post.eventBookId !== book.id);
        this.setItem('eventbook_posts', remainingPosts);
      }
    }

    this.setItem('eventbooks', uniqueEventbooks);
    
    return {
      removed: removedCount,
      kept: uniqueEventbooks.length
    };
  }

  // Función para debugging - ver todos los EventBooks con sus event_id
  async debugEventBooks(): Promise<void> {
    const eventbooks = this.getItem<EventBook>('eventbooks');
    console.log('=== DEBUG: EventBooks en localStorage ===');
    console.log(`Total: ${eventbooks.length}`);
    
    const eventIdCount: Record<string, number> = {};
    
    eventbooks.forEach((book, index) => {
      console.log(`${index + 1}. ${book.name} (ID: ${book.id}) - Event ID: ${book.event_id}`);
      eventIdCount[book.event_id] = (eventIdCount[book.event_id] || 0) + 1;
    });

    console.log('\n=== Duplicados por Event ID ===');
    Object.entries(eventIdCount).forEach(([eventId, count]) => {
      if (count > 1) {
        console.log(`Event ID ${eventId}: ${count} EventBooks (DUPLICADO)`);
      }
    });
  }

  // CRUD para Posts
  async getAllPosts(eventBookId: string): Promise<EventBookPost[]> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    return posts.filter(post => post.eventBookId === eventBookId);
  }

  async createPost(
    eventBookId: string, 
    guestId: string, 
    content: string, 
    mediaFiles?: { type: 'image' | 'video'; url: string; thumbnail?: string }[],
    feeling?: { id: string; emoji: string; name: string; category: 'emotion' },
    authorRole?: 'guest' | 'moderator' | 'admin'
  ): Promise<{ post: EventBookPost; requiresApproval: boolean }> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    
    // Obtener configuración del EventBook
    const eventBooks = this.getItem<EventBook>('eventbooks');
    const eventBook = eventBooks.find(eb => eb.id === eventBookId);
    
    // Determinar si requiere aprobación
    const requiresApproval = Boolean(eventBook?.settings?.functionality?.requirePostApproval) && 
                            authorRole === 'guest';
    
    // Determinar status inicial del post
    const initialStatus: 'pending' | 'published' = requiresApproval ? 'pending' : 'published';
    
    const newPost: EventBookPost = {
      id: crypto.randomUUID(),
      eventBookId,
      guestId,
      content,
      feeling,
      mediaFiles: mediaFiles || [],
      reactions: {},
      comments: [],
      createdAt: new Date().toISOString(),
      isModerated: !requiresApproval, // Si no requiere aprobación, se considera moderado
      status: initialStatus
    };

    posts.push(newPost);
    this.setItem('eventbook_posts', posts);
    
    return { post: newPost, requiresApproval };
  }

  async addReaction(postId: string, guestId: string, reactionType: string): Promise<EventBookPost | null> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return null;

    const post = posts[postIndex];
    
    // Si ya reaccionó con el mismo tipo, quitarla
    if (post.reactions[guestId] === reactionType) {
      delete post.reactions[guestId];
    } else {
      // Agregar o cambiar reacción
      post.reactions[guestId] = reactionType;
    }

    posts[postIndex] = post;
    this.setItem('eventbook_posts', posts);
    
    return post;
  }

  async addComment(postId: string, guestId: string, content: string): Promise<EventBookPost | null> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return null;

    const post = posts[postIndex];
    const newComment = {
      id: crypto.randomUUID(),
      guestId,
      content,
      reactions: {},
      replies: [],
      createdAt: new Date().toISOString()
    };

    post.comments.push(newComment);
    posts[postIndex] = post;
    this.setItem('eventbook_posts', posts);
    
    return post;
  }

  // Responder a un comentario
  async addCommentReply(postId: string, commentId: string, guestId: string, content: string, replyingToName: string): Promise<EventBookPost | null> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return null;
    
    const commentIndex = posts[postIndex].comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return null;
    
    // Asegurar que el array replies existe (para comentarios creados antes de esta funcionalidad)
    if (!posts[postIndex].comments[commentIndex].replies) {
      posts[postIndex].comments[commentIndex].replies = [];
    }
    
    // Migrar respuestas existentes que no tengan la nueva estructura
    posts[postIndex].comments[commentIndex].replies = posts[postIndex].comments[commentIndex].replies.map(reply => {
      if (!reply.replyingToId) {
        return {
          ...reply,
          replyingToId: commentId,
          replies: reply.replies || []
        };
      }
      return reply;
    });
    
    const newReply = {
      id: crypto.randomUUID(),
      guestId,
      content,
      replyingTo: replyingToName,
      replyingToId: commentId, // ID del comentario al que responde
      reactions: {},
      replies: [], // Inicializar array para respuestas anidadas
      createdAt: new Date().toISOString()
    };
    
    posts[postIndex].comments[commentIndex].replies.push(newReply);
    this.setItem('eventbook_posts', posts);
    
    return posts[postIndex];
  }

  // Responder a una respuesta (respuestas anidadas)
  async addNestedReply(postId: string, parentReplyId: string, guestId: string, content: string, replyingToName: string): Promise<EventBookPost | null> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return null;

    // Función recursiva para encontrar y agregar respuesta anidada
    const findAndAddReply = (replies: any[], targetId: string): boolean => {
      for (let i = 0; i < replies.length; i++) {
        if (replies[i].id === targetId) {
          // Encontramos el objetivo, agregar respuesta aquí
          if (!replies[i].replies) {
            replies[i].replies = [];
          }
          
          const newReply = {
            id: crypto.randomUUID(),
            guestId,
            content,
            replyingTo: replyingToName,
            replyingToId: targetId,
            reactions: {},
            replies: [],
            createdAt: new Date().toISOString()
          };
          
          replies[i].replies.push(newReply);
          return true;
        }
        
        // Buscar recursivamente en las respuestas anidadas
        if (replies[i].replies && replies[i].replies.length > 0) {
          if (findAndAddReply(replies[i].replies, targetId)) {
            return true;
          }
        }
      }
      return false;
    };

    // Buscar en todos los comentarios
    let found = false;
    for (const comment of posts[postIndex].comments) {
      if (comment.replies && findAndAddReply(comment.replies, parentReplyId)) {
        found = true;
        break;
      }
    }

    if (!found) return null;

    this.setItem('eventbook_posts', posts);
    return posts[postIndex];
  }

  async reportPost(postId: string, guestId: string, reason: string): Promise<boolean> {
    const reports = this.getItem<any>('post_reports');
    
    const newReport = {
      id: crypto.randomUUID(),
      postId,
      reportedBy: guestId,
      reason,
      createdAt: new Date().toISOString(),
      status: 'pending' // pending, reviewed, resolved
    };

    reports.push(newReport);
    this.setItem('post_reports', reports);
    
    return true;
  }

  // Agregar reacción a un comentario
  async addCommentReaction(postId: string, commentId: string, guestId: string, reactionType: string): Promise<EventBookPost | null> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return null;
    
    const commentIndex = posts[postIndex].comments.findIndex(c => c.id === commentId);
    if (commentIndex === -1) return null;
    
    // Inicializar reactions si no existe (para comentarios existentes)
    if (!posts[postIndex].comments[commentIndex].reactions) {
      posts[postIndex].comments[commentIndex].reactions = {};
    }
    
    // Si el usuario ya reaccionó con el mismo tipo, quitar la reacción
    if (posts[postIndex].comments[commentIndex].reactions[guestId] === reactionType) {
      delete posts[postIndex].comments[commentIndex].reactions[guestId];
    } else {
      // Agregar o cambiar la reacción
      posts[postIndex].comments[commentIndex].reactions[guestId] = reactionType;
    }
    
    this.setItem('eventbook_posts', posts);
    return posts[postIndex];
  }

  // Agregar reacción a una respuesta (función recursiva)
  async addReplyReaction(postId: string, replyId: string, guestId: string, reactionType: string): Promise<EventBookPost | null> {
    const posts = this.getItem<EventBookPost>('eventbook_posts');
    const postIndex = posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) return null;

    // Función recursiva para encontrar y agregar reacción a respuesta
    const findAndAddReaction = (replies: any[], targetId: string): boolean => {
      for (let i = 0; i < replies.length; i++) {
        if (replies[i].id === targetId) {
          // Inicializar reactions si no existe
          if (!replies[i].reactions) {
            replies[i].reactions = {};
          }
          
          // Si el usuario ya reaccionó con el mismo tipo, quitar la reacción
          if (replies[i].reactions[guestId] === reactionType) {
            delete replies[i].reactions[guestId];
          } else {
            // Agregar o cambiar la reacción
            replies[i].reactions[guestId] = reactionType;
          }
          return true;
        }
        
        // Buscar recursivamente en las respuestas anidadas
        if (replies[i].replies && replies[i].replies.length > 0) {
          if (findAndAddReaction(replies[i].replies, targetId)) {
            return true;
          }
        }
      }
      return false;
    };

    // Buscar en todos los comentarios
    let found = false;
    for (const comment of posts[postIndex].comments) {
      if (comment.replies && findAndAddReaction(comment.replies, replyId)) {
        found = true;
        break;
      }
    }

    if (!found) return null;

    this.setItem('eventbook_posts', posts);
    return posts[postIndex];
  }

  // Método para obtener estadísticas del EventBook
  async getEventBookStats(eventBookId: string) {
    const posts = await this.getAllPosts(eventBookId);
    const { guestStorage } = await import('./guest-storage');
    const guests = guestStorage.getAllGuests(eventBookId);
    const reports = this.getItem<any>('post_reports');
    const postIds = posts.map(p => p.id);
    const reportedPosts = reports.filter((report: any) => postIds.includes(report.postId));
    
    return {
      participants: guests.length,
      posts: posts.length,
      photos: posts.filter(post => post.mediaFiles && post.mediaFiles.length > 0).length,
      reported: reportedPosts.length
    };
  }

  // Métodos para manejo de bloqueo de participantes
  async blockParticipant(eventBookId: string, userId: string, blockType: 'total' | 'partial', reason?: string, blockedBy?: string) {
    const eventBooks = await this.getAllEventBooks();
    const eventBookIndex = eventBooks.findIndex(eb => eb.id === eventBookId);
    
    if (eventBookIndex === -1) {
      throw new Error('EventBook no encontrado');
    }

    const eventBook = eventBooks[eventBookIndex];
    
    // Inicializar array si no existe
    if (!eventBook.blockedParticipants) {
      eventBook.blockedParticipants = [];
    }

    // Verificar si ya está bloqueado
    const existingBlockIndex = eventBook.blockedParticipants.findIndex(bp => bp.userId === userId);
    
    const blockData = {
      userId,
      blocked: true,
      blockedType: blockType,
      blockedReason: reason,
      blockedAt: new Date().toISOString(),
      blockedBy: blockedBy || 'system'
    };

    if (existingBlockIndex >= 0) {
      // Actualizar bloqueo existente
      eventBook.blockedParticipants[existingBlockIndex] = blockData;
    } else {
      // Agregar nuevo bloqueo
      eventBook.blockedParticipants.push(blockData);
    }

    eventBooks[eventBookIndex] = eventBook;
    localStorage.setItem('eventbooks', JSON.stringify(eventBooks));
    
    return blockData;
  }

  async unblockParticipant(eventBookId: string, userId: string) {
    const eventBooks = await this.getAllEventBooks();
    const eventBookIndex = eventBooks.findIndex(eb => eb.id === eventBookId);
    
    if (eventBookIndex === -1) {
      throw new Error('EventBook no encontrado');
    }

    const eventBook = eventBooks[eventBookIndex];
    
    if (!eventBook.blockedParticipants) {
      return false;
    }

    // Remover el bloqueo
    eventBook.blockedParticipants = eventBook.blockedParticipants.filter(bp => bp.userId !== userId);
    
    eventBooks[eventBookIndex] = eventBook;
    localStorage.setItem('eventbooks', JSON.stringify(eventBooks));
    
    return true;
  }

  async getParticipantBlockStatus(eventBookId: string, userId: string) {
    const eventBooks = await this.getAllEventBooks();
    const eventBook = eventBooks.find(eb => eb.id === eventBookId);
    
    if (!eventBook || !eventBook.blockedParticipants) {
      return null;
    }

    return eventBook.blockedParticipants.find(bp => bp.userId === userId) || null;
  }

  async isParticipantBlocked(eventBookId: string, userId: string): Promise<{ blocked: boolean; blockType?: 'total' | 'partial' }> {
    const blockStatus = await this.getParticipantBlockStatus(eventBookId, userId);
    
    if (!blockStatus || !blockStatus.blocked) {
      return { blocked: false };
    }

    return {
      blocked: true,
      blockType: blockStatus.blockedType
    };
  }
}

export const eventBookStorage = new EventBookStorage();