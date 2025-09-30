import React from 'react';
import { Users, Calendar, CalendarCheck, UserCheck } from 'lucide-react';
import type { Event, Guest } from '../types/event';

interface AdminStatsProps {
  events: Event[];
  guests: Guest[];
}

export function AdminStats({ events, guests }: AdminStatsProps) {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const stats = React.useMemo(() => {
    const thisMonthEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });

    const thisMonthGuests = guests.filter(guest => {
      const event = events.find(e => e.id === guest.event_id);
      if (!event) return false;
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });

    return {
      totalEvents: events.length,
      totalGuests: guests.length,
      monthEvents: thisMonthEvents.length,
      monthGuests: thisMonthGuests.length,
    };
  }, [events, guests, currentMonth, currentYear]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Calendar className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total de Eventos
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {stats.totalEvents}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Total de Invitados
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {stats.totalGuests}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CalendarCheck className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Eventos Este Mes
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {stats.monthEvents}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="p-5">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserCheck className="h-6 w-6 text-gray-400" />
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">
                  Invitados Este Mes
                </dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {stats.monthGuests}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}