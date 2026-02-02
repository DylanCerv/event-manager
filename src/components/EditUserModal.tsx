import React from 'react';
import { X, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { updateUserAPI } from '../endpoints/user';
import type { Creator } from '../types/creator';
import { useUser } from '../contexts/UserContext';
import { notify } from '../lib/notify';

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

interface UserFormData {
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
  createdBy: string;
  status: string;
}

interface FormErrors {
  [key: string]: string;
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  creators: Creator[];
  editingUser: User | null;
  onUpdated?: (apiUser: any) => void;
}

export function EditUserModal({ isOpen, creators, onClose, editingUser, onUpdated }: EditUserModalProps) {
  const { fetchUsers } = useUser();
  const [initialPassword, setInitialPassword] = React.useState('');
  const [formData, setFormData] = React.useState<UserFormData>({
    firstName: '',
    lastName: '',
    company: '',
    country: '',
    city: '',
    address: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    createdBy: '',
    status: 'active'
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (editingUser) {
      const existingPassword = ((editingUser as any).password_plain ?? '') as string;
      setInitialPassword(existingPassword || '');
      setFormData({
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        company: editingUser.company,
        country: editingUser.country,
        city: editingUser.city,
        address: editingUser.address,
        phone: editingUser.phone,
        email: editingUser.email,
        username: editingUser.username,
        // Prefill if backend provides decrypted password (scoped)
        password: existingPassword || '',
        createdBy: editingUser.createdBy || '',
        status: editingUser.status
      });
    }
  }, [editingUser]);

  // Función para obtener el nombre del creador
  const getCreatorName = (creator: any) => {
    console.log('creators', creators);
    const creatorFinded = creators.find(c => c.id === creator.createdBy);
    return creatorFinded ? `${creatorFinded.firstName} ${creatorFinded.lastName}` : creator.creatorId;
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      company: '',
      country: '',
      city: '',
      address: '',
      phone: '',
      email: '',
      username: '',
      password: '',
      createdBy: '',
      status: 'active'
    });
    setErrors({});
    setShowPassword(false);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'El apellido es requerido';
    if (!formData.company.trim()) newErrors.company = 'La empresa es requerida';
    if (!formData.country.trim()) newErrors.country = 'El país es requerido';
    if (!formData.city.trim()) newErrors.city = 'La ciudad es requerida';
    if (!formData.address.trim()) newErrors.address = 'El domicilio es requerido';
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es requerido';
    if (!formData.username.trim()) newErrors.username = 'El nombre de usuario es requerido';
    if (formData.password && formData.password.trim().length > 0 && formData.password.trim().length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El formato del email no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !editingUser) return;

    setIsLoading(true);
    try {
      const payload: Record<string, any> = {
        name: formData.firstName,
        last_name: formData.lastName,
        username: formData.username,
        email: formData.email,
        country: formData.country,
        city: formData.city,
        address: formData.address,
        phone: formData.phone,
        company: formData.company,
        status: formData.status,
      };
      const passwordChanged = (formData.password || '') !== (initialPassword || '');
      if (passwordChanged && formData.password && formData.password.trim().length >= 8) {
        payload.password = formData.password;
      }

      const response = await updateUserAPI(Number(editingUser.id), payload);
      const updatedUser = response?.data ?? response?.user ?? response;
      const isSuccess = response?.status == 200 || !!updatedUser?.id;
      if (isSuccess) {
        resetForm();
        fetchUsers();
        try { onUpdated?.(updatedUser); } catch {}
        onClose();
      } else {
        notify.error(response?.message || 'Error al actualizar el usuario');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      notify.error('Error al actualizar el usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-base sm:text-lg font-medium text-gray-900">✏️ Editar Usuario</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 p-1"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  👤 Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.firstName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.firstName && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.firstName}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  👤 Apellido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.lastName ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.lastName && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.lastName}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                🏢 Empresa <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                  errors.company ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ingresa la empresa"
              />
              {errors.company && (
                <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {errors.company}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  🌍 País <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.country ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa el país"
                />
                {errors.country && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.country}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  🏙️ Ciudad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.city ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa la ciudad"
                />
                {errors.city && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.city}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                🏠 Domicilio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                  errors.address ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Ingresa el domicilio"
              />
              {errors.address && (
                <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  {errors.address}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  📞 Teléfono <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa el teléfono"
                />
                {errors.phone && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.phone}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  📧 Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa el email"
                />
                {errors.email && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.email}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  👨‍💻 Nombre de usuario <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa el nombre de usuario"
                />
                {errors.username && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.username}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700">
                  🔒 Contraseña (opcional)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm pr-8 ${
                      errors.password ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Dejar vacío para no cambiar"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-2 flex items-center"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <div className="mt-1 flex items-center text-red-600 text-xs sm:text-sm">
                    <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    {errors.password}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                👨‍💼 Creado por
              </label>
              <div className="mt-1 block w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm text-gray-700">
                {formData.createdBy ? getCreatorName(formData) : 'Sin creador asignado'}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Este campo no se puede editar. El creador se asigna al crear el usuario.
              </p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700">
                ⚙️ Estado del Usuario
              </label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center">
                  <input
                    id="status-active"
                    name="status"
                    type="radio"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="h-3 w-3 sm:h-4 sm:w-4 text-green-600 focus:ring-green-500 border-gray-300"
                  />
                  <label htmlFor="status-active" className="ml-2 sm:ml-3 block text-xs sm:text-sm font-medium text-gray-700">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✅ Activo
                    </span>
                    <span className="ml-1 sm:ml-2 text-gray-500 text-xs sm:text-sm hidden sm:inline">- El usuario puede acceder normalmente</span>
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="status-suspended"
                    name="status"
                    type="radio"
                    value="suspended"
                    checked={formData.status === 'suspended'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="h-3 w-3 sm:h-4 sm:w-4 text-red-600 focus:ring-red-500 border-gray-300"
                  />
                  <label htmlFor="status-suspended" className="ml-2 sm:ml-3 block text-xs sm:text-sm font-medium text-gray-700">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      ❌ Suspendido
                    </span>
                    <span className="ml-1 sm:ml-2 text-gray-500 text-xs sm:text-sm hidden sm:inline">- El usuario no podrá acceder al sistema</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center px-3 sm:px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isLoading ? 'Guardando...' : 'Actualizar Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}