import React, { useEffect, useMemo, useState } from 'react';
import { ThumbsUp, Heart, MessageCircle, Share, MoreHorizontal, Send, User, Flag, Star, Megaphone } from 'lucide-react';
import { EventBookPost, EventBookReply } from '../types/eventbook';
import { EventBookGuest } from '../lib/guest-storage';
import { ReactionPicker, getReactionDisplay, ReactionsSummary } from './ReactionPicker';
import { appPrompt } from '../lib/dialogs';
import { notify } from '../lib/notify';

// Configuraciones para visibilidad de comentarios y respuestas
const INITIAL_COMMENTS_VISIBLE = 3;
const INITIAL_REPLIES_VISIBLE = 2;
type OrderStrategy = 'engagement' | 'recent';
const ORDER_STRATEGY: OrderStrategy = 'engagement';

interface PostCardProps {
  post: EventBookPost;
  author: EventBookGuest | null;
  currentGuest: EventBookGuest | null;
  onReaction: (postId: string, reactionType: string) => Promise<void>;
  onComment: (postId: string, content: string) => Promise<void>;
  onCommentReply: (postId: string, commentId: string, content: string, replyingToName: string) => Promise<void>;
  onNestedReply: (postId: string, parentReplyId: string, content: string, replyingToName: string) => Promise<void>;
  onReport: (postId: string, reason: string) => Promise<void>;
  onCommentReaction: (postId: string, commentId: string, reactionType: string) => Promise<void>;
  onReplyReaction: (postId: string, replyId: string, reactionType: string) => Promise<void>;
  allGuests: EventBookGuest[];
  allowComments?: boolean;
  allowReactions?: boolean;
  isDarkTheme?: boolean;
}

export function PostCard({ 
  post, 
  author, 
  currentGuest, 
  onReaction, 
  onComment, 
  onCommentReply,
  onNestedReply,
  onReport,
  onCommentReaction,
  onReplyReaction,
  allGuests,
  allowComments = true,
  allowReactions = true,
  isDarkTheme = false
}: PostCardProps) {
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [optimisticUserReaction, setOptimisticUserReaction] = useState<string | null | undefined>(undefined);
  
  // Estados para respuestas
  const [replyingTo, setReplyingTo] = useState<{commentId: string, userName: string, isNested?: boolean} | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  
  // Estados para reaction pickers de comentarios y respuestas
  const [showCommentReactionPicker, setShowCommentReactionPicker] = useState<string | null>(null);
  const [showReplyReactionPicker, setShowReplyReactionPicker] = useState<string | null>(null);

  // Estados para expansión/colapso de comentarios y respuestas
  const [showAllComments, setShowAllComments] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());

  // Función para calcular engagement de un comentario
  const getCommentEngagement = (comment: any) => {
    const repliesCount = comment.replies ? comment.replies.length : 0;
    // En el futuro se pueden agregar reacciones a comentarios
    return repliesCount;
  };

  // Función para ordenar comentarios
  const sortComments = (comments: any[]) => {
    if (ORDER_STRATEGY === 'engagement') {
      return [...comments].sort((a, b) => {
        const engagementA = getCommentEngagement(a);
        const engagementB = getCommentEngagement(b);
        if (engagementA !== engagementB) {
          return engagementB - engagementA; // Mayor engagement primero
        }
        // Si el engagement es igual, ordenar por fecha (más reciente primero)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    } else {
      // Ordenar solo por fecha (más reciente primero)
      return [...comments].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
  };

  // Lógica para determinar qué comentarios mostrar
  const sortedComments = useMemo(() => sortComments(post.comments), [post.comments]);
  const commentsToShow = showAllComments 
    ? sortedComments 
    : sortedComments.slice(0, INITIAL_COMMENTS_VISIBLE);

  // Función para alternar expansión de respuestas de un comentario
  const toggleRepliesExpansion = (commentId: string) => {
    setExpandedReplies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  // Función para obtener respuestas visibles de un comentario
  const getVisibleReplies = (comment: any) => {
    if (!comment.replies || comment.replies.length === 0) return [];
    
    const isExpanded = expandedReplies.has(comment.id);
    return isExpanded 
      ? comment.replies 
      : comment.replies.slice(0, INITIAL_REPLIES_VISIBLE);
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `Hace ${diffInDays}d`;
  };

  const getReactionCounts = (reactionsMap: Record<string, string>) => {
    const counts: { [key: string]: number } = {};
    Object.values(reactionsMap).forEach(reaction => {
      counts[reaction] = (counts[reaction] || 0) + 1;
    });
    return counts;
  };

  const getUserReaction = (reactionsMap: Record<string, string>) => {
    return currentGuest ? (reactionsMap[currentGuest.id] ?? null) : null;
  };

  const effectiveReactions = useMemo(() => {
    const base = (post.reactions || {}) as Record<string, string>;
    if (!currentGuest) return base;
    if (optimisticUserReaction === undefined) return base;

    const next = { ...base };
    if (optimisticUserReaction === null) {
      delete next[currentGuest.id];
    } else {
      next[currentGuest.id] = optimisticUserReaction;
    }
    return next;
  }, [post.reactions, currentGuest, optimisticUserReaction]);

  useEffect(() => {
    if (!currentGuest) {
      if (optimisticUserReaction !== undefined) setOptimisticUserReaction(undefined);
      return;
    }
    if (optimisticUserReaction === undefined) return;

    const base = (post.reactions || {}) as Record<string, string>;
    const serverReaction = base[currentGuest.id] ?? null;
    if (optimisticUserReaction === null) {
      if (!base[currentGuest.id]) setOptimisticUserReaction(undefined);
      return;
    }
    if (serverReaction === optimisticUserReaction) {
      setOptimisticUserReaction(undefined);
    }
  }, [post.reactions, currentGuest, optimisticUserReaction]);

  const handleReaction = async (reactionType: string) => {
    if (!currentGuest) return;

    const base = (post.reactions || {}) as Record<string, string>;
    const previous = base[currentGuest.id] ?? null;
    const optimisticNext = previous === reactionType ? null : reactionType;
    setOptimisticUserReaction(optimisticNext);

    try {
      await onReaction(post.id, reactionType);
      // keep optimistic state until parent refresh matches it
    } catch (error) {
      // rollback
      setOptimisticUserReaction(undefined);
      throw error;
    }
  };

  const handleReport = async () => {
    if (!currentGuest) return;
    
    const reason = await appPrompt({
      title: 'Reportar publicación',
      message: '¿Por qué quieres reportar esta publicación?',
      placeholder: 'Escribe el motivo...',
      confirmText: 'Reportar',
      cancelText: 'Cancelar',
      multiline: true,
    });
    
    // Validar que el motivo tenga al menos 4 caracteres (sin espacios iniciales/finales)
    if (!reason || reason.trim().length < 4) {
      notify.info('Por favor, escribe un motivo válido de al menos 4 letras.');
      return;
    }
    
    await onReport(post.id, reason.trim());
    notify.success('Publicación reportada. El moderador la revisará.');
  };

  const handleComment = async () => {
    if (!newComment.trim() || !currentGuest) return;
    
    setIsSubmittingComment(true);
    try {
      await onComment(post.id, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Error posting comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const getTotalCommentsCount = useMemo(() => {
    const countReplies = (replies: EventBookReply[]): number => {
      if (!replies || replies.length === 0) return 0;
      return replies.reduce((total, reply) => {
        return total + 1 + countReplies(reply.replies || []);
      }, 0);
    };

    return post.comments.reduce((total, comment) => {
      return total + 1 + countReplies(comment.replies || []);
    }, 0);
  }, [post.comments]);

  const handleReply = async () => {
    if (!replyContent.trim() || !currentGuest || !replyingTo) return;
    
    setIsSubmittingReply(true);
    try {
      if (replyingTo.isNested) {
        await onNestedReply(post.id, replyingTo.commentId, replyContent.trim(), replyingTo.userName);
      } else {
        await onCommentReply(post.id, replyingTo.commentId, replyContent.trim(), replyingTo.userName);
      }
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const getGuestById = (guestId: string) => {
    return allGuests.find(g => g.id === guestId);
  };

  // Componente recursivo para renderizar respuestas anidadas con indentación fija
  const NestedReply = ({ reply, depth = 0 }: { reply: EventBookReply; depth?: number }) => {
    const replyAuthor = getGuestById(reply.guestId);
    if (!replyAuthor) return null;

    return (
      <>
        {/* Respuesta actual con indentación fija */}
        <div key={reply.id} className="flex space-x-2 mt-2">
          {replyAuthor.profilePhoto ? (
            <img
              src={replyAuthor.profilePhoto}
              alt={`${replyAuthor.firstName} ${replyAuthor.lastName}`}
              className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-3 h-3 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="font-semibold text-xs">
                {replyAuthor.firstName} {replyAuthor.lastName}
              </p>
              <p className="text-gray-800 text-sm">
                <span className="text-blue-600 font-medium">@{reply.replyingTo}</span> {reply.content}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 ml-3 text-xs text-gray-500">
              <span>{formatTimeAgo(reply.createdAt)}</span>
              {reply.reactions && Object.keys(reply.reactions).length > 0 && (
                <ReactionsSummary
                  reactionsMap={reply.reactions}
                  allGuests={allGuests}
                  clickToShowUsers
                  className="shrink-0"
                />
              )}
              {currentGuest && (
                <div className="relative flex items-center gap-2">
                  <button
                    onClick={() => setShowReplyReactionPicker(
                      showReplyReactionPicker === reply.id ? null : reply.id
                    )}
                    className="hover:underline font-semibold text-blue-500 flex items-center space-x-1 shrink-0"
                  >
                    <span>😊</span>
                    <span>Reaccionar</span>
                  </button>
                  <ReactionPicker
                    isVisible={showReplyReactionPicker === reply.id}
                    onReaction={(reactionType) => {
                      onReplyReaction(post.id, reply.id, reactionType);
                      setShowReplyReactionPicker(null);
                    }}
                    currentReaction={currentGuest ? reply.reactions?.[currentGuest.id] : null}
                    onClose={() => setShowReplyReactionPicker(null)}
                  />
                  <button
                    onClick={() => setReplyingTo({
                      commentId: reply.id,
                      userName: `${replyAuthor.firstName} ${replyAuthor.lastName}`,
                      isNested: true
                    })}
                    className="hover:underline font-semibold shrink-0"
                  >
                    Responder
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Respuestas anidadas con la misma indentación (sin ml-4 adicional) */}
        {reply.replies && reply.replies.length > 0 && (
          <>
            {reply.replies.map((nestedReply) => (
              <NestedReply key={nestedReply.id} reply={nestedReply} depth={depth + 1} />
            ))}
          </>
        )}
      </>
    );
  };

  const reactionCounts = getReactionCounts(effectiveReactions);
  const userReaction = getUserReaction(effectiveReactions);
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);
  const currentReactionDisplay = getReactionDisplay(userReaction);

  if (!author) return null;

  return (
    <div className={`bg-white rounded-lg shadow mb-4 ${
      post.isAnnouncement ? 'border-l-4 border-red-500' : 
      post.isHighlighted ? 'border-l-4 border-yellow-500' : ''
    }`}>
      {/* Badge especial para posts destacados/anuncios */}
      {(post.isAnnouncement || post.isHighlighted) && (
        <div className="px-4 pt-3 pb-1">
          <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            post.isAnnouncement 
              ? 'bg-red-100 text-red-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {post.isAnnouncement ? (
              <>
                <Megaphone className="w-3 h-3" />
                <span>Anuncio Oficial</span>
              </>
            ) : (
              <>
                <Star className="w-3 h-3" />
                <span>Post Destacado</span>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Header del post */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {author.profilePhoto ? (
            <img
              src={author.profilePhoto}
              alt={`${author.firstName} ${author.lastName}`}
              className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-sm">
                {author.firstName.charAt(0)}{author.lastName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">
                {author.firstName} {author.lastName}
              </h3>
              {post.feeling && (
                <>
                  <span className="text-gray-400">•</span>
                  <span className="text-sm text-gray-600 flex items-center space-x-1">
                    <span>{post.feeling.emoji}</span>
                    <span>me siento {post.feeling.name}</span>
                  </span>
                </>
              )}
            </div>
            <p className="text-sm text-gray-500">{formatTimeAgo(post.createdAt)}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Contenido del post */}
      {post.content && (
        <div className="px-4 pb-3">
          <p className="text-gray-800 whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Media del post */}
      {post.mediaFiles && post.mediaFiles.length > 0 && (
        <div className="w-full">
          {post.mediaFiles.length === 1 ? (
            // Una sola imagen/video
            <div className="w-full">
              {post.mediaFiles[0].type === 'image' ? (
                <img
                  src={post.mediaFiles[0].url}
                  alt="Post content"
                  className="w-full max-h-96 object-cover"
                />
              ) : (
                <video
                  src={post.mediaFiles[0].url}
                  controls
                  className="w-full max-h-96 object-cover"
                />
              )}
            </div>
          ) : (
            // Múltiples archivos - grid
            <div className={`grid gap-1 ${post.mediaFiles.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
              {post.mediaFiles.slice(0, 4).map((media, index) => (
                <div key={index} className="relative">
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={`Post content ${index + 1}`}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <video
                      src={media.url}
                      controls
                      className="w-full h-48 object-cover"
                    />
                  )}
                  {index === 3 && post.mediaFiles.length > 4 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <span className="text-white font-semibold text-xl">
                        +{post.mediaFiles.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Estadísticas: reacciones agrupadas (click = ver quién), comentarios */}
      {(totalReactions > 0 || post.comments.length > 0) && (
        <div className="px-4 py-2 border-b border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-2 text-gray-500 text-sm">
            {totalReactions > 0 && (
              <ReactionsSummary
                reactionsMap={effectiveReactions}
                allGuests={allGuests}
                clickToShowUsers
              />
            )}
            {getTotalCommentsCount > 0 && (
              <button
                onClick={() => setShowAllComments(!showAllComments)}
                className="hover:underline"
              >
                {getTotalCommentsCount} comentario{getTotalCommentsCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botones de acción */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-3 gap-1">
          {/* Botón de reacciones con picker */}
          <div className="relative">
            <button
              onClick={() => setShowReactionPicker((v) => !v)}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg transition-colors w-full ${
                userReaction
                  ? `${currentReactionDisplay.color} bg-blue-50`
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="text-lg">{currentReactionDisplay.emoji}</span>
              <span className="font-medium">{currentReactionDisplay.name}</span>
            </button>
            
            <ReactionPicker
              isVisible={showReactionPicker}
              onReaction={handleReaction}
              currentReaction={userReaction}
              onClose={() => setShowReactionPicker(false)}
            />
          </div>
          
          <button
            onClick={() => {
              // Siempre hacer focus en el input para comentar
              document.querySelector(`#comment-input-${post.id}`)?.focus();
            }}
            className="flex items-center justify-center space-x-2 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comentar</span>
          </button>
          
          {!post.moderatorPost && (
            <button
              onClick={handleReport}
              className="flex items-center justify-center space-x-2 py-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <Flag className="w-5 h-5" />
              <span className="font-medium">Reportar</span>
            </button>
          )}
        </div>
      </div>

      {/* Comentarios */}
      {commentsToShow.length > 0 && (
        <div className="px-4 pb-4 border-t border-gray-200">
          {/* Lista de comentarios visible */}
          {commentsToShow.length > 0 && (
            <div className="mt-3 space-y-3">
              {commentsToShow.map((comment) => {
                const commentAuthor = getGuestById(comment.guestId);
                if (!commentAuthor) return null;

                return (
                  <div key={comment.id} className="space-y-2">
                    {/* Comentario principal */}
                    <div className="flex space-x-2">
                      {commentAuthor.profilePhoto ? (
                        <img
                          src={commentAuthor.profilePhoto}
                          alt={`${commentAuthor.firstName} ${commentAuthor.lastName}`}
                          className="w-8 h-8 rounded-full object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                          <p className="font-semibold text-sm">
                            {commentAuthor.firstName} {commentAuthor.lastName}
                          </p>
                          <p className="text-gray-800">{comment.content}</p>
                        </div>
                        {/* Acciones del comentario: reacciones agrupadas + Reaccionar + Responder */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 ml-3 text-xs text-gray-500">
                          <span>{formatTimeAgo(comment.createdAt)}</span>
                          {comment.reactions && Object.keys(comment.reactions).length > 0 && (
                            <ReactionsSummary
                              reactionsMap={comment.reactions}
                              allGuests={allGuests}
                              clickToShowUsers
                              className="shrink-0"
                            />
                          )}
                          <div className="relative flex items-center gap-2">
                            <button
                              onClick={() => setShowCommentReactionPicker(
                                showCommentReactionPicker === comment.id ? null : comment.id
                              )}
                              className="hover:underline font-semibold text-blue-500 flex items-center space-x-1 shrink-0"
                            >
                              <span>😊</span>
                              <span>Reaccionar</span>
                            </button>
                            <ReactionPicker
                              isVisible={showCommentReactionPicker === comment.id}
                              onReaction={(reactionType) => {
                                onCommentReaction(post.id, comment.id, reactionType);
                                setShowCommentReactionPicker(null);
                              }}
                              currentReaction={currentGuest ? comment.reactions?.[currentGuest.id] : null}
                              onClose={() => setShowCommentReactionPicker(null)}
                            />
                            <button
                              onClick={() => setReplyingTo({
                                commentId: comment.id,
                                userName: `${commentAuthor.firstName} ${commentAuthor.lastName}`
                              })}
                              className="hover:underline font-semibold shrink-0"
                            >
                              Responder
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Respuestas anidadas usando componente recursivo */}
                    {comment.replies && comment.replies.length > 0 && (
                      <>
                        <div className="ml-10 space-y-2">
                          {getVisibleReplies(comment).map((reply: EventBookReply) => (
                            <NestedReply key={reply.id} reply={reply} depth={0} />
                          ))}
                        </div>
                        
                        {/* Botón para mostrar/ocultar más respuestas */}
                        {comment.replies.length > INITIAL_REPLIES_VISIBLE && (
                          <div className="ml-10 mt-2">
                            <button
                              onClick={() => toggleRepliesExpansion(comment.id)}
                              className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  toggleRepliesExpansion(comment.id);
                                }
                              }}
                            >
                              {expandedReplies.has(comment.id)
                                ? 'Ver menos'
                                : `Ver ${comment.replies.length - INITIAL_REPLIES_VISIBLE} respuestas más`
                              }
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Indicador de comentarios ocultos/mostrados */}
          {sortedComments.length > INITIAL_COMMENTS_VISIBLE && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowAllComments(!showAllComments)}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setShowAllComments(!showAllComments);
                  }
                }}
              >
                {showAllComments
                  ? 'Ver menos'
                  : `Ver ${sortedComments.length - INITIAL_COMMENTS_VISIBLE} comentarios más`
                }
              </button>
            </div>
          )}

          {/* Campo de respuesta */}
          {replyingTo && currentGuest && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-blue-700">
                  Respondiendo a <span className="font-semibold">{replyingTo.userName}</span>
                </p>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="text-blue-500 hover:text-blue-700"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center space-x-3">
                {currentGuest.profilePhoto ? (
                  <img
                    src={currentGuest.profilePhoto}
                    alt={`${currentGuest.firstName} ${currentGuest.lastName}`}
                    className="w-6 h-6 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-xs">
                      {currentGuest.firstName.charAt(0)}{currentGuest.lastName.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={`Responde a ${replyingTo.userName}...`}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleReply()}
                    disabled={isSubmittingReply}
                    className="w-full bg-white rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300"
                    autoFocus
                  />
                  <button
                    onClick={handleReply}
                    disabled={!replyContent.trim() || isSubmittingReply}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Input para agregar comentario - Siempre visible */}
      {currentGuest && (
        <div className="px-4 pb-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mt-3">
            {currentGuest.profilePhoto ? (
              <img
                src={currentGuest.profilePhoto}
                alt={`${currentGuest.firstName} ${currentGuest.lastName}`}
                className="w-8 h-8 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xs">
                  {currentGuest.firstName.charAt(0)}{currentGuest.lastName.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1 relative">
              <input
                id={`comment-input-${post.id}`}
                type="text"
                placeholder="Escribe un comentario..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                disabled={isSubmittingComment}
                className="w-full bg-gray-100 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleComment}
                disabled={!newComment.trim() || isSubmittingComment}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-500 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
