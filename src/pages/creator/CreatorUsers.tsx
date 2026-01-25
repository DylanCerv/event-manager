import { useState, useEffect } from 'react';
import { Users, FileText, CheckCircle, User, Mail, Building, Eye, X, Calendar, ClipboardList, BookOpen, UserCheck, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { storage } from '../../lib/storage';
import { eventBookStorage } from '../../lib/eventbook-storage';
import { createUserAPI } from '../../endpoints/user';
import { useUser } from '../../contexts/UserContext';
import type { ApiUser } from '../../types/auth';
import { useEvents } from '../../contexts/EventContext';

interface CreatorStats {
  totalUsers: number;
  topUserByApprovals: { name: string; count: number } | null;
  topUserByGuests: { name: string; count: number } | null;
  avgGuestsPerEvent: number;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  company: string;
  country?: string;
  city?: string;
  address?: string;
  phone?: string;
  createdAt: string;
  createdBy: string;
}

interface CreateAdminFormData {
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  password: string;
}

interface UserMetrics {
  events: {
    active: number;
    finished: number;
    total: number;
  };
  requests: {
    approved: number;
    rejected: number;
    pending: number;
    total: number;
  };
  eventBooks: {
    active: number;
    closed: number;
    total: number;
  };
  participation: {
    totalGuests: number;
    lastEvent: {
      name: string;
      date: string;
      guests: number;
    } | null;
    mostSuccessfulEvent: {
      name: string;
      date: string;
      guests: number;
    } | null;
  };
}

export default function CreatorUsers() {
  const { user } = useAuth();
  const { fetchUsers } = useUser();
  const { events: scopedEvents } = useEvents();
  const [stats, setStats] = useState<CreatorStats>({
    totalUsers: 0,
    topUserByApprovals: null,
    topUserByGuests: null,
    avgGuestsPerEvent: 0
  });
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUserDetails, setShowUserDetails] = useState<UserInfo | null>(null);
  const [userMetrics, setUserMetrics] = useState<UserMetrics | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [userDateFilter, setUserDateFilter] = useState('all');
  const [userSpecificDate, setUserSpecificDate] = useState('');
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);
  const [createAdminError, setCreateAdminError] = useState<string | null>(null);
  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminFormData>({
    firstName: '',
    lastName: '',
    company: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    password: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  // Helper functions for date filtering
  const getUserDateFilterRange = (filter: string, specificDate: string) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        return { start: weekAgo, end: now };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        return { start: monthAgo, end: now };
      case '3months':
        const threeMonthsAgo = new Date(today);
        threeMonthsAgo.setDate(today.getDate() - 90);
        return { start: threeMonthsAgo, end: now };
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setDate(today.getDate() - 365);
        return { start: yearAgo, end: now };
      case 'specific':
        if (specificDate) {
          const specific = new Date(specificDate);
          const endOfDay = new Date(specific);
          endOfDay.setHours(23, 59, 59, 999);
          return { start: specific, end: endOfDay };
        }
        return null;
      default:
        return null;
    }
  };

  const filterUserByDateRange = (items: any[], dateField: string, dateRange: { start: Date; end: Date } | null) => {
    if (!dateRange) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= dateRange.start && itemDate <= dateRange.end;
    });
  };

  // Function to calculate detailed metrics for a specific user
  const calculateUserMetrics = async (selectedUser: UserInfo, dateFilter = userDateFilter, specificDate = userSpecificDate) => {
    setIsLoadingMetrics(true);
    
    try {
      // Get date range for filtering
      const dateRange = getUserDateFilterRange(dateFilter, specificDate);
      
      // Use backend-scoped events from EventContext (CREATOR sees events of its admins via backend rules)
      const allEvents = scopedEvents || [];
      const allEventBooks = await eventBookStorage.getAllEventBooks();

      // Filter events and requests by user
      const userEvents = allEvents.filter(event => String(event.created_by) === String(selectedUser.id));
      const userEventBooks = allEventBooks.filter((book: any) => String(book.created_by) === String(selectedUser.id));

      // Apply date filters if specified
      const filteredEvents = filterUserByDateRange(userEvents, 'created_at', dateRange);
      // Requests are attached to events in backend (event.request?.status)
      const filteredRequests = filteredEvents
        .map((e: any) => e.request)
        .filter(Boolean)
        .filter((r: any) => !dateRange || (new Date(r.created_at) >= dateRange.start && new Date(r.created_at) <= dateRange.end));

      // Calculate event metrics (based on event date vs current date)
      const now = new Date();
      const activeEvents = filteredEvents.filter(event => new Date(event.date) >= now).length;
      const finishedEvents = filteredEvents.filter(event => new Date(event.date) < now).length;

      // Calculate request metrics
      const approvedRequests = filteredRequests.filter((req: any) => req.status === 'approved').length;
      const rejectedRequests = filteredRequests.filter((req: any) => req.status === 'rejected').length;
      const pendingRequests = filteredRequests.filter((req: any) => req.status === 'pending').length;

      // Calculate EventBook metrics
      const activeEventBooks = userEventBooks.filter(book => book.isActive).length;
      const closedEventBooks = userEventBooks.filter(book => !book.isActive).length;

      // Calculate participation metrics
      // Guests count from events (backend already has guest_count)
      const totalGuests = filteredEvents.reduce((sum: number, e: any) => sum + Number(e.guest_count || 0), 0);

      // Find last event
      const sortedEvents = filteredEvents.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastEvent = sortedEvents.length > 0 ? {
        name: sortedEvents[0].name,
        date: sortedEvents[0].created_at,
        guests: Number(sortedEvents[0].guest_count || 0)
      } : null;

      // Find most successful event by guest count
      const eventsWithGuestCount = filteredEvents.map(event => ({
        ...event,
        guestCount: Number((event as any).guest_count || 0)
      }));
      const mostSuccessfulEvent = eventsWithGuestCount.length > 0 
        ? eventsWithGuestCount.reduce((max, event) => 
            event.guestCount > max.guestCount ? event : max
          )
        : null;

      const metrics: UserMetrics = {
        events: {
          active: activeEvents,
          finished: finishedEvents,
          total: filteredEvents.length
        },
        requests: {
          approved: approvedRequests,
          rejected: rejectedRequests,
          pending: pendingRequests,
          total: filteredRequests.length
        },
        eventBooks: {
          active: activeEventBooks,
          closed: closedEventBooks,
          total: userEventBooks.length
        },
        participation: {
          totalGuests,
          lastEvent,
          mostSuccessfulEvent: mostSuccessfulEvent ? {
            name: mostSuccessfulEvent.name,
            date: mostSuccessfulEvent.created_at,
            guests: mostSuccessfulEvent.guestCount
          } : null
        }
      };

      setUserMetrics(metrics);
      setShowUserDetails(selectedUser);
    } catch (error) {
      console.error('Error calculating user metrics:', error);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get users created by this creator (from API)
      const allApiUsers = await fetchUsers();
      const creatorUsers: UserInfo[] = (allApiUsers || [])
        .filter((u: ApiUser) => String(u.creator_id ?? '') === String(user.id))
        .filter((u: ApiUser) => String((u as any).role_id ?? u.role?.id) === '2') // ADMIN
        .map((u: ApiUser) => ({
          id: String(u.id),
          firstName: u.name || '',
          lastName: u.last_name || '',
          email: u.email || '',
          username: u.username || '',
          company: (u.company as string) || '',
          country: u.country || '',
          city: u.city || '',
          address: u.address || '',
          phone: u.phone || '',
          createdAt: u.created_at || new Date().toISOString(),
          createdBy: String(u.creator_id ?? ''),
        }));

      // Get all requests from users created by this creator
      const allRequests = (await storage.getEventRequests()) as any[];
      const creatorRequests = allRequests.filter(request => 
        creatorUsers.some(u => u.id === request.requested_by)
      );

      // Get events data for guest count calculations
      const eventsData = JSON.parse(localStorage.getItem('events') || '[]');
      
      // Calculate user with most approved requests
      const approvedRequests = creatorRequests.filter(r => r.status === 'approved');
      const userApprovalCounts = new Map<string, number>();
      
      approvedRequests.forEach(request => {
        const currentCount = userApprovalCounts.get(request.requested_by) || 0;
        userApprovalCounts.set(request.requested_by, currentCount + 1);
      });
      
      let topUserByApprovals = null;
      if (userApprovalCounts.size > 0) {
        const [topUserId, topCount] = Array.from(userApprovalCounts.entries())
          .reduce((max, current) => current[1] > max[1] ? current : max);
        const topUser = creatorUsers.find(u => u.id === topUserId);
        if (topUser) {
          topUserByApprovals = {
            name: `${topUser.firstName} ${topUser.lastName}`,
            count: topCount
          };
        }
      }

      // Calculate user with most guests (from approved requests)
      const userGuestCounts = new Map<string, number>();
      
      approvedRequests.forEach(request => {
        const event = eventsData.find((e: any) => e.id === request.event_id);
        if (event && event.guest_count) {
          const currentCount = userGuestCounts.get(request.requested_by) || 0;
          userGuestCounts.set(request.requested_by, currentCount + event.guest_count);
        }
      });
      
      let topUserByGuests = null;
      if (userGuestCounts.size > 0) {
        const [topUserId, topCount] = Array.from(userGuestCounts.entries())
          .reduce((max, current) => current[1] > max[1] ? current : max);
        const topUser = creatorUsers.find(u => u.id === topUserId);
        if (topUser) {
          topUserByGuests = {
            name: `${topUser.firstName} ${topUser.lastName}`,
            count: topCount
          };
        }
      }

      // Calculate average guests per event (approved events only)
      const approvedEventsWithGuests = approvedRequests.map(request => 
        eventsData.find((e: any) => e.id === request.event_id)
      ).filter(event => event && event.guest_count);
      
      const avgGuestsPerEvent = approvedEventsWithGuests.length > 0 
        ? Math.round(approvedEventsWithGuests.reduce((sum: number, event: any) => sum + event.guest_count, 0) / approvedEventsWithGuests.length)
        : 0;

      setStats({
        totalUsers: creatorUsers.length,
        topUserByApprovals,
        topUserByGuests,
        avgGuestsPerEvent
      });

      setUsers(creatorUsers);
    } catch (error) {
      console.error('Error loading creator data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetCreateAdmin = () => {
    setCreateAdminForm({
      firstName: '',
      lastName: '',
      company: '',
      country: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      password: '',
    });
    setCreateAdminError(null);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreateAdminError(null);
    setIsCreatingAdmin(true);
    try {
      const payload = {
        name: createAdminForm.firstName.trim(),
        last_name: createAdminForm.lastName.trim(),
        email: createAdminForm.email.trim(),
        username: createAdminForm.email.trim(),
        password: createAdminForm.password,
        company: createAdminForm.company.trim() || null,
        country: createAdminForm.country.trim() || null,
        city: createAdminForm.city.trim() || null,
        address: createAdminForm.address.trim() || null,
        phone: createAdminForm.phone.trim() || null,
        role_id: 2, // ADMIN
        status: 'active',
      };

      const response = await createUserAPI(payload);
      const created = response?.data ?? response;
      const isOk = response?.status === 201 || !!created?.id;
      if (!isOk) {
        setCreateAdminError(response?.message || 'No se pudo crear el admin');
        return;
      }

      resetCreateAdmin();
      setShowCreateAdmin(false);
      await loadData();
    } catch (err: any) {
      setCreateAdminError(err?.message || 'No se pudo crear el admin');
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Usuarios</h1>
            <p className="mt-2 text-gray-600">
              Estadísticas y usuarios creados por ti
            </p>
          </div>
          <button
            onClick={() => setShowCreateAdmin(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Crear Usuario
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-indigo-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Usuarios Creados
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.totalUsers}
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
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Top Usuario (Aprobaciones)
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {stats.topUserByApprovals ? 
                      `${stats.topUserByApprovals.name} (${stats.topUserByApprovals.count})` : 
                      'N/A'
                    }
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
                <User className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Top Usuario (Invitados)
                  </dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {stats.topUserByGuests ? 
                      `${stats.topUserByGuests.name} (${stats.topUserByGuests.count})` : 
                      'N/A'
                    }
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
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Promedio Invitados/Evento
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stats.avgGuestsPerEvent}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

      </div>


      {/* Users Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Usuarios Creados
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Lista de usuarios que has creado en el sistema
          </p>
        </div>
        <div className="overflow-x-auto">
          {users.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay usuarios
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Los usuarios que crees aparecerán aquí.
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Creación
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {userItem.firstName} {userItem.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">{userItem.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Building className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">{userItem.company}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(userItem.createdAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => calculateUserMetrics(userItem)}
                        disabled={isLoadingMetrics}
                        className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                        title="Ver métricas detalladas"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Crear Admin */}
      {showCreateAdmin && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Crear Admin</h3>
              <button
                onClick={() => {
                  resetCreateAdmin();
                  setShowCreateAdmin(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {createAdminError && (
              <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                {createAdminError}
              </div>
            )}

            <form onSubmit={handleCreateAdmin} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Nombre"
                  value={createAdminForm.firstName}
                  onChange={(e) => setCreateAdminForm({ ...createAdminForm, firstName: e.target.value })}
                  required
                />
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Apellido"
                  value={createAdminForm.lastName}
                  onChange={(e) => setCreateAdminForm({ ...createAdminForm, lastName: e.target.value })}
                  required
                />
              </div>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Empresa"
                value={createAdminForm.company}
                onChange={(e) => setCreateAdminForm({ ...createAdminForm, company: e.target.value })}
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="País"
                  value={createAdminForm.country}
                  onChange={(e) => setCreateAdminForm({ ...createAdminForm, country: e.target.value })}
                  required
                />
                <input
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ciudad"
                  value={createAdminForm.city}
                  onChange={(e) => setCreateAdminForm({ ...createAdminForm, city: e.target.value })}
                  required
                />
              </div>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Dirección"
                value={createAdminForm.address}
                onChange={(e) => setCreateAdminForm({ ...createAdminForm, address: e.target.value })}
                required
              />
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Teléfono"
                value={createAdminForm.phone}
                onChange={(e) => setCreateAdminForm({ ...createAdminForm, phone: e.target.value })}
                required
              />
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Email"
                type="email"
                value={createAdminForm.email}
                onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })}
                required
              />
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                placeholder="Contraseña (mín. 8)"
                type="password"
                value={createAdminForm.password}
                onChange={(e) => setCreateAdminForm({ ...createAdminForm, password: e.target.value })}
                minLength={8}
                required
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    resetCreateAdmin();
                    setShowCreateAdmin(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingAdmin}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isCreatingAdmin ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Métricas Detalladas */}
      {showUserDetails && userMetrics && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Métricas Detalladas - {showUserDetails.firstName} {showUserDetails.lastName}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {showUserDetails.email} • @{showUserDetails.username || ''} • {showUserDetails.company}
                </p>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
                  <div><span className="font-medium text-gray-700">Teléfono:</span> {showUserDetails.phone || '-'}</div>
                  <div><span className="font-medium text-gray-700">País:</span> {showUserDetails.country || '-'}</div>
                  <div><span className="font-medium text-gray-700">Ciudad:</span> {showUserDetails.city || '-'}</div>
                  <div className="sm:col-span-2"><span className="font-medium text-gray-700">Dirección:</span> {showUserDetails.address || '-'}</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUserDetails(null);
                  setUserMetrics(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {/* Filtros de Fecha */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Filtrar por fecha:</span>
                  
                  <select
                    value={userDateFilter}
                    onChange={(e) => setUserDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las fechas</option>
                    <option value="week">Última semana</option>
                    <option value="month">Último mes</option>
                    <option value="3months">Últimos 3 meses</option>
                    <option value="year">Último año</option>
                    <option value="specific">Fecha específica</option>
                  </select>

                  {userDateFilter === 'specific' && (
                    <input
                      type="date"
                      value={userSpecificDate}
                      onChange={(e) => setUserSpecificDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  <button
                    onClick={() => calculateUserMetrics(showUserDetails, userDateFilter, userSpecificDate)}
                    disabled={isLoadingMetrics}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Aplicar Filtro
                  </button>

                  {userDateFilter !== 'all' && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {userDateFilter === 'week' && 'Mostrando últimos 7 días'}
                      {userDateFilter === 'month' && 'Mostrando últimos 30 días'}
                      {userDateFilter === '3months' && 'Mostrando últimos 90 días'}
                      {userDateFilter === 'year' && 'Mostrando últimos 365 días'}
                      {userDateFilter === 'specific' && userSpecificDate && `Mostrando: ${new Date(userSpecificDate).toLocaleDateString('es-ES')}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Eventos */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="text-sm font-medium text-blue-900">Eventos</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-700">Activos:</span>
                      <span className="text-xs font-medium text-blue-900">{userMetrics.events.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-700">Finalizados:</span>
                      <span className="text-xs font-medium text-blue-900">{userMetrics.events.finished}</span>
                    </div>
                    <div className="flex justify-between border-t border-blue-200 pt-2">
                      <span className="text-xs font-medium text-blue-700">Total:</span>
                      <span className="text-xs font-bold text-blue-900">{userMetrics.events.total}</span>
                    </div>
                  </div>
                </div>

                {/* Solicitudes */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <ClipboardList className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-green-900">Solicitudes</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-green-700">Aprobadas:</span>
                      <span className="text-xs font-medium text-green-900">{userMetrics.requests.approved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-green-700">Rechazadas:</span>
                      <span className="text-xs font-medium text-green-900">{userMetrics.requests.rejected}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-green-700">Pendientes:</span>
                      <span className="text-xs font-medium text-green-900">{userMetrics.requests.pending}</span>
                    </div>
                    <div className="flex justify-between border-t border-green-200 pt-2">
                      <span className="text-xs font-medium text-green-700">Total:</span>
                      <span className="text-xs font-bold text-green-900">{userMetrics.requests.total}</span>
                    </div>
                  </div>
                </div>

                {/* EventBooks */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <BookOpen className="h-5 w-5 text-purple-600 mr-2" />
                    <h4 className="text-sm font-medium text-purple-900">EventBooks</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-purple-700">Activos:</span>
                      <span className="text-xs font-medium text-purple-900">{userMetrics.eventBooks.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-purple-700">Cerrados:</span>
                      <span className="text-xs font-medium text-purple-900">{userMetrics.eventBooks.closed}</span>
                    </div>
                    <div className="flex justify-between border-t border-purple-200 pt-2">
                      <span className="text-xs font-medium text-purple-700">Total:</span>
                      <span className="text-xs font-bold text-purple-900">{userMetrics.eventBooks.total}</span>
                    </div>
                  </div>
                </div>

                {/* Participación */}
                <div className="bg-orange-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <UserCheck className="h-5 w-5 text-orange-600 mr-2" />
                    <h4 className="text-sm font-medium text-orange-900">Participación</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-orange-700">Total Invitados:</span>
                      <span className="text-xs font-medium text-orange-900">{userMetrics.participation.totalGuests}</span>
                    </div>
                    {userMetrics.participation.lastEvent && (
                      <div className="border-t border-orange-200 pt-2">
                        <div className="text-xs font-medium text-orange-700 mb-1">Último Evento:</div>
                        <div className="text-xs text-orange-600">{userMetrics.participation.lastEvent.name}</div>
                        <div className="text-xs text-orange-500">
                          {new Date(userMetrics.participation.lastEvent.date).toLocaleDateString('es-ES')} • {userMetrics.participation.lastEvent.guests} invitados
                        </div>
                      </div>
                    )}
                    {userMetrics.participation.mostSuccessfulEvent && (
                      <div className="border-t border-orange-200 pt-2">
                        <div className="text-xs font-medium text-orange-700 mb-1">Evento Más Exitoso:</div>
                        <div className="text-xs text-orange-600">{userMetrics.participation.mostSuccessfulEvent.name}</div>
                        <div className="text-xs text-orange-500">
                          {new Date(userMetrics.participation.mostSuccessfulEvent.date).toLocaleDateString('es-ES')} • {userMetrics.participation.mostSuccessfulEvent.guests} invitados
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
