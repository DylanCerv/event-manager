import React, { useState } from 'react';
import { Gift, Star, X } from 'lucide-react';

interface AwardPrizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  currentPoints: number;
  prizes: any[];
  onSubmit: (award: { userId: string; prizeId: string; prizeCost: number }) => void;
}

export function AwardPrizeModal({ isOpen, onClose, user, currentPoints, prizes, onSubmit }: AwardPrizeModalProps) {
  const [selectedPrize, setSelectedPrize] = React.useState<string>('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrize) {
      alert('Por favor selecciona un premio');
      return;
    }

    const prize = prizes.find(p => p.id === selectedPrize);
    if (!prize) return;

    if (currentPoints < prize.points) {
      alert('El usuario no tiene suficientes puntos para este premio');
      return;
    }

    setIsSubmitting(true);
    
    try {
      onSubmit({
        userId: user.id,
        prizeId: prize.id,
        prizeCost: prize.points
      });
      
      setSelectedPrize('');
    } catch (error) {
      console.error('Error awarding prize:', error);
      alert('Error al otorgar premio');
    } finally {
      setIsSubmitting(false);
    }
  };

  console.log('All prizes:', prizes);
  console.log('Prizes length:', prizes?.length);
  console.log('Current points:', currentPoints);
  console.log('User type:', user?.userType);
  
  const availablePrizes = (prizes || []).filter(prize => {
    console.log('Checking prize:', prize.title, 'Cost:', prize.points, 'Eligible:', prize.targetAudience);
    const hasEnoughPoints = prize.points <= currentPoints;
    const isEligible = prize.targetAudience === 'Todos' || 
     (user?.userType === 'admin' && prize.targetAudience === 'Administradores') ||
     (user?.userType === 'creator' && prize.targetAudience === 'Creadores');
    console.log('Has enough points:', hasEnoughPoints, 'Is eligible:', isEligible);
    return hasEnoughPoints && isEligible;
  });
  
  console.log('Available prizes:', availablePrizes);

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Gift className="h-6 w-6 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Otorgar Premio</h3>
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
          <div className="flex items-center justify-between">
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
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-yellow-600">
                <Star className="h-4 w-4 mr-1" />
                <span className="text-lg font-bold">{currentPoints}</span>
              </div>
              <p className="text-xs text-gray-500">puntos disponibles</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selección de premio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Premio disponible
            </label>
            {availablePrizes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Gift className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                <p className="text-sm">No hay premios disponibles para este usuario</p>
                <p className="text-xs">Puntos insuficientes o sin premios elegibles</p>
              </div>
            ) : (
              <select
                value={selectedPrize}
                onChange={(e) => setSelectedPrize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Selecciona un premio...</option>
                {availablePrizes.map((prize) => (
                  <option key={prize.id} value={prize.id}>
                    {prize.title} - {prize.points} puntos
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Vista previa del premio seleccionado */}
          {selectedPrize && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              {(() => {
                const prize = prizes.find(p => p.id === selectedPrize);
                return prize ? (
                  <div>
                    <h4 className="font-medium text-green-800">{prize.title}</h4>
                    <p className="text-sm text-green-600 mt-1">{prize.description}</p>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-sm font-medium text-green-800">
                        Costo: {prize.points} puntos
                      </span>
                      <span className="text-sm text-green-600">
                        Puntos restantes: {currentPoints - prize.points}
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedPrize || availablePrizes.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Otorgando...' : 'Otorgar Premio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
