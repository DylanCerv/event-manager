import React from 'react';
import { MessageCircle, Download, Eye, Calendar, Users, X } from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Guest } from '../types/event';
import { useEvents } from '../contexts/EventContext';
import { notify } from '../lib/notify';

export function Feedback() {
  const { user } = useAuth();
  const { events } = useEvents();
  const [eventsList, setEventsList] = React.useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [guests, setGuests] = React.useState<Guest[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [showGuestModal, setShowGuestModal] = React.useState(false);

  React.useEffect(() => {
    // Eventos vienen del backend vía EventContext
    setEventsList(events);
  }, [events]);

  const API_BASE = import.meta.env.VITE_API_URL as string;
  const getAuthHeaders = (): Record<string, string> => {
    const token =
      sessionStorage.getItem('auth_token') ||
      localStorage.getItem('auth_token') ||
      '';
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const handleEventSelect = async (event: Event) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE}/event-guests/event/${event.id}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error loading guests');
      }
      const eventGuests = (json.data || []).map((g: any) => ({
        id: String(g.id),
        event_id: String(g.event_id),
        name: g.name || undefined,
        guest_number: Number(g.guest_number || 0),
        table_number: g.table_number ? Number(g.table_number) : undefined,
        email: g.email || undefined,
        phone: g.phone || undefined,
        profile_photo: g.profile_photo || undefined,
        health_info: g.health_information || undefined,
        qr_code: g.qr_code || '',
        created_at: g.created_at || new Date().toISOString(),
        qr_code_status: typeof g.qr_code_status === 'boolean' ? g.qr_code_status : undefined,
        video_status: typeof g.video_status === 'boolean' ? g.video_status : undefined,
        video_url: g.video_url || undefined,
        status: g.status || undefined,
        confirmation_status: (g.confirmation_status || 'not confirmed') as Guest['confirmation_status'],
      })) as Guest[];
      // Only show guests with complete information
      const completedGuests = eventGuests.filter(guest => 
        guest.name && guest.email && guest.phone
      );
      setSelectedEvent(event);
      setGuests(completedGuests);
      setShowGuestModal(true);
    } catch (error) {
      console.error('Error loading guests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'xlsx' | 'pdf') => {
    if (!guests.length) return;
    
    try {
      if (format === 'xlsx') {
        const data = guests.map(guest => ({
          'Número': guest.guest_number,
          'Nombre': guest.name || '',
          'Teléfono': guest.phone || '',
          'Email': guest.email || ''
        }));

        const ws = utils.json_to_sheet(data);
        const wb = utils.book_new();
        utils.book_append_sheet(wb, ws, 'Invitados');
        writeFile(wb, `invitados-${selectedEvent?.name || 'evento'}.xlsx`);
      } else {
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(16);
        doc.text(`Lista de Invitados - ${selectedEvent?.name || 'Evento'}`, 14, 15);
        
        // Add table
        const tableData = guests.map(guest => [
          guest.guest_number?.toString() || '',
          guest.name || '',
          guest.phone || '',
          guest.email || ''
        ]);
        
        doc.autoTable({
          startY: 25,
          head: [['Número', 'Nombre', 'Teléfono', 'Email']],
          body: tableData,
          theme: 'striped',
          headStyles: { fillColor: [75, 85, 99] }
        });
        
        doc.save(`invitados-${selectedEvent?.name || 'evento'}.pdf`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      notify.error('Error al exportar los datos');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Feedback</h1>
        <div className="space-y-8">
          {/* Events List */}
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Tus Eventos</h2>
              <div className="space-y-4">
                {eventsList.map((event) => (
                  <div 
                    key={event.id} 
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedEvent?.id === event.id
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => handleEventSelect(event)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                        <div className="mt-1 flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar className="h-4 w-4" />
                          <span>{new Date(event.date).toLocaleDateString()}</span>
                          <span>•</span>
                          <Users className="h-4 w-4" />
                          <span>{event.guest_count} invitados</span>
                        </div>
                      </div>
                      <Eye className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Guest Modal */}
          {showGuestModal && selectedEvent && (
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">
                      Invitados - {selectedEvent.name}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleExport('xlsx')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar XLSX
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar PDF
                      </button>
                      <button
                        onClick={() => setShowGuestModal(false)}
                        className="text-gray-400 hover:text-gray-500 focus:outline-none"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="px-4 py-5 sm:p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-300">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                            Número
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Nombre
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Teléfono
                          </th>
                          <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                            Email
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {guests.map((guest) => (
                          <tr key={guest.id}>
                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                              #{guest.guest_number?.toString().padStart(3, '0')}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {guest.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {guest.phone}
                            </td>
                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                              {guest.email}
                            </td>
                          </tr>
                        ))}
                        {guests.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                              No hay invitados con información completa
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:p-6">
              <div className="py-8">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <MessageCircle className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900">Próximamente: Reseñas y Calificación</h3>
                  <div className="mt-4 flex justify-center items-center space-x-8">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-gray-900">80</p>
                      <p className="text-sm text-gray-500">Reseñas totales</p>
                    </div>
                    <div className="text-center relative">
                      <p className="text-3xl font-bold text-gray-900">8</p>
                      <p className="text-sm text-gray-500">Reseñas esta semana</p>
                      <span className="absolute -top-2 -right-2 bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        +1 nueva
                      </span>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-center items-center">
                    <div className="text-2xl text-yellow-400">★★★★</div>
                    <div className="text-2xl text-gray-300">★</div>
                    <span className="ml-2 text-lg font-medium text-gray-900">4.2</span>
                  </div>
                </div>
                <div className="mt-8 max-w-md mx-auto">
                  <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Distribución de Calificaciones</h4>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center">
                        <div className="w-8 text-sm text-gray-600">{stars}★</div>
                        <div className="flex-1 h-4 mx-2 rounded-full bg-gray-100">
                          <div 
                            className="h-full rounded-full bg-yellow-400" 
                            style={{ 
                              width: `${stars === 5 ? 52.5 : stars === 4 ? 28.75 : stars === 3 ? 11.25 : stars === 2 ? 5 : 2.5}%` 
                            }} 
                          />
                        </div>
                        <div className="w-12 text-sm text-gray-500">{stars === 5 ? 42 : stars === 4 ? 23 : stars === 3 ? 9 : stars === 2 ? 4 : 2}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-8 text-center">
                    <button
                      disabled
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-400 cursor-not-allowed"
                    >
                      Ver todas las reseñas
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Próximamente
                  </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}