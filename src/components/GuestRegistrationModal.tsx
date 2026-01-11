import React, { useState } from 'react';
import { User, Camera } from 'lucide-react';

interface GuestRegistrationModalProps {
  isOpen: boolean;
  onRegister: (firstName: string, lastName: string, profilePhoto?: string) => Promise<void> | void;
  eventName: string;
}

export function GuestRegistrationModal({ isOpen, onRegister, eventName }: GuestRegistrationModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    setIsLoading(true);
    try {
      await onRegister(firstName.trim(), lastName.trim(), profilePhoto);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setProfilePhoto(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                ¡Bienvenido al EventBook!
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {eventName}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <User className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="text-center mb-6">
            <p className="text-gray-700 mb-2">
              Para participar en este EventBook, completa tu perfil rápidamente:
            </p>
          </div>

          {/* Photo Upload */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {profilePhoto ? (
                <img
                  src={profilePhoto}
                  alt="Foto de perfil"
                  className="w-20 h-20 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-center mb-4">
            La foto de perfil es opcional
          </p>

          {/* Name Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu nombre"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Apellido *
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tu apellido"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="submit"
              disabled={!firstName.trim() || !lastName.trim() || isLoading}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Registrando...' : 'Continuar'}
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center">
            Tu información se guardará solo en este dispositivo para este evento
          </p>
        </form>
      </div>
    </div>
  );
}
