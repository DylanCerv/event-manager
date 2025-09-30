import React from 'react';
import { X, Shield, ShieldOff, AlertTriangle } from 'lucide-react';

interface ParticipantBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  participantId: string;
  isCurrentlyBlocked: boolean;
  currentBlockType?: 'total' | 'partial';
  onConfirm: (blockType: 'total' | 'partial', reason?: string) => void;
  onUnblock: () => void;
}

export function ParticipantBlockModal({
  isOpen,
  onClose,
  participantName,
  participantId,
  isCurrentlyBlocked,
  currentBlockType,
  onConfirm,
  onUnblock
}: ParticipantBlockModalProps) {
  const [blockType, setBlockType] = React.useState<'total' | 'partial'>('partial');
  const [reason, setReason] = React.useState('');

  React.useEffect(() => {
    if (isOpen && !isCurrentlyBlocked) {
      setBlockType('partial');
      setReason('');
    }
  }, [isOpen, isCurrentlyBlocked]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isCurrentlyBlocked) {
      onUnblock();
    } else {
      onConfirm(blockType, reason.trim() || undefined);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {isCurrentlyBlocked ? (
              <ShieldOff className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            ) : (
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            )}
            <h3 className="text-base sm:text-lg font-medium text-gray-900">
              <span className="hidden sm:inline">
                {isCurrentlyBlocked ? 'Desbloquear participante' : 'Bloquear participante'}
              </span>
              <span className="sm:hidden">
                {isCurrentlyBlocked ? 'Desbloquear' : 'Bloquear'}
              </span>
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-6">
          <div className="mb-3 sm:mb-4">
            <p className="text-xs sm:text-sm text-gray-600">
              <span className="font-medium">Participante:</span> {participantName}
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              ID: #{participantId.slice(0, 8)}
            </p>
          </div>

          {isCurrentlyBlocked ? (
            // Unblock confirmation
            <div className="mb-4 sm:mb-6">
              <div className="flex items-start space-x-2 sm:space-x-3 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm font-medium text-yellow-800">
                    Confirmar desbloqueo
                  </p>
                  <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                    <span className="hidden sm:inline">
                      Este participante está bloqueado con tipo "{currentBlockType === 'total' ? 'Total' : 'Parcial'}". 
                      ¿Estás seguro de que quieres desbloquearlo?
                    </span>
                    <span className="sm:hidden">
                      Bloqueado "{currentBlockType === 'total' ? 'Total' : 'Parcial'}". ¿Desbloquear?
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ) : (
            // Block configuration
            <>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                  Tipo de bloqueo
                </label>
                <div className="space-y-2 sm:space-y-3">
                  <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="blockType"
                      value="total"
                      checked={blockType === 'total'}
                      onChange={(e) => setBlockType(e.target.value as 'total')}
                      className="mt-0.5 sm:mt-1 h-3 w-3 sm:h-4 sm:w-4 text-red-600 focus:ring-red-500 border-gray-300"
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        Total
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        <span className="hidden sm:inline">No puede entrar al EventBook</span>
                        <span className="sm:hidden">Sin acceso</span>
                      </div>
                    </div>
                  </label>
                  
                  <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="blockType"
                      value="partial"
                      checked={blockType === 'partial'}
                      onChange={(e) => setBlockType(e.target.value as 'partial')}
                      className="mt-0.5 sm:mt-1 h-3 w-3 sm:h-4 sm:w-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                    />
                    <div>
                      <div className="text-xs sm:text-sm font-medium text-gray-900">
                        Parcial
                      </div>
                      <div className="text-xs sm:text-sm text-gray-500">
                        <span className="hidden sm:inline">Puede ver el muro, pero no puede publicar, comentar ni reaccionar</span>
                        <span className="sm:hidden">Solo lectura</span>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mb-4 sm:mb-6">
                <label htmlFor="reason" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  Motivo (opcional)
                </label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe brevemente el motivo del bloqueo..."
                  rows={2}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent text-xs sm:text-sm resize-none"
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reason.length}/200 caracteres
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2 sm:space-x-3 p-3 sm:p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
              isCurrentlyBlocked
                ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
            }`}
          >
            {isCurrentlyBlocked ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </div>
    </div>
  );
}
