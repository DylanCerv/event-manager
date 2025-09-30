import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  BookOpen,
  MessageSquare,
  Users,
  Clock,
  User,
  Eye,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Search,
  ChevronDown,
  Shield,
  ShieldOff,
  ChevronLeft,
  ChevronRight,
  Camera,
  Send,
  Image,
  Video,
  Smile,
  Star,
  Megaphone,
  Info
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventBookStorage } from '../lib/eventbook-storage';
import { guestStorage } from '../lib/guest-storage';
import { rolesStorage } from '../lib/roles-storage';
import type { EventBook, EventBookPost } from '../types/eventbook';
import type { EventBookGuest } from '../lib/guest-storage';
import { ParticipantBlockModal } from '../components/ParticipantBlockModal';
import { FeelingPicker, type Feeling } from '../components/FeelingPicker';

type TabType = 'info' | 'posts' | 'participants';
type PostFilter = 'all' | 'pending' | 'reported';
type ParticipantFilter = 'all' | 'active' | 'with_posts' | 'without_posts';
type ParticipantSort = 'name' | 'activity' | 'registration';

interface ParticipantData {
  id: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  isActive: boolean;
  lastActivity: string;
  registrationDate: string;
  postCount: number;
  isBlocked?: boolean;
  blockedType?: 'total' | 'partial';
  blockedReason?: string;
  blockedAt?: string;
}

