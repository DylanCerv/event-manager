import React from 'react';
import { Users, Calendar, CalendarCheck, UserCheck } from 'lucide-react';
import { useEvents } from '../contexts/EventContext';

export function AdminStats() {
  const {events} = useEvents();
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const stats = React.useMemo(() => {
    const thisMonthEvents = events.filter(event => {
      const eventDate = new Date(event.date); // date is mapped from start_at in EventContext
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });

    return {
      totalEvents: events.length,
      totalGuests: events.reduce((acc, event) => acc + event.guest_count, 0),
      monthEvents: thisMonthEvents.length,
      monthGuests: thisMonthEvents.reduce((acc, event) => acc + event.guest_count, 0),
    };
  }, [events, currentMonth, currentYear]);

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