import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, Clock, CheckCircle, XCircle, User, Calendar, Search, Users, InboxIcon, Gift } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import type { EventRequest } from '../../types/event';
import { getEventRequestsAPI } from '../../endpoints/eventRequest';
import { getPrizeRedemptionsAPI } from '../../endpoints/prizeRedemption';
import { getPrizesAPI } from '../../endpoints/prize';

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
}

interface RequestWithDetails extends EventRequest {
  eventName?: string;
  user?: UserInfo;
}

interface RequestStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export default function CreatorRequests() {
  const { user } = useAuth();
  const location = useLocation();
  const [mainTab, setMainTab] = useState<'eventos' | 'canjes'>('eventos');
  const [requests, setRequests] = useState<RequestWithDetails[]>([]);
  const [filteredRequests, setFilteredRequests] = useState<RequestWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [stats, setStats] = useState<RequestStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para canjes de premios
  const [prizeRequests, setPrizeRequests] = useState<any[]>([]);
  const [prizeRequestsStats, setPrizeRequestsStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  
  // Estados para premios disponibles
  const [availablePrizes, setAvailablePrizes] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    loadRequests();
    loadPrizeRequests();
    loadAvailablePrizes();
  }, [user, location.pathname]);

  const loadRequests = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Backend scopes CREATOR role to only see requests from their admins
      const response = await getEventRequestsAPI('bolt_event,creator');
      const rawRequests = response?.data?.data ?? response?.data ?? [];

      const enrichedRequests: RequestWithDetails[] = rawRequests.map((r: any) => {
        const boltEvent = r.bolt_event ?? r.boltEvent ?? null;
        const creator = r.creator ?? null;
        return {
          id: String(r.id),
          event_id: String(r.bolt_event_id ?? r.event_id ?? ''),
          status: r.status,
          requested_by: String(r.creator_id ?? ''),
          created_at: r.created_at,
          processed_at: r.processed_at ?? null,
          eventName: boltEvent?.name ?? 'Evento no encontrado',
          guestCount: boltEvent?.guest_count ?? 0,
          user: creator
            ? {
                id: String(creator.id),
                firstName: creator.name ?? '',
                lastName: creator.last_name ?? '',
                email: creator.email ?? '',
                company: creator.company ?? '',
              }
            : undefined,
        };
      });

      setRequests(enrichedRequests);
      setFilteredRequests(enrichedRequests);

      const newStats = {
        total: enrichedRequests.length,
        pending: enrichedRequests.filter(r => r.status === 'pending').length,
        approved: enrichedRequests.filter(r => r.status === 'approved').length,
        rejected: enrichedRequests.filter(r => r.status === 'rejected').length,
      };
      setStats(newStats);
    } catch (error) {
      console.error('Error loading creator requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Función para obtener información del usuario que solicita el canje
  const getPrizeRequestUserInfo = (userId: string) => {
    // Buscar en los usuarios creados por este creador
    const allUsers = JSON.parse(localStorage.getItem('admin_users') || '[]');
    const adminUser = allUsers.find((u: any) => u.id === userId);
    
    if (adminUser) {
      return {
        name: `${adminUser.firstName} ${adminUser.lastName}`,
        company: adminUser.company,
        email: adminUser.email,
        type: 'Administrador'
      };
    }
    
    return {
      name: userId,
      company: 'N/A',
      email: 'N/A',
      type: 'Desconocido'
    };
  };

  // Cargar solicitudes de premios desde localStorage (solo de administradores de este creador)
  const loadPrizeRequests = async () => {
    if (!user) return;

    try {
      const response = await getPrizeRedemptionsAPI();
      const allRequests = response?.data || [];

      // Filter only redemptions from admins created by this creator (backend includes creatorId)
      const creatorPrizeRequests = allRequests.filter((r: any) => r.creatorId === String(user.id));

      setPrizeRequests(creatorPrizeRequests);

      setPrizeRequestsStats({
        total: creatorPrizeRequests.length,
        pending: creatorPrizeRequests.filter((r: any) => r.status === 'pending').length,
        approved: creatorPrizeRequests.filter((r: any) => r.status === 'approved').length,
        rejected: creatorPrizeRequests.filter((r: any) => r.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Error loading prize requests:', error);
      setPrizeRequests([]);
      setPrizeRequestsStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
    }
  };

  // Cargar premios disponibles desde localStorage
  const loadAvailablePrizes = () => {
    try {
      getPrizesAPI()
        .then((response) => {
          setAvailablePrizes(response?.data || []);
        })
        .catch((error) => {
          console.error('Error loading available prizes:', error);
          setAvailablePrizes([]);
        });
    } catch (error) {
      console.error('Error loading available prizes:', error);
      setAvailablePrizes([]);
    }
  };

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, dateFrom, dateTo]);

  const filterRequests = () => {
    let filtered = requests;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(request => 
        request.eventName?.toLowerCase().includes(searchLower) ||
        request.user?.firstName.toLowerCase().includes(searchLower) ||
        request.user?.lastName.toLowerCase().includes(searchLower) ||
        request.user?.email.toLowerCase().includes(searchLower) ||
        request.user?.company.toLowerCase().includes(searchLower)
      );
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.created_at);
        return requestDate >= fromDate;
      });
    }

    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(request => {
        const requestDate = new Date(request.created_at);
        return requestDate <= toDate;
      });
    }

    setFilteredRequests(filtered);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'approved':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'rejected':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'approved':
        return 'Aprobada';
      case 'rejected':
        return 'Rechazada';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-500">Cargando solicitudes...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Solicitudes</h1>
        <p className="mt-2 text-gray-600">
          Gestiona las solicitudes de eventos y canjes de premios de tus administradores
        </p>
      </div>

      {/* Main Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setMainTab('eventos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                mainTab === 'eventos'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Eventos
                {stats.pending > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {stats.pending}
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setMainTab('canjes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                mainTab === 'canjes'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center">
                <Gift className="h-5 w-5 mr-2" />
                Canjes
                {prizeRequestsStats.pending > 0 && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {prizeRequestsStats.pending}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content based on selected tab */}
      {mainTab === 'eventos' && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
              </div>
              <div className="ml-3 sm:ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-400" />
              </div>
              <div className="ml-3 sm:ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pendientes</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-400" />
              </div>
              <div className="ml-3 sm:ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Aprobadas</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.approved}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-3 sm:p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
              </div>
              <div className="ml-3 sm:ml-4 w-0 flex-1">
                <dl>
                  <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">Rechazadas</dt>
                  <dd className="text-lg sm:text-xl font-medium text-gray-900">{stats.rejected}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow sm:rounded-lg mb-6">
        <div className="px-3 py-4 sm:px-4 sm:py-5">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="sm:w-36">
                <select
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                >
                  <option value="all">Todos los estados</option>
                  <option value="pending">Pendientes</option>
                  <option value="approved">Aprobadas</option>
                  <option value="rejected">Rechazadas</option>
                </select>
              </div>
            </div>
            
            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha desde
                </label>
                <input
                  type="date"
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Fecha hasta
                </label>
                <input
                  type="date"
                  className="w-full px-2 py-2 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setDateFrom('');
                    setDateTo('');
                  }}
                  className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
                >
                  Limpiar fechas
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {searchTerm || statusFilter !== 'all' ? 'No se encontraron solicitudes' : 'No hay solicitudes'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda.' 
                  : 'Las solicitudes de tus usuarios aparecerán aquí.'}
              </p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Evento
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitados
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Solicitud
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Procesado
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.eventName || 'Evento no encontrado'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.user?.company || 'Empresa no encontrada'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {request.user ? `${request.user.firstName} ${request.user.lastName}` : 'Usuario no encontrado'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-gray-400 mr-2" />
                        <span className="text-sm font-medium text-gray-900">
                          {(request as any).guestCount ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                        <span className={`ml-2 ${getStatusBadge(request.status)}`}>
                          {getStatusText(request.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.processed_at ? (
                        new Date(request.processed_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
        </>
      )}

      {/* Canjes Tab */}
      {mainTab === 'canjes' && (
        <div>
          <div className="mb-6">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Solicitudes de Canjes de Premios
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Solicitudes de canje realizadas por tus administradores (solo visualización).
              </p>
            </div>
          </div>

          {/* Estadísticas de canjes */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg border">
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <InboxIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">
                        Total Solicitudes
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {prizeRequestsStats.total}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg border">
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">
                        Pendientes
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {prizeRequestsStats.pending}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg border">
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">
                        Aprobadas
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {prizeRequestsStats.approved}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg border">
              <div className="p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <XCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <dl>
                      <dt className="text-xs font-medium text-gray-500 truncate">
                        Rechazadas
                      </dt>
                      <dd className="text-lg font-semibold text-gray-900">
                        {prizeRequestsStats.rejected}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Premios Disponibles */}
          <div className="mb-8">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Premios Disponibles</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Premios que tus administradores pueden canjear con sus puntos.
                  </p>
                </div>
                
                {availablePrizes.filter(prize => prize.targetAudience === 'Administradores').length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {availablePrizes
                      .filter(prize => prize.targetAudience === 'Administradores')
                      .map((prize) => (
                      <div key={prize.id} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          {prize.image ? (
                            <img 
                              src={prize.image} 
                              alt={prize.title}
                              className="w-8 h-8 object-cover rounded"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded flex items-center justify-center">
                              <Gift className="w-4 h-4 text-white" />
                            </div>
                          )}
                          <div className="text-right">
                            <div className="text-sm font-bold text-indigo-600">
                              {prize.points} pts
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm mb-1">{prize.title}</h4>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Disponible
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Gift className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">
                      No hay premios disponibles para administradores
                    </h3>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Lista de solicitudes */}
          {prizeRequests.length === 0 ? (
            <div className="text-center py-12">
              <InboxIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No hay solicitudes de canjes
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Las solicitudes de canje de tus administradores aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="border-t border-gray-200">
                <ul className="divide-y divide-gray-200">
                  {prizeRequests.map((request) => (
                    <li key={request.id} className="px-4 py-5 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-lg font-medium text-gray-900">{request.prizeTitle}</h4>
                            <span className="text-sm text-gray-500">•</span>
                            <span className="text-sm font-medium text-indigo-600">
                              {request.prizePoints} puntos
                            </span>
                          </div>
                          <div className="mt-2 space-y-1">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Empresa:</span> 
                              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-md font-bold ml-2">
                                {getPrizeRequestUserInfo(request.userId).company}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Solicitante:</span> {getPrizeRequestUserInfo(request.userId).name} ({getPrizeRequestUserInfo(request.userId).type})
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">Email:</span> {getPrizeRequestUserInfo(request.userId).email}
                            </div>
                            <div className="text-sm text-gray-500">
                              <span className="font-medium">Solicitado:</span> {new Date(request.requestDate).toLocaleDateString('es-ES')}
                            </div>
                            {request.processedDate && (
                              <div className="text-sm text-gray-500">
                                <span className="font-medium">Procesado:</span> {new Date(request.processedDate).toLocaleDateString('es-ES')}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          {request.status === 'pending' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Clock className="h-4 w-4 mr-1" />
                              Pendiente
                            </span>
                          ) : request.status === 'approved' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprobado
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazado
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
