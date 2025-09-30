import React from 'react';
import { Pencil, Trash2, Maximize2 } from 'lucide-react';
import type { EventCard } from '../types/event';

interface EventCardPreviewProps {
  card: EventCard;
  onEdit: () => void;
  onDelete: () => void;
  onFullView: () => void;
}

export function EventCardPreview({ card, onEdit, onDelete, onFullView }: EventCardPreviewProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="relative h-48">
        <img
          src={card.cover_image}
          alt="Portada del evento"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-xl font-medium text-white">{card.event_name}</h3>
          <div className="flex space-x-2 mt-2">
            {card.show_health_form && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Formulario de Salud
              </span>
            )}
            {card.show_mobility_form && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Formulario de Movilidad
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4">
        <div className="flex justify-end space-x-2">
          <button
            onClick={onFullView}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Vista Completa
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}