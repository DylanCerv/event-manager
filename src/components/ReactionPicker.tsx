import React, { useEffect, useRef } from 'react';
import { ThumbsUp } from 'lucide-react';

interface ReactionPickerProps {
  onReaction: (reactionType: string) => void;
  currentReaction?: string | null;
  isVisible: boolean;
  onClose: () => void;
}

const reactions = [
  { type: 'like', emoji: '👍', name: 'Me gusta', color: 'text-blue-600' },
  { type: 'love', emoji: '❤️', name: 'Me encanta', color: 'text-red-600' },
  { type: 'haha', emoji: '😂', name: 'Me divierte', color: 'text-yellow-600' },
  { type: 'wow', emoji: '😮', name: 'Me sorprende', color: 'text-orange-600' },
  { type: 'sad', emoji: '😢', name: 'Me entristece', color: 'text-blue-400' },
  { type: 'angry', emoji: '😡', name: 'Me enoja', color: 'text-red-500' }
];

export function ReactionPicker({ onReaction, currentReaction, isVisible, onClose }: ReactionPickerProps) {
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
      {/* Picker de reacciones */}
      <div
        ref={pickerRef}
        className="absolute bottom-full left-0 mb-2 bg-white rounded-full shadow-lg border border-gray-200 p-2 flex space-x-1 z-20 animate-bounce-in"
      >
        {reactions.map((reaction) => (
          <button
            key={reaction.type}
            onClick={() => {
              onReaction(reaction.type);
              onClose();
            }}
            className={`
              relative w-12 h-12 rounded-full flex items-center justify-center
              hover:bg-gray-100 transition-all duration-200 transform hover:scale-110
              ${currentReaction === reaction.type ? 'bg-blue-50 ring-2 ring-blue-200' : ''}
            `}
            title={reaction.name}
          >
            <span className="text-2xl">{reaction.emoji}</span>
            
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

// CSS adicional para la animación (agregar a un archivo CSS global o usando styled-components)
const styles = `
  @keyframes bounce-in {
    0% {
      transform: scale(0.8);
      opacity: 0;
    }
    50% {
      transform: scale(1.05);
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  .animate-bounce-in {
    animation: bounce-in 0.3s ease-out;
  }
`;
