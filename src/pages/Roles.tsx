import React from 'react';
import { Shield, Users, Settings, Lock, Plus, Search, Crown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../lib/storage';
import { rolesStorage } from '../lib/roles-storage';
import { eventBookStorage } from '../lib/eventbook-storage';
import { CreateUserAccessModal } from '../components/CreateUserAccessModal';
import { UserAccessCard } from '../components/UserAccessCard';
import type { UserAccess, CreateUserAccessData } from '../types/roles';
import type { Event } from '../types/event';
import type { EventBook } from '../types/eventbook';

export function Roles() {
  const { user } = useAuth();
  const [userAccesses, setUserAccesses] = React.useState<UserAccess[]>([]);
  const [availableEvents, setAvailableEvents] = React.useState<Event[]>([]);
  const [availableEventBooks, setAvailableEventBooks] = React.useState<EventBook[]>([]);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const [editingUserAccess, setEditingUserAccess] = React.useState<UserAccess | null>(null);

  React.useEffect(() => {
    loadUserAccesses();
    loadAvailableEvents();
    loadAvailableEventBooks();
  }, []);

  const loadUserAccesses = async () => {
    if (!user?.id) return;
    try {
      const accesses = await rolesStorage.getUserAccesses(user.id);
      setUserAccesses(accesses);
    } catch (error) {
      console.error('Error loading user accesses:', error);
    }
  };

  const loadAvailableEvents = async () => {
    try {
      const events = await storage.getEvents();
      setAvailableEvents(events);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const loadAvailableEventBooks = async () => {
    if (!user?.id) return;
    try {
      const allEventBooks = await eventBookStorage.getEventBooksByUser();
      const events = await storage.getEvents();
      
      // Filter EventBooks that belong to events created by the current admin
      const adminEvents = events.filter(event => event.created_by === user.id);
      const adminEventIds = adminEvents.map(event => event.id);
      const adminEventBooks = allEventBooks.filter(eventBook => 
        adminEventIds.includes(eventBook.event_id)
      );
      
      setAvailableEventBooks(adminEventBooks);
    } catch (error) {
      console.error('Error loading EventBooks:', error);
    }
  };

  const handleCreateUserAccess = async (data: CreateUserAccessData) => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      
      if (editingUserAccess) {
        // Update existing user access
        const updatedAccess = {
          ...editingUserAccess,
          ...data
        };
        await rolesStorage.updateUserAccess(editingUserAccess.id, updatedAccess);
        setUserAccesses(prev => prev.map(access => 
          access.id === editingUserAccess.id ? updatedAccess : access
        ));
        setEditingUserAccess(null);
      } else {
        // Create new user access
        const newAccess = await rolesStorage.createUserAccess(data, user.id);
        setUserAccesses(prev => [...prev, newAccess]);
      }
      
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating user access:', error);
      alert('Error al crear el acceso de usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUserAccess = (userAccess: UserAccess) => {
    setEditingUserAccess(userAccess);
    setShowCreateModal(true);
  };

  const handleDeleteUserAccess = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este acceso? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setIsLoading(true);
      await rolesStorage.deleteUserAccess(id);
      setUserAccesses(prev => prev.filter(access => access.id !== id));
    } catch (error) {
      console.error('Error deleting user access:', error);
      alert('Error al eliminar el acceso de usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignEvent = async (userAccessId: string, eventId: string) => {
    try {
      const userAccess = userAccesses.find(access => access.id === userAccessId);
      if (!userAccess) return;

      // For moderators, handle EventBook assignment instead of event assignment
      if (userAccess.accessType === 'moderador') {
        return handleAssignEventBook(userAccessId, eventId); // eventId is actually eventBookId for moderators
      }

      if (userAccess.assignedEvents.includes(eventId)) {
        // If already assigned, revoke it
        await rolesStorage.revokeEventFromUser(userAccessId, eventId);
        setUserAccesses(prev => prev.map(access => 
          access.id === userAccessId 
            ? { ...access, assignedEvents: access.assignedEvents.filter(id => id !== eventId) }
            : access
        ));
      } else {
        // If not assigned, assign it
        await rolesStorage.assignEventToUser(userAccessId, eventId);
        setUserAccesses(prev => prev.map(access => 
          access.id === userAccessId 
            ? { ...access, assignedEvents: [...access.assignedEvents, eventId] }
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
      const userAccess = userAccesses.find(access => access.id === userAccessId);
      if (!userAccess || userAccess.accessType !== 'moderador') return;

      const assignedEventBooks = userAccess.assignedEventBooks || [];
      
      if (assignedEventBooks.includes(eventBookId)) {
        // If already assigned, revoke it
        await rolesStorage.revokeEventBookFromUser(userAccessId, eventBookId);
        setUserAccesses(prev => prev.map(access => 
          access.id === userAccessId 
            ? { ...access, assignedEventBooks: (access.assignedEventBooks || []).filter(id => id !== eventBookId) }
            : access
        ));
      } else {
        // If not assigned, assign it
        await rolesStorage.assignEventBookToUser(userAccessId, eventBookId);
        setUserAccesses(prev => prev.map(access => 
          access.id === userAccessId 
            ? { ...access, assignedEventBooks: [...(access.assignedEventBooks || []), eventBookId] }
            : access
        ));
      }
    } catch (error) {
      console.error('Error assigning/revoking EventBook:', error);
      alert('Error al gestionar la asignación del EventBook');
    }
  };

  const handleRevokeEvent = async (userAccessId: string, eventId: string) => {
    const userAccess = userAccesses.find(access => access.id === userAccessId);
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
      await rolesStorage.revokeEventFromUser(userAccessId, eventId);
      setUserAccesses(prev => prev.map(access => 
        access.id === userAccessId 
          ? { ...access, assignedEvents: access.assignedEvents.filter(id => id !== eventId) }
          : access
      ));
    } catch (error) {
      console.error('Error revoking event:', error);
      alert('Error al quitar el acceso al evento');
    }
  };

  const handleRevokeEventBook = async (userAccessId: string, eventBookId: string) => {
    try {
      await rolesStorage.revokeEventBookFromUser(userAccessId, eventBookId);
      setUserAccesses(prev => prev.map(access => 
        access.id === userAccessId 
          ? { ...access, assignedEventBooks: (access.assignedEventBooks || []).filter(id => id !== eventBookId) }
          : access
      ));
    } catch (error) {
      console.error('Error revoking EventBook:', error);
      alert('Error al quitar el acceso al EventBook');
    }
  };

  const existingUsernames = userAccesses.map(access => access.username);

  const filteredAccesses = React.useMemo(() => {
    return userAccesses.filter(access => {
      const searchLower = searchTerm.toLowerCase();
      return (
        access.firstName.toLowerCase().includes(searchLower) ||
        access.lastName.toLowerCase().includes(searchLower) ||
        access.username.toLowerCase().includes(searchLower)
      );
    });
  }, [userAccesses, searchTerm]);

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
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
                      {userAccesses.length}
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
                      {userAccesses.filter(a => a.accessType === 'control_acceso').length}
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
                      {userAccesses.filter(a => a.accessType === 'seguridad').length}
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
                      {userAccesses.filter(a => a.accessType === 'catering').length}
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
                      {userAccesses.filter(a => a.accessType === 'moderador').length}
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
            setEditingUserAccess(null);
          }}
          onSubmit={handleCreateUserAccess}
          isLoading={isLoading}
          existingUsernames={existingUsernames}
          editingUserAccess={editingUserAccess}
        />
      </div>
    </div>
  );
}