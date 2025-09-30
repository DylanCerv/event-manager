import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

interface Feeling {
  id: string;
  emoji: string;
  name: string;
  category: 'emotion';
}

interface FeelingPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (feeling: Feeling) => void;
}

const feelings: Feeling[] = [
  // Solo Emociones/Sentimientos
  { id: 'happy', emoji: '😊', name: 'feliz', category: 'emotion' },
  { id: 'excited', emoji: '🤗', name: 'emocionado/a', category: 'emotion' },
  { id: 'grateful', emoji: '🙏', name: 'agradecido/a', category: 'emotion' },
  { id: 'blessed', emoji: '😇', name: 'bendecido/a', category: 'emotion' },
  { id: 'loved', emoji: '🥰', name: 'amado/a', category: 'emotion' },
  { id: 'proud', emoji: '😎', name: 'orgulloso/a', category: 'emotion' },
  { id: 'relaxed', emoji: '😌', name: 'relajado/a', category: 'emotion' },
  { id: 'tired', emoji: '😴', name: 'cansado/a', category: 'emotion' },
  { id: 'surprised', emoji: '😮', name: 'sorprendido/a', category: 'emotion' },
];

export function FeelingPicker({ isOpen, onClose, onSelect }: FeelingPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredFeelings = feelings.filter(feeling => 
    feeling.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">¿Cómo te sientes?</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar sentimiento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Feelings List */}
        <div className="max-h-96 overflow-y-auto p-4">
          {filteredFeelings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No se encontraron sentimientos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredFeelings.map((feeling) => (
                <button
                  key={feeling.id}
                  onClick={() => {
                    onSelect(feeling);
                    onClose();
                  }}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 transition-colors text-left"
                >
                  <span className="text-2xl">{feeling.emoji}</span>
                  <span className="text-gray-900 font-medium">
                    me siento {feeling.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export type { Feeling };
