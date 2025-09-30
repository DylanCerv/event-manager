import React from 'react';
import { Users, User } from 'lucide-react';
import { EventBookGuest } from '../lib/guest-storage';

interface EventBookUsersSidebarProps {
  guests: EventBookGuest[];
  isVisible: boolean;
}

export function EventBookUsersSidebar({ guests, isVisible }: EventBookUsersSidebarProps) {
  if (!isVisible) return null;

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

  const sortedGuests = [...guests].sort((a, b) => 
    new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
  );

  return (
    <div className="w-full bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">
            Participantes ({guests.length})
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Invitados que se han unido al EventBook
        </p>
      </div>

      {/* Users List */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {sortedGuests.length === 0 ? (
          <div className="text-center py-8">
            <div className="flex justify-center mb-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            </div>
            <p className="text-gray-500 text-sm">
              Aún no hay participantes registrados
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedGuests.map((guest) => (
              <div key={guest.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {guest.profilePhoto ? (
                    <img
                      src={guest.profilePhoto}
                      alt={`${guest.firstName} ${guest.lastName}`}
                      className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                  
                  {/* Indicador de actividad reciente */}
                  {new Date().getTime() - new Date(guest.lastActiveAt).getTime() < 5 * 60 * 1000 && (
                    <div className="w-3 h-3 bg-green-500 rounded-full absolute -mt-2 ml-7 border-2 border-white"></div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {guest.firstName} {guest.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTimeAgo(guest.lastActiveAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {guests.length > 0 && (
        <div className="border-t border-gray-200 p-4 mt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">{guests.length}</p>
              <p className="text-xs text-gray-500">Total registrados</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-green-600">
                {guests.filter(g => 
                  new Date().getTime() - new Date(g.lastActiveAt).getTime() < 5 * 60 * 1000
                ).length}
              </p>
              <p className="text-xs text-gray-500">Activos ahora</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
