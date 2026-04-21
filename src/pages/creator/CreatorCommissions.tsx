import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { commissionsStorage } from '../../lib/commissions-storage';
import { configStorage } from '../../lib/config-storage';
import type { Commission, CommissionSummary } from '../../types/commission';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Calendar,
  Users,
  Filter,
  Eye
} from 'lucide-react';

interface CommissionWithEventData extends Commission {
  eventDate?: string;
  adminName?: string;
}

export default function CreatorCommissions() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<CommissionWithEventData[]>([]);
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [pricePerGuest, setPricePerGuest] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'guests'>('date');
  const [dateFilter, setDateFilter] = useState({
    preset: 'all',
    startDate: '',
    endDate: ''
  });
  const [filteredSummary, setFilteredSummary] = useState<CommissionSummary | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadCommissionsData();
    }
  }, [user?.id]);

  const loadCommissionsData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load commissions for this creator (backend now includes eventName)
      const creatorCommissions = await commissionsStorage.getCommissionsByCreator(user.id);

      const commissionsWithEventData: CommissionWithEventData[] = creatorCommissions.map(commission => ({
        ...commission,
        eventDate: '',
        adminName: '',
      }));
      
      setCommissions(commissionsWithEventData);
      
      // Load summary
      const summaryData = await commissionsStorage.getCommissionSummary(user.id);
      setSummary(summaryData);
      
      // Load price per guest
      const price = await configStorage.getPricePerGuest();
      setPricePerGuest(price);
      
      // Apply initial date filter
      applyDateFilter(commissionsWithEventData);
      
    } catch (error) {
      console.error('Error loading commissions data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyDateFilter = (allCommissions: CommissionWithEventData[]) => {
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
    
    // Calculate filtered summary
    const filteredStats: CommissionSummary = {
      creatorId: user?.id || '',
      totalCommissions: filtered.reduce((sum, c) => sum + c.amount, 0),
      paidCommissions: filtered.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0),
      pendingCommissions: filtered.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0),
      totalEvents: filtered.length,
      totalGuests: filtered.reduce((sum, c) => sum + c.guestCount, 0),
      totalRevenue: filtered.reduce((sum, c) => sum + (c.guestCount * pricePerGuest), 0)
    };
    
    setFilteredSummary(filteredStats);
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

  const filteredCommissions = commissions
    .filter(commission => {
      if (filter === 'all') return true;
      return commission.status === filter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'guests':
          return b.guestCount - a.guestCount;
        case 'date':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando comisiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Comisiones</h1>
          <p className="mt-2 text-gray-600">
            Visualiza tus comisiones generadas por eventos aprobados
          </p>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Filtros de Período</h3>
              <span className="text-sm text-gray-500">{getDateRangeText()}</span>
            </div>
          </div>
          <div className="p-3 sm:p-6">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 mb-3 sm:mb-4">
              <button
                onClick={() => handleDateFilterChange('thisMonth')}
                className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  dateFilter.preset === 'thisMonth'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Este Mes
              </button>
              <button
                onClick={() => handleDateFilterChange('lastMonth')}
                className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  dateFilter.preset === 'lastMonth'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Último Mes
              </button>
              <button
                onClick={() => handleDateFilterChange('last3Months')}
                className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  dateFilter.preset === 'last3Months'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Últimos 3 Meses
              </button>
              <button
                onClick={() => handleDateFilterChange('thisYear')}
                className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  dateFilter.preset === 'thisYear'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Este Año
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <button
                onClick={() => handleDateFilterChange('all')}
                className={`px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                  dateFilter.preset === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Todo el Tiempo
              </button>
              
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => handleDateFilterChange('custom', e.target.value, dateFilter.endDate)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm flex-1 min-w-0"
                  placeholder="Fecha inicio"
                />
                <span className="text-gray-500 text-xs">-</span>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => handleDateFilterChange('custom', dateFilter.startDate, e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1.5 text-xs sm:text-sm flex-1 min-w-0"
                  placeholder="Fecha fin"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {(filteredSummary || summary) && (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6 mb-6 sm:mb-8">
            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Total Ganado</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {formatCurrency((filteredSummary || summary)!.totalCommissions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-yellow-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Pendiente</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {formatCurrency((filteredSummary || summary)!.pendingCommissions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 sm:h-8 sm:w-8 text-purple-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Pagado</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {formatCurrency((filteredSummary || summary)!.paidCommissions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TrendingUp className="h-5 w-5 sm:h-8 sm:w-8 text-blue-600" />
                </div>
                <div className="ml-2 sm:ml-4">
                  <p className="text-xs sm:text-sm font-medium text-gray-500">Eventos</p>
                  <p className="text-lg sm:text-2xl font-semibold text-gray-900">
                    {(filteredSummary || summary)!.totalEvents}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Commissions List */}
        {filteredCommissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No hay comisiones' : `No hay comisiones ${filter === 'pending' ? 'pendientes' : 'pagadas'}`}
            </h3>
            <p className="text-gray-500">
              {filter === 'all' 
                ? 'Aún no se han generado comisiones para tus eventos.'
                : `No tienes comisiones ${filter === 'pending' ? 'pendientes' : 'pagadas'} en este momento.`
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {filteredCommissions.map((commission) => (
              <div key={commission.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-6">
                  {/* Header - Título y Estado */}
                  <div className="flex items-start justify-between mb-3 sm:mb-2">
                    <h3 className="text-sm sm:text-base font-semibold text-gray-900 pr-2 leading-tight">
                      {commission.eventName ?? `Evento #${commission.eventId}`}
                    </h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                      commission.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {commission.status === 'paid' ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>

                  {/* Mobile Layout */}
                  <div className="block sm:hidden">
                    {/* Información principal en 2x2 grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{commission.guestCount} inv.</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">
                          {commission.eventDate 
                            ? new Date(commission.eventDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
                            : 'Sin fecha'
                          }
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <TrendingUp className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{commission.commissionPercentage}%</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-purple-600">
                          {formatCurrency(commission.amount)}
                        </p>
                        <p className="text-xs text-gray-500">Tu comisión</p>
                      </div>
                    </div>

                    {/* Información adicional */}
                    <div className="space-y-1 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 font-medium">
                        {commission.adminName}
                      </p>
                      <p className="text-xs text-gray-400">
                        Creado: {formatDate(commission.createdAt)}
                      </p>
                      {commission.paidAt && (
                        <p className="text-xs text-green-600 font-medium">
                          Pagado: {formatDate(commission.paidAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Desktop Layout - mantener original */}
                  <div className="hidden sm:block">
                    <div className="grid grid-cols-3 gap-4 mb-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-2" />
                        <span>{commission.guestCount} inv.</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {commission.eventDate 
                            ? new Date(commission.eventDate).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
                            : 'Sin fecha'
                          }
                        </span>
                      </div>
                      <div className="flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        <span>{commission.commissionPercentage}%</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 truncate">
                          {commission.adminName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(commission.createdAt)}
                        </p>
                        {commission.paidAt && (
                          <p className="text-xs text-green-600">
                            Pagado: {formatDate(commission.paidAt)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-purple-600">
                          {formatCurrency(commission.amount)}
                        </p>
                        <p className="text-xs text-gray-500">Tu comisión</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Footer */}
        {filteredCommissions.length > 0 && (
          <div className="mt-8 bg-purple-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-purple-900">
                  Resumen de {filter === 'all' ? 'todas las' : filter === 'pending' ? 'comisiones pendientes' : 'comisiones pagadas'}
                </h4>
                <p className="text-purple-700">
                  {filteredCommissions.length} evento{filteredCommissions.length !== 1 ? 's' : ''} • {' '}
                  {filteredCommissions.reduce((sum, c) => sum + c.guestCount, 0)} invitados totales
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-purple-900">
                  {formatCurrency(filteredCommissions.reduce((sum, c) => sum + c.amount, 0))}
                </p>
                <p className="text-purple-700">Total en comisiones</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
