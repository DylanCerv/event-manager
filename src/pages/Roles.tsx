import { useEffect, useMemo, useState } from 'react';
import { Shield, Users, Settings, Lock, Plus, Search, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { useEvents } from '../contexts/EventContext';
import { eventBookStorage } from '../lib/eventbook-storage';
import { deleteUserAPI } from '../endpoints/user';
import { CreateUserAccessModal } from '../components/CreateUserAccessModal';
import { UserAccessCard } from '../components/UserAccessCard';
import type { UserAccess } from '../types/roles';
import type { ApiUser } from '../types/auth';
import type { Event } from '../types/event';
import type { EventBook } from '../types/eventbook';

export function Roles() {
  const { user } = useAuth();
  const { events } = useEvents();
  const { fetchUsers, users } = useUser();
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([]);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [availableEventBooks, setAvailableEventBooks] = useState<EventBook[]>([]);
  const [moderatorAssignments, setModeratorAssignments] = useState<Record<string, string[]>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [editingAccessApiUser, setEditingAccessApiUser] = useState<ApiUser | null>(null);

  useEffect(() => {
    loadUserAccesses();
    loadAvailableEventBooks();
    fetchUsers();
  }, []);

  useEffect(() => {
    setAvailableEvents(events);
  }, [events]);

  // Re-derive access list whenever backend users change
  useEffect(() => {
    loadUserAccesses();
  }, [users, moderatorAssignments]);

  useEffect(() => {
    if (availableEventBooks.length > 0) {
      loadModeratorAssignments();
    } else {
      setModeratorAssignments({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableEventBooks]);

  const loadUserAccesses = async () => {
    try {
      const accessUsers = users.filter(u => Number((u as any).role_id) === 3 || Number((u as any).role_id) === 4);
      const mapped: UserAccess[] = accessUsers.map((u: any) => {
        const roleId = Number(u.role_id);
        const accessType: UserAccess['accessType'] = roleId === 4 ? 'moderador' : 'control_acceso';
        const assignedEventBooks = accessType === 'moderador' ? (moderatorAssignments[String(u.id)] || []) : undefined;
        return {
          id: String(u.id),
          accessType,
          name: u.name || '',
          lastName: u.last_name || '',
          username: u.username || '',
          password: u.password_plain || '',
          assignedEvents: [],
          assignedEventBooks,
          createdAt: u.created_at || new Date().toISOString(),
          createdBy: String(u.creator_id || ''),
        };
      });
      setUserAccesses(mapped);
    } catch (error) {
      console.error('Error loading user accesses:', error);
    }
  };

  const loadAvailableEventBooks = async () => {
    if (!user?.id) return;
    try {
      const allEventBooks = await eventBookStorage.getEventBooksByUser();
      setAvailableEventBooks(allEventBooks);
    } catch (error) {
      console.error('Error loading EventBooks:', error);
    }
  };

  const loadModeratorAssignments = async () => {
    try {
      const assignments: Record<string, string[]> = {};
      await Promise.all(
        availableEventBooks.map(async (eb) => {
          try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/event-books/${eb.id}/moderators`, {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}`,
              },
            });
            const json = await res.json();
            if (!res.ok) return;
            const mods = json.data || [];
            mods.forEach((m: any) => {
              const uid = String(m.id);
              if (!assignments[uid]) assignments[uid] = [];
              assignments[uid].push(eb.id);
            });
          } catch {
            // ignore per-event errors
          }
        })
      );
      setModeratorAssignments(assignments);
    } catch (error) {
      console.error('Error loading moderator assignments:', error);
    }
  };

  const handleEditUserAccess = (userAccess: UserAccess) => {
    const api = users.find(u => String(u.id) === String(userAccess.id)) || null;
    setEditingAccessApiUser(api as any);
    setShowCreateModal(true);
  };

  const handleDeleteUserAccess = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este acceso? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setIsLoading(true);
      await deleteUserAPI(Number(id));
      await fetchUsers();
      loadUserAccesses();
    } catch (error) {
      console.error('Error deleting user access:', error);
      alert('Error al eliminar el acceso de usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignEvent = async (userAccessId: string, eventId: string) => {
    try {
      const userAccess = userAccesses.find((access: any) => String(access.id) === String(userAccessId));
      if (!userAccess) return;

      // For moderators, handle EventBook assignment instead of event assignment
      if (userAccess.accessType === 'moderador') {
        return handleAssignEventBook(userAccessId, eventId); // eventId is actually eventBookId for moderators
      }

      if ((userAccess.assignedEvents || []).includes(eventId)) {
        // If already assigned, revoke it
        setUserAccesses(prev => prev.map((access: any) => 
          String(access.id) === String(userAccessId)
            ? { ...access, assignedEvents: (access.assignedEvents || []).filter((id: string) => id !== eventId) }
            : access
        ));
      } else {
        // If not assigned, assign it
        setUserAccesses(prev => prev.map((access: any) => 
          String(access.id) === String(userAccessId)
            ? { ...access, assignedEvents: [...(access.assignedEvents || []), eventId] }
            : access
        ));
      }
    } catch (error) {
      console.error('Error assigning/revoking event:', error);
      alert('Error al gestionar la asignación del evento');
    }
  };

  const handleAssignEventBook = async (userAccessId: string, eventBookId: string) => {
    try {
      setIsLoading(true);
      const userAccess = userAccesses.find((access) => String(access.id) === String(userAccessId));
      if (!userAccess || userAccess.accessType !== 'moderador') return;

      const currentlyAssigned = (moderatorAssignments[String(userAccessId)] || []).includes(eventBookId);
      if (currentlyAssigned) {
        await eventBookStorage.revokeModerator(eventBookId, Number(userAccessId));
      } else {
        await eventBookStorage.assignModerator(eventBookId, Number(userAccessId));
      }

      // Refresh assignments map
      await loadModeratorAssignments();
    } catch (error) {
      console.error('Error assigning/revoking EventBook:', error);
      alert('Error al gestionar la asignación del EventBook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeEvent = async (userAccessId: string, eventId: string) => {
    const userAccess = userAccesses.find((access: any) => String(access.id) === String(userAccessId));
    if (!userAccess) return;

    // For moderators, handle EventBook revocation
    if (userAccess.accessType === 'moderador') {
      if (!window.confirm('¿Estás seguro de que deseas quitar el acceso a este EventBook?')) {
        return;
      }
      return handleRevokeEventBook(userAccessId, eventId); // eventId is actually eventBookId for moderators
    }

    if (!window.confirm('¿Estás seguro de que deseas quitar el acceso a este evento?')) {
      return;
    }

    try {
      setUserAccesses(prev => prev.map((access: any) => 
        String(access.id) === String(userAccessId)
          ? { ...access, assignedEvents: (access.assignedEvents || []).filter((id: string) => id !== eventId) }
          : access
      ));
    } catch (error) {
      console.error('Error revoking event:', error);
      alert('Error al quitar el acceso al evento');
    }
  };

  const handleRevokeEventBook = async (userAccessId: string, eventBookId: string) => {
    try {
      setIsLoading(true);
      await eventBookStorage.revokeModerator(eventBookId, Number(userAccessId));
      await loadModeratorAssignments();
    } catch (error) {
      console.error('Error revoking EventBook:', error);
      alert('Error al quitar el acceso al EventBook');
    } finally {
      setIsLoading(false);
    }
  };

  const existingUsernames = userAccesses.map(access => String(access.username || ''));

  const filteredAccesses = useMemo(() => {
    const norm = (v: unknown) => (v ?? '').toString().toLowerCase();
    const q = searchTerm.toLowerCase();
    return userAccesses.filter((access) => {
      return (
        norm(access.name).includes(q) ||
        norm(access.lastName).includes(q) ||
        norm(access.username).includes(q)
      );
    });
  }, [userAccesses, searchTerm]);

  const stats = useMemo(() => {
    const total = userAccesses.length;
    const control = userAccesses.filter((a) => a.accessType === 'control_acceso').length;
    const moderator = userAccesses.filter((a) => a.accessType === 'moderador').length;
    const catering = 0;
    const security = 0;
    return { total, control, moderator, catering, security };
    }, [userAccesses]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {isLoading && (
          <div className="mb-4 bg-indigo-50 border border-indigo-200 text-indigo-700 px-4 py-3 rounded-md text-sm">
            Procesando... por favor esperá un momento.
          </div>
        )}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-indigo-600" />
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Roles</h1>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear nuevo acceso
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Accesos
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.total}
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
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Control de Acceso
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.control}
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
                  <Lock className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Seguridad
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.security}
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
                  <Settings className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Catering
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.catering}
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
                  <Crown className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Moderador
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {stats.moderator}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        {userAccesses.length > 0 && (
          <div className="bg-white shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nombre, apellido o usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* User Access Cards */}
        <div className="space-y-6">
          {filteredAccesses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAccesses.map((userAccess) => (
                <UserAccessCard
                  key={userAccess.id}
                  userAccess={userAccess}
                  onEdit={handleEditUserAccess}
                  onDelete={handleDeleteUserAccess}
                  onAssignEvent={handleAssignEvent}
                  onRevokeEvent={handleRevokeEvent}
                  availableEvents={availableEvents}
                  availableEventBooks={availableEventBooks}
                />
              ))}
            </div>
          ) : userAccesses.length === 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-indigo-100 mb-4">
                    <Shield className="h-8 w-8 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No hay accesos de usuario creados
                  </h3>
                  <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    Crea tu primer acceso de usuario para comenzar a gestionar los roles y permisos de tu equipo.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Crear nuevo acceso
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="text-center py-12">
                  <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No se encontraron accesos
                  </h3>
                  <p className="text-gray-500">
                    Intenta ajustar los términos de búsqueda.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Create User Access Modal */}
        <CreateUserAccessModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingAccessApiUser(null);
          }}
          onSaved={() => {
            fetchUsers();
            loadUserAccesses();
          }}
          isLoading={isLoading}
          existingUsernames={existingUsernames}
          editingUserAccess={editingAccessApiUser as any}
        />
      </div>
    </div>
  );
}