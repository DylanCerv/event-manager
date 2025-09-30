import React from 'react';
import { EventFormData } from '../types/event';

interface EventFormProps {
  onSubmit: (data: EventFormData) => void;
  isLoading?: boolean;
  initialData?: EventFormData;
}

export function EventForm({ onSubmit, isLoading, initialData }: EventFormProps) {
  const [formData, setFormData] = React.useState<EventFormData>(initialData || {
    name: '',
    date: '',
    location: '',
    contractor_name: '',
    guest_count: 1,
  });
  const [guestCountInput, setGuestCountInput] = React.useState<string>(
    initialData?.guest_count?.toString() || '1'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Asegurar que guest_count sea un número válido antes de enviar
    const finalData = {
      ...formData,
      guest_count: parseInt(guestCountInput) || 1
    };
    console.log('EventForm - Submitting data:', finalData);
    onSubmit(finalData);
  };

  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setGuestCountInput(value);
    
    // Solo actualizar formData si el valor es un número válido
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0) {
      setFormData({ ...formData, guest_count: numValue });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Nombre del Evento
        </label>
        <input
          type="text"
          id="name"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700">
          Fecha y Hora
        </label>
        <input
          type="datetime-local"
          id="date"
          required
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700">
          Ubicación
        </label>
        <input
          type="text"
          id="location"
          required
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="contractor" className="block text-sm font-medium text-gray-700">
          Nombre del Contratista
        </label>
        <input
          type="text"
          id="contractor"
          required
          value={formData.contractor_name}
          onChange={(e) => setFormData({ ...formData, contractor_name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="guests" className="block text-sm font-medium text-gray-700">
          Número de Invitados
        </label>
        <input
          type="number"
          id="guests"
          required
          min="1"
          value={guestCountInput}
          onChange={handleGuestCountChange}
          onFocus={(e) => e.target.select()}
          placeholder="Ej: 250"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Guardando...' : initialData ? 'Actualizar Evento' : 'Crear Evento'}
        </button>
      </div>
    </form>
  );
}