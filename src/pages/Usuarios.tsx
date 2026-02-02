import React from 'react';
import { storage } from '../lib/storage';
import { useUser } from '../contexts/UserContext';
import type { ApiUser } from '../types/auth';
import { eventBookStorage } from '../lib/eventbook-storage';
import { getBoltEventsAPI } from '../endpoints/boltEvent';
import { Users, Plus, Edit, Trash2, Shield, Star, Search, Calendar, Gift, Settings, X, Minus, Clock, UserPlus, Eye, BarChart3, BookOpen, FileText } from 'lucide-react';
import { CreateUserModal } from '../components/CreateUserModal';
import { EditUserModal } from '../components/EditUserModal';
import { AwardPrizeModal } from '../components/AwardPrizeModal';
import { HistoryModal } from '../components/HistoryModal';
import type { Creator } from '../types/creator';
import { deleteUserAPI } from '../endpoints/user';
import { getPrizesAPI, createPrizeAPI, deletePrizeAPI } from '../endpoints/prize';
import { notify } from '../lib/notify';
import { appConfirm } from '../lib/dialogs';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  country: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  username: string;
  password: string;
  role: string;
  status: string;
  eventsCount: number;
  lastLogin: string;
  createdAt: string;
  createdBy?: string;
  password_plain?: string;
}

export function Usuarios() {
  const { fetchUsers: fetchAllUsers, getUserById } = useUser();
  const [activeTab, setActiveTab] = React.useState<'gestion' | 'puntos'>('gestion');
  const [users, setUsers] = React.useState<User[]>([]);
  const [creators, setCreators] = React.useState<Creator[]>([]);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);
  const [showUserDetails, setShowUserDetails] = React.useState<User | null>(null);
  const [userMetrics, setUserMetrics] = React.useState<any>(null);
  const [dateFilter, setDateFilter] = React.useState<string>('all');
  const [specificDate, setSpecificDate] = React.useState<string>('');
  const [isLoading, setIsLoading] = React.useState(false);
  console.log('users', users);
  console.log('editingUser', editingUser);
  
  // Estados para premios
  const [showCreatePrizeModal, setShowCreatePrizeModal] = React.useState(false);
  const [prizes, setPrizes] = React.useState<any[]>([]);
  
  // Estados para filtros de estadísticas
  const [statsDateFilter, setStatsDateFilter] = React.useState<string>('all');
  const [statsStartDate, setStatsStartDate] = React.useState<string>('');
  const [statsEndDate, setStatsEndDate] = React.useState<string>('');
  const [pointsStats, setPointsStats] = React.useState({
    totalPoints: 0,
    totalRedemptions: 0,
    activeUsers: 0
  });
  
  // Estados para búsqueda de puntos y ajuste manual
  const [pointsSearchTerm, setPointsSearchTerm] = React.useState('');
  const [showPointsAdjustModal, setShowPointsAdjustModal] = React.useState(false);
  const [showAwardPrizeModal, setShowAwardPrizeModal] = React.useState(false);
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<any>(null);
  
  // Estado para almacenar puntos de usuarios
  const [userPoints, setUserPoints] = React.useState<{[key: string]: number}>({});
  
  // Estado para historial de transacciones
  const [userTransactions, setUserTransactions] = React.useState<{[key: string]: any[]}>({});

  // Move stats calculation to prevent re-renders during typing
  const stats = React.useMemo(() => {
    return {
      total: users.length,
      active: users.filter(u => u.status === 'active').length,
      suspended: users.filter(u => u.status === 'suspended').length,
      admins: users.filter(u => u.role === 'ADMIN').length
    };
  }, [users.length]); // Only recalculate when users array length changes, not content

  React.useEffect(() => {
    reloadUsersFromAPI();
    loadUserPoints();
    loadUserTransactions();
    loadPrizes();

    // Listener para detectar cambios en localStorage desde otras partes del sistema
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userTransactions' || e.key === 'userPoints') {
        loadUserTransactions();
        loadUserPoints();
      }
    };

    // Listener para cambios desde la misma pestaña
    const handleLocalStorageUpdate = () => {
      loadUserTransactions();
      loadUserPoints();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorageUpdate', handleLocalStorageUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorageUpdate', handleLocalStorageUpdate);
    };
  }, []);

  React.useEffect(() => {
    calculatePointsStats();
  }, [users, creators, statsDateFilter, statsStartDate, statsEndDate, userPoints]);

  const loadUserPoints = () => {
    try {
      const storedPoints = localStorage.getItem('userPoints');
      if (storedPoints) {
        setUserPoints(JSON.parse(storedPoints));
      }
    } catch (error) {
      console.error('Error loading user points:', error);
    }
  };

  const loadUserTransactions = () => {
    try {
      const storedTransactions = localStorage.getItem('userTransactions');
      if (storedTransactions) {
        setUserTransactions(JSON.parse(storedTransactions));
      }
    } catch (error) {
      console.error('Error loading user transactions:', error);
    }
  };

  const saveUserPoints = (points: {[key: string]: number}) => {
    try {
      localStorage.setItem('userPoints', JSON.stringify(points));
      setUserPoints(points);
    } catch (error) {
      console.error('Error saving user points:', error);
    }
  };

  const loadPrizes = async () => {
    try {
      const response = await getPrizesAPI();
      setPrizes(response?.data || []);
    } catch (error) {
      console.error('Error loading prizes from API, falling back to localStorage:', error);
      try {
        const storedPrizes = localStorage.getItem('prizes');
        if (storedPrizes) {
          setPrizes(JSON.parse(storedPrizes));
        } else {
          setPrizes([]);
        }
      } catch {
        setPrizes([]);
      }
    }
  };

  const handleCreatePrize = async (newPrize: any) => {
    try {
      const payload = {
        title: newPrize.title || newPrize.name,
        description: newPrize.description || null,
        points: Number(newPrize.points ?? newPrize.cost ?? 0),
        targetAudience: newPrize.targetAudience || newPrize.eligibleUsers || 'Administradores',
        image: newPrize.image || null,
        isActive: newPrize.isActive ?? true,
      };

      const response = await createPrizeAPI(payload);
      setPrizes((prev) => [response.data, ...prev]);
    } catch (error) {
      console.error('Error saving prize:', error);
      notify.error('Error al guardar el premio');
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    const confirmed = await appConfirm({
      title: 'Eliminar premio',
      message: '¿Estás seguro de que deseas eliminar este premio?',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (confirmed) {
      try {
        await deletePrizeAPI(prizeId);
        setPrizes((prev) => prev.filter(prize => prize.id !== prizeId));
      } catch (error) {
        console.error('Error deleting prize:', error);
        notify.error('Error al eliminar el premio');
      }
    }
  };

  const mapApiUserToLocalUser = (u: ApiUser): User => ({
    id: String(u.id),
    firstName: u.name || '',
    lastName: u.last_name || '',
    company: (u as any).company || '',
    country: (u as any).country || '',
    city: (u as any).city || '',
    address: (u as any).address || '',
    phone: (u as any).phone || '',
    email: u.email,
    username: u.username || '',
    password: (u as any).password_plain || '',
    password_plain: (u as any).password_plain || '',
    role: (u.role?.name as string) || 'ADMIN',
    status: (u as any).status || 'active',
    eventsCount: 0,
    lastLogin: new Date().toISOString(),
    createdAt: (u as any).created_at || new Date().toISOString(),
    createdBy: (u as any).creator_id ? String((u as any).creator_id) : undefined,
  });

  const mapApiCreatorToLocalCreator = (u: ApiUser): Creator => ({
    id: String(u.id),
    firstName: u.name || '',
    lastName: u.last_name || '',
    email: u.email || '',
    username: u.username || '',
    password: (u as any).password_plain || '',
    phone: (u as any).phone || '',
    country: (u as any).country || '',
    status: ((u as any).status || 'active') as any,
    commissionPercentage: Number((u as any).commission_percentage ?? 0),
    createdAt: (u as any).created_at || new Date().toISOString(),
    createdBy: (u as any).creator_id ? String((u as any).creator_id) : '',
    city: (u as any).city || '',
  });

  const reloadUsersFromAPI = async () => {
    try {
      const loadedUsers = await fetchAllUsers();
      // ADMINS
      const admins = (loadedUsers || []).filter((u: any) => String((u as any).role_id ?? u.role?.id) === '2');
      const mapped = admins.map(mapApiUserToLocalUser);
      setUsers(mapped);

      // CREATORS
      const creators = (loadedUsers || []).filter((u: any) => String((u as any).role_id ?? u.role?.id) === '5');
      const mappedCreators: Creator[] = creators.map(mapApiCreatorToLocalCreator);
      setCreators(mappedCreators);
    } catch (error) {
      console.error('Error loading admins from API:', error);
    }
  };


  const calculatePointsStats = async () => {
    try {
      // const events = await storage.getEvents();
      const requests = await storage.getEventRequests();
      // const allGuests = await storage.getAllGuests();
      
      // Obtener rango de fechas para el filtro
      const dateRange = getStatsDateFilterRange(statsDateFilter, statsStartDate, statsEndDate);
      
      // Filtrar solicitudes aprobadas en el rango de fechas
      let approvedRequests = requests.filter(request => request.status === 'approved');
      if (dateRange) {
        approvedRequests = approvedRequests.filter(request => {
          const requestDate = new Date(request.created_at);
          return requestDate >= dateRange.startDate && requestDate <= dateRange.endDate;
        });
      }
      
      // Calcular puntos totales reales desde userPoints
      let totalPoints = Object.values(userPoints).reduce((sum, points) => sum + points, 0);
      
      // TODO: Implementar cálculo real cuando se active el sistema de puntos
      // const processedEvents = new Set();
      // for (const request of approvedRequests) {
      //   if (!processedEvents.has(request.event_id)) {
      //     processedEvents.add(request.event_id);
      //     const event = events.find(e => e.id === request.event_id);
      //     if (event) {
      //       const eventGuests = allGuests.filter(guest => guest.event_id === event.id);
      //       const guestCount = eventGuests.length;
      //       const creator = users.find(u => u.id === event.created_by) || 
      //                      creators.find(c => c.id === event.created_by);
      //       if (creator) {
      //         let pointsPerGuest = 0;
      //         if (users.find(u => u.id === event.created_by && u.role === 'ADMIN')) {
      //           pointsPerGuest = 2;
      //         } else if (creators.find(c => c.id === event.created_by)) {
      //           pointsPerGuest = 1.5;
      //         }
      //         totalPoints += guestCount * pointsPerGuest;
      //       }
      //     }
      //   }
      // }
      
      // Calcular canjes reales basándose en transacciones de premios otorgados
      let totalRedemptions = 0;
      Object.values(userTransactions).forEach(transactions => {
        totalRedemptions += transactions.filter(t => t.type === 'prize_awarded').length;
      });
      
      // Usuarios activos elegibles
      const activeUsers = users.filter(u => u.role === 'ADMIN' && u.status === 'active').length + 
                          creators.filter(c => c.status === 'active').length;
      
      setPointsStats({
        totalPoints: Math.round(totalPoints),
        totalRedemptions,
        activeUsers
      });
      
    } catch (error) {
      console.error('Error calculating points stats:', error);
    }
  };

  const getStatsDateFilterRange = (filter: string, startDate: string, endDate: string) => {
    const now = new Date();
    let filterStartDate: Date;
    let filterEndDate: Date = now;
    
    switch (filter) {
      case 'week':
        filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        filterStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        filterStartDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case 'custom':
        if (!startDate || !endDate) return null;
        filterStartDate = new Date(startDate);
        filterEndDate = new Date(endDate);
        filterEndDate.setHours(23, 59, 59, 999); // Incluir todo el día final
        break;
      default:
        return null;
    }
    
    return { startDate: filterStartDate, endDate: filterEndDate };
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDateFilterRange = (filter: string, specificDate: string) => {
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
  void getDateFilterRange;

  const getFilterDate = (filter: string, specificDate: string): Date | null => {
    const now = new Date();
    switch (filter) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '3months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      case 'specific':
        return specificDate ? new Date(specificDate) : null;
      default:
        return null;
    }
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

  const calculateUserMetrics = async (user: User) => {
    try {
      setIsLoading(true);
      
      // Cargar datos reales desde backend (SuperAdmin)
      const eventsRes = await getBoltEventsAPI({ queryParams: { include_requests: true } });
      const events = (eventsRes?.data || []).map((e: any) => ({
        id: String(e.id),
        name: e.name,
        date: formatDateForInput(e.start_at),
        guest_count: Number(e.guest_count || 0),
        created_by: String(e.user_id || ''),
        created_at: e.created_at,
        request: e.request || null,
      }));
      const eventBooks = await eventBookStorage.getAllEventBooks();
      
      const now = new Date();
      
      // Filtrar eventos del usuario
      let userEvents = events.filter((event: any) => String(event.created_by) === String(user.id));
      
      // Aplicar filtro de fecha si está seleccionado
      if (dateFilter !== 'all') {
        const filterDate = getFilterDate(dateFilter, specificDate);
        if (filterDate) {
          userEvents = userEvents.filter((event: any) => {
            const eventDate = new Date(event.date);
            return eventDate >= filterDate;
          });
        }
      }
      
      // Calcular eventos activos y finalizados
      const activeEvents = userEvents.filter((event: any) => new Date(event.date) >= now);
      const finishedEvents = userEvents.filter((event: any) => new Date(event.date) < now);
      
      // Calcular solicitudes del usuario
      let userRequests = userEvents.map((e: any) => e.request).filter(Boolean);
      
      // Aplicar filtro de fecha a solicitudes si está seleccionado
      if (dateFilter !== 'all') {
        const filterDate = getFilterDate(dateFilter, specificDate);
        if (filterDate) {
          userRequests = userRequests.filter((request: any) => {
            const requestDate = new Date(request.created_at || request.createdAt || '');
            return requestDate >= filterDate;
          });
        }
      }
      
      const approvedRequests = userRequests.filter((request: any) => request.status === 'approved');
      const rejectedRequests = userRequests.filter((request: any) => request.status === 'rejected');
      const pendingRequests = userRequests.filter((request: any) => request.status === 'pending');
      
      // Calcular EventBooks del usuario
      const userEventIds = userEvents.map((event: any) => event.id);
      const userEventBooks = eventBooks.filter(book => userEventIds.includes(book.event_id));
      const activeEventBooks = userEventBooks.filter(book => book.isActive);
      const closedEventBooks = userEventBooks.filter(book => !book.isActive);
      
      // Total invitados (desde backend: guest_count por evento)
      const totalGuests = userEvents.reduce((sum: number, e: any) => sum + Number(e.guest_count || 0), 0);
      
      // Encontrar último evento
      const lastEvent = userEvents
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      
      // Encontrar evento más exitoso (por número de invitados)
      const eventGuestCounts = userEvents.map((event: any) => ({
        event,
        guestCount: Number(event.guest_count || 0)
      }));
      const mostSuccessfulEvent = eventGuestCounts
        .sort((a: any, b: any) => b.guestCount - a.guestCount)[0];
      
      const metrics = {
        events: {
          active: activeEvents.length,
          finished: finishedEvents.length,
          total: userEvents.length
        },
        requests: {
          total: userRequests.length,
          approved: approvedRequests.length,
          rejected: rejectedRequests.length,
          pending: pendingRequests.length
        },
        eventBooks: {
          total: userEventBooks.length,
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
      
      setUserMetrics(metrics);
      setShowUserDetails(user);
    } catch (error) {
      console.error('Error calculating user metrics:', error);
      notify.error('Error al cargar las métricas del usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const getCreatorName = (creatorId: string | undefined) => {
    if (!creatorId) return '-';
    const creator = getUserById(creatorId);
    return creator ? `${creator.name} ${creator.last_name || ''}`.trim() : creatorId;
  };

  const handleDeleteUser = async (userId: string) => {
    console.log('userId', userId);
    setIsLoading(true);
    
    try {
      const deleteResponse = await deleteUserAPI(Number(userId));
      const deleteOk = deleteResponse?.status === 200 || deleteResponse?.message || deleteResponse?.success;
      if (!deleteOk) {
        throw new Error(deleteResponse?.message || 'Error al eliminar el usuario');
      }

      // 1. Eliminar eventos del usuario
      const events = await storage.getEvents();
      const userEvents = events.filter(event => event.created_by === userId);
      const remainingEvents = events.filter(event => event.created_by !== userId);
      localStorage.setItem('events', JSON.stringify(remainingEvents));

      // 2. Eliminar solicitudes relacionadas con los eventos del usuario
      for (const event of userEvents) {
        await storage.deleteEventRequestsByEventId(event.id);
        await storage.deleteEventCard(event.id);
      }

      // 3. Eliminar todas las solicitudes hechas por el usuario
      const requests = await storage.getEventRequests();
      const userRequests = requests.filter(request => request.creator_id === Number(userId));
      for (const request of userRequests) {
        await storage.deleteEventRequest(request.id.toString());
      }

      // 4. Eliminar EventBooks del usuario
      try {
        const eventBooks = JSON.parse(localStorage.getItem('eventbooks') || '[]');
        const remainingEventBooks = eventBooks.filter((eb: any) => eb.created_by !== userId);
        localStorage.setItem('eventbooks', JSON.stringify(remainingEventBooks));
      } catch (error) {
        console.error('Error deleting user EventBooks:', error);
      }

      // 5. Eliminar comisiones relacionadas
      try {
        const commissions = JSON.parse(localStorage.getItem('commissions_data') || '[]');
        const remainingCommissions = commissions.filter((commission: any) => 
          commission.adminId !== userId && commission.eventCreatedBy !== userId
        );
        localStorage.setItem('commissions_data', JSON.stringify(remainingCommissions));
      } catch (error) {
        console.error('Error deleting user commissions:', error);
      }

      // 6. Eliminar invitados de los eventos del usuario
      try {
        const guests = JSON.parse(localStorage.getItem('guests') || '[]');
        const userEventIds = userEvents.map(e => e.id);
        const remainingGuests = guests.filter((guest: any) => !userEventIds.includes(guest.event_id));
        localStorage.setItem('guests', JSON.stringify(remainingGuests));
      } catch (error) {
        console.error('Error deleting user guests:', error);
      }

      // 7. Eliminar usuarios de roles (Control de Acceso y Moderador) creados por este usuario
      try {
        const userAccesses = JSON.parse(localStorage.getItem('user_accesses') || '[]');
        const remainingUserAccesses = userAccesses.filter((access: any) => access.createdBy !== userId);
        localStorage.setItem('user_accesses', JSON.stringify(remainingUserAccesses));
      } catch (error) {
        console.error('Error deleting user role accesses:', error);
      }

      // 8. Finalmente eliminar el usuario
      const updatedUsers = users.filter(user => user.id !== userId);
    // Persisting to local storage disabled for API-driven users
      setUsers(updatedUsers);
      await fetchAllUsers();
      
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting user and related data:', error);
      notify.error('Error al eliminar el usuario');
    }
    finally {
      setIsLoading(false);
    }
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const filteredUsers = React.useMemo(() => {
    return users.filter(user => {
      const searchLower = searchTerm.toLowerCase();
      return (
        user.firstName.toLowerCase().includes(searchLower) ||
        user.lastName.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.company.toLowerCase().includes(searchLower)
      );
    });
  }, [users, searchTerm]);

  const handlePointsAdjust = (adjustmentData: any) => {
    const { userId, points, action } = adjustmentData;
    const currentPoints = userPoints[userId] || 0;
    const newPoints = action === 'add' ? currentPoints + points : Math.max(0, currentPoints - points);
    
    const updatedPoints = {
      ...userPoints,
      [userId]: newPoints
    };
    
    // Registrar transacción
    const transaction = {
      id: Date.now().toString(),
      type: 'points_adjustment',
      action,
      points,
      reason: adjustmentData.reason,
      date: new Date().toISOString(),
      adminId: 'current-admin' // TODO: usar ID real del admin logueado
    };
    
    const updatedTransactions = {
      ...userTransactions,
      [userId]: [...(userTransactions[userId] || []), transaction]
    };
    
    saveUserPoints(updatedPoints);
    setUserTransactions(updatedTransactions);
    localStorage.setItem('userTransactions', JSON.stringify(updatedTransactions));
    setShowPointsAdjustModal(false);
    setSelectedUser(null);
  };

  const handleAwardPrize = (awardData: any) => {
    const { userId, prizeId, prizeCost } = awardData;
    const currentPoints = userPoints[userId] || 0;
    
    if (currentPoints < prizeCost) {
      notify.info('El usuario no tiene suficientes puntos para este premio');
      return;
    }
    
    const newPoints = currentPoints - prizeCost;
    const updatedPoints = {
      ...userPoints,
      [userId]: newPoints
    };
    
    // Manejar premio por defecto o premio existente
    let prizeName = 'Premio desconocido';
    if (prizeId === 'default-lector-qr') {
      prizeName = 'LECTOR QR';
    } else {
      const prize = prizes.find(p => p.id === prizeId);
      prizeName = prize?.title || 'Premio desconocido';
    }
    
    // Registrar transacción de premio
    const transaction = {
      id: Date.now().toString(),
      type: 'prize_awarded',
      prizeId,
      prizeName,
      prizeCost,
      date: new Date().toISOString(),
      adminId: 'current-admin' // TODO: usar ID real del admin logueado
    };
    
    const updatedTransactions = {
      ...userTransactions,
      [userId]: [...(userTransactions[userId] || []), transaction]
    };
    
    saveUserPoints(updatedPoints);
    setUserTransactions(updatedTransactions);
    localStorage.setItem('userTransactions', JSON.stringify(updatedTransactions));
    setShowAwardPrizeModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
          {activeTab === 'gestion' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Crear Usuario
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('gestion')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'gestion'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="h-5 w-5 mr-2 inline" />
                Gestión
              </button>
              <button
                onClick={() => setActiveTab('puntos')}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'puntos'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Star className="h-5 w-5 mr-2 inline" />
                Puntos
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de la pestaña Gestión */}
        {activeTab === 'gestion' && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <div className="ml-2 sm:ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      Total Usuarios
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
                </div>
                <div className="ml-2 sm:ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      Usuarios Activos
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {stats.active}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                </div>
                <div className="ml-2 sm:ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      Usuarios Suspendidos
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {stats.suspended}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
            <div className="p-3 sm:p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-400" />
                </div>
                <div className="ml-2 sm:ml-3 w-0 flex-1">
                  <dl>
                    <dt className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                      Administradores
                    </dt>
                    <dd className="text-base sm:text-lg font-semibold text-gray-900">
                      {stats.admins}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, apellido, email o empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        </div>

        {/* Users Cards - Responsive Design */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado por
                  </th>
                  <th scope="col" className="relative px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-xs font-medium text-indigo-700">
                              {user.firstName[0]}{user.lastName[0]}
                            </span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(user.createdAt).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {user.company}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div>{user.city}, {user.country}</div>
                      <div className="text-xs text-gray-400">{user.address}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status === 'active' ? 'Activo' : 'Suspendido'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {getCreatorName(user.createdBy)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => calculateUserMetrics(user)}
                          className="text-blue-600 hover:text-blue-900 p-1"
                          title="Ver detalles y métricas"
                          disabled={isLoading}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(user.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile/Tablet Card View */}
          <div className="lg:hidden divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center flex-1">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-700">
                            {user.firstName[0]}{user.lastName[0]}
                          </span>
                        </div>
                      </div>
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.status === 'active' ? '✅ Activo' : '❌ Suspendido'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">🏢 Empresa:</span>
                    <span className="ml-1 text-gray-900">{user.company}</span>
                  </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">📍 Ubicación:</span>
                      <span className="ml-1 text-gray-900">{user.city}, {user.country}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">📞 Teléfono:</span>
                      <span className="ml-1 text-gray-900">{user.phone}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium text-gray-700">👨‍💼 Creado por:</span>
                      <span className="ml-1 text-gray-900">{getCreatorName(user.createdBy)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      📅 Creado: {new Date(user.createdAt).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => calculateUserMetrics(user)}
                        className="inline-flex items-center px-2 py-1 border border-blue-300 rounded-md shadow-sm text-xs font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        title="Ver detalles y métricas"
                        disabled={isLoading}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </button>
                      <button
                        onClick={() => openEditModal(user)}
                        className="inline-flex items-center px-2 py-1 border border-indigo-300 rounded-md shadow-sm text-xs font-medium text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        title="Editar usuario"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(user.id)}
                        className="inline-flex items-center px-2 py-1 border border-red-300 rounded-md shadow-sm text-xs font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Intenta ajustar los términos de búsqueda.' : 'Comienza creando tu primer usuario.'}
            </p>
          </div>
        )}

        {/* Create User Modal */}
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={(apiUser) => {
            // Optimistic update local list to avoid full refetch
            const userData = (apiUser as any)?.data ?? apiUser;
            const mapped = mapApiUserToLocalUser(userData as ApiUser);
            setUsers((prev) => [mapped, ...prev]);
            fetchAllUsers().catch(() => {});
          }}
        />

        {/* Edit User Modal */}
        <EditUserModal
          isOpen={showEditModal}
          creators={creators}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          editingUser={editingUser}
          onUpdated={(apiUser) => {
            const userData = (apiUser as any)?.data ?? apiUser;
            if (!userData?.id) return;
            const mapped = mapApiUserToLocalUser(userData as ApiUser);
            setUsers((prev) => prev.map((u) => (u.id === String(mapped.id) ? { ...u, ...mapped } : u)));
            fetchAllUsers().catch(() => {});
          }}
        />

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-sm sm:max-w-md w-full p-4 sm:p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-base sm:text-lg font-medium text-gray-900">🗑️ Eliminar Usuario</h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      ¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer y eliminará permanentemente toda la información del usuario.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(null)}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  disabled={isLoading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  {isLoading ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Details Modal */}
        {showUserDetails && userMetrics && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 sm:top-20 mx-auto p-3 sm:p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      Métricas de {showUserDetails.company}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {showUserDetails.email} • @{showUserDetails.username}
                    </p>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-500">
                      <div><span className="font-medium text-gray-700">Teléfono:</span> {showUserDetails.phone || '-'}</div>
                      <div><span className="font-medium text-gray-700">País:</span> {showUserDetails.country || '-'}</div>
                      <div><span className="font-medium text-gray-700">Ciudad:</span> {showUserDetails.city || '-'}</div>
                      <div className="sm:col-span-2"><span className="font-medium text-gray-700">Dirección:</span> {showUserDetails.address || '-'}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserDetails(null);
                    setUserMetrics(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 p-1 sm:p-0"
                >
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                </button>
              </div>

              {/* Filtros de Fecha */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm font-medium text-gray-700">Filtrar por fecha:</span>
                  
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todas las fechas</option>
                    <option value="week">Última semana</option>
                    <option value="month">Último mes</option>
                    <option value="3months">Últimos 3 meses</option>
                    <option value="year">Último año</option>
                    <option value="specific">Fecha específica</option>
                  </select>

                  {dateFilter === 'specific' && (
                    <input
                      type="date"
                      value={specificDate}
                      onChange={(e) => setSpecificDate(e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}

                  <button
                    onClick={() => calculateUserMetrics(showUserDetails)}
                    disabled={isLoading}
                    className="px-4 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Cargando...' : 'Aplicar Filtro'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Eventos */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="text-lg font-semibold text-blue-800">Eventos</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Activos:</span>
                      <span className="font-medium text-blue-700">{userMetrics.events.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Finalizados:</span>
                      <span className="font-medium text-blue-700">{userMetrics.events.finished}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="font-medium text-blue-700">{userMetrics.events.total}</span>
                    </div>
                  </div>
                </div>

                {/* Solicitudes */}
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <FileText className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-lg font-semibold text-green-800">Solicitudes</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="font-medium text-green-700">{userMetrics.requests.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Aprobadas:</span>
                      <span className="font-medium text-green-700">{userMetrics.requests.approved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Pendientes:</span>
                      <span className="font-medium text-green-700">{userMetrics.requests.pending}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Rechazadas:</span>
                      <span className="font-medium text-green-700">{userMetrics.requests.rejected}</span>
                    </div>
                  </div>
                </div>

                {/* EventBooks */}
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center mb-3">
                    <BookOpen className="h-5 w-5 text-yellow-600 mr-2" />
                    <h4 className="text-lg font-semibold text-yellow-800">EventBooks</h4>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="font-medium text-yellow-700">{userMetrics.eventBooks.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Activos:</span>
                      <span className="font-medium text-yellow-700">{userMetrics.eventBooks.active}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Cerrados:</span>
                      <span className="font-medium text-yellow-700">{userMetrics.eventBooks.closed}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Participación */}
              <div className="mt-6 bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center mb-3">
                  <Users className="h-5 w-5 text-purple-600 mr-2" />
                  <h4 className="text-lg font-semibold text-purple-800">Participación</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{userMetrics.participation.totalGuests}</div>
                    <div className="text-sm text-gray-600">Total de Invitados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">Último Evento</div>
                    <div className="text-sm text-gray-600">
                      {userMetrics.participation.lastEventName || 'Sin eventos'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {userMetrics.participation.lastEventDate 
                        ? new Date(userMetrics.participation.lastEventDate).toLocaleDateString('es-ES')
                        : '-'
                      }
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-medium text-gray-700">Evento Más Exitoso</div>
                    <div className="text-sm text-gray-600">
                      {userMetrics.participation.mostSuccessfulEvent?.name || 'Sin eventos'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {userMetrics.participation.mostSuccessfulEvent?.guestCount 
                        ? `${userMetrics.participation.mostSuccessfulEvent.guestCount} invitados`
                        : '-'
                      }
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowUserDetails(null);
                    setUserMetrics(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* Contenido de la pestaña Puntos */}
        {activeTab === 'puntos' && (
          <div className="space-y-6">


            {/* Estadísticas del Sistema de Puntos */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Estadísticas del Sistema</h3>
                  
                  {/* Filtros de Fecha */}
                  <div className="flex items-center space-x-4">
                    <select
                      value={statsDateFilter}
                      onChange={(e) => setStatsDateFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="all">Todos los tiempos</option>
                      <option value="week">Última semana</option>
                      <option value="month">Último mes</option>
                      <option value="year">Último año</option>
                      <option value="custom">Rango personalizado</option>
                    </select>
                    
                    {statsDateFilter === 'custom' && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="date"
                          value={statsStartDate}
                          onChange={(e) => setStatsStartDate(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="date"
                          value={statsEndDate}
                          onChange={(e) => setStatsEndDate(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-indigo-600">
                      {pointsStats.activeUsers}
                    </div>
                    <div className="text-sm text-gray-500">Usuarios Activos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {pointsStats.totalPoints.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">Puntos Totales Otorgados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{prizes.length}</div>
                    <div className="text-sm text-gray-500">Premios Disponibles</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {pointsStats.totalRedemptions}
                    </div>
                    <div className="text-sm text-gray-500">Canjes Realizados</div>
                  </div>
                </div>
                
                {/* Indicador de filtro activo */}
                {statsDateFilter !== 'all' && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                        <span className="text-sm text-blue-800">
                          Filtro activo: {
                            statsDateFilter === 'week' ? 'Última semana' :
                            statsDateFilter === 'month' ? 'Último mes' :
                            statsDateFilter === 'year' ? 'Último año' :
                            statsDateFilter === 'custom' ? `${statsStartDate} - ${statsEndDate}` :
                            'Personalizado'
                          }
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setStatsDateFilter('all');
                          setStatsStartDate('');
                          setStatsEndDate('');
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Limpiar filtro
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Gestión de Premios */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Gestión de Premios</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Crea y administra los premios que los usuarios pueden canjear con sus puntos.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCreatePrizeModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  Crear Premio
                </button>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Premios dinámicos */}
                  {prizes.map((prize) => (
                    <div key={prize.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        {prize.image ? (
                          <img src={prize.image} alt={prize.title} className="w-12 h-12 object-cover rounded-lg" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex items-center justify-center">
                            <Gift className="h-6 w-6 text-white" />
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              // TODO: Implementar edición de premio
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrize(prize.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">{prize.title}</h3>
                      <p className="text-sm text-gray-600 mb-3">{prize.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-yellow-600">
                          <Star className="h-4 w-4 mr-1" />
                          <span className="font-medium">{prize.points} puntos</span>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          {prize.targetAudience}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {prizes.length === 0 && (
                  <div className="text-center py-12">
                    <Gift className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay premios creados</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Comienza creando tu primer premio para el sistema de puntos.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Visualización de Puntos por Usuario */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Puntos por Usuario</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Visualiza los puntos acumulados por cada administrador y creador.
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={pointsSearchTerm}
                        onChange={(e) => setPointsSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Administradores */}
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <Shield className="h-5 w-5 text-indigo-600 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">Administradores</h4>
                    <span className="ml-2 bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                      {users.filter(u => u.role === 'ADMIN').length} usuarios
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {users
                      .filter(user => user.role === 'ADMIN')
                      .filter(user => {
                        if (!pointsSearchTerm.trim()) return true;
                        const searchLower = pointsSearchTerm.toLowerCase();
                        return (
                          user.firstName?.toLowerCase().includes(searchLower) ||
                          user.lastName?.toLowerCase().includes(searchLower) ||
                          user.company?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((user) => (
                        <div key={user.id} className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-indigo-700">
                                  {user.firstName[0]}{user.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">{user.firstName} {user.lastName}</h5>
                                <p className="text-sm text-gray-600">{user.company}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-yellow-600">
                                <Star className="h-4 w-4 mr-1" />
                                <span className="text-lg font-bold">{userPoints[user.id] || 0}</span>
                              </div>
                              <p className="text-xs text-gray-500">puntos</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Eventos creados:</span>
                              <span className="font-medium">{user.eventsCount || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Puntos por invitado:</span>
                              <span className="font-medium text-indigo-600">2 pts</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Estado:</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                user.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.status === 'active' ? 'Activo' : 'Suspendido'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-indigo-100">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedUser({...user, userType: 'admin'});
                                  setShowPointsAdjustModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                                title="Ajustar puntos"
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser({...user, userType: 'admin'});
                                  setShowAwardPrizeModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                title="Otorgar premio"
                              >
                                <Gift className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser({...user, userType: 'admin'});
                                  setShowHistoryModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Ver historial"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {users.filter(u => u.role === 'ADMIN').length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Shield className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No hay administradores registrados</p>
                    </div>
                  )}
                </div>

                {/* Creadores */}
                <div>
                  <div className="flex items-center mb-4">
                    <Users className="h-5 w-5 text-green-600 mr-2" />
                    <h4 className="text-lg font-medium text-gray-900">Creadores</h4>
                    <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      {creators.length} usuarios
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {creators
                      .filter(creator => {
                        if (!pointsSearchTerm.trim()) return true;
                        const searchLower = pointsSearchTerm.toLowerCase();
                        return (
                          creator.firstName?.toLowerCase().includes(searchLower) ||
                          creator.lastName?.toLowerCase().includes(searchLower) ||
                          creator.country?.toLowerCase().includes(searchLower)
                        );
                      })
                      .map((creator) => (
                        <div key={creator.id} className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                                <span className="text-sm font-medium text-green-700">
                                  {creator.firstName[0]}{creator.lastName[0]}
                                </span>
                              </div>
                              <div>
                                <h5 className="font-medium text-gray-900">{creator.firstName} {creator.lastName}</h5>
                                <p className="text-sm text-gray-600">{creator.country}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center text-yellow-600">
                                <Star className="h-4 w-4 mr-1" />
                                <span className="text-lg font-bold">{userPoints[creator.id] || 0}</span>
                              </div>
                              <p className="text-xs text-gray-500">puntos</p>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Eventos creados:</span>
                              <span className="font-medium">0</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Puntos por invitado:</span>
                              <span className="font-medium text-green-600">1.5 pts</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Estado:</span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                creator.status === 'active'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {creator.status === 'active' ? 'Activo' : 'Suspendido'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 pt-4 border-t border-green-100">
                            <div className="flex justify-center space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedUser({...creator, userType: 'creator'});
                                  setShowPointsAdjustModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                title="Ajustar puntos"
                              >
                                <Settings className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser({...creator, userType: 'creator'});
                                  setShowAwardPrizeModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-colors"
                                title="Otorgar premio"
                              >
                                <Gift className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedUser({...creator, userType: 'creator'});
                                  setShowHistoryModal(true);
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                title="Ver historial"
                              >
                                <Clock className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                  {creators.length === 0 && (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Users className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500">No hay creadores registrados</p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Modal de Crear Premio */}
        <CreatePrizeModal 
          isOpen={showCreatePrizeModal}
          onClose={() => setShowCreatePrizeModal(false)}
          onSubmit={handleCreatePrize}
        />

        {/* Modal de Ajustar Puntos */}
        <PointsAdjustModal 
          isOpen={showPointsAdjustModal}
          onClose={() => {
            setShowPointsAdjustModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentPoints={selectedUser ? (userPoints[selectedUser.id] || 0) : 0}
          onSubmit={handlePointsAdjust}
        />

        {/* Modal de Otorgar Premio */}
        <AwardPrizeModal 
          isOpen={showAwardPrizeModal}
          onClose={() => {
            setShowAwardPrizeModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentPoints={selectedUser ? (userPoints[selectedUser.id] || 0) : 0}
          prizes={prizes}
          onSubmit={handleAwardPrize}
        />

        {/* Modal de Historial */}
        <HistoryModal 
          isOpen={showHistoryModal}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          transactions={selectedUser ? (userTransactions[selectedUser.id] || []) : []}
        />
      </div>
    </div>
  );
}

// Componente Modal para Crear Premio
interface CreatePrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prize: any) => void;
}

function CreatePrizeModal({ isOpen, onClose, onSubmit }: CreatePrizeModalProps) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [points, setPoints] = React.useState<string>('');
  const [targetAudience, setTargetAudience] = React.useState('Administradores');
  const [image, setImage] = React.useState('');
  const [, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string>('');
  const [imageSource, setImageSource] = React.useState<'url' | 'file'>('url');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        notify.info('La imagen debe ser menor a 5MB');
        return;
      }
      
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pointsValue = parseInt(points) || 0;
    if (!title.trim() || !description.trim() || pointsValue < 1) {
      notify.info('Por favor completa todos los campos obligatorios y asegúrate de que los puntos sean mayor a 0');
      return;
    }

    setIsSubmitting(true);
    
    let finalImage = '';
    if (imageSource === 'url') {
      finalImage = image.trim();
    } else if (imageSource === 'file' && imagePreview) {
      finalImage = imagePreview; // Base64 string
    }
    
    const newPrize = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      points: pointsValue,
      targetAudience: targetAudience,
      image: finalImage,
      createdAt: new Date().toISOString(),
      isActive: true
    };

    try {
      onSubmit(newPrize);
      // Reset form
      setTitle('');
      setDescription('');
      setPoints('');
      setTargetAudience('Administradores');
      setImage('');
      setImageFile(null);
      setImagePreview('');
      setImageSource('url');
      onClose();
    } catch (error) {
      console.error('Error creating prize:', error);
      notify.error('Error al crear el premio');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Crear Nuevo Premio</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: Descuento 20% Próximo Evento"
              required
            />
          </div>

          {/* Imagen */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagen del Premio (opcional)
            </label>
            
            {/* Selector de tipo de imagen */}
            <div className="flex space-x-4 mb-3">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="imageSource"
                  value="url"
                  checked={imageSource === 'url'}
                  onChange={(e) => setImageSource(e.target.value as 'url' | 'file')}
                  className="mr-2"
                />
                URL de imagen
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="imageSource"
                  value="file"
                  checked={imageSource === 'file'}
                  onChange={(e) => setImageSource(e.target.value as 'url' | 'file')}
                  className="mr-2"
                />
                Subir archivo
              </label>
            </div>

            {/* Campo URL */}
            {imageSource === 'url' && (
              <input
                type="url"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://ejemplo.com/imagen.jpg"
              />
            )}

            {/* Campo archivo */}
            {imageSource === 'file' && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-xs text-gray-500 mt-1">Máximo 5MB. Formatos: JPG, PNG, GIF, WebP</p>
              </div>
            )}

            {/* Previsualización */}
            {((imageSource === 'url' && image) || (imageSource === 'file' && imagePreview)) && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Previsualización:</p>
                <img
                  src={imageSource === 'url' ? image : imagePreview}
                  alt="Previsualización"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe el premio y sus beneficios..."
              required
            />
          </div>

          {/* Cantidad de Puntos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad de Puntos *
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {/* Dirigido a */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirigido a *
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            >
              <option value="Administradores">Administradores</option>
              <option value="Creadores">Creadores</option>
              <option value="Control de Acceso" disabled>Control de Acceso (No disponible)</option>
              <option value="Moderadores" disabled>Moderadores (No disponible)</option>
            </select>
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creando...' : 'Crear Premio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente Modal para Ajustar Puntos
interface PointsAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentPoints: number;
  onSubmit: (adjustment: { userId: string; points: number; action: 'add' | 'subtract'; reason: string }) => void;
}

function PointsAdjustModal({ isOpen, onClose, user, currentPoints, onSubmit }: PointsAdjustModalProps) {
  const [points, setPoints] = React.useState<string>('');
  const [action, setAction] = React.useState<'add' | 'subtract'>('add');
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pointsValue = parseInt(points) || 0;
    if (pointsValue < 1) {
      notify.info('Por favor ingresa una cantidad válida de puntos (mayor a 0)');
      return;
    }

    if (!reason.trim()) {
      notify.info('Por favor proporciona una razón para el ajuste');
      return;
    }

    setIsSubmitting(true);
    
    try {
      onSubmit({
        userId: user.id,
        points: pointsValue,
        action,
        reason: reason.trim()
      });
      
      // Reset form
      setPoints('');
      setAction('add');
      setReason('');
    } catch (error) {
      console.error('Error adjusting points:', error);
      notify.error('Error al ajustar puntos');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Settings className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Ajustar Puntos</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Información del usuario */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
              user.userType === 'admin' ? 'bg-indigo-100' : 'bg-green-100'
            }`}>
              <span className={`text-sm font-medium ${
                user.userType === 'admin' ? 'text-indigo-700' : 'text-green-700'
              }`}>
                {user.firstName[0]}{user.lastName[0]}
              </span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{user.firstName} {user.lastName}</h4>
              <p className="text-sm text-gray-600">{user.company}</p>
              <p className="text-xs text-gray-500">
                {user.userType === 'admin' ? 'Administrador' : 'Creador'}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Acción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Acción
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="add"
                  checked={action === 'add'}
                  onChange={(e) => setAction(e.target.value as 'add' | 'subtract')}
                  className="mr-2"
                />
                <Plus className="h-4 w-4 text-green-600 mr-1" />
                <span className="text-sm">Agregar puntos</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="subtract"
                  checked={action === 'subtract'}
                  onChange={(e) => setAction(e.target.value as 'add' | 'subtract')}
                  className="mr-2"
                />
                <Minus className="h-4 w-4 text-red-600 mr-1" />
                <span className="text-sm">Quitar puntos</span>
              </label>
            </div>
          </div>

          {/* Cantidad de puntos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad de puntos *
            </label>
            <input
              type="number"
              min="1"
              max="10000"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Ej: 50"
              required
            />
          </div>

          {/* Razón */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Razón del ajuste *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe la razón para este ajuste de puntos..."
              required
            />
          </div>

          {/* Vista previa del ajuste */}
          {points && (
            <div className={`p-3 rounded-lg border ${
              action === 'add' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center">
                {action === 'add' ? (
                  <Plus className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <Minus className="h-4 w-4 text-red-600 mr-2" />
                )}
                <span className={`text-sm font-medium ${
                  action === 'add' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {action === 'add' ? 'Agregar' : 'Quitar'} {points} puntos
                </span>
              </div>
              <p className={`text-xs mt-1 ${
                action === 'add' ? 'text-green-600' : 'text-red-600'
              }`}>
                Puntos actuales: {currentPoints} → Nuevos puntos: {action === 'add' ? currentPoints + parseInt(points) : Math.max(0, currentPoints - parseInt(points))}
              </p>
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                action === 'add'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isSubmitting ? 'Procesando...' : (action === 'add' ? 'Agregar Puntos' : 'Quitar Puntos')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}