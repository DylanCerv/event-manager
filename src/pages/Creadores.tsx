import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Users, Shield, DollarSign, BarChart3, Check, Eye, X, Calendar, CheckCircle, XCircle, Clock, BookOpen, UserCheck, Edit, Trash2 } from 'lucide-react';
import { deleteUserAPI } from '../endpoints/user';
import { commissionsStorage } from '../lib/commissions-storage';
import { eventBookStorage } from '../lib/eventbook-storage';
import CreateCreatorModal from '../components/CreateCreatorModal';
import { useUser } from '../contexts/UserContext';
import type { ApiUser } from '../types/auth';
import EditCreatorModal from '../components/EditCreatorModal';
import type { Creator } from '../types/creator';
import type { CommissionSummary } from '../types/commission';
import { getBoltEventsAPI } from '../endpoints/boltEvent';
import { notify } from '../lib/notify';
import { appConfirm } from '../lib/dialogs';

export default function Creadores() {
  const { filterByRoleId, users: apiUsers, fetchUsers } = useUser();
  const [activeTab, setActiveTab] = useState<'creators' | 'finances'>('creators');
  const [searchTerm, setSearchTerm] = useState('');
  const backendCreators: ApiUser[] = useMemo(() => filterByRoleId('CREATOR'), [apiUsers]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCreator, setSelectedCreator] = useState<ApiUser | null>(null);
  const [, setIsLoading] = useState(true);
  const [, setCommissionSummaries] = useState<CommissionSummary[]>([]);
  const [globalStats, setGlobalStats] = useState({
    totalRevenue: 0,
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0
  });
  const [commissions, setCommissions] = useState<any[]>([]);
  const [creatorStats, setCreatorStats] = useState({
    total: 0,
    active: 0,
    topPerformer: null as { name: string; amount: number } | null,
    newThisMonth: 0
  });
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    preset: 'all' as 'all' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'custom'
  });
  const [filteredStats, setFilteredStats] = useState({
    totalRevenue: 0,
    totalCommissions: 0,
    paidCommissions: 0,
    pendingCommissions: 0
  });
  const [filteredCommissions, setFilteredCommissions] = useState<any[]>([]);
  const [showCreatorDetails, setShowCreatorDetails] = useState<Creator | null>(null);
  const [creatorMetrics, setCreatorMetrics] = useState<any>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [creatorDateFilter, setCreatorDateFilter] = useState<string>('all');
  const [creatorSpecificDate, setCreatorSpecificDate] = useState<string>('');

  useEffect(() => {
    loadCreators();
    fetchUsers().catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'finances') {
      loadCommissionData();
    }
  }, [activeTab]);

  const mapApiCreatorToCreator = (u: ApiUser): Creator => ({
    id: String(u.id),
    firstName: u.name || '',
    lastName: (u.last_name as string) || '',
    email: u.email || '',
    username: (u.username as string) || '',
    password: (u as any).password_plain || '',
    phone: (u.phone as string) || '',
    country: (u.country as string) || '',
    status: (u.status as any) === 'suspended' ? 'suspended' : 'active',
    commissionPercentage: Number((u as any).commission_percentage ?? (u as any).commissionPercentage ?? 15),
    createdAt: (u.created_at as string) || new Date().toISOString(),
    createdBy: String((u as any).creator_id ?? ''),
    city: (u.city as string) || '',
  });

  // Recompute creator stats when backend creators or commissions change
  useEffect(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const total = backendCreators.length;
    const active = backendCreators.filter(c => c.status === 'active').length;
    const newThisMonth = backendCreators.filter((c: any) => {
      const createdAt = c.created_at ? new Date(c.created_at as string) : null;
      return createdAt ? createdAt >= thirtyDaysAgo : false;
    }).length;

    // Top performer: creator with highest total commissions
    let topPerformer: { name: string; amount: number } | null = null;
    if (commissions.length > 0) {
      const totals: Record<string, number> = {};
      for (const c of commissions) {
        totals[c.creatorId] = (totals[c.creatorId] ?? 0) + c.amount;
      }
      const topId = Object.entries(totals).sort(([, a], [, b]) => b - a)[0]?.[0];
      if (topId) {
        const topCreatorApi = backendCreators.find(c => String(c.id) === topId);
        if (topCreatorApi && (totals[topId] ?? 0) > 0) {
          topPerformer = {
            name: `${topCreatorApi.name || ''} ${(topCreatorApi.last_name as string) || ''}`.trim(),
            amount: totals[topId],
          };
        }
      }
    }

    setCreatorStats({ total, active, newThisMonth, topPerformer });
  }, [backendCreators, commissions]);

  const loadCreators = async () => {
    try {
      setIsLoading(true);
      await loadCommissionData();
    } catch (error) {
      console.error('Error loading creators:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommissionData = async () => {
    try {
      const [globalData, allCommissions] = await Promise.all([
        commissionsStorage.getAllCommissionsSummary(),
        commissionsStorage.getCommissions(),
      ]);
      setGlobalStats(globalData);

      const sorted = [...allCommissions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setCommissions(sorted);
      applyDateFilter(sorted);

      // Build summaries grouped by creator from the commissions themselves
      const summaryMap: Record<string, CommissionSummary> = {};
      for (const c of sorted) {
        if (!summaryMap[c.creatorId]) {
          summaryMap[c.creatorId] = {
            creatorId: c.creatorId,
            totalCommissions: 0,
            paidCommissions: 0,
            pendingCommissions: 0,
            totalEvents: 0,
            totalGuests: 0,
            totalRevenue: 0,
          };
        }
        summaryMap[c.creatorId].totalCommissions += c.amount;
        if (c.status === 'paid') summaryMap[c.creatorId].paidCommissions += c.amount;
        else summaryMap[c.creatorId].pendingCommissions += c.amount;
        summaryMap[c.creatorId].totalEvents++;
        summaryMap[c.creatorId].totalGuests += c.guestCount;
      }
      const summaries = Object.values(summaryMap);
      setCommissionSummaries(summaries);
    } catch (error) {
      console.error('Error loading commission data:', error);
    }
  };

  const handleMarkAsPaid = async (creatorId: string) => {
    try {
      const creatorCommissions = await commissionsStorage.getCommissionsByCreator(creatorId);
      const pendingCommissions = creatorCommissions.filter(c => c.status === 'pending');
      
      // Mark all pending commissions as paid
      await Promise.all(
        pendingCommissions.map(commission => 
          commissionsStorage.markAsPaid(commission.id, 'superadmin')
        )
      );
      
      await loadCommissionData();
    } catch (error) {
      console.error('Error marking commissions as paid:', error);
    }
  };
  void handleMarkAsPaid;

  const handleDeleteCreator = async (id: string | number) => {
    const confirmed = await appConfirm({
      title: 'Eliminar creador',
      message: '¿Estás seguro de que quieres eliminar este creador?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (confirmed) {
      try {
        const response = await deleteUserAPI(Number(id));
        if (response && (response.id || response.status === 200 || response.message)) {
          await fetchUsers();
        }
      } catch (error) {
        console.error('Error deleting creator:', error);
        notify.error('Error al eliminar el creador');
      }
    }
  };

  const openEditModal = (creator: ApiUser) => {
    setSelectedCreator(creator);
    setShowEditModal(true);
  };

  const getCreatorDateFilterRange = (filter: string, specificDate: string) => {
    const now = new Date();
    let startDate: Date;
    
    switch (filter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'specific':
        if (!specificDate) return null;
        const specificDateTime = new Date(specificDate);
        startDate = new Date(specificDateTime.getFullYear(), specificDateTime.getMonth(), specificDateTime.getDate());
        const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
        return { startDate, endDate };
      default:
        return null;
    }
    
    return { startDate, endDate: now };
  };

  const formatDateForInput = (isoDate: string): string => {
    if (!isoDate) return '';
    try {
      const d = new Date(isoDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const filterCreatorByDateRange = (items: any[], dateField: string, dateRange: any) => {
    if (!dateRange) return items;
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= dateRange.startDate && itemDate <= dateRange.endDate;
    });
  };

  const calculateCreatorMetrics = async (creator: Creator, dateFilter = creatorDateFilter, specificDate = creatorSpecificDate) => {
    try {
      setIsLoadingMetrics(true);
      
      // Cargar datos reales desde backend (SuperAdmin)
      await fetchUsers();
      const allApiUsers = apiUsers || [];
      const creatorAdmins = allApiUsers.filter((u: any) =>
        String((u as any).creator_id ?? '') === String(creator.id) &&
        String((u as any).role_id ?? u.role?.id) === '2'
      );
      const creatorAdminIds = creatorAdmins.map((u: any) => String(u.id));

      const eventsRes = await getBoltEventsAPI({ queryParams: { include_requests: true } });
      const allEvents = (eventsRes?.data || []).map((e: any) => ({
        id: String(e.id),
        name: e.name,
        date: formatDateForInput(e.start_at),
        guest_count: Number(e.guest_count || 0),
        created_by: String(e.user_id || ''),
        created_at: e.created_at,
        request: e.request || null,
      }));
      const allEventBooks = await eventBookStorage.getAllEventBooks();
      
      // Usuarios creados por este creador (admins)
      const creatorUsers = creatorAdmins.map((u: any) => ({
        id: String(u.id),
        status: (u as any).status || 'active',
      }));
      
      // Obtener rango de fechas para filtrado
      const dateRange = getCreatorDateFilterRange(dateFilter, specificDate);
      
      // Calcular eventos de los usuarios del creador
      let creatorEvents = allEvents.filter((event: any) => creatorAdminIds.includes(String(event.created_by)));
      
      // Aplicar filtro de fecha si está seleccionado
      if (dateRange) {
        creatorEvents = filterCreatorByDateRange(creatorEvents, 'date', dateRange);
      }
      
      const now = new Date();
      const activeEvents = creatorEvents.filter((event: any) => new Date(event.date) >= now);
      const finishedEvents = creatorEvents.filter((event: any) => new Date(event.date) < now);
      
      // Solicitudes vienen en event.request desde backend
      let creatorRequests = creatorEvents.map((e: any) => e.request).filter(Boolean);
      if (dateRange) {
        creatorRequests = creatorRequests.filter((r: any) => {
          const d = new Date(r.created_at || r.createdAt || '');
          return d >= dateRange.startDate && d <= dateRange.endDate;
        });
      }
      
      const approvedRequests = creatorRequests.filter((request: any) => request.status === 'approved');
      const rejectedRequests = creatorRequests.filter((request: any) => request.status === 'rejected');
      const pendingRequests = creatorRequests.filter((request: any) => request.status === 'pending');
      
      // Calcular EventBooks de los usuarios del creador
      const creatorEventIds = creatorEvents.map((event: any) => event.id);
      const creatorEventBooks = allEventBooks.filter(book => creatorEventIds.includes(book.event_id));
      const activeEventBooks = creatorEventBooks.filter(book => book.isActive);
      const closedEventBooks = creatorEventBooks.filter(book => !book.isActive);
      
      // Total invitados (guest_count por evento)
      const totalGuests = creatorEvents.reduce((sum: number, e: any) => sum + Number(e.guest_count || 0), 0);
      
      // Encontrar último evento
      const lastEvent = creatorEvents
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Encontrar evento más exitoso (por número de invitados)
      const eventGuestCounts = creatorEvents.map((event: any) => ({
        event,
        guestCount: Number(event.guest_count || 0)
      }));
      const mostSuccessfulEvent = eventGuestCounts
        .sort((a: any, b: any) => b.guestCount - a.guestCount)[0];
      
      const metrics = {
        users: {
          total: creatorUsers.length,
          active: creatorUsers.filter(user => user.status === 'active').length,
          suspended: creatorUsers.filter(user => user.status === 'suspended').length
        },
        events: {
          active: activeEvents.length,
          finished: finishedEvents.length,
          total: creatorEvents.length
        },
        requests: {
          total: creatorRequests.length,
          approved: approvedRequests.length,
          rejected: rejectedRequests.length,
          pending: pendingRequests.length
        },
        eventBooks: {
          total: creatorEventBooks.length,
          active: activeEventBooks.length,
          closed: closedEventBooks.length
        },
        participation: {
          totalGuests,
          lastEventDate: lastEvent ? lastEvent.date : null,
          lastEventName: lastEvent ? lastEvent.name : null,
          mostSuccessfulEvent: mostSuccessfulEvent ? {
            name: mostSuccessfulEvent.event.name,
            guestCount: mostSuccessfulEvent.guestCount
          } : null
        }
      };
      
      setCreatorMetrics(metrics);
      setShowCreatorDetails(creator);
    } catch (error) {
      console.error('Error calculating creator metrics:', error);
      notify.error('Error al cargar las métricas del creador');
    } finally {
      setIsLoadingMetrics(false);
    }
  };



  const applyDateFilter = (allCommissions: any[]) => {
    let filtered = allCommissions;
    const now = new Date();
    
    if (dateFilter.preset !== 'all') {
      let startDate: Date;
      let endDate = now;
      
      switch (dateFilter.preset) {
        case 'thisMonth':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'lastMonth':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'last3Months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
          break;
        case 'thisYear':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        case 'custom':
          if (dateFilter.startDate) startDate = new Date(dateFilter.startDate);
          if (dateFilter.endDate) endDate = new Date(dateFilter.endDate);
          break;
        default:
          startDate = new Date(0);
      }
      
      if (startDate!) {
        filtered = allCommissions.filter(commission => {
          const commissionDate = new Date(commission.createdAt);
          return commissionDate >= startDate && commissionDate <= endDate;
        });
      }
    }
    
    setFilteredCommissions(filtered);
    
    // Calculate filtered stats
    const stats = {
      totalRevenue: 0,
      totalCommissions: 0,
      paidCommissions: 0,
      pendingCommissions: 0
    };
    
    filtered.forEach(commission => {
      const revenue = commission.guestCount * commission.amount / (commission.commissionPercentage / 100);
      stats.totalRevenue += revenue;
      stats.totalCommissions += commission.amount;
      
      if (commission.status === 'paid') {
        stats.paidCommissions += commission.amount;
      } else {
        stats.pendingCommissions += commission.amount;
      }
    });
    
    setFilteredStats(stats);
  };

  const handleDateFilterChange = (preset: string, startDate?: string, endDate?: string) => {
    const newFilter = {
      preset: preset as any,
      startDate: startDate || '',
      endDate: endDate || ''
    };
    setDateFilter(newFilter);
    
    // Re-apply filter with new settings
    applyDateFilter(commissions);
  };

  const getDateRangeText = () => {
    switch (dateFilter.preset) {
      case 'thisMonth': return 'Este Mes';
      case 'lastMonth': return 'Último Mes';
      case 'last3Months': return 'Últimos 3 Meses';
      case 'thisYear': return 'Este Año';
      case 'custom': 
        if (dateFilter.startDate && dateFilter.endDate) {
          return `${new Date(dateFilter.startDate).toLocaleDateString('es-ES')} - ${new Date(dateFilter.endDate).toLocaleDateString('es-ES')}`;
        }
        return 'Período Personalizado';
      default: return 'Todo el Tiempo';
    }
  };

  const handleMarkSingleCommissionAsPaid = async (commissionId: string) => {
    try {
      await commissionsStorage.markAsPaid(commissionId, 'superadmin');
      await loadCommissionData();
    } catch (error) {
      console.error('Error marking commission as paid:', error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Creadores</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 space-x-2"
          >
            <Plus size={20} />
            Crear Creador
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('creators')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'creators'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Creadores</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('finances')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'finances'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5" />
                <span>Finanzas</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'creators' && (
          <>
            {/* Creator Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                    </div>
                    <div className="ml-3 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          👥 Total Creadores
                        </dt>
                        <dd className="text-lg sm:text-xl font-bold text-gray-900">
                          {creatorStats.total}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                    </div>
                    <div className="ml-3 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          ✅ Creadores Activos
                        </dt>
                        <dd className="text-lg sm:text-xl font-bold text-gray-900">
                          {creatorStats.active}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                    </div>
                    <div className="ml-3 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          🏆 Top Performer
                        </dt>
                        <dd className="text-sm font-medium text-gray-900">
                          {creatorStats.topPerformer ? (
                            <div>
                              <div className="truncate font-bold">{creatorStats.topPerformer.name}</div>
                              <div className="text-xs text-gray-500">${creatorStats.topPerformer.amount.toFixed(2)}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin datos</span>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4 sm:p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Plus className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
                    </div>
                    <div className="ml-3 sm:ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                          ⭐ Nuevos este Mes
                        </dt>
                        <dd className="text-lg sm:text-xl font-bold text-gray-900">
                          {creatorStats.newThisMonth}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white shadow sm:rounded-lg mb-6 sm:mb-8">
              <div className="px-3 py-4 sm:px-6 sm:py-5">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, apellido, email o país..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full pl-9 sm:pl-10 pr-3 py-2 sm:py-2.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-offset-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Creators Cards from API (UserContext) */}
            <div className="space-y-4">
              {!backendCreators || backendCreators.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron creadores</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {searchTerm ? 'Intenta ajustar los términos de búsqueda.' : 'Comienza creando tu primer creador.'}
                  </p>
                </div>
              ) : (
                backendCreators
                  .filter((creator) => {
                    if (!searchTerm.trim()) return true;
                    const q = searchTerm.toLowerCase();
                    return (
                      (creator.name || '').toLowerCase().includes(q) ||
                      (creator.last_name || '').toLowerCase().includes(q) ||
                      (creator.email || '').toLowerCase().includes(q) ||
                      ((creator.country || '') as string).toLowerCase().includes(q)
                    );
                  })
                  .map((creator) => (
                    <div key={String(creator.id)} className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                          <div className="flex-shrink-0">
                            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                              <span className="text-lg font-medium text-purple-700">
                                {(creator.name || 'C')[0]}{(creator.last_name || 'R')[0]}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-lg font-medium text-gray-900 truncate">
                              {creator.name} {creator.last_name}
                            </div>
                            <div className="text-sm text-gray-500 truncate">{creator.email}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-sm text-gray-600">{(creator.country as string) || '-'}</span>
                              <span className="text-gray-300">•</span>
                              <span className="text-sm text-gray-600">{creator.phone || '-'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                          <div className="flex items-center justify-between sm:justify-start space-x-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              creator.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {creator.status === 'active' ? 'Activo' : 'Suspendido'}
                            </span>
                            <span className="text-sm text-gray-500">
                              {creator.created_at ? new Date(creator.created_at as string).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'}) : '-'}
                            </span>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => {
                                calculateCreatorMetrics(mapApiCreatorToCreator(creator));
                              }}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </button>
                            <button
                              onClick={() => openEditModal(creator)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              title="Editar creador"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteCreator(creator.id)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              title="Eliminar creador"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Empty state is handled above using backendCreators */}
          </>
        )}

        {/* Finances Tab */}
        {activeTab === 'finances' && (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Filtros de Fecha</h3>
                  <p className="text-sm text-gray-500">Período seleccionado: {getDateRangeText()}</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Preset Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDateFilterChange('all')}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        dateFilter.preset === 'all'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Todo
                    </button>
                    <button
                      onClick={() => handleDateFilterChange('thisMonth')}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        dateFilter.preset === 'thisMonth'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Este Mes
                    </button>
                    <button
                      onClick={() => handleDateFilterChange('lastMonth')}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        dateFilter.preset === 'lastMonth'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Último Mes
                    </button>
                    <button
                      onClick={() => handleDateFilterChange('last3Months')}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        dateFilter.preset === 'last3Months'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Últimos 3 Meses
                    </button>
                    <button
                      onClick={() => handleDateFilterChange('thisYear')}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        dateFilter.preset === 'thisYear'
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Este Año
                    </button>
                  </div>
                  
                  {/* Custom Date Range */}
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => {
                        const startDate = e.target.value;
                        handleDateFilterChange('custom', startDate, dateFilter.endDate);
                      }}
                      className="px-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Desde"
                    />
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => {
                        const endDate = e.target.value;
                        handleDateFilterChange('custom', dateFilter.startDate, endDate);
                      }}
                      className="px-3 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Hasta"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Financial Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-xs font-medium text-gray-500 truncate">
                          Ingresos Totales
                        </dt>
                        <dd className="text-base font-medium text-gray-900">
                          ${dateFilter.preset === 'all' ? globalStats.totalRevenue.toLocaleString() : filteredStats.totalRevenue.toLocaleString()}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-xs font-medium text-gray-500 truncate">
                          Comisiones Pagadas
                        </dt>
                        <dd className="text-base font-medium text-gray-900">
                          ${dateFilter.preset === 'all' ? globalStats.paidCommissions.toFixed(2) : filteredStats.paidCommissions.toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-xs font-medium text-gray-500 truncate">
                          Comisiones Pendientes
                        </dt>
                        <dd className="text-base font-medium text-gray-900">
                          ${dateFilter.preset === 'all' ? globalStats.pendingCommissions.toFixed(2) : filteredStats.pendingCommissions.toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-3 w-0 flex-1">
                      <dl>
                        <dt className="text-xs font-medium text-gray-500 truncate">
                          Ganancia Neta
                        </dt>
                        <dd className="text-base font-medium text-gray-900">
                          ${dateFilter.preset === 'all' ? (globalStats.totalRevenue - globalStats.paidCommissions).toFixed(2) : (filteredStats.totalRevenue - filteredStats.paidCommissions).toFixed(2)}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Individual Commissions Cards */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">
                Comisiones por Solicitud Aprobada
              </h3>
              
              {(dateFilter.preset === 'all' ? commissions : filteredCommissions).length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <DollarSign className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No hay comisiones generadas
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Las comisiones aparecerán aquí cuando se aprueben solicitudes de eventos.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {(dateFilter.preset === 'all' ? commissions : filteredCommissions).map((commission) => {
                    const creatorApi = backendCreators.find(c => String(c.id) === commission.creatorId);
                    const creatorDisplayName = creatorApi
                      ? `${creatorApi.name || ''} ${(creatorApi.last_name as string) || ''}`.trim()
                      : null;
                    const creatorInitials = creatorApi
                      ? `${(creatorApi.name || 'C')[0]}${((creatorApi.last_name as string) || 'R')[0]}`
                      : '??';

                    return (
                      <div key={commission.id} className="bg-white shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="p-4 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 gap-4">
                            <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1 gap-2">
                              {/* Creator Avatar */}
                              <div className="flex-shrink-0">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                  <span className="text-sm font-medium text-indigo-700">
                                    {creatorInitials}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Commission Details */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 space-y-1 sm:space-y-0">
                                    <h4 className="text-base sm:text-lg font-medium text-gray-900 truncate">
                                      {creatorDisplayName ?? 'Creador no encontrado'}
                                    </h4>
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 w-fit">
                                      {commission.commissionPercentage}%
                                    </span>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 truncate">
                                  {commission.eventName ?? `Evento #${commission.eventId}`}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm text-gray-500">
                                  <span className="flex items-center">
                                    <Users className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    {commission.guestCount} invitados
                                  </span>
                                  <span className="flex items-center">
                                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    ${commission.amount.toFixed(2)} comisión
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {new Date(commission.createdAt).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'})}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-center">
                                <div className="text-lg sm:text-xl font-bold text-green-600">
                                  ${commission.amount.toFixed(2)}
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  commission.status === 'paid' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {commission.status === 'paid' ? 'Pagado' : 'Pendiente'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Actions */}
                            <div className="mt-4">
                              {commission.status === 'pending' ? (
                                <button
                                  onClick={() => handleMarkSingleCommissionAsPaid(commission.id)}
                                  className="inline-flex items-center justify-center px-3 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 w-full sm:w-auto"
                                >
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                  Marcar como Pagado
                                </button>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center justify-center sm:justify-start text-green-600 bg-green-50 px-3 py-2 rounded-md">
                                      <Check className="w-4 h-4 sm:w-5 sm:h-5 mr-1" />
                                      <span className="text-xs sm:text-sm font-medium">Pagado</span>
                                  </div>
                                  {commission.paidAt && (
                                    <span className="text-[9px] text-green-400 ml-2 hidden sm:inline">
                                      {new Date(commission.paidAt).toLocaleDateString('es-ES', {day: 'numeric', month: 'numeric', year: 'numeric'})}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <CreateCreatorModal
        isOpen={showCreateModal}
        onClose={async () => {
          setShowCreateModal(false);
          await fetchUsers();
        }}
      />

      <EditCreatorModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedCreator(null);
        }}
        creator={selectedCreator}
        onUpdated={async () => {
          await fetchUsers();
        }}
      />

      {/* Modal de Métricas del Creador */}
      {showCreatorDetails && creatorMetrics && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <BarChart3 className="h-6 w-6 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    Métricas de {showCreatorDetails.firstName} {showCreatorDetails.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {showCreatorDetails.email} • @{showCreatorDetails.username || ''}
                  </p>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
                    <div><span className="font-medium text-gray-700">Teléfono:</span> {showCreatorDetails.phone || '-'}</div>
                    <div><span className="font-medium text-gray-700">País:</span> {showCreatorDetails.country || '-'}</div>
                    <div><span className="font-medium text-gray-700">Ciudad:</span> {showCreatorDetails.city || '-'}</div>
                    <div className="sm:col-span-2"><span className="font-medium text-gray-700">Dirección:</span> {(showCreatorDetails as any).address || '-'}</div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCreatorDetails(null);
                  setCreatorMetrics(null);
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
                    value={creatorDateFilter}
                    onChange={(e) => setCreatorDateFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las fechas</option>
                    <option value="week">Última semana</option>
                    <option value="month">Último mes</option>
                    <option value="3months">Últimos 3 meses</option>
                    <option value="year">Último año</option>
                    <option value="specific">Fecha específica</option>
                  </select>

                  {creatorDateFilter === 'specific' && (
                    <input
                      type="date"
                      value={creatorSpecificDate}
                      onChange={(e) => setCreatorSpecificDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  <button
                    onClick={() => calculateCreatorMetrics(showCreatorDetails, creatorDateFilter, creatorSpecificDate)}
                    disabled={isLoadingMetrics}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Aplicar Filtro
                  </button>

                  {creatorDateFilter !== 'all' && (
                    <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                      {creatorDateFilter === 'week' && 'Mostrando últimos 7 días'}
                      {creatorDateFilter === 'month' && 'Mostrando últimos 30 días'}
                      {creatorDateFilter === '3months' && 'Mostrando últimos 90 días'}
                      {creatorDateFilter === 'year' && 'Mostrando últimos 365 días'}
                      {creatorDateFilter === 'specific' && creatorSpecificDate && `Mostrando: ${new Date(creatorSpecificDate).toLocaleDateString('es-ES')}`}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Usuarios Creados */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Users className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="text-sm font-medium text-blue-900">Usuarios Creados</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">Total:</span>
                      <span className="text-sm font-semibold text-blue-900">{creatorMetrics.users.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">Activos:</span>
                      <span className="text-sm font-semibold text-green-600">{creatorMetrics.users.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-blue-700">Suspendidos:</span>
                      <span className="text-sm font-semibold text-red-600">{creatorMetrics.users.suspended}</span>
                    </div>
                  </div>
                </div>

                {/* Eventos */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-sm font-medium text-green-900">Eventos</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">Activos:</span>
                      <span className="text-sm font-semibold text-green-600">{creatorMetrics.events.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">Finalizados:</span>
                      <span className="text-sm font-semibold text-gray-600">{creatorMetrics.events.finished}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-green-700">Total:</span>
                      <span className="text-sm font-semibold text-green-900">{creatorMetrics.events.total}</span>
                    </div>
                  </div>
                </div>

                {/* Solicitudes */}
                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <UserCheck className="h-5 w-5 text-yellow-600 mr-2" />
                    <h4 className="text-sm font-medium text-yellow-900">Solicitudes</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-yellow-700">Aceptadas:</span>
                      <span className="text-sm font-semibold text-green-600">
                        <CheckCircle className="h-4 w-4 inline mr-1" />
                        {creatorMetrics.requests.approved}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-yellow-700">Rechazadas:</span>
                      <span className="text-sm font-semibold text-red-600">
                        <XCircle className="h-4 w-4 inline mr-1" />
                        {creatorMetrics.requests.rejected}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-yellow-700">Pendientes:</span>
                      <span className="text-sm font-semibold text-yellow-600">
                        <Clock className="h-4 w-4 inline mr-1" />
                        {creatorMetrics.requests.pending}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-yellow-200 pt-2">
                      <span className="text-sm text-yellow-700">Total:</span>
                      <span className="text-sm font-semibold text-yellow-900">{creatorMetrics.requests.total}</span>
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
                      <span className="text-sm text-purple-700">Activos:</span>
                      <span className="text-sm font-semibold text-green-600">{creatorMetrics.eventBooks.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-purple-700">Cerrados:</span>
                      <span className="text-sm font-semibold text-gray-600">{creatorMetrics.eventBooks.closed}</span>
                    </div>
                    <div className="flex justify-between border-t border-purple-200 pt-2">
                      <span className="text-sm text-purple-700">Total:</span>
                      <span className="text-sm font-semibold text-purple-900">{creatorMetrics.eventBooks.total}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Sección de Participación - Ancho completo */}
              <div className="mt-6 bg-indigo-50 rounded-lg p-4">
                <div className="flex items-center mb-4">
                  <BarChart3 className="h-5 w-5 text-indigo-600 mr-2" />
                  <h4 className="text-sm font-medium text-indigo-900">Participación y Rendimiento</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">{creatorMetrics.participation.totalGuests}</div>
                    <div className="text-sm text-indigo-700">Total de Invitados</div>
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-indigo-900">Último Evento</div>
                    <div className="text-sm text-indigo-700">
                      {creatorMetrics.participation.lastEventName || 'Sin eventos'}
                    </div>
                    {creatorMetrics.participation.lastEventDate && (
                      <div className="text-xs text-indigo-600">
                        {new Date(creatorMetrics.participation.lastEventDate).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <div className="text-sm font-medium text-indigo-900">Evento Más Exitoso</div>
                    <div className="text-sm text-indigo-700">
                      {creatorMetrics.participation.mostSuccessfulEvent?.name || 'Sin eventos'}
                    </div>
                    {creatorMetrics.participation.mostSuccessfulEvent && (
                      <div className="text-xs text-indigo-600">
                        {creatorMetrics.participation.mostSuccessfulEvent.guestCount} invitados
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => {
                  setShowCreatorDetails(null);
                  setCreatorMetrics(null);
                }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
