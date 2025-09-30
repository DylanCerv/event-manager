import React from 'react';
import { Edit, Trash2, UserPlus, ChevronDown, ChevronUp, Calendar, Users, X, BookOpen } from 'lucide-react';
import type { UserAccess } from '../types/roles';
import type { Event } from '../types/event';
import type { EventBook } from '../types/eventbook';

interface UserAccessCardProps {
  userAccess: UserAccess;
  onEdit: (userAccess: UserAccess) => void;
  onDelete: (id: string) => void;
  onAssignEvent: (userAccessId: string, eventId: string) => void;
  onRevokeEvent: (userAccessId: string, eventId: string) => void;
  availableEvents: Event[];
  availableEventBooks: EventBook[];
}

export function UserAccessCard({ 
  userAccess, 
  onEdit, 
  onDelete, 
  onAssignEvent, 
  onRevokeEvent,
  availableEvents,
  availableEventBooks
}: UserAccessCardProps) {
  const [showEventList, setShowEventList] = React.useState(false);

  const getAccessTypeLabel = (type: string) => {
    switch (type) {
      case 'control_acceso':
        return 'Control de Acceso';
      case 'seguridad':
        return 'Seguridad';
      case 'catering':
        return 'Catering';
      case 'moderador':
        return 'Moderador';
      default:
        return type;
    }
  };

  const getAccessTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'control_acceso':
        return 'bg-blue-100 text-blue-800';
      case 'seguridad':
        return 'bg-red-100 text-red-800';
      case 'catering':
        return 'bg-green-100 text-green-800';
      case 'moderador':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              {userAccess.firstName} {userAccess.lastName}
            </h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAccessTypeBadgeColor(userAccess.accessType)}`}>
              {getAccessTypeLabel(userAccess.accessType)}
            </span>
          </div>
          <div className="space-y-1 text-sm text-gray-500">
            <p><span className="font-medium">Usuario:</span> @{userAccess.username}</p>
            <p><span className="font-medium">Creado:</span> {new Date(userAccess.createdAt).toLocaleDateString('es-ES')}</p>
            <p>
              <span className="font-medium">
                {userAccess.accessType === 'moderador' ? 'EventBooks asignados:' : 'Eventos asignados:'}
              </span>{' '}
              {userAccess.accessType === 'moderador' 
                ? (userAccess.assignedEventBooks || []).length 
                : userAccess.assignedEvents.length
              }
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onEdit(userAccess)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </button>
        
        <button
          onClick={() => onDelete(userAccess.id)}
          className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </button>
        
        <button
          onClick={() => setShowEventList(!showEventList)}
          className="inline-flex items-center px-3 py-2 border border-indigo-300 shadow-sm text-sm leading-4 font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {userAccess.accessType === 'moderador' ? (
            <BookOpen className="h-4 w-4 mr-2" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          {userAccess.accessType === 'moderador' ? 'Otorgar EventBook' : 'Otorgar evento'}
          {showEventList ? (
            <ChevronUp className="h-4 w-4 ml-1" />
          ) : (
            <ChevronDown className="h-4 w-4 ml-1" />
          )}
        </button>
      </div>

      {/* Event/EventBook Assignment List */}
      {showEventList && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {userAccess.accessType === 'moderador' ? 'EventBooks Disponibles' : 'Eventos Disponibles'}
          </h4>
          {userAccess.accessType === 'moderador' ? (
            // EventBooks list for moderators
            availableEventBooks.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableEventBooks.map((eventBook) => {
                  const isAssigned = (userAccess.assignedEventBooks || []).includes(eventBook.id);
                  return (
                    <div
                      key={eventBook.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAssigned
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() => onAssignEvent(userAccess.id, eventBook.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h5 className="text-sm font-medium text-gray-900">{eventBook.name}</h5>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                            <BookOpen className="h-3 w-3" />
                            <span>EventBook</span>
                            <Users className="h-3 w-3 ml-2" />
                            <span>{eventBook.stats.participants} participantes</span>
                          </div>
                        </div>
                        {isAssigned && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            Asignado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No tenés EventBooks para asignar</p>
              </div>
            )
          ) : (
            // Events list for other roles
            availableEvents.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      userAccess.assignedEvents.includes(event.id)
                        ? 'bg-indigo-50 border-indigo-200'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => onAssignEvent(userAccess.id, event.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{event.name}</h5>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(event.date).toLocaleDateString('es-ES')}</span>
                          <Users className="h-3 w-3 ml-2" />
                          <span>{event.guest_count} invitados</span>
                        </div>
                      </div>
                      {userAccess.assignedEvents.includes(event.id) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Asignado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay eventos disponibles</p>
              </div>
            )
          )}
        </div>
      )}

      {/* Eventos/EventBooks Asignados Section */}
      {userAccess.accessType === 'moderador' ? (
        // EventBooks asignados para moderadores
        (userAccess.assignedEventBooks && userAccess.assignedEventBooks.length > 0) && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">EventBooks Asignados</h4>
            <div className="space-y-3">
              {userAccess.assignedEventBooks.map((eventBookId) => {
                const eventBook = availableEventBooks.find(eb => eb.id === eventBookId);
                if (!eventBook) return null;
                
                return (
                  <div key={eventBookId} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{eventBook.name}</h5>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <BookOpen className="h-3 w-3" />
                          <span>EventBook</span>
                          <Users className="h-3 w-3 ml-2" />
                          <span>{eventBook.stats.participants} participantes</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRevokeEvent(userAccess.id, eventBookId)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                        title="Quitar acceso a este EventBook"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Quitar acceso
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      ) : (
        // Eventos asignados para otros roles
        userAccess.assignedEvents.length > 0 && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-4">Eventos Asignados</h4>
            <div className="space-y-3">
              {userAccess.assignedEvents.map((eventId) => {
                const event = availableEvents.find(e => e.id === eventId);
                if (!event) return null;
                
                return (
                  <div key={eventId} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900">{event.name}</h5>
                        <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(event.date).toLocaleDateString('es-ES')}</span>
                          <Users className="h-3 w-3 ml-2" />
                          <span>{event.guest_count} invitados</span>
                        </div>
                      </div>
                      <button
                        onClick={() => onRevokeEvent(userAccess.id, eventId)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                        title="Quitar acceso a este evento"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Quitar acceso
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )
      )}
    </div>
  );
}