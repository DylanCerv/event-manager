import React from 'react';
import { Guest } from '../types/event';
import { Mail, Phone, Search, UserCheck, UserX, ClipboardCheck, ClipboardX } from 'lucide-react';

interface GuestListProps {
  guests: Guest[];
  onUpdateGuest: (guest: Guest) => void;
  onSelectionChange: (selectedIds: string[]) => void;
}

export function GuestList({ guests, onUpdateGuest, onSelectionChange }: GuestListProps) {
  const [search, setSearch] = React.useState('');
  const [selectedGuests, setSelectedGuests] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    onSelectionChange(Array.from(selectedGuests));
  }, [selectedGuests, onSelectionChange]);

  const filteredGuests = React.useMemo(() => {
    return guests.filter(guest => 
      guest.name?.toLowerCase().includes(search.toLowerCase()) ||
      guest.guest_number?.toString().includes(search) ||
      guest.email?.toLowerCase().includes(search.toLowerCase()) ||
      (guest.confirmed && 'confirmed'.includes(search.toLowerCase())) ||
      (!guest.confirmed && 'not confirmed'.includes(search.toLowerCase()))
    ).sort((a, b) => (a.guest_number || 0) - (b.guest_number || 0));
  }, [guests, search]);

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests(prev => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const stats = React.useMemo(() => {
    const isGuestComplete = (guest: any) => {
      // Un invitado está completo si:
      const hasName = !!guest.name;
      const hasTableNumber = !!guest.table_number;
      
      // Si tiene categoría de edad explícita, usar esa lógica
      if (guest.age_category === 'minor') {
        return hasName && hasTableNumber; // Menor: solo nombre + mesa
      } else if (guest.age_category === 'adult') {
        return hasName && guest.email && guest.phone && hasTableNumber; // Mayor: nombre + contacto + mesa
      } else {
        // Fallback a lógica actual para compatibilidad con datos existentes
        const isMinor = hasName && (!guest.email && !guest.phone); // Menor de 16
        const isAdult = hasName && guest.email && guest.phone; // Mayor de 16
        return (isMinor || isAdult) && hasTableNumber;
      }
    };

    return {
      complete: guests.filter(isGuestComplete).length,
      incomplete: guests.filter(guest => !isGuestComplete(guest)).length,
      confirmed: guests.filter(guest => guest.confirmed).length,
      notConfirmed: guests.filter(guest => !guest.confirmed).length,
    };
  }, [guests]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
          <ClipboardCheck className="h-4 w-4 text-green-500" />
          <span className="ml-1.5 text-xs text-gray-500">Completos:</span>
          <span className="ml-1 text-sm font-semibold text-gray-900">{stats.complete}</span>
        </div>
        <div className="inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
          <ClipboardX className="h-4 w-4 text-amber-500" />
          <span className="ml-1.5 text-xs text-gray-500">Incompletos:</span>
          <span className="ml-1 text-sm font-semibold text-gray-900">{stats.incomplete}</span>
        </div>
        <div className="inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
          <UserCheck className="h-4 w-4 text-indigo-500" />
          <span className="ml-1.5 text-xs text-gray-500">Confirmados:</span>
          <span className="ml-1 text-sm font-semibold text-gray-900">{stats.confirmed}</span>
        </div>
        <div className="inline-flex items-center px-2.5 py-1.5 bg-white border border-gray-100 rounded-md shadow-sm">
          <UserX className="h-4 w-4 text-gray-500" />
          <span className="ml-1.5 text-xs text-gray-500">No Confirmados:</span>
          <span className="ml-1 text-sm font-semibold text-gray-900">{stats.notConfirmed}</span>
        </div>
      </div>

      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar invitados..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="relative w-12 px-6 sm:w-16 sm:px-8">
                    <input
                      type="checkbox"
                      className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                      checked={selectedGuests.size === filteredGuests.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGuests(new Set(filteredGuests.map(g => g.id)));
                        } else {
                          setSelectedGuests(new Set());
                        }
                      }}
                    />
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Invitado #
                    <span className="text-xs text-gray-500 block">Starting from 100</span>
                  </th>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-48">
                    Invitado
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-20">
                    Edad
                  </th>
                  <th scope="col" className="px-2 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Contacto
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Info. de Salud
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Info. de Movilidad
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Mesa #
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredGuests.map((guest) => (
                  <tr 
                    key={guest.id}
                    className={`${
                      selectedGuests.has(guest.id) ? 'bg-gray-50' : ''
                    } hover:bg-gray-50 cursor-pointer`}
                    onClick={() => toggleGuestSelection(guest.id)}
                  >
                    <td className="relative w-12 px-6 sm:w-16 sm:px-8">
                      <input
                        type="checkbox"
                        className="absolute left-4 top-1/2 -mt-2 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 sm:left-6"
                        checked={selectedGuests.has(guest.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleGuestSelection(guest.id);
                        }}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                      #{guest.guest_number?.toString().padStart(3, '0')}
                    </td>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={guest.name || ''}
                          onChange={(e) => onUpdateGuest({ ...guest, name: e.target.value })}
                          placeholder="Nombre del Invitado"
                          className="block w-full min-w-[200px] border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <select
                        value={guest.age_category || 'auto'}
                        onChange={(e) => {
                          const value = e.target.value;
                          onUpdateGuest({ 
                            ...guest, 
                            age_category: value === 'auto' ? undefined : value as 'minor' | 'adult'
                          });
                        }}
                        className="block w-full border-0 p-0 text-gray-900 focus:ring-0 sm:text-sm"
                      >
                        <option value="auto">Auto</option>
                        <option value="adult">+16</option>
                        <option value="minor">-16</option>
                      </select>
                    </td>
                    <td className="px-2 py-4 text-sm text-gray-500">
                      {(() => {
                        // Determinar si es menor basado en age_category o fallback a lógica actual
                        const isMinor = guest.age_category === 'minor' || 
                          (guest.age_category === undefined && guest.name && (!guest.email && !guest.phone));
                        
                        return isMinor ? (
                          // Menor de 16 años - mostrar indicador
                          <div className="flex items-center space-x-1 text-blue-600">
                            <span className="text-xs font-medium">Menor de 16 años</span>
                          </div>
                        ) : (
                          // Mayor de 16 años - mostrar campos de contacto
                          <div className="flex flex-col space-y-1">
                            <input
                              type="email" 
                              value={guest.email || ''}
                              onChange={(e) => onUpdateGuest({ ...guest, email: e.target.value })}
                              placeholder="Correo"
                              className="block w-32 border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 text-xs"
                            />
                            <input
                              type="tel"
                              value={guest.phone || ''}
                              onChange={(e) => onUpdateGuest({ ...guest, phone: e.target.value })}
                              placeholder="Teléfono"
                              className="block w-32 border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 text-xs"
                            />
                          </div>
                        );
                      })()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <select
                        value={guest.attended ? 'attended' : (guest.confirmed ? 'confirmed' : 'not_confirmed')}
                        onChange={(e) => {
                          const value = e.target.value;
                          onUpdateGuest({
                            ...guest,
                            confirmed: value === 'confirmed' || value === 'attended',
                            attended: value === 'attended'
                          });
                        }}
                        className="block w-full border-0 p-0 text-gray-900 focus:ring-0 sm:text-sm"
                      >
                        <option value="not_confirmed">No Confirmado</option>
                        <option value="confirmed">Confirmado</option>
                        <option value="attended">Asistió</option>
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <input
                        type="text"
                        value={guest.dietary_restrictions || ''}
                        onChange={(e) => onUpdateGuest({ ...guest, dietary_restrictions: e.target.value })}
                        placeholder="Información de Salud"
                        className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <input
                        type="text"
                        value={guest.mobility_restrictions || ''}
                        onChange={(e) => onUpdateGuest({ ...guest, mobility_restrictions: e.target.value })}
                        placeholder="Información de Movilidad"
                        className="block w-full border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <input
                        type="number"
                        value={guest.table_number || ''}
                        onChange={(e) => onUpdateGuest({ ...guest, table_number: parseInt(e.target.value) || undefined })}
                        placeholder="Mesa #"
                        min="1"
                        className="block w-20 border-0 p-0 text-gray-900 placeholder-gray-500 focus:ring-0 sm:text-sm"
                      />
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex space-x-3">
                        {guest.email && (
                          <a
                            href={`mailto:${guest.email}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            <Mail className="h-5 w-5" />
                          </a>
                        )}
                        {guest.phone && (
                          <a
                            href={`https://wa.me/${guest.phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-900"
                          >
                            <Phone className="h-5 w-5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}