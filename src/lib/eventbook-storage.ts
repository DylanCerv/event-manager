import type { EventBook, EventBookPost } from '../types/eventbook';

const API_BASE = import.meta.env.VITE_API_URL as string;

const getAuthHeaders = (): Record<string, string> => {
  const token = sessionStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const getCurrentRole = (): string | null => {
  try {
    const userRaw = sessionStorage.getItem('user');
    if (!userRaw) return null;
    const user = JSON.parse(userRaw);
    return (user?.role?.name || null) as string | null;
  } catch {
    return null;
  }
};

const dataUrlToFile = (dataUrl: string, filename: string): File => {
  const [meta, base64] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:([^;]+);base64/i);
  const mime = mimeMatch?.[1] || 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
};

class EventBookStorage {
  private async uploadFile(eventBookId: string, type: 'image' | 'video', file: File): Promise<string> {
    const form = new FormData();
    form.append('type', type);
    form.append('file', file);

    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/uploads`, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error uploading file');
    }
    const relative = String(json.data.path || json.data.url || '');
    if (!relative.startsWith('/')) return relative;
    return new URL(API_BASE).origin + relative;
  }

  private async normalizeMediaFiles(
    eventBookId: string,
    mediaFiles?: { type: 'image' | 'video'; url: string; thumbnail?: string }[]
  ): Promise<{ type: 'image' | 'video'; url: string; thumbnail?: string }[]> {
    if (!mediaFiles || mediaFiles.length === 0) return [];

    return await Promise.all(
      mediaFiles.map(async (m, idx) => {
        let url = m.url;
        let thumbnail = m.thumbnail;

        if (url?.startsWith('data:')) {
          const ext = m.type === 'video' ? 'mp4' : 'jpg';
          const file = dataUrlToFile(url, `post_${idx}.${ext}`);
          url = await this.uploadFile(eventBookId, m.type, file);
        }
        if (thumbnail?.startsWith('data:')) {
          const file = dataUrlToFile(thumbnail, `thumb_${idx}.jpg`);
          thumbnail = await this.uploadFile(eventBookId, 'image', file);
        }

        return { ...m, url, thumbnail };
      })
    );
  }
  async getAllEventBooks(): Promise<EventBook[]> {
    const role = (getCurrentRole() || '').toUpperCase();
    const scope = role === 'MODERATOR' ? 'assigned' : undefined;
    const url = scope ? `${API_BASE}/event-books?scope=${encodeURIComponent(scope)}` : `${API_BASE}/event-books`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error loading EventBooks');
    }
    return json.data as EventBook[];
  }

  async getEventBooksByUser(_userId?: string): Promise<EventBook[]> {
    const response = await fetch(`${API_BASE}/event-books`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error loading EventBooks');
    }
    return json.data as EventBook[];
  }

  async getEventBookById(id: string): Promise<EventBook> {
    const response = await fetch(`${API_BASE}/event-books/${id}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error loading EventBook');
    }
    return json.data as EventBook;
  }

  async getPublicEventBook(ownerSlug: string, eventSlug: string): Promise<EventBook> {
    const response = await fetch(`${API_BASE}/event-books/public/${encodeURIComponent(ownerSlug)}/${encodeURIComponent(eventSlug)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'EventBook not available');
    }
    return json.data as EventBook;
  }

  async createEventBook(
    data: Omit<EventBook, 'id' | 'createdAt' | 'stats' | 'slug' | 'publicUrl' | 'created_by'>
  ): Promise<EventBook> {
    const response = await fetch(`${API_BASE}/event-books`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        bolt_event_id: Number(data.event_id),
        name: data.name,
        description: data.description,
        cover_image: data.coverImage,
        max_participants: data.maxParticipants,
        settings: data.settings,
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error creating EventBook');
    }
    return json.data as EventBook;
  }

  async updateEventBook(id: string, updates: Partial<EventBook>): Promise<EventBook | null> {
    // If moderatorProfilePhoto is still base64, upload and replace with URL
    let settingsPayload: any = updates.settings;
    const maybePhoto = updates.settings?.customization?.moderatorProfilePhoto;
    if (typeof maybePhoto === 'string' && maybePhoto.startsWith('data:')) {
      const file = dataUrlToFile(maybePhoto, 'moderator_profile.jpg');
      const url = await this.uploadFile(id, 'image', file);
      settingsPayload = {
        ...updates.settings,
        customization: {
          ...(updates.settings?.customization || {}),
          moderatorProfilePhoto: url,
        },
      };
    }

    const response = await fetch(`${API_BASE}/event-books/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.description !== undefined ? { description: updates.description } : {}),
        ...(updates.coverImage !== undefined ? { cover_image: updates.coverImage } : {}),
        ...(updates.maxParticipants !== undefined ? { max_participants: updates.maxParticipants } : {}),
        ...(updates.isActive !== undefined ? { is_active: updates.isActive } : {}),
        ...(updates.moderationEnabled !== undefined ? { moderation_enabled: updates.moderationEnabled } : {}),
        ...(updates.settings !== undefined ? { settings: settingsPayload } : {}),
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error updating EventBook');
    }
    return json.data as EventBook;
  }

  async deleteEventBook(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/event-books/${id}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as any)?.message || 'Error deleting EventBook');
    }
  }

  // Backwards-compat no-op (kept for call sites)
  async archiveEventBookPosts(_eventBookId: string): Promise<void> {
    return;
  }

  // CRUD para Posts
  async getBackupPosts(eventBookId: string): Promise<EventBookPost[]> {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/backup/posts`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as any)?.message || 'Error loading backup posts');
    }
    return (json as any).data as EventBookPost[];
  }

  async getAllPosts(eventBookId: string): Promise<EventBookPost[]> {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/posts`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await response.json().catch(() => ({}));
    if (response.ok) {
      return (json as any).data as EventBookPost[];
    }

    // If the EventBook is closed/inactive, public endpoint returns 404.
    // Fallback to authenticated backup endpoint (creator/moderator/superadmin).
    const message = String((json as any)?.message || '');
    if (response.status === 404 && message.toLowerCase().includes('not available')) {
      const backupRes = await fetch(`${API_BASE}/event-books/${eventBookId}/backup/posts`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
      });
      const backupJson = await backupRes.json().catch(() => ({}));
      if (backupRes.ok) {
        return (backupJson as any).data as EventBookPost[];
      }
    }

    throw new Error(message || 'Error loading posts');
  }

  async createPost(
    eventBookId: string, 
    guestId: string, 
    content: string, 
    mediaFiles?: { type: 'image' | 'video'; url: string; thumbnail?: string }[],
    feeling?: { id: string; emoji: string; name: string; category: 'emotion' },
    authorRole?: 'guest' | 'moderator' | 'admin',
    postMeta?: { moderatorPost?: boolean; isHighlighted?: boolean; isAnnouncement?: boolean }
  ): Promise<{ post: EventBookPost; requiresApproval: boolean }> {
    const normalizedMedia = await this.normalizeMediaFiles(eventBookId, mediaFiles);
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        content,
        feeling,
        media_files: normalizedMedia,
        author_role: authorRole,
        ...(postMeta?.moderatorPost !== undefined ? { moderator_post: postMeta.moderatorPost } : {}),
        ...(postMeta?.isHighlighted !== undefined ? { is_highlighted: postMeta.isHighlighted } : {}),
        ...(postMeta?.isAnnouncement !== undefined ? { is_announcement: postMeta.isAnnouncement } : {}),
      }),
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error creating post');
    }
    return {
      post: json.data.post as EventBookPost,
      requiresApproval: Boolean(json.data.requiresApproval),
    };
  }

  async addReaction(postId: string, guestId: string, reactionType: string): Promise<EventBookPost | null> {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        reaction_type: reactionType,
      }),
    });
    const json = await response.json();
    if (!response.ok) return null;
    return json.data as EventBookPost;
  }

  async addComment(postId: string, guestId: string, content: string): Promise<EventBookPost | null> {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        content,
      }),
    });
    const json = await response.json();
    if (!response.ok) return null;
    return json.data as EventBookPost;
  }

  // Responder a un comentario
  async addCommentReply(postId: string, commentId: string, guestId: string, content: string, replyingToName: string): Promise<EventBookPost | null> {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        content,
        parent_comment_id: commentId,
        replying_to_comment_id: commentId,
        replying_to_name: replyingToName,
      }),
    });
    const json = await response.json();
    if (!response.ok) return null;
    return json.data as EventBookPost;
  }

  // Responder a una respuesta (respuestas anidadas)
  async addNestedReply(postId: string, parentReplyId: string, guestId: string, content: string, replyingToName: string): Promise<EventBookPost | null> {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        content,
        parent_comment_id: parentReplyId,
        replying_to_comment_id: parentReplyId,
        replying_to_name: replyingToName,
      }),
    });
    const json = await response.json();
    if (!response.ok) return null;
    return json.data as EventBookPost;
  }

  async reportPost(postId: string, guestId: string, reason: string): Promise<boolean> {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        reason,
      }),
    });
    return response.ok;
  }

  // Agregar reacción a un comentario
  async addCommentReaction(_postId: string, commentId: string, guestId: string, reactionType: string): Promise<EventBookPost | null> {
    const response = await fetch(`${API_BASE}/event-books/comments/${commentId}/reactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        participant_id: guestId,
        reaction_type: reactionType,
      }),
    });
    const json = await response.json();
    if (!response.ok) return null;
    return json.data as EventBookPost;
  }

  // Agregar reacción a una respuesta (función recursiva)
  async addReplyReaction(postId: string, replyId: string, guestId: string, reactionType: string): Promise<EventBookPost | null> {
    return this.addCommentReaction(postId, replyId, guestId, reactionType);
  }

  async getEventBookStats(eventBookId: string) {
    const book = await this.getEventBookById(eventBookId);
    return book.stats;
  }

  // Métodos para manejo de bloqueo de participantes
  async blockParticipant(eventBookId: string, userId: string, blockType: 'total' | 'partial', reason?: string, _blockedBy?: string) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/participants/${userId}/block`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        blocked_type: blockType,
        blocked_reason: reason,
      }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error((json as any)?.message || 'Error blocking participant');
    }
    return {
      userId,
      blocked: true,
      blockedType: blockType,
      blockedReason: reason,
      blockedAt: new Date().toISOString(),
      blockedBy: _blockedBy || 'system',
    };
  }

  async unblockParticipant(eventBookId: string, userId: string) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/participants/${userId}/block`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
    });
    return response.ok;
  }

  async getParticipantBlockStatus(eventBookId: string, userId: string) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/participants/${userId}/block-status`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    const json = await response.json();
    if (!response.ok) return null;
    if (!json?.data?.blocked) return null;
    return {
      userId,
      blocked: true,
      blockedType: json.data.blockType as 'total' | 'partial',
      blockedReason: json.data.blockedReason,
      blockedAt: '',
      blockedBy: 'system',
    };
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

  async getModerationFeed(eventBookId: string): Promise<{ posts: EventBookPost[]; reports: any[] }> {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/moderation/posts`, {
      method: 'GET',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error loading moderation feed');
    }
    return json.data as { posts: EventBookPost[]; reports: any[] };
  }

  async ensureModeratorParticipant(eventBookId: string) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/moderation/moderator-participant`, {
      method: 'POST',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json?.message || 'Error ensuring moderator participant');
    return json.data;
  }

  async assignModerator(eventBookId: string, userId: number) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/moderators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ user_id: userId }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any)?.message || 'Error assigning moderator');
  }

  async revokeModerator(eventBookId: string, userId: number) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/moderators/${userId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any)?.message || 'Error revoking moderator');
  }

  async setActivationAsModerator(eventBookId: string, isActive: boolean) {
    const response = await fetch(`${API_BASE}/event-books/${eventBookId}/moderation/activation`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ is_active: isActive }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any)?.message || 'Error updating activation');
    return Boolean((json as any)?.data?.isActive);
  }

  async publishPost(postId: string) {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}/publish`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any)?.message || 'Error publishing post');
  }

  async deletePost(postId: string) {
    const response = await fetch(`${API_BASE}/event-books/posts/${postId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any)?.message || 'Error deleting post');
  }

  async resolveReport(reportId: string) {
    const response = await fetch(`${API_BASE}/event-books/reports/${reportId}/resolve`, {
      method: 'PATCH',
      headers: { Accept: 'application/json', ...getAuthHeaders() },
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error((json as any)?.message || 'Error resolving report');
  }
}

export const eventBookStorage = new EventBookStorage();