import React, { useState } from 'react';
import { User, Calendar, Star, Gift, Camera, X } from 'lucide-react';
import { PhotoUploadModal } from './PhotoUploadModal';
import { useAuth } from '../contexts/AuthContext';
import { getPointTransactionsAPI } from '../endpoints/points';

interface UserProfileDropdownProps {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  onViewRewards: () => void;
  onCloseMobileMenu?: () => void;
}

export function UserProfileDropdown({ user, isOpen, onClose, onViewRewards, onCloseMobileMenu }: UserProfileDropdownProps) {
  const { updateUserPhoto } = useAuth();
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState(false);
  const [points, setPoints] = useState<number>(0);

  // Cerrar modal de foto cuando se cierre el dropdown
  React.useEffect(() => {
    if (!isOpen) {
      setIsPhotoModalOpen(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen || !user?.id) return;
    getPointTransactionsAPI(String(user.id))
      .then((resp) => {
        const txs = resp?.data || [];
        const balance = txs.reduce((sum: number, t: any) => sum + (Number(t.points) || 0), 0);
        setPoints(balance);
      })
      .catch(() => setPoints(0));
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  // Función para formatear fecha de membresía
  const formatMemberSince = (createdAt: string) => {
    return new Date(createdAt).toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long' 
    });
  };

  const userPoints = points;

  const handlePhotoUpdate = (newPhotoUrl: string) => {
    updateUserPhoto(newPhotoUrl);
    // Aquí se guardaría en la base de datos
  };

  const handleOpenPhotoModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsPhotoModalOpen(true);
    onCloseMobileMenu?.();
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 z-[55]" 
        onClick={onClose}
      />
      
      {/* Dropdown */}
      <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-20 sm:top-full mt-2 w-80 sm:w-80 w-auto max-w-sm mx-0 sm:mx-0 bg-white rounded-lg shadow-xl border border-gray-200 z-[60]">
        <div className="p-4">
          {/* Header con foto y nombre */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              {user.profilePhoto ? (
                <img 
                  src={user.profilePhoto} 
                  alt="Perfil" 
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || user.firstName + ' ' + user.lastName || 'Usuario'}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {user.firstName} {user.lastName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Información de membresía */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Miembro desde: {formatMemberSince(user.createdAt || new Date().toISOString())}</span>
            </div>
            
            <div className="flex items-center text-sm">
              <Star className="h-4 w-4 mr-2 text-yellow-500" />
              <span className="font-medium text-gray-900">{userPoints.toLocaleString()} puntos</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex space-x-2">
            <button
              onClick={onViewRewards}
              className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <Gift className="h-4 w-4 mr-2" />
              Ver Premios
            </button>
            <button
              onClick={handleOpenPhotoModal}
              className="inline-flex items-center justify-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              title="Cambiar foto de perfil"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onPhotoUpdate={handlePhotoUpdate}
        currentPhoto={user.profilePhoto}
      />
    </>
  );
}