export function ModeradorEventBook() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [eventBook, setEventBook] = React.useState<EventBook | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>('info');
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasAccess, setHasAccess] = React.useState(false);
  const [realStats, setRealStats] = React.useState({
    totalParticipants: 0,
    totalPosts: 0,
    pendingPosts: 0,
    reportedPosts: 0
  });
  
  // Estados para la pestaña Posts del Muro
  const [posts, setPosts] = React.useState<EventBookPost[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [guests, setGuests] = React.useState<EventBookGuest[]>([]);
  const [activeFilter, setActiveFilter] = React.useState<PostFilter>('all');
  const [isLoadingPosts, setIsLoadingPosts] = React.useState(false);
  
  // Estados para la pestaña de Participantes
  const [participants, setParticipants] = React.useState<ParticipantData[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = React.useState(false);
  const [participantFilter, setParticipantFilter] = React.useState<ParticipantFilter>('all');
  const [participantSort, setParticipantSort] = React.useState<'name' | 'activity' | 'registration'>('activity');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 20;
  
  // Estados para el modal de bloqueo
  const [blockModalOpen, setBlockModalOpen] = React.useState(false);
  const [selectedParticipant, setSelectedParticipant] = React.useState<ParticipantData | null>(null);

  // Estados para expansión inline de posts por participante
  const [expandedParticipant, setExpandedParticipant] = React.useState<string | null>(null);
  const [participantPosts, setParticipantPosts] = React.useState<Record<string, EventBookPost[]>>({});
  const [loadingParticipantPosts, setLoadingParticipantPosts] = React.useState<Record<string, boolean>>({});
  const [participantPostsPage, setParticipantPostsPage] = React.useState<Record<string, number>>({});
  const [participantPostsError, setParticipantPostsError] = React.useState<Record<string, string>>({});

  // Estados para confirmaciones y notificaciones
  const [confirmAction, setConfirmAction] = React.useState<{
    type: 'delete' | 'publish' | 'ignore';
    postId: string;
    message: string;
  } | null>(null);
  const [toast, setToast] = React.useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Estados para el composer del moderador
  const [moderatorPostContent, setModeratorPostContent] = React.useState('');
  const [moderatorMediaFiles, setModeratorMediaFiles] = React.useState<{ type: 'image' | 'video'; url: string; thumbnail?: string }[]>([]);
  const [moderatorSelectedFeeling, setModeratorSelectedFeeling] = React.useState<Feeling | null>(null);
  const [moderatorShowFeelingPicker, setModeratorShowFeelingPicker] = React.useState(false);
  const [moderatorPostType, setModeratorPostType] = React.useState<'normal' | 'highlighted' | 'announcement'>('normal');
  const [isSubmittingModeratorPost, setIsSubmittingModeratorPost] = React.useState(false);
  const moderatorFileInputRef = React.useRef<HTMLInputElement>(null);
  const moderatorVideoInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadEventBookData();
  }, [id, user]);

  React.useEffect(() => {
    if (eventBook) {
      loadRealStats();
    }
  }, [eventBook]);

  React.useEffect(() => {
    if (eventBook && activeTab === 'posts') {
      loadPostsAndReports();
    }
  }, [eventBook, activeTab]);

  // Efecto para cargar participantes cuando se cambia a la pestaña
  React.useEffect(() => {
    if (activeTab === 'participants') {
      loadParticipants();
    }
  }, [activeTab, eventBook]);

  // Recargar participantes cada 30 segundos para simular tiempo real (igual que el muro público)
  React.useEffect(() => {
    if (activeTab === 'participants' && eventBook) {
      const interval = setInterval(() => {
        loadParticipants();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [activeTab, eventBook]);

  const loadEventBookData = async () => {
    if (!id || !user?.id) return;

    try {
      setIsLoading(true);

      // Verificar que el moderador tenga acceso a este EventBook
      const allAccesses = await rolesStorage.getUserAccesses('all');
      const currentUserAccess = allAccesses.find(access => access.id === user.id);
      
      if (!currentUserAccess || !currentUserAccess.assignedEventBooks?.includes(id)) {
        setHasAccess(false);
        setIsLoading(false);
        return;
      }

      setHasAccess(true);

      // Cargar datos del EventBook
      const allEventBooks = await eventBookStorage.getAllEventBooks();
      const eventBookData = allEventBooks.find(eb => eb.id === id);
      setEventBook(eventBookData || null);
    } catch (error) {
      console.error('Error loading EventBook data:', error);
      setHasAccess(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRealStats = async () => {
    if (!eventBook) return;

    try {
      // Cargar datos reales
      const allPosts = await eventBookStorage.getAllPosts(eventBook.id);
      
      // Obtener reportes desde localStorage directamente
      const allReports = JSON.parse(localStorage.getItem('post_reports') || '[]');
      
      // Filtrar reportes que corresponden a posts de este EventBook
      const eventBookReports = allReports.filter((report: any) => {
        return allPosts.some(post => post.id === report.postId);
      });

      // Calcular participantes únicos basándose en los guestId de los posts
      const uniqueParticipants = new Set<string>();
      allPosts.forEach(post => {
        uniqueParticipants.add(post.guestId);
        post.comments.forEach(comment => {
          uniqueParticipants.add(comment.guestId);
          comment.replies.forEach(reply => {
            if (reply.replies) {
              reply.replies.forEach(nestedReply => {
                uniqueParticipants.add(nestedReply.guestId);
              });
            }
          });
        });
      });

      // Contar posts según su status
      const publishedPosts = allPosts.filter(post => post.status === 'published').length;
      const pendingPosts = allPosts.filter(post => post.status === 'pending').length;

      // Contar reportes pendientes
      const pendingReports = eventBookReports.filter(report => report.status === 'pending').length;

      setRealStats({
        totalParticipants: uniqueParticipants.size,
        totalPosts: publishedPosts, // Solo contar posts publicados en el total
        pendingPosts,
        reportedPosts: pendingReports
      });

    } catch (error) {
      console.error('Error loading real stats:', error);
    }
  };

  // Cargar invitados
  const loadGuests = async () => {
    console.log('=== INICIO loadGuests ===');
    if (!eventBook) {
      console.error('No hay eventBook definido');
      return;
    }
    
    try {
      console.log(`Buscando invitados para EventBook: ${eventBook.id}`);
      const guestsData = await guestStorage.getAllGuests(eventBook.id);
      console.log(`Se encontraron ${guestsData.length} invitados`);
      setGuests(guestsData);
    } catch (error) {
      console.error('Error cargando invitados:', error);
    }
  };

  // Cargar participantes con datos completos (usando la misma lógica que el muro público)
  const loadParticipants = async () => {
    if (!eventBook) {
      console.error('No hay eventBook definido');
      return;
    }
    
    setIsLoadingParticipants(true);
    try {
      // Usar la misma fuente de datos que el muro público
      const guestsData = guestStorage.getAllGuests(eventBook.id);
      const allPosts = await eventBookStorage.getAllPosts(eventBook.id);
      
      // Obtener datos de bloqueo del EventBook actual
      const eventBooks = await eventBookStorage.getAllEventBooks();
      const currentEventBook = eventBooks.find(eb => eb.id === eventBook.id);
      const blockedUsers = currentEventBook?.blockedParticipants || [];
      
      // Procesar participantes con la misma lógica que EventBookUsersSidebar
      const participantsData: ParticipantData[] = guestsData.map(guest => {
        const userPosts = allPosts.filter(post => post.guestId === guest.id);
        const blockedInfo = blockedUsers.find(bu => bu.userId === guest.id);
        const lastActiveTime = new Date(guest.lastActiveAt).getTime();
        const now = new Date().getTime();
        const isActive = (now - lastActiveTime) < 5 * 60 * 1000; // Activo si estuvo en los últimos 5 minutos
        
        let displayName = '';
        if (guest.firstName && guest.lastName) {
          displayName = `${guest.firstName} ${guest.lastName}`;
        } else if (guest.firstName) {
          displayName = guest.firstName;
        } else if (guest.lastName) {
          displayName = guest.lastName;
        } else {
          displayName = `Usuario ${guest.id.slice(0, 8)}`;
        }
        
        return {
          id: guest.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          displayName,
          isActive,
          lastActivity: guest.lastActiveAt,
          registrationDate: guest.registeredAt,
          postCount: userPosts.length,
          isBlocked: blockedInfo?.blocked || false,
          blockedType: blockedInfo?.blockedType,
          blockedReason: blockedInfo?.blockedReason,
          blockedAt: blockedInfo?.blockedAt
        };
      });
      
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading participants:', error);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  // Función helper para obtener el nombre completo del usuario
  const getUserDisplayName = (guestId: string): string => {
    const guest = guests.find(g => g.id === guestId);
    const systemId = `Usuario ${guestId.slice(0, 8)}`;
    
    if (guest && guest.firstName && guest.lastName) {
      return `${systemId} (${guest.firstName} ${guest.lastName})`;
    }
    
    return systemId;
  };

  // Funciones de confirmación
  const showConfirmation = (type: 'delete' | 'publish' | 'ignore', postId: string) => {
    const messages = {
      delete: '¿Eliminar esta publicación? Esta acción no se puede deshacer.',
      publish: '¿Publicar esta publicación?',
      ignore: '¿Marcar este reporte como resuelto y mantener la publicación?'
    };
    
    setConfirmAction({
      type,
      postId,
      message: messages[type]
    });
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const executeConfirmedAction = async () => {
    if (!confirmAction) return;
    
    const { type, postId } = confirmAction;
    setConfirmAction(null);
    
    try {
      switch (type) {
        case 'delete':
          await executeDeletePost(postId);
          break;
        case 'publish':
          await executePublishPost(postId);
          break;
        case 'ignore':
          await executeIgnoreReport(postId);
          break;
      }
    } catch (error) {
      console.error(`Error executing ${type} action:`, error);
      showToast('error', 'Error al ejecutar la acción. Inténtalo de nuevo.');
    }
  };

  // Cargar posts y reportes
  const loadPostsAndReports = async () => {
    if (!eventBook) return;
    
    setIsLoadingPosts(true);
    try {
      // Cargar posts
      const postsData = await eventBookStorage.getAllPosts(eventBook.id);
      
      // Cargar reportes desde localStorage directamente
      const allReports = JSON.parse(localStorage.getItem('post_reports') || '[]');
      
      // Filtrar reportes que corresponden a posts de este EventBook
      const reportsData = allReports.filter((report: any) => {
        return postsData.some(post => post.id === report.postId);
      });
      
      setPosts(postsData);
      setReports(reportsData);
      
      // También cargar invitados para mostrar nombres reales
      await loadGuests();
    } catch (error) {
      console.error('Error loading posts and reports:', error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const executeDeletePost = async (postId: string) => {
    try {
      // Eliminar el post del localStorage directamente
      const allPosts = JSON.parse(localStorage.getItem('eventbook_posts') || '[]');
      const updatedPosts = allPosts.filter((post: any) => post.id !== postId);
      localStorage.setItem('eventbook_posts', JSON.stringify(updatedPosts));
      
      // También eliminar reportes asociados
      const allReports = JSON.parse(localStorage.getItem('post_reports') || '[]');
      const updatedReports = allReports.filter((report: any) => report.postId !== postId);
      localStorage.setItem('post_reports', JSON.stringify(updatedReports));
      
      // Recargar datos completos para mantener sincronización
      await Promise.all([loadRealStats(), loadPostsAndReports()]);
      
      showToast('success', 'Publicación eliminada correctamente.');
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('error', 'Error al eliminar la publicación.');
      throw error;
    }
  };

  const executePublishPost = async (postId: string) => {
    try {
      // Aprobar/publicar el post en localStorage
      const allPosts = JSON.parse(localStorage.getItem('eventbook_posts') || '[]');
      const updatedPosts = allPosts.map((post: any) => 
        post.id === postId ? { ...post, status: 'published', isModerated: true } : post
      );
      localStorage.setItem('eventbook_posts', JSON.stringify(updatedPosts));
      
      // Recargar datos completos para mantener sincronización
      await Promise.all([loadRealStats(), loadPostsAndReports()]);
      
      showToast('success', 'Publicación aprobada y publicada.');
    } catch (error) {
      console.error('Error publishing post:', error);
      showToast('error', 'Error al publicar la publicación.');
      throw error;
    }
  };

  const executeIgnoreReport = async (postId: string) => {
    try {
      // Resolver el reporte en localStorage
      const allReports = JSON.parse(localStorage.getItem('post_reports') || '[]');
      const updatedReports = allReports.map((report: any) => 
        report.postId === postId ? { ...report, status: 'resolved' } : report
      );
      localStorage.setItem('post_reports', JSON.stringify(updatedReports));
      
      // Recargar datos completos para mantener sincronización
      await Promise.all([loadRealStats(), loadPostsAndReports()]);
      
      showToast('success', 'Reporte marcado como resuelto.');
    } catch (error) {
      console.error('Error ignoring report:', error);
      showToast('error', 'Error al resolver el reporte.');
      throw error;
    }
  };

  const handleDeletePost = (postId: string) => {
    showConfirmation('delete', postId);
  };

  const handlePublishPost = (postId: string) => {
    showConfirmation('publish', postId);
  };

  const handleIgnoreReport = (postId: string) => {
    showConfirmation('ignore', postId);
  };

  // Funciones para manejo de participantes
  const handleBlockUser = async (participantId: string) => {
    if (!eventBook) return;
    
    const confirmed = window.confirm('¿Estás seguro de que quieres bloquear a este usuario?');
    if (!confirmed) return;
    
    try {
      // Actualizar datos de bloqueo en localStorage
      const eventBooks = JSON.parse(localStorage.getItem('eventbooks') || '[]');
      const eventBookIndex = eventBooks.findIndex((eb: any) => eb.id === eventBook.id);
      
      if (eventBookIndex !== -1) {
        if (!eventBooks[eventBookIndex].blockedParticipants) {
          eventBooks[eventBookIndex].blockedParticipants = [];
        }
        
        const existingBlockIndex = eventBooks[eventBookIndex].blockedParticipants
          .findIndex((bp: any) => bp.id === participantId);
        
        if (existingBlockIndex !== -1) {
          // Actualizar bloqueo existente
          eventBooks[eventBookIndex].blockedParticipants[existingBlockIndex] = {
            id: participantId,
            blocked: true,
            blockedType: 'total',
            blockedAt: new Date().toISOString()
          };
        } else {
          // Agregar nuevo bloqueo
          eventBooks[eventBookIndex].blockedParticipants.push({
            id: participantId,
            blocked: true,
            blockedType: 'total',
            blockedAt: new Date().toISOString()
          });
        }
        
        localStorage.setItem('eventbooks', JSON.stringify(eventBooks));
        
        // Recargar participantes para reflejar cambios
        await loadParticipants();
        
        showToast('success', 'Usuario bloqueado correctamente.');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      showToast('error', 'Error al bloquear el usuario.');
    }
  };

  const handleUnblockUser = async (participantId: string) => {
    if (!eventBook) return;
    
    try {
      // Actualizar datos de bloqueo en localStorage
      const eventBooks = JSON.parse(localStorage.getItem('eventbooks') || '[]');
      const eventBookIndex = eventBooks.findIndex((eb: any) => eb.id === eventBook.id);
      
      if (eventBookIndex !== -1 && eventBooks[eventBookIndex].blockedParticipants) {
        const blockIndex = eventBooks[eventBookIndex].blockedParticipants
          .findIndex((bp: any) => bp.id === participantId);
        
        if (blockIndex !== -1) {
          eventBooks[eventBookIndex].blockedParticipants[blockIndex].blocked = false;
          localStorage.setItem('eventbooks', JSON.stringify(eventBooks));
          
          // Recargar participantes para reflejar cambios
          await loadParticipants();
          
          showToast('success', 'Usuario desbloqueado correctamente.');
        }
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      showToast('error', 'Error al desbloquear el usuario.');
    }
  };

  // Función para alternar la expansión de posts de un participante
  const handleToggleParticipantPosts = async (participantId: string) => {
    if (expandedParticipant === participantId) {
      // Colapsar si ya está expandido
      setExpandedParticipant(null);
      return;
    }

    // Expandir y cargar posts
    setExpandedParticipant(participantId);
    
    // Si ya tenemos posts cargados, no volver a cargar
    if (participantPosts[participantId] && participantPosts[participantId].length > 0) {
      return;
    }

    await loadParticipantPosts(participantId, 1);
  };

  // Función para cargar posts de un participante específico
  const loadParticipantPosts = async (participantId: string, page: number) => {
    if (!eventBook) return;

    setLoadingParticipantPosts(prev => ({ ...prev, [participantId]: true }));
    setParticipantPostsError(prev => ({ ...prev, [participantId]: '' }));

    try {
      // Cargar todos los posts del EventBook
      const allPosts = await eventBookStorage.getAllPosts(eventBook.id);
      
      // Filtrar posts del participante específico
      const userPosts = allPosts
        .filter(post => post.guestId === participantId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Paginado: 4 posts por página
      const postsPerPage = 4;
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = userPosts.slice(0, endIndex); // Acumulativo para "Ver más"

      setParticipantPosts(prev => ({
        ...prev,
        [participantId]: paginatedPosts
      }));

      setParticipantPostsPage(prev => ({
        ...prev,
        [participantId]: page
      }));

    } catch (error) {
      console.error('Error loading participant posts:', error);
      setParticipantPostsError(prev => ({
        ...prev,
        [participantId]: 'Error al cargar las publicaciones. Inténtalo de nuevo.'
      }));
    } finally {
      setLoadingParticipantPosts(prev => ({ ...prev, [participantId]: false }));
    }
  };

  // Función para cargar más posts (paginado incremental)
  const handleLoadMoreParticipantPosts = async (participantId: string) => {
    const currentPage = participantPostsPage[participantId] || 1;
    await loadParticipantPosts(participantId, currentPage + 1);
  };

  // Función para reintentar cargar posts en caso de error
  const handleRetryParticipantPosts = async (participantId: string) => {
    await loadParticipantPosts(participantId, 1);
  };

  const handleViewUserPosts = () => {
    // TODO: Implementar navegación a posts filtrados por usuario
    console.log('Ver posts del usuario');
  };

  // Funciones para el sistema de bloqueo
  const handleBlockParticipant = (participant: ParticipantData) => {
    setSelectedParticipant(participant);
    setBlockModalOpen(true);
  };

  const handleConfirmBlock = async (blockType: 'total' | 'partial', reason?: string) => {
    if (!selectedParticipant || !eventBook || !user) return;

    try {
      await eventBookStorage.blockParticipant(
        eventBook.id,
        selectedParticipant.id,
        blockType,
        reason,
        user.id
      );

      // Actualizar la lista de participantes
      await loadParticipants();

      // Mostrar notificación de éxito
      setToast({
        type: 'success',
        message: `Participante bloqueado exitosamente (${blockType === 'total' ? 'Total' : 'Parcial'})`
      });

      setBlockModalOpen(false);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Error blocking participant:', error);
      setToast({
        type: 'error',
        message: 'Error al bloquear participante'
      });
    }
  };

  const handleUnblockParticipant = async () => {
    if (!selectedParticipant || !eventBook) return;

    try {
      await eventBookStorage.unblockParticipant(eventBook.id, selectedParticipant.id);

      // Actualizar la lista de participantes
      await loadParticipants();

      // Mostrar notificación de éxito
      setToast({
        type: 'success',
        message: 'Participante desbloqueado exitosamente'
      });

      setBlockModalOpen(false);
      setSelectedParticipant(null);
    } catch (error) {
      console.error('Error unblocking participant:', error);
      setToast({
        type: 'error',
        message: 'Error al desbloquear participante'
      });
    }
  };

  // Funciones para el composer del moderador
  const handleModeratorImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setModeratorMediaFiles(prev => [...prev, {
              type: 'image',
              url: event.target!.result as string
            }]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleModeratorVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setModeratorMediaFiles(prev => [...prev, {
              type: 'video',
              url: event.target!.result as string
            }]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleRemoveModeratorMedia = (index: number) => {
    setModeratorMediaFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitModeratorPost = async () => {
    if (!moderatorPostContent.trim() && moderatorMediaFiles.length === 0) return;
    if (!eventBook || !user) return;

    setIsSubmittingModeratorPost(true);
    try {
      // Obtener el nombre personalizado del moderador desde la configuración
      const moderatorDisplayName = eventBook.settings.customization?.organizerDisplayName || 'Moderador';
      const moderatorPhoto = eventBook.settings.customization?.moderatorProfilePhoto;
      
      console.log('🔍 Configuración del moderador:', {
        displayName: moderatorDisplayName,
        hasPhoto: !!moderatorPhoto,
        photoLength: moderatorPhoto?.length
      });
      
      // Buscar guest existente del moderador
      let moderatorGuest = guestStorage.getAllGuests(eventBook.id).find(g => 
        g.moderatorUserId === user.id
      );
      
      console.log('🔍 Guest del moderador encontrado:', moderatorGuest);
      
      // Si existe un guest pero no tiene la imagen actual, actualizar directamente
      if (moderatorGuest && moderatorGuest.profilePhoto !== moderatorPhoto) {
        console.log('🔄 Actualizando imagen del guest del moderador...');
        
        // Actualizar directamente sin eliminar el guest
        const guests = JSON.parse(localStorage.getItem(`eventbook_guests_${eventBook.id}`) || '[]');
        const guestIndex = guests.findIndex((g: any) => g.id === moderatorGuest!.id);
        if (guestIndex !== -1) {
          guests[guestIndex].profilePhoto = moderatorPhoto;
          localStorage.setItem(`eventbook_guests_${eventBook.id}`, JSON.stringify(guests));
          moderatorGuest.profilePhoto = moderatorPhoto;
          console.log('✅ Imagen del guest del moderador actualizada');
        }
      }
      
      if (!moderatorGuest) {
        // Crear guest especial para el moderador usando el nombre personalizado
        moderatorGuest = guestStorage.registerGuest(
          eventBook.id, 
          moderatorDisplayName, 
          '',
          eventBook.settings.customization?.moderatorProfilePhoto
        );
        
        // Actualizar el guest con un ID especial en localStorage para identificarlo
        const guests = JSON.parse(localStorage.getItem(`eventbook_guests_${eventBook.id}`) || '[]');
        const guestIndex = guests.findIndex((g: any) => g.id === moderatorGuest!.id);
        if (guestIndex !== -1) {
          guests[guestIndex].moderatorUserId = user.id;
          localStorage.setItem(`eventbook_guests_${eventBook.id}`, JSON.stringify(guests));
        }
        
        console.log('✅ Guest del moderador creado:', moderatorGuest);
      } else {
        // Actualizar el nombre y foto del guest existente si cambió la configuración
        const guests = JSON.parse(localStorage.getItem(`eventbook_guests_${eventBook.id}`) || '[]');
        const guestIndex = guests.findIndex((g: any) => g.id === moderatorGuest!.id);
        if (guestIndex !== -1) {
          let needsUpdate = false;
          
          if (guests[guestIndex].firstName !== moderatorDisplayName) {
            guests[guestIndex].firstName = moderatorDisplayName;
            guests[guestIndex].lastName = '';
            moderatorGuest.firstName = moderatorDisplayName;
            moderatorGuest.lastName = '';
            needsUpdate = true;
          }
          
          if (guests[guestIndex].profilePhoto !== eventBook.settings.customization?.moderatorProfilePhoto) {
            guests[guestIndex].profilePhoto = eventBook.settings.customization?.moderatorProfilePhoto;
            moderatorGuest.profilePhoto = eventBook.settings.customization?.moderatorProfilePhoto;
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            localStorage.setItem(`eventbook_guests_${eventBook.id}`, JSON.stringify(guests));
            console.log('✅ Guest del moderador actualizado:', moderatorGuest);
          }
        }
      }

      const { post } = await eventBookStorage.createPost(
        eventBook.id,
        moderatorGuest.id, // Usar ID del guest del moderador
        moderatorPostContent,
        moderatorMediaFiles.length > 0 ? moderatorMediaFiles : undefined,
        moderatorSelectedFeeling || undefined,
        'moderator'
      );

      // Actualizar el post con los campos específicos del moderador
      const posts = JSON.parse(localStorage.getItem('eventbook_posts') || '[]');
      const postIndex = posts.findIndex((p: any) => p.id === post.id);
      if (postIndex !== -1) {
        posts[postIndex] = {
          ...posts[postIndex],
          moderatorPost: true,
          isHighlighted: moderatorPostType === 'highlighted',
          isAnnouncement: moderatorPostType === 'announcement'
        };
        localStorage.setItem('eventbook_posts', JSON.stringify(posts));
      }

      // Limpiar el composer
      setModeratorPostContent('');
      setModeratorMediaFiles([]);
      setModeratorSelectedFeeling(null);
      setModeratorPostType('normal');

      // Recargar estadísticas
      await loadRealStats();

      showToast('success', 'Post publicado exitosamente');
    } catch (error) {
      console.error('Error creating moderator post:', error);
      showToast('error', 'Error al publicar el post');
    } finally {
      setIsSubmittingModeratorPost(false);
    }
  };

  const tabs = [
    { id: 'info' as TabType, label: 'Gestión', icon: BookOpen },
    { id: 'posts' as TabType, label: 'Posts del Muro', icon: MessageSquare },
    { id: 'participants' as TabType, label: 'Participantes', icon: Users },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Acceso Denegado
          </h1>
          <p className="text-gray-600 mb-6">
            No tienes permisos para gestionar este EventBook.
          </p>
          <button
            onClick={() => navigate('/moderador')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  if (!eventBook) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <BookOpen className="h-8 w-8 text-gray-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            EventBook no encontrado
          </h1>
          <p className="text-gray-600 mb-6">
            El EventBook solicitado no existe o no está disponible.
          </p>
          <button
            onClick={() => navigate('/moderador')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Panel
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateEventBook = async (updates: Partial<EventBook>) => {
    if (!eventBook) return;
    try {
      await eventBookStorage.updateEventBook(eventBook.id, updates);
      // Actualizar el estado local
      setEventBook(prev => prev ? { ...prev, ...updates } : null);
      
      // Recargar estadísticas reales después de la actualización
      await loadRealStats();
      
      // Mostrar mensaje de éxito
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50';
      successMessage.innerHTML = updates.isActive !== undefined
        ? (updates.isActive ? '✅ EventBook activado con éxito' : '✅ EventBook desactivado')
        : '✅ EventBook actualizado con éxito';
      document.body.appendChild(successMessage);
      setTimeout(() => {
        if (document.body.contains(successMessage)) {
          document.body.removeChild(successMessage);
        }
      }, 3000);
    } catch (error) {
      console.error('Error updating EventBook:', error);
      // Mostrar mensaje de error
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
      errorMessage.innerHTML = '❌ Error al actualizar EventBook';
      document.body.appendChild(errorMessage);
      setTimeout(() => {
        if (document.body.contains(errorMessage)) {
          document.body.removeChild(errorMessage);
        }
      }, 3000);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="p-6">
            <div className="space-y-6">
              {/* Estado del EventBook */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex h-3 w-3 rounded-full ${
                      eventBook?.isActive ? 'bg-green-500' : 'bg-gray-400'
                    }`}></span>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {eventBook?.isActive ? 'EventBook Activo' : 'EventBook Inactivo'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {eventBook?.isActive 
                          ? 'El muro está visible y los invitados pueden interactuar'
                          : 'El muro está oculto y los invitados no pueden acceder'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      if (!eventBook) return;
                      const newIsActive = !eventBook.isActive;
                      await handleUpdateEventBook({ isActive: newIsActive });
                    }}
                    className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white ${
                      eventBook?.isActive
                        ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                        : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200`}
                  >
                    <span className="hidden sm:inline">
                      {eventBook?.isActive ? 'Desactivar EventBook' : 'Activar EventBook'}
                    </span>
                    <span className="sm:hidden">
                      {eventBook?.isActive ? 'Desactivar' : 'Activar'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Tarjetas de Resumen */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600" />
                    </div>
                    <div className="ml-2 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          <span className="hidden sm:inline">Total Participantes</span>
                          <span className="sm:hidden">Participantes</span>
                        </dt>
                        <dd className="text-sm sm:text-lg font-semibold text-gray-900">
                          {realStats.totalParticipants}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <MessageSquare className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600" />
                    </div>
                    <div className="ml-2 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          <span className="hidden sm:inline">Total Posts</span>
                          <span className="sm:hidden">Posts</span>
                        </dt>
                        <dd className="text-sm sm:text-lg font-semibold text-gray-900">
                          {realStats.totalPosts}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-orange-600" />
                    </div>
                    <div className="ml-2 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          <span className="hidden sm:inline">Posts Pendientes</span>
                          <span className="sm:hidden">Pendientes</span>
                        </dt>
                        <dd className="text-sm sm:text-lg font-semibold text-gray-900">
                          {realStats.pendingPosts}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 sm:h-8 sm:w-8 text-red-600" />
                    </div>
                    <div className="ml-2 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          <span className="hidden sm:inline">Posts Reportados</span>
                          <span className="sm:hidden">Reportados</span>
                        </dt>
                        <dd className="text-sm sm:text-lg font-semibold text-gray-900">
                          {realStats.reportedPosts}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Composer del Moderador */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                <div className="mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                    <span className="hidden sm:inline">Crear Publicación como Moderador</span>
                    <span className="sm:hidden">Nueva Publicación</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-500">
                    <span className="hidden sm:inline">Publica contenido oficial en el muro del EventBook</span>
                    <span className="sm:hidden">Contenido oficial</span>
                  </p>
                </div>

                {/* Tipo de Post */}
                <div className="mb-3 sm:mb-4">
                  <label className="text-xs sm:text-sm font-medium text-gray-700 mb-2 block">
                    Tipo de publicación
                  </label>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="postType"
                        value="normal"
                        checked={moderatorPostType === 'normal'}
                        onChange={(e) => setModeratorPostType(e.target.value as 'normal' | 'highlighted' | 'announcement')}
                        className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <span className="ml-2 text-xs sm:text-sm text-gray-700">Normal</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="postType"
                        value="highlighted"
                        checked={moderatorPostType === 'highlighted'}
                        onChange={(e) => setModeratorPostType(e.target.value as 'normal' | 'highlighted' | 'announcement')}
                        className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <Star className="ml-2 h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
                      <span className="ml-1 text-xs sm:text-sm text-gray-700">Destacado</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="postType"
                        value="announcement"
                        checked={moderatorPostType === 'announcement'}
                        onChange={(e) => setModeratorPostType(e.target.value as 'normal' | 'highlighted' | 'announcement')}
                        className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 focus:ring-purple-500 border-gray-300"
                      />
                      <Megaphone className="ml-2 h-3 w-3 sm:h-4 sm:w-4 text-blue-500" />
                      <span className="ml-1 text-xs sm:text-sm text-gray-700">
                        <span className="hidden sm:inline">Anuncio Oficial</span>
                        <span className="sm:hidden">Anuncio</span>
                      </span>
                    </label>
                  </div>
                </div>

                {/* Textarea para contenido */}
                <div className="mb-4">
                  <textarea
                    value={moderatorPostContent}
                    onChange={(e) => setModeratorPostContent(e.target.value)}
                    placeholder="¿Qué quieres compartir en el muro?"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                </div>

                {/* Media files preview */}
                {moderatorMediaFiles.length > 0 && (
                  <div className="mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {moderatorMediaFiles.map((file, index) => (
                        <div key={index} className="relative">
                          {file.type === 'image' ? (
                            <img
                              src={file.url}
                              alt="Preview"
                              className="w-full h-20 object-cover rounded-lg"
                            />
                          ) : (
                            <div className="w-full h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Video className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveModeratorMedia(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones de acción */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-2 overflow-x-auto">
                    {/* Botón de imagen */}
                    <button
                      onClick={() => moderatorFileInputRef.current?.click()}
                      className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 whitespace-nowrap"
                    >
                      <Image className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Imagen</span>
                      <span className="sm:hidden">📷</span>
                    </button>

                    {/* Botón de video (solo si está habilitado) */}
                    {eventBook?.settings?.functionality?.allowVideoUploads && (
                      <button
                        onClick={() => moderatorVideoInputRef.current?.click()}
                        className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 whitespace-nowrap"
                      >
                        <Video className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Video</span>
                        <span className="sm:hidden">🎥</span>
                      </button>
                    )}

                    {/* Botón de sentimientos */}
                    <div className="relative">
                      <button
                        onClick={() => setModeratorShowFeelingPicker(!moderatorShowFeelingPicker)}
                        className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 whitespace-nowrap"
                      >
                        <Smile className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">
                          {moderatorSelectedFeeling ? moderatorSelectedFeeling.emoji : 'Sentimiento'}
                        </span>
                        <span className="sm:hidden">
                          {moderatorSelectedFeeling ? moderatorSelectedFeeling.emoji : '😊'}
                        </span>
                      </button>
                      
                      {moderatorShowFeelingPicker && (
                        <div className="absolute bottom-full left-0 mb-2 z-10">
                          <FeelingPicker
                            isOpen={moderatorShowFeelingPicker}
                            onSelect={(feeling) => {
                              setModeratorSelectedFeeling(feeling);
                              setModeratorShowFeelingPicker(false);
                            }}
                            onClose={() => setModeratorShowFeelingPicker(false)}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de publicar */}
                  <button
                    onClick={handleSubmitModeratorPost}
                    disabled={isSubmittingModeratorPost || (!moderatorPostContent.trim() && moderatorMediaFiles.length === 0)}
                    className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                  >
                    {isSubmittingModeratorPost ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white mr-2"></div>
                        <span className="hidden sm:inline">Publicando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                        Publicar
                      </>
                    )}
                  </button>
                </div>

                {/* Inputs ocultos para archivos */}
                <input
                  ref={moderatorFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleModeratorImageUpload}
                  className="hidden"
                />
                <input
                  ref={moderatorVideoInputRef}
                  type="file"
                  accept="video/*"
                  multiple
                  onChange={handleModeratorVideoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>
        );
      case 'posts':
        const getFilteredPosts = () => {
          let filtered: EventBookPost[];
          
          switch (activeFilter) {
            case 'pending':
              filtered = posts.filter(post => post.status === 'pending');
              break;
            case 'reported':
              const reportedPostIds = reports
                .filter(report => report.status === 'pending')
                .map(report => report.postId);
              filtered = posts.filter(post => reportedPostIds.includes(post.id));
              break;
            default:
              filtered = posts;
          }
          
          // Ordenar por fecha de creación descendente (más recientes primero)
          return filtered.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        };

        const filteredPosts = getFilteredPosts();
        const pendingCount = posts.filter(post => post.status === 'pending').length;
        const reportedCount = reports.filter(report => report.status === 'pending').length;

        return (
          <div className="p-3 sm:p-6">
            {/* Filtros tipo chips */}
            <div className="mb-4 sm:mb-6">
              <div className="flex space-x-2 overflow-x-auto pb-2 md:overflow-visible">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap relative ${
                    activeFilter === 'all'
                      ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">🔵 Todos</span>
                  <span className="sm:hidden">🔵</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-purple-600 rounded-full">
                    {posts.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('pending')}
                  className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap relative ${
                    activeFilter === 'pending'
                      ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">🕒 Pendientes</span>
                  <span className="sm:hidden">🕒</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-orange-600 rounded-full">
                    {pendingCount}
                  </span>
                </button>

                <button
                  onClick={() => setActiveFilter('reported')}
                  className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap relative ${
                    activeFilter === 'reported'
                      ? 'bg-red-100 text-red-800 border-2 border-red-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">🚩 Reportados</span>
                  <span className="sm:hidden">🚩</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                    {reportedCount}
                  </span>
                </button>
              </div>
            </div>

            {/* Lista de posts */}
            {isLoadingPosts ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay publicaciones en esta categoría
                </h3>
                <p className="text-gray-500">
                  {activeFilter === 'pending' && 'No hay posts pendientes de aprobación.'}
                  {activeFilter === 'reported' && 'No hay posts reportados.'}
                  {activeFilter === 'all' && 'No hay publicaciones en este EventBook.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {filteredPosts.map((post) => {
                  const isReported = reports.some(report => 
                    report.postId === post.id && report.status === 'pending'
                  );
                  const isPending = post.status === 'pending';

                  return (
                    <div key={post.id} className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6">
                      {/* Header del post */}
                      <div className="flex items-start justify-between mb-3 sm:mb-4">
                        <div className="flex items-center space-x-2 sm:space-x-3 mb-2 sm:mb-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs sm:text-sm text-gray-600 flex items-center flex-wrap gap-1">
                              <span className="truncate">{getUserDisplayName(post.guestId)}</span>
                              {post.moderatorPost && (
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full whitespace-nowrap">
                                  <span className="hidden sm:inline">(moderador)</span>
                                  <span className="sm:hidden">mod</span>
                                </span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-gray-500">
                              {new Date(post.createdAt).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        
                        {/* Estado del post */}
                        <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 flex-shrink-0">
                          {isPending && (
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                              <span className="hidden sm:inline">Pendiente</span>
                              <span className="sm:hidden">Pend.</span>
                            </span>
                          )}
                          {isReported && (
                            <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                              <span className="hidden sm:inline">Reportado</span>
                              <span className="sm:hidden">Rep.</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Contenido del post */}
                      <div className="mb-3 sm:mb-4">
                        <p className="text-sm sm:text-base text-gray-900">{post.content}</p>
                        {post.feeling && (
                          <div className="mt-2 flex items-center space-x-2">
                            <span className="text-base sm:text-lg">{post.feeling.emoji}</span>
                            <span className="text-xs sm:text-sm text-gray-600">{post.feeling.name}</span>
                          </div>
                        )}
                        {post.mediaFiles && post.mediaFiles.length > 0 && (
                          <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-2">
                            {post.mediaFiles.map((media, index) => (
                              <div key={index} className="relative">
                                {media.type === 'image' ? (
                                  <img 
                                    src={media.url} 
                                    alt="Post media" 
                                    className="w-full h-24 sm:h-32 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-full h-24 sm:h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <span className="text-xs sm:text-sm text-gray-500">📹 Video</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Motivo del reporte para posts reportados */}
                        {isReported && (
                          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-xs sm:text-sm font-medium text-red-800">
                                  <span className="hidden sm:inline">Motivo del reporte:</span>
                                  <span className="sm:hidden">Reporte:</span>
                                </p>
                                <p className="text-xs sm:text-sm text-red-700 mt-1">
                                  {(() => {
                                    const report = reports.find(r => r.postId === post.id && r.status === 'pending');
                                    return report?.reason || 'Sin motivo especificado';
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Botones de acción */}
                      <div className="flex items-center justify-end space-x-1 sm:space-x-2 pt-3 sm:pt-4 border-t border-gray-100">
                        {isPending && (
                          <>
                            <button
                              onClick={() => handlePublishPost(post.id)}
                              className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-xs sm:text-sm"
                            >
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Publicar</span>
                              <span className="sm:hidden">✓</span>
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Eliminar</span>
                              <span className="sm:hidden">🗑</span>
                            </button>
                          </>
                        )}
                        
                        {isReported && (
                          <>
                            <button
                              onClick={() => handleIgnoreReport(post.id)}
                              className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Ignorar</span>
                              <span className="sm:hidden">👁</span>
                            </button>
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                              <span className="hidden sm:inline">Eliminar</span>
                              <span className="sm:hidden">🗑</span>
                            </button>
                          </>
                        )}
                        
                        {!isPending && !isReported && (
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            className="flex items-center space-x-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs sm:text-sm"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Eliminar</span>
                            <span className="sm:hidden">🗑</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      case 'participants':
        // Funciones de filtrado y ordenamiento con datos reales
        const getFilteredAndSortedParticipants = () => {
          let filtered = participants;

          // Aplicar filtros con datos reales
          switch (participantFilter) {
            case 'active':
              filtered = filtered.filter(p => p.isActive);
              break;
            case 'with_posts':
              filtered = filtered.filter(p => p.postCount > 0);
              break;
            case 'without_posts':
              filtered = filtered.filter(p => p.postCount === 0);
              break;
            default:
              break;
          }

          // Aplicar búsqueda por nombre, ID o cualquier identificador disponible
          if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filtered = filtered.filter(p => 
              p.displayName.toLowerCase().includes(searchLower) ||
              p.id.toLowerCase().includes(searchLower) ||
              (p.firstName && p.firstName.toLowerCase().includes(searchLower)) ||
              (p.lastName && p.lastName.toLowerCase().includes(searchLower))
            );
          }

          // Aplicar ordenamiento (por defecto por última actividad como en el sidebar)
          filtered.sort((a, b) => {
            switch (participantSort) {
              case 'name':
                return a.displayName.localeCompare(b.displayName);
              case 'registration':
                return new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime();
              case 'activity':
              default:
                return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
            }
          });

          return filtered;
        };

        const filteredParticipants = getFilteredAndSortedParticipants();
        const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedParticipants = filteredParticipants.slice(startIndex, startIndex + itemsPerPage);

        // Calcular contadores reales
        const counters = {
          total: participants.length,
          active: participants.filter(p => p.isActive).length,
          withPosts: participants.filter(p => p.postCount > 0).length,
          withoutPosts: participants.filter(p => p.postCount === 0).length
        };

        return (
          <div className="p-3 sm:p-6">
            {/* Header con búsqueda y ordenamiento */}
            <div className="mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  <span className="hidden sm:inline">Participantes</span>
                  <span className="sm:hidden">Users</span>
                </h3>
                
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {/* Búsqueda */}
                  <div className="relative">
                    <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs sm:text-sm w-full"
                    />
                  </div>

                  {/* Ordenamiento */}
                  <div className="relative">
                    <select
                      value={participantSort}
                      onChange={(e) => setParticipantSort(e.target.value as ParticipantSort)}
                      className="appearance-none bg-white border border-gray-300 rounded-lg px-2 sm:px-4 py-1.5 sm:py-2 pr-6 sm:pr-8 text-xs sm:text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent w-full sm:w-auto"
                    >
                      <option value="activity">Actividad</option>
                      <option value="name">Nombre</option>
                      <option value="registration">Registro</option>
                    </select>
                    <ChevronDown className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros tipo chips */}
            <div className="mb-4 sm:mb-6">
              <div className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-2 md:overflow-visible">
                <button
                  onClick={() => setParticipantFilter('all')}
                  className={`inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    participantFilter === 'all'
                      ? 'bg-purple-100 text-purple-800 border-2 border-purple-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">👥 Todos</span>
                  <span className="sm:hidden">👥</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-purple-600 rounded-full">
                    {counters.total}
                  </span>
                </button>

                <button
                  onClick={() => setParticipantFilter('active')}
                  className={`inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    participantFilter === 'active'
                      ? 'bg-green-100 text-green-800 border-2 border-green-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">🟢 Activos</span>
                  <span className="sm:hidden">🟢</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-green-600 rounded-full">
                    {counters.active}
                  </span>
                </button>

                <button
                  onClick={() => setParticipantFilter('with_posts')}
                  className={`inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    participantFilter === 'with_posts'
                      ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">📝 Con posts</span>
                  <span className="sm:hidden">📝</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                    {counters.withPosts}
                  </span>
                </button>

                <button
                  onClick={() => setParticipantFilter('without_posts')}
                  className={`inline-flex items-center px-2 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
                    participantFilter === 'without_posts'
                      ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                      : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <span className="hidden sm:inline">📭 Sin posts</span>
                  <span className="sm:hidden">📭</span>
                  <span className="ml-1 sm:ml-2 inline-flex items-center justify-center px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold leading-none text-white bg-orange-600 rounded-full">
                    {counters.withoutPosts}
                  </span>
                </button>
              </div>
            </div>

            {/* Lista de participantes */}
            {isLoadingParticipants ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay participantes en esta categoría
                </h3>
                <p className="text-gray-500">
                  {searchTerm ? 'No se encontraron participantes que coincidan con tu búsqueda.' : 'No hay participantes para mostrar.'}
                </p>
              </div>
            ) : (
              <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                  {paginatedParticipants.map((participant) => (
                    <li key={participant.id}>
                      <div className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 relative">
                              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                              </div>
                              {participant.isActive && (
                                <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white"></div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-1 sm:space-x-2">
                                <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                                  {participant.displayName}
                                </p>
                                <span className="hidden sm:inline text-xs text-gray-500 font-mono">
                                  #{participant.id.slice(0, 8)}
                                </span>
                                {participant.isBlocked && (
                                  <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium ${
                                    participant.blockedType === 'total' 
                                      ? 'bg-red-100 text-red-800' 
                                      : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    <span className="hidden sm:inline">Bloqueado {participant.blockedType === 'total' ? 'Total' : 'Parcial'}</span>
                                    <span className="sm:hidden">🚫</span>
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center space-x-2 sm:space-x-4 mt-1">
                                <div className="flex items-center space-x-1">
                                  {participant.isActive ? (
                                    <>
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                                      <span className="text-xs text-green-600">
                                        <span className="hidden sm:inline">Activo ahora</span>
                                        <span className="sm:hidden">Activo</span>
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full"></div>
                                      <span className="text-xs text-gray-500">
                                        {(() => {
                                          const date = new Date(participant.lastActivity);
                                          const now = new Date();
                                          const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
                                          
                                          if (diffInMinutes < 1) return 'Ahora';
                                          if (diffInMinutes < 60) return `${diffInMinutes}m`;
                                          
                                          const diffInHours = Math.floor(diffInMinutes / 60);
                                          if (diffInHours < 24) return `${diffInHours}h`;
                                          
                                          const diffInDays = Math.floor(diffInHours / 24);
                                          return `${diffInDays}d`;
                                        })()}
                                      </span>
                                    </>
                                  )}
                                </div>
                                
                                <span className="text-xs text-gray-500">
                                  <span className="hidden sm:inline">{participant.postCount} publicaciones</span>
                                  <span className="sm:hidden">{participant.postCount} posts</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                            <button
                              onClick={() => handleToggleParticipantPosts(participant.id)}
                              className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                              <Eye className="h-3 w-3 mr-0.5 sm:mr-1" />
                              <span className="hidden sm:inline">{expandedParticipant === participant.id ? 'Ocultar' : 'Ver posts'}</span>
                              <span className="sm:hidden">{expandedParticipant === participant.id ? '👁' : '👁'}</span>
                            </button>
                            {participant.isBlocked ? (
                              <button
                                onClick={() => {
                                  setSelectedParticipant(participant);
                                  setBlockModalOpen(true);
                                }}
                                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              >
                                <ShieldOff className="h-3 w-3 mr-0.5 sm:mr-1" />
                                <span className="hidden sm:inline">Desbloquear</span>
                                <span className="sm:hidden">✅</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleBlockParticipant(participant)}
                                className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              >
                                <Shield className="h-3 w-3 mr-0.5 sm:mr-1" />
                                <span className="hidden sm:inline">Bloquear</span>
                                <span className="sm:hidden">🚫</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expansión inline de posts del participante */}
                      {expandedParticipant === participant.id && (
                        <div className="px-3 py-3 sm:px-4 sm:py-4 bg-gray-50 border-t border-gray-200">
                          <div className="mb-2 sm:mb-3">
                            <h4 className="text-xs sm:text-sm font-medium text-gray-900">
                              <span className="hidden sm:inline">Publicaciones de {participant.displayName}</span>
                              <span className="sm:hidden">Posts de {participant.displayName}</span>
                              {participant.postCount > 0 && (
                                <span className="ml-1 sm:ml-2 text-xs text-gray-500">
                                  ({participant.postCount})
                                </span>
                              )}
                            </h4>
                          </div>

                          {/* Loading state */}
                          {loadingParticipantPosts[participant.id] && (
                            <div className="space-y-4">
                              {[...Array(4)].map((_, index) => (
                                <div key={index} className="animate-pulse">
                                  <div className="flex space-x-3">
                                    <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Error state */}
                          {participantPostsError[participant.id] && (
                            <div className="text-center py-4">
                              <div className="text-red-600 text-sm mb-2">
                                {participantPostsError[participant.id]}
                              </div>
                              <button
                                onClick={() => handleRetryParticipantPosts(participant.id)}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700"
                              >
                                Reintentar
                              </button>
                            </div>
                          )}

                          {/* Posts list */}
                          {!loadingParticipantPosts[participant.id] && 
                           !participantPostsError[participant.id] && 
                           participantPosts[participant.id] && (
                            <div className="space-y-3">
                              {participantPosts[participant.id].length === 0 ? (
                                <div className="text-center py-6 text-gray-500 text-sm">
                                  Este participante no tiene publicaciones
                                </div>
                              ) : (
                                <>
                                  {participantPosts[participant.id].map((post) => (
                                    <div key={post.id} className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200">
                                      <div className="flex items-start space-x-1.5 sm:space-x-2 mb-1 sm:mb-2">
                                        <div className="w-5 h-5 sm:w-6 sm:h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                          <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-purple-600" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center space-x-1 sm:space-x-2 mb-1">
                                            <span className="text-xs font-medium text-gray-900 truncate">
                                              {participant.displayName}
                                            </span>
                                            <span className="text-xs text-gray-500 hidden sm:inline">
                                              {new Date(post.createdAt).toLocaleString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </span>
                                            <span className="text-xs text-gray-500 sm:hidden">
                                              {new Date(post.createdAt).toLocaleDateString('es-ES', {
                                                day: '2-digit',
                                                month: '2-digit'
                                              })}
                                            </span>
                                            {post.status === 'pending' && (
                                              <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                                <span className="hidden sm:inline">Pendiente</span>
                                                <span className="sm:hidden">⏳</span>
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 sm:line-clamp-3">
                                            {post.content}
                                          </p>
                                          {post.mediaFiles && post.mediaFiles.length > 0 && (
                                            <div className="mt-1 sm:mt-2 flex items-center text-xs text-gray-500">
                                              <Camera className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-0.5 sm:mr-1" />
                                              <span className="hidden sm:inline">{post.mediaFiles.length} archivo{post.mediaFiles.length > 1 ? 's' : ''} multimedia</span>
                                              <span className="sm:hidden">{post.mediaFiles.length} 📷</span>
                                            </div>
                                          )}
                                          <div className="flex items-center space-x-2 sm:space-x-4 mt-1 sm:mt-2 text-xs text-gray-500">
                                            <span className="hidden sm:inline">{Object.keys(post.reactions || {}).length} reacciones</span>
                                            <span className="sm:hidden">{Object.keys(post.reactions || {}).length} ❤️</span>
                                            <span className="hidden sm:inline">{post.comments?.length || 0} comentarios</span>
                                            <span className="sm:hidden">{post.comments?.length || 0} 💬</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}

                                  {/* Ver más button */}
                                  {(() => {
                                    const currentPage = participantPostsPage[participant.id] || 1;
                                    const postsPerPage = 4;
                                    const totalUserPosts = participant.postCount;
                                    const loadedPosts = participantPosts[participant.id].length;
                                    const hasMore = loadedPosts < totalUserPosts;

                                    return hasMore ? (
                                      <div className="text-center pt-3">
                                        <button
                                          onClick={() => handleLoadMoreParticipantPosts(participant.id)}
                                          disabled={loadingParticipantPosts[participant.id]}
                                          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                          {loadingParticipantPosts[participant.id] ? (
                                            <>
                                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                                              Cargando...
                                            </>
                                          ) : (
                                            <>
                                              Ver más ({totalUserPosts - loadedPosts} restantes)
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    ) : null;
                                  })()}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Paginación */}
            {!isLoadingParticipants && filteredParticipants.length > 0 && totalPages > 1 && (
                  <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Mostrando <span className="font-medium">{startIndex + 1}</span> a{' '}
                          <span className="font-medium">
                            {Math.min(startIndex + itemsPerPage, filteredParticipants.length)}
                          </span>{' '}
                          de <span className="font-medium">{filteredParticipants.length}</span> participantes
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-purple-50 border-purple-500 text-purple-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          ))}
                          <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* Header with EventBook name and back button */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => navigate('/moderador')}
                className="inline-flex items-center px-2 sm:px-3 py-2 border border-gray-300 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Volver</span>
              </button>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  {eventBook?.name}
                </h1>
                <p className="text-xs sm:text-base text-gray-500 mt-1">
                  <span className="hidden sm:inline">Gestión de EventBook • Moderador</span>
                  <span className="sm:hidden">Moderador</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white rounded-xl shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex px-3 sm:px-6 overflow-x-auto" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('info')}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                  activeTab === 'info'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Info className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Información del EventBook</span>
                  <span className="sm:hidden">Info</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ml-4 sm:ml-8 ${
                  activeTab === 'posts'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Posts ({posts.length})</span>
                  <span className="sm:hidden">Posts ({posts.length})</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('participants')}
                className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ml-4 sm:ml-8 ${
                  activeTab === 'participants'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Participantes ({participants.length})</span>
                  <span className="sm:hidden">Users ({participants.length})</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-96">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* Modal de confirmación */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
              <h3 className="text-lg font-medium text-gray-900">Confirmar acción</h3>
            </div>
            <p className="text-gray-700 mb-6">{confirmAction.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmedAction}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de notificación */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              {toast.type === 'success' ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span className="font-medium">{toast.message}</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal de bloqueo de participantes */}
      {selectedParticipant && (
        <ParticipantBlockModal
          isOpen={blockModalOpen}
          onClose={() => {
            setBlockModalOpen(false);
            setSelectedParticipant(null);
          }}
          participantName={selectedParticipant.displayName}
          participantId={selectedParticipant.id}
          isCurrentlyBlocked={selectedParticipant.isBlocked || false}
          currentBlockType={selectedParticipant.blockedType}
          onConfirm={handleConfirmBlock}
          onUnblock={handleUnblockParticipant}
        />
      )}
    </div>
  );
};
