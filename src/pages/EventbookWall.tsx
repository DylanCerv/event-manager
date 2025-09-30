import React from 'react';
import { useParams } from 'react-router-dom';
import { MessageSquare, Camera, Video, Smile, CheckCircle, AlertTriangle, Smartphone } from 'lucide-react';
import type { EventBook, EventBookPost } from '../types/eventbook';
import { eventBookStorage } from '../lib/eventbook-storage';
import { isEventBookClosed } from '../lib/eventbook-backup';
import { guestStorage, EventBookGuest } from '../lib/guest-storage';
import { GuestRegistrationModal } from '../components/GuestRegistrationModal';
import { EventBookUsersSidebar } from '../components/EventBookUsersSidebar';
import { CreatePostModal } from '../components/CreatePostModal';
import { PostCard } from '../components/PostCard';
import { EventBookQRCode } from '../components/EventBookQRCode';

export function EventbookWall() {
  const { id, userSlug, eventSlug } = useParams();
  const [eventBook, setEventBook] = React.useState<EventBook | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [posts, setPosts] = React.useState<EventBookPost[]>([]);
  
  // Estados para el sistema de invitados
  const [showRegistrationModal, setShowRegistrationModal] = React.useState(false);
  const [currentGuest, setCurrentGuest] = React.useState<EventBookGuest | null>(null);
  const [guests, setGuests] = React.useState<EventBookGuest[]>([]);
  
  // Estados para posts
  const [showCreatePostModal, setShowCreatePostModal] = React.useState(false);
  
  // Estados para el sistema de bloqueo
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [blockType, setBlockType] = React.useState<'total' | 'partial' | null>(null);
  const [blockMessage, setBlockMessage] = React.useState('');
  
  // Estado para notificaciones toast
  const [toast, setToast] = React.useState<{
    type: 'success' | 'info';
    message: string;
  } | null>(null);

  // Obtener el tema del EventBook
  const isDarkTheme = eventBook?.settings?.customization?.theme === 'dark';
  
  React.useEffect(() => {
    loadEventBook();
  }, [id, userSlug, eventSlug]);

  // Cargar datos de invitados cuando se carga el EventBook
  React.useEffect(() => {
    if (eventBook) {
      checkGuestRegistration();
      loadGuests();
      loadPosts();
    }
  }, [eventBook]);

  // Recargar posts cada 30 segundos para simular tiempo real
  React.useEffect(() => {
    if (!eventBook) return;
    
    const interval = setInterval(() => {
      loadPosts();
      loadGuests(); // También actualizar lista de invitados
    }, 30000);

    return () => clearInterval(interval);
  }, [eventBook]);

  const loadEventBook = async () => {
    try {
      setIsLoading(true);
      const books = await eventBookStorage.getAllEventBooks();
      
      console.log('🔍 Debugging EventBook search:');
      console.log('userSlug:', userSlug);
      console.log('eventSlug:', eventSlug);
      console.log('Available EventBooks:', books.map(b => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        publicUrl: b.publicUrl
      })));
      
      let book;
      if (id) {
        // Búsqueda por ID directo (ruta administrativa)
        book = books.find(b => b.id === id);
        console.log('🔍 Admin search result:', book);
      } else if (userSlug && eventSlug) {
        // Búsqueda por slug (ruta pública)
        // Verificar que el slug del evento coincida y que la URL pública contenga el userSlug
        book = books.find(b => 
          b.slug === eventSlug && 
          b.publicUrl.includes(`/${userSlug}/`)
        );
        console.log('🔍 Public search result:', book);
        
        // Verificar si el EventBook está cerrado (acceso público bloqueado)
        if (book && isEventBookClosed(book)) {
          console.log('🔒 EventBook is closed, blocking public access');
          book = null; // Bloquear acceso público
        }
      }
      
      if (book) {
        setEventBook(book);
        console.log('✅ EventBook found:', book.name);
      } else {
        console.log('❌ EventBook not found or access blocked');
      }
    } catch (error) {
      console.error('Error loading EventBook:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkGuestRegistration = async () => {
    if (!eventBook) return;
    
    const guest = guestStorage.getCurrentGuest(eventBook.id);
    if (guest) {
      setCurrentGuest(guest);
      setShowRegistrationModal(false);
      
      // Verificar si el usuario está bloqueado
      await checkBlockStatus(guest.id);
    } else {
      setShowRegistrationModal(true);
    }
  };

  const checkBlockStatus = async (guestId: string) => {
    if (!eventBook) return;
    
    try {
      const blockStatus = await eventBookStorage.isParticipantBlocked(eventBook.id, guestId);
      
      if (blockStatus.blocked) {
        setIsBlocked(true);
        setBlockType(blockStatus.blockType || 'total');
        
        if (blockStatus.blockType === 'total') {
          setBlockMessage('Este EventBook no está disponible para tu cuenta.');
        } else {
          setBlockMessage('Tu participación está limitada por moderación.');
        }
      } else {
        setIsBlocked(false);
        setBlockType(null);
        setBlockMessage('');
      }
    } catch (error) {
      console.error('Error checking block status:', error);
    }
  };

  const loadGuests = () => {
    if (!eventBook) return;
    
    const allGuests = guestStorage.getAllGuests(eventBook.id);
    setGuests(allGuests);
  };

  const handleGuestRegistration = (firstName: string, lastName: string, profilePhoto?: string) => {
    if (!eventBook) return;
    
    const newGuest = guestStorage.registerGuest(eventBook.id, firstName, lastName, profilePhoto);
    setCurrentGuest(newGuest);
    setShowRegistrationModal(false);
    
    // Recargar lista de invitados
    loadGuests();
  };

  const loadPosts = async () => {
    if (!eventBook) return;
    
    try {
      const eventBookPosts = await eventBookStorage.getAllPosts(eventBook.id);
      
      // Filtrar solo posts publicados para el muro público
      const publishedPosts = eventBookPosts.filter(post => post.status === 'published');
      
      // Ordenar por fecha, más recientes primero
      const sortedPosts = publishedPosts.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPosts(sortedPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  };

  const showToast = (type: 'success' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCreatePost = async (
    content: string, 
    mediaFiles: { type: 'image' | 'video'; url: string; thumbnail?: string }[], 
    feeling?: { id: string; emoji: string; name: string; category: 'emotion' }
  ) => {
    if (!eventBook || !currentGuest) return;
    
    try {
      const result = await eventBookStorage.createPost(
        eventBook.id, 
        currentGuest.id, 
        content, 
        mediaFiles, 
        feeling,
        'guest' // Siempre es guest desde el muro público
      );
      
      setShowCreatePostModal(false);
      
      if (result.requiresApproval) {
        // Post pendiente de aprobación
        showToast('info', 'Tu publicación quedó pendiente de aprobación');
      } else {
        // Post publicado directamente
        showToast('success', '¡Publicación creada exitosamente!');
        await loadPosts(); // Solo recargar si se publicó directamente
      }
      
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('info', 'Error al crear la publicación. Inténtalo de nuevo.');
    }
  };

  const handleReaction = async (postId: string, reactionType: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes reaccionar debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.addReaction(postId, currentGuest.id, reactionType);
      loadPosts(); // Recargar posts para mostrar la nueva reacción
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes comentar debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.addComment(postId, currentGuest.id, content);
      loadPosts(); // Recargar posts para mostrar el nuevo comentario
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleCommentReply = async (postId: string, commentId: string, content: string, replyingToName: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes responder comentarios debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.addCommentReply(postId, commentId, currentGuest.id, content, replyingToName);
      loadPosts(); // Recargar posts para mostrar la nueva respuesta
    } catch (error) {
      console.error('Error adding comment reply:', error);
    }
  };

  const handleNestedReply = async (postId: string, parentReplyId: string, content: string, replyingToName: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes responder comentarios debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.addNestedReply(postId, parentReplyId, currentGuest.id, content, replyingToName);
      loadPosts(); // Recargar posts para mostrar la nueva respuesta anidada
    } catch (error) {
      console.error('Error adding nested reply:', error);
    }
  };

  const handleReport = async (postId: string, reason: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes reportar publicaciones debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.reportPost(postId, currentGuest.id, reason);
      showToast('success', 'Publicación reportada correctamente');
    } catch (error) {
      console.error('Error reporting post:', error);
      showToast('info', 'Error al reportar la publicación');
    }
  };

  const handleCommentReaction = async (postId: string, commentId: string, reactionType: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes reaccionar debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.addCommentReaction(postId, commentId, currentGuest.id, reactionType);
      loadPosts(); // Recargar posts para mostrar la nueva reacción
    } catch (error) {
      console.error('Error adding comment reaction:', error);
    }
  };

  const handleReplyReaction = async (postId: string, replyId: string, reactionType: string) => {
    if (!currentGuest) return;
    
    // Verificar bloqueo parcial
    if (isBlocked && blockType === 'partial') {
      showToast('info', 'No puedes reaccionar debido a restricciones de moderación');
      return;
    }
    
    try {
      await eventBookStorage.addReplyReaction(postId, replyId, currentGuest.id, reactionType);
      loadPosts(); // Recargar posts para mostrar la nueva reacción
    } catch (error) {
      console.error('Error adding reply reaction:', error);
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando EventBook...</p>
        </div>
      </div>
    );
  }

  if (!eventBook) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">EventBook No Disponible</h1>
            <p className="text-gray-600 mb-4">
              Este EventBook no existe, se cerró automáticamente, o no está disponible públicamente.
            </p>
            <p className="text-sm text-gray-500">
              Si necesitas acceder al contenido, contacta con el organizador del evento.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla de bloqueo total
  if (isBlocked && blockType === 'total') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h1>
            <p className="text-gray-600 mb-4">{blockMessage}</p>
            <p className="text-sm text-gray-500">
              Si crees que esto es un error, contacta con el organizador del evento.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!eventBook.settings.isConfigured) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">EventBook en Configuración</h2>
          <p className="text-gray-600">
            Este EventBook aún está siendo configurado por el organizador. ¡Vuelve pronto!
          </p>
        </div>
      </div>
    );
  }

  // Verificar si el EventBook está activo
  if (!eventBook.isActive) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">EventBook Inactivo</h2>
          <p className="text-gray-600">
            Este EventBook está temporalmente desactivado por el organizador.
          </p>
        </div>
      </div>
    );
  }



  return (
    <>
      {/* Modal de Registro */}
      <GuestRegistrationModal
        isOpen={showRegistrationModal}
        onRegister={handleGuestRegistration}
        eventName={eventBook.name}
      />

      {/* Modal de Crear Post */}
      {currentGuest && (
        <CreatePostModal
          isOpen={showCreatePostModal}
          onClose={() => setShowCreatePostModal(false)}
          onSubmit={handleCreatePost}
          guest={currentGuest}
          eventBook={eventBook}
        />
      )}

      <div className={`min-h-screen ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-100'}`}>
        {/* Header con foto de portada - Ancho completo */}
        <div className="relative h-64 bg-gradient-to-r from-blue-600 to-purple-600 overflow-hidden">
          <img
            src={eventBook.coverImage}
            alt="Event cover"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black bg-opacity-40" />
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-6xl mx-auto">
              <h1 className="text-4xl font-bold text-white mb-2">{eventBook.name}</h1>
              <p className="text-white/90">{eventBook.settings.customization?.welcomeMessage}</p>
            </div>
          </div>
        </div>

        {/* Contenedor principal */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar izquierda - QR Code (oculta en móvil) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 sticky top-8`}>
                <h3 className={`text-xl font-bold mb-4 text-center flex items-center justify-center gap-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                  <Smartphone className="h-6 w-6 text-green-500" />
                  ACCESO
                </h3>
                <div className="flex flex-col items-center">
                  <div className="border-2 border-green-400 rounded-lg p-2">
                    <EventBookQRCode 
                      publicUrl={eventBook.publicUrl} 
                      eventBookName={eventBook.name}
                      showDownloadButton={false}
                      size="large"
                    />
                  </div>
                  <p className={`text-lg font-bold text-center mt-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                    Escanea el QR para ingresar al EventBook
                  </p>
                </div>
              </div>
            </div>

            {/* Contenido principal - Posts */}
            <div className="col-span-1 lg:col-span-2">

              {/* Crear Post */}
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm mb-6 p-4`}>
                <div className="flex items-center space-x-3 mb-4">
                  {currentGuest?.profilePhoto ? (
                    <img
                      src={currentGuest.profilePhoto}
                      alt={`${currentGuest.firstName} ${currentGuest.lastName}`}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">
                        {currentGuest ? currentGuest.firstName.charAt(0) + currentGuest.lastName.charAt(0) : 'TU'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <button
                      onClick={isBlocked && blockType === 'partial' ? () => showToast('info', 'No puedes publicar debido a restricciones de moderación') : () => setShowCreatePostModal(true)}
                      disabled={isBlocked && blockType === 'partial'}
                      className={`w-full ${isDarkTheme ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'} rounded-full px-4 py-3 text-left transition-all ${
                        isBlocked && blockType === 'partial' 
                          ? 'cursor-not-allowed' 
                          : ''
                      }`}
                    >
                      {currentGuest ? `¿Qué está pasando, ${currentGuest.firstName}?` : "¿Qué está pasando en el evento?"}
                    </button>
                  </div>
                </div>
                
                {/* Botones de acción - Estilo Facebook */}
                <div className={`flex items-center justify-between pt-3 border-t ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    onClick={isBlocked && blockType === 'partial' ? () => showToast('info', 'No puedes publicar debido a restricciones de moderación') : () => setShowCreatePostModal(true)}
                    disabled={isBlocked && blockType === 'partial'}
                    className={`flex items-center space-x-2 px-4 py-2 ${isDarkTheme ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} rounded-lg transition-colors ${
                      isBlocked && blockType === 'partial' 
                        ? 'cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    <Camera className="w-5 h-5 text-green-500" />
                    <span className="font-medium">Foto</span>
                  </button>
                  
                  <button
                    onClick={isBlocked && blockType === 'partial' ? () => showToast('info', 'No puedes publicar debido a restricciones de moderación') : () => setShowCreatePostModal(true)}
                    disabled={isBlocked && blockType === 'partial'}
                    className={`flex items-center space-x-2 px-4 py-2 ${isDarkTheme ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} rounded-lg transition-colors ${
                      isBlocked && blockType === 'partial' 
                        ? 'cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    <Video className="w-5 h-5 text-red-500" />
                    <span className="font-medium">Video</span>
                  </button>
                  
                  <button
                    onClick={isBlocked && blockType === 'partial' ? () => showToast('info', 'No puedes publicar debido a restricciones de moderación') : () => setShowCreatePostModal(true)}
                    disabled={isBlocked && blockType === 'partial'}
                    className={`flex items-center space-x-2 px-4 py-2 ${isDarkTheme ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'} rounded-lg transition-colors ${
                      isBlocked && blockType === 'partial' 
                        ? 'cursor-not-allowed' 
                        : ''
                    }`}
                  >
                    <Smile className="w-5 h-5 text-yellow-500" />
                    <span className="font-medium">Sentimiento</span>
                  </button>
                </div>
              </div>

              {/* Posts */}
              <div className="space-y-4">
                {posts.length === 0 ? (
                  <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm p-8 text-center`}>
                    <MessageSquare className={`w-12 h-12 ${isDarkTheme ? 'text-gray-500' : 'text-gray-400'} mx-auto mb-4`} />
                    <h3 className={`text-lg font-medium ${isDarkTheme ? 'text-white' : 'text-gray-900'} mb-2`}>No hay publicaciones aún</h3>
                    <p className={`${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>¡Sé el primero en compartir algo en este EventBook!</p>
                  </div>
                ) : (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentGuest={currentGuest}
                      onReaction={handleReaction}
                      onComment={handleComment}
                      onCommentReply={handleCommentReply}
                      onNestedReply={handleNestedReply}
                      onReport={handleReport}
                      onCommentReaction={handleCommentReaction}
                      onReplyReaction={handleReplyReaction}
                      allGuests={guests}
                      author={guests.find(g => g.id === post.guestId) || null}
                      allowComments={eventBook.settings.functionality?.allowComments || false}
                      allowReactions={eventBook.settings.functionality?.allowReactions || false}
                      isDarkTheme={isDarkTheme}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Sidebar derecha - Participantes */}
            <div className="lg:col-span-1">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-sm sticky top-8`}>
                <EventBookUsersSidebar guests={guests} isVisible={currentGuest !== null} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast de notificación */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success' 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-blue-100 text-blue-800 border-blue-200'
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
    </>
  );
}