import React from 'react';
import { X, AlertCircle, Eye, EyeOff, Shield } from 'lucide-react';
import type { CreateUserAccessData } from '../types/roles';
import type { ApiUser } from '../types/auth';
import { createUserAPI, updateUserAPI } from '../endpoints/user';

interface FormErrors {
  [key: string]: string;
}

interface CreateUserAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (user: ApiUser) => void;
  isLoading?: boolean;
  existingUsernames: string[];
  editingUserAccess?: ApiUser | null;
}

export function CreateUserAccessModal({ 
  isOpen, 
  onClose, 
  onSaved,
  isLoading = false,
  existingUsernames,
  editingUserAccess
}: CreateUserAccessModalProps) {
  const [formData, setFormData] = React.useState<CreateUserAccessData>({
    accessType: 'control_acceso',
    name: '',
    lastName: '',
    username: '',
    password: ''
  });

  const [errors, setErrors] = React.useState<FormErrors>({});
  const [showPassword, setShowPassword] = React.useState(false);

  // Initialize form data when editing
  React.useEffect(() => {
    if (editingUserAccess) {
      setFormData({
        accessType: (editingUserAccess.role_id === 4 ? 'moderador' : 'control_acceso') as any,
        name: editingUserAccess.name || '',
        lastName: (editingUserAccess.last_name as string) || '',
        username: (editingUserAccess.username as string) || '',
        password: (editingUserAccess as any).password_plain || ''
      });
    } else {
      setFormData({
        accessType: 'control_acceso',
        name: '',
        lastName: '',
        username: '',
        password: ''
      });
    }
  }, [editingUserAccess]);

  const resetForm = () => {
    setFormData({
      accessType: 'control_acceso',
      name: '',
      lastName: '',
      username: '',
      password: ''
    });
    setErrors({});
    setShowPassword(false);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!formData.username.trim()) {
      newErrors.username = 'El nombre de usuario es requerido';
    } else if (existingUsernames.includes(formData.username) && 
               (!editingUserAccess || editingUserAccess.username !== formData.username)) {
      newErrors.username = 'Este nombre de usuario ya está en uso';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'La contraseña es requerida';
    } else if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const role_id = formData.accessType === 'moderador' ? 4 : 3;
      const payload: any = {
        name: formData.name,
        last_name: formData.lastName,
        username: formData.username,
        password: formData.password,
        role_id,
        status: 'active',
      };

      let response: any;
      if (editingUserAccess) {
        // For edit, send only changed password if length >= 6
        const updatePayload: any = {
          name: formData.name,
          last_name: formData.lastName,
          username: formData.username,
          role_id,
        };
        if (formData.password && formData.password.length >= 6) {
          updatePayload.password = formData.password;
        }
        response = await updateUserAPI(Number(editingUserAccess.id), updatePayload);
      } else {
        response = await createUserAPI(payload);
      }

      if (response && (response.status === 201 || response.id || response.status === 200)) {
        try { onSaved?.(response.data ?? response); } catch {}
        resetForm();
        onClose();
      } else {
        const apiMessage = response?.message || 'Error al guardar acceso';
        const apiErrors = response?.errors;
        const newErrors: Record<string, string> = {};
        if (apiErrors && typeof apiErrors === 'object') {
          Object.keys(apiErrors).forEach((key) => {
            const val = apiErrors[key];
            if (Array.isArray(val) && val.length > 0) newErrors[key] = val[0];
          });
        }
        setErrors(prev => ({ ...prev, ...newErrors, submit: apiMessage }));
      }
    } catch (error: any) {
      setErrors({ submit: error?.message || 'Error al guardar acceso' });
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            <h3 className="text-lg font-medium text-gray-900">
              {editingUserAccess ? 'Editar Acceso' : 'Crear Nuevo Acceso'}
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
              <div>
                <div>{errors.submit}</div>
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Tipo de acceso <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.accessType}
              onChange={(e) => setFormData({ ...formData, accessType: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="control_acceso">Control de Acceso</option>
              <option value="moderador">Moderador</option>
              <option value="seguridad" disabled className="text-gray-400">
                Seguridad (Próximamente)
              </option>
              <option value="catering" disabled className="text-gray-400">
                Catering (Próximamente)
              </option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.name ? 'border-red-300' : ''
                }`}
                placeholder="Ingresa el nombre"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apellido <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  errors.lastName ? 'border-red-300' : ''
                }`}
                placeholder="Ingresa el apellido"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.lastName}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nombre de usuario <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                errors.username ? 'border-red-300' : ''
              }`}
              placeholder="Ingresa el nombre de usuario"
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.username}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10 ${
                  errors.password ? 'border-red-300' : ''
                }`}
                placeholder="Ingresa la contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.password}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? (editingUserAccess ? 'Actualizando...' : 'Creando...') : (editingUserAccess ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}