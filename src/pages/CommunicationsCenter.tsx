import React from 'react';
import { Plus, Edit, Trash2, Bell, Info, AlertTriangle, CheckCircle, X, Save } from 'lucide-react';
import { communicationsStorage } from '../lib/communications-storage';
import type { Notification, SystemUpdate, CommunicationFormData } from '../types/communications';
import { appConfirm } from '../lib/dialogs';
import { notify } from '../lib/notify';

export function CommunicationsCenter() {
  const [activeTab, setActiveTab] = React.useState<'notifications' | 'updates'>('notifications');
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [systemUpdates, setSystemUpdates] = React.useState<SystemUpdate[]>([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Notification | SystemUpdate | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [formData, setFormData] = React.useState<CommunicationFormData>({
    title: '',
    message: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    targetRole: 'ADMIN'
  });

  React.useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [notifs, updates] = await Promise.all([
        communicationsStorage.getNotifications(),
        communicationsStorage.getSystemUpdates()
      ]);
      setNotifications(notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setSystemUpdates(updates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Error loading communications data:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: activeTab === 'notifications' ? 'info' : 'feature',
      date: new Date().toISOString().split('T')[0],
      targetRole: 'ADMIN'
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (activeTab === 'notifications') {
        const notificationData = {
          title: formData.title,
          message: formData.message,
          type: formData.type as 'info' | 'warning' | 'success' | 'error',
          isActive: true,
          targetRole: formData.targetRole,
          createdBy: 'Super Admin'
        };

        if (editingItem) {
          await communicationsStorage.updateNotification(editingItem.id, notificationData);
        } else {
          await communicationsStorage.createNotification(notificationData);
        }
      } else {
        const updateData = {
          title: formData.title,
          message: formData.message,
          type: formData.type as 'feature' | 'reminder' | 'maintenance' | 'announcement',
          date: formData.date || new Date().toISOString().split('T')[0],
          isActive: true,
          targetRole: formData.targetRole,
          createdBy: 'Super Admin'
        };

        if (editingItem) {
          await communicationsStorage.updateSystemUpdate(editingItem.id, updateData);
        } else {
          await communicationsStorage.createSystemUpdate(updateData);
        }
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Error saving communication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (item: Notification | SystemUpdate) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      message: item.message,
      type: item.type,
      date: 'date' in item ? item.date : new Date().toISOString().split('T')[0],
      targetRole: item.targetRole
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await appConfirm({
      title: 'Eliminar elemento',
      message: '¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      setIsLoading(true);
      if (activeTab === 'notifications') {
        await communicationsStorage.deleteNotification(id);
      } else {
        await communicationsStorage.deleteSystemUpdate(id);
      }
      await loadData();
    } catch (error) {
      console.error('Error deleting communication:', error);
      notify.error('Error al eliminar el elemento');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleActive = async (item: Notification | SystemUpdate) => {
    try {
      const updatedData = { isActive: !item.isActive };
      if (activeTab === 'notifications') {
        await communicationsStorage.updateNotification(item.id, updatedData);
      } else {
        await communicationsStorage.updateSystemUpdate(item.id, updatedData);
      }
      await loadData();
    } catch (error) {
      console.error('Error toggling active status:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
      case 'feature':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'warning':
      case 'reminder':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'announcement':
        return <Bell className="h-5 w-5 text-indigo-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const currentItems = activeTab === 'notifications' ? notifications : systemUpdates;

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Centro de Comunicaciones</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear {activeTab === 'notifications' ? 'Notificación' : 'Actualización'}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`${
                activeTab === 'notifications'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <Bell className="h-5 w-5 inline-block mr-2" />
              Notificaciones
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`${
                activeTab === 'updates'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              <Info className="h-5 w-5 inline-block mr-2" />
              Actualizaciones del Sistema
            </button>
          </nav>
        </div>

        {/* Content List */}
        <div className="space-y-4">
          {currentItems.length === 0 ? (
            <div className="bg-white shadow rounded-lg">
              <div className="text-center py-12">
                {activeTab === 'notifications' ? (
                  <Bell className="mx-auto h-12 w-12 text-gray-400" />
                ) : (
                  <Info className="mx-auto h-12 w-12 text-gray-400" />
                )}
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No hay {activeTab === 'notifications' ? 'notificaciones' : 'actualizaciones'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comienza creando {activeTab === 'notifications' ? 'una notificación' : 'una actualización'}.
                </p>
              </div>
            </div>
          ) : (
            currentItems.map((item) => (
              <div key={item.id} className="bg-white shadow rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-4 sm:space-y-0">
                    <div className="flex items-start space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getTypeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                          <h3 className="text-base font-medium text-gray-900 truncate">{item.title}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {item.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {item.targetRole === 'ADMIN' ? 'Solo Admins' : 
                               item.targetRole === 'CREATOR' ? 'Solo Creadores' : 'Todos'}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{item.message}</p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center">
                            Tipo: <span className="ml-1 font-medium">{item.type}</span>
                          </span>
                          {'date' in item && (
                            <span className="flex items-center">
                              Fecha: <span className="ml-1 font-medium">{new Date(item.date).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
                            </span>
                          )}
                          <span className="flex items-center">
                            Creado: <span className="ml-1 font-medium">{new Date(item.createdAt).toLocaleDateString('es-ES', {day: '2-digit', month: '2-digit', year: 'numeric'})}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:ml-4">
                      <button
                        onClick={() => toggleActive(item)}
                        className={`inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          item.isActive
                            ? 'text-gray-700 bg-gray-100 hover:bg-gray-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200'
                        }`}
                      >
                        {item.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 text-indigo-600 hover:text-indigo-900 transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-600 hover:text-red-900 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingItem ? 'Editar' : 'Crear'} {activeTab === 'notifications' ? 'Notificación' : 'Actualización'}
                </h3>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-500">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Mensaje</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Seleccionar tipo</option>
                    {activeTab === 'notifications' ? (
                      <>
                        <option value="info">Información</option>
                        <option value="warning">Advertencia</option>
                        <option value="success">Éxito</option>
                        <option value="error">Error</option>
                      </>
                    ) : (
                      <>
                        <option value="feature">Nueva Función</option>
                        <option value="reminder">Recordatorio</option>
                        <option value="maintenance">Mantenimiento</option>
                        <option value="announcement">Anuncio</option>
                      </>
                    )}
                  </select>
                </div>

                {activeTab === 'updates' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fecha</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700">Dirigido a</label>
                  <select
                    value={formData.targetRole}
                    onChange={(e) => setFormData({ ...formData, targetRole: e.target.value as 'ADMIN' | 'CREATOR' | 'ALL' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="ADMIN">Solo Administradores</option>
                    <option value="CREATOR">Solo Creadores</option>
                    <option value="ALL">Todos los usuarios</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}