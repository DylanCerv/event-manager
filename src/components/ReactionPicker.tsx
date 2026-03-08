import React, { useEffect, useRef } from 'react';

interface ReactionPickerProps {
  onReaction: (reactionType: string) => void;
  currentReaction?: string | null;
  isVisible: boolean;
  onClose: () => void;
  /** Nombre del evento abierto; se muestra como título del picker */
  eventTitle?: string;
}

const reactions = [
  { type: 'like', emoji: '👍', name: 'Me gusta', color: 'text-blue-600' },
  { type: 'love', emoji: '❤️', name: 'Me encanta', color: 'text-red-600' },
  { type: 'haha', emoji: '😂', name: 'Me divierte', color: 'text-yellow-600' },
  { type: 'wow', emoji: '😮', name: 'Me sorprende', color: 'text-orange-600' },
  { type: 'sad', emoji: '😢', name: 'Me entristece', color: 'text-blue-400' },
  { type: 'angry', emoji: '😡', name: 'Me enoja', color: 'text-red-500' }
];

export function ReactionPicker({ onReaction, currentReaction, isVisible, onClose, eventTitle }: ReactionPickerProps) {
  if (!isVisible) return null;

  const pickerRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click (avoid "instant close" on the same click that opened it)
  useEffect(() => {
    if (!isVisible) return;

    const onMouseDown = (e: MouseEvent) => {
      const el = pickerRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      onClose();
    };

    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
    }, 0);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [isVisible, onClose]);

  return (
    <>
      {/* Una sola fila con scroll horizontal; no wrap para no desbordar */}
      <div
        ref={pickerRef}
        className="absolute bottom-full left-0 mb-2 bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex flex-nowrap gap-1 max-w-[min(calc(100vw-2rem),20rem)] max-h-[4.5rem] min-h-[3.5rem] overflow-x-auto overflow-y-hidden z-20 animate-bounce-in"
        style={{
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          msOverflowStyle: 'none',
        }}
      >
        <style>
          {`
            /* Oculta scrollbar para navegadores webkit */
            [data-hide-scrollbar]::-webkit-scrollbar {
              display: none;
            }
          `}
        </style>
        {reactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => {
              onReaction(reaction.type);
              onClose();
            }}
            className={`
              relative w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0
              hover:bg-gray-100 transition-all duration-200 transform hover:scale-110
              ${currentReaction === reaction.type ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
            `}
            title={reaction.name}
          >
            <span className="text-xl sm:text-2xl">{reaction.emoji}</span>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
              {reaction.name}
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

// Función helper para obtener la reacción activa
export function getReactionDisplay(reactionType: string | null) {
  if (!reactionType) return { emoji: '👍', name: 'Me gusta', color: 'text-gray-600' };
  
  const reaction = reactions.find(r => r.type === reactionType);
  return reaction || { emoji: '👍', name: 'Me gusta', color: 'text-gray-600' };
}

export const REACTIONS_LIST = reactions;

/** Agrupa reactions map (guestId -> type) por tipo y opcionalmente resuelve nombres */
export function groupReactionsByType(reactionsMap: Record<string, string>) {
  const byType: Record<string, string[]> = {};
  Object.entries(reactionsMap || {}).forEach(([guestId, type]) => {
    if (!byType[type]) byType[type] = [];
    byType[type].push(guestId);
  });
  return byType;
}

interface ReactionsSummaryProps {
  reactionsMap: Record<string, string>;
  allGuests: { id: string; firstName?: string; lastName?: string }[];
  /** Si es true, al hacer click se muestra quién reaccionó (estilo Facebook) */
  clickToShowUsers?: boolean;
  className?: string;
}

/** Resumen agrupado de reacciones; opcionalmente clickeable para ver usuarios */
export function ReactionsSummary({
  reactionsMap,
  allGuests,
  clickToShowUsers = true,
  className = '',
}: ReactionsSummaryProps) {
  const [showWho, setShowWho] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const byType = React.useMemo(() => groupReactionsByType(reactionsMap), [reactionsMap]);
  const total = Object.values(byType).reduce((s, arr) => s + arr.length, 0);
  if (total === 0) return null;

  const getGuestName = (id: string) => {
    const g = allGuests.find(x => x.id === id);
    return g ? `${g.firstName || ''} ${g.lastName || ''}`.trim() || 'Invitado' : 'Invitado';
  };

  return (
    <div ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={() => clickToShowUsers && setShowWho(prev => !prev)}
        className={`
          flex items-center gap-0.5 text-sm text-gray-600 hover:text-gray-800
          ${clickToShowUsers ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <div className="flex items-center -space-x-1">
          {reactions.map(r => {
            const count = byType[r.type]?.length ?? 0;
            if (count === 0) return null;
            return <span key={r.type} className="text-base" title={r.name}>{r.emoji}</span>;
          })}
        </div>
        <span className="ml-0.5">{total}</span>
      </button>
      {clickToShowUsers && showWho && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden
            onClick={() => setShowWho(false)}
          />
          <div className="absolute bottom-full left-0 mb-1 min-w-[160px] max-w-[260px] bg-white border border-gray-200 rounded-lg shadow-lg py-2 px-3 z-20 text-left">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reactions.map(r => {
                const guestIds = byType[r.type] ?? [];
                if (guestIds.length === 0) return null;
                const disp = getReactionDisplay(r.type);
                return (
                  <div key={r.type} className="text-sm">
                    <span className="font-medium text-gray-700">{disp.emoji} {disp.name}</span>
                    <div className="text-gray-600 mt-0.5 pl-4">
                      {guestIds.map(id => getGuestName(id)).join(', ')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

