import React from 'react';
import { X, Gift, Star, Lock, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getPrizesAPI } from '../endpoints/prize';
import { createPrizeRedemptionAPI, getPrizeRedemptionsAPI } from '../endpoints/prizeRedemption';

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  targetAudience: string;
  isActive: boolean;
  image?: string;
  createdAt: string;
}

interface RewardsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userPoints: number;
  userType?: string;
}

export function RewardsModal({ isOpen, onClose, userPoints, userType = 'Administradores' }: RewardsModalProps) {
  const { user } = useAuth();
  const [pendingRequests, setPendingRequests] = React.useState<any[]>([]);
  const [allUserRequests, setAllUserRequests] = React.useState<any[]>([]);
  const [availablePoints, setAvailablePoints] = React.useState(userPoints);
  const [showHistory, setShowHistory] = React.useState(false);
  const [rewards, setRewards] = React.useState<Reward[]>([]);

  // Cargar solicitudes pendientes del usuario
  React.useEffect(() => {
    if (user?.id && isOpen) {
      loadUserPendingRequests();
      loadRewardsFromApi();
    }
  }, [user?.id, isOpen]);

  // Actualizar puntos disponibles cuando cambian los userPoints
  React.useEffect(() => {
    // Backend reserves points via transactions, so the balance is the available points.
    setAvailablePoints(userPoints);
  }, [userPoints, user?.id]);

  // Listener para actualizar cuando otras pantallas disparen un refresh manual
  React.useEffect(() => {
    const handleStorageUpdate = () => {
      if (user?.id && isOpen) {
        loadUserPendingRequests();
      }
    };

    window.addEventListener('localStorageUpdate', handleStorageUpdate);
    return () => window.removeEventListener('localStorageUpdate', handleStorageUpdate);
  }, [user?.id, isOpen]);

  const loadUserPendingRequests = async () => {
    try {
      if (!user?.id) return;
      const response = await getPrizeRedemptionsAPI({ userId: String(user.id) });
      const allRequests = response?.data || [];
      const userPendingRequests = allRequests.filter((r: any) => r.status === 'pending');
      setPendingRequests(userPendingRequests);
      setAllUserRequests(allRequests);
      setAvailablePoints(userPoints);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      setPendingRequests([]);
      setAvailablePoints(userPoints);
    }
  };

  const loadRewardsFromApi = async () => {
    try {
      const response = await getPrizesAPI();
      const allPrizes = (response?.data || []) as Reward[];
      const filtered = allPrizes.filter((prize: any) =>
        prize.isActive && (prize.targetAudience === userType || prize.targetAudience === 'Todos')
      );
      setRewards(filtered);
    } catch (error) {
      console.error('Error loading rewards:', error);
      setRewards(loadRewardsLocal());
    }
  };

  // Fallback: Cargar premios desde localStorage
  const loadRewardsLocal = (): Reward[] => {
    try {
      const storedPrizes = localStorage.getItem('prizes');
      if (storedPrizes) {
        const allPrizes = JSON.parse(storedPrizes);
        // Filtrar premios activos según el tipo de usuario
        return allPrizes.filter((prize: Reward) => 
          prize.isActive && 
          (prize.targetAudience === userType || prize.targetAudience === 'Todos')
        );
      }
      return [];
    } catch (error) {
      console.error('Error loading rewards:', error);
      return [];
    }
  };

  // Helper function to get status information
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
          text: 'En revisión'
        };
      case 'approved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          text: 'Aprobado'
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          text: 'Rechazado'
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          text: 'Desconocido'
        };
    }
  };

  // Función para verificar si el usuario puede canjear el producto (restricción de 90 días)
  const canRedeemProduct = (prizeId: string): { canRedeem: boolean; message?: string } => {
    try {
      const userRequests = allUserRequests.filter((request: any) =>
        request.userId === String(user?.id) &&
        request.prizeId === prizeId &&
        request.status === 'approved'
      );
      
      if (userRequests.length === 0) return { canRedeem: true };
      
      // Verificar si hay alguna solicitud aprobada en los últimos 90 días
      const now = new Date();
      const ninetyDaysAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      
      const recentApproval = userRequests.find((request: any) => {
        const processedDate = new Date(request.processedDate);
        return processedDate > ninetyDaysAgo;
      });
      
      if (recentApproval) {
        const processedDate = new Date(recentApproval.processedDate);
        const availableDate = new Date(processedDate.getTime() + (90 * 24 * 60 * 60 * 1000));
        return {
          canRedeem: false,
          message: `Ya canjeaste este producto recientemente. Podrás canjearlo nuevamente el ${availableDate.toLocaleDateString()}.`
        };
      }
      
      return { canRedeem: true };
    } catch (error) {
      console.error('Error checking product redemption eligibility:', error);
      return { canRedeem: true }; // En caso de error, permitir el canje
    }
  };

  if (!isOpen) return null;

  const handleRedeem = (reward: Reward) => {
    // Verificar restricción de 90 días
    const redemptionCheck = canRedeemProduct(reward.id);
    if (!redemptionCheck.canRedeem) {
      alert(redemptionCheck.message);
      return;
    }

    if (availablePoints >= reward.points) {
      if (!user?.id) return;
      createPrizeRedemptionAPI({ prize_id: reward.id, user_id: String(user.id) })
        .then(() => {
          loadUserPendingRequests();
          window.dispatchEvent(new CustomEvent('localStorageUpdate', { detail: { type: 'prizeRequest', userId: user?.id } }));
          alert(`¡Solicitud de canje de ${reward.title} enviada!`);
        })
        .catch((error) => {
          console.error('Error creating prize redemption:', error);
          alert(error instanceof Error ? error.message : 'Error al enviar la solicitud. Inténtalo de nuevo.');
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Gift className="h-6 w-6 text-indigo-600 mr-2" />
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Mis Premios
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Toggle between prizes and history */}
            <div className="flex mb-4 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setShowHistory(false)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  !showHistory
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Premios Disponibles
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  showHistory
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Historial de Solicitudes
              </button>
            </div>

            {/* Puntos disponibles */}
            <div className="bg-indigo-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">
                    Puntos totales: {userPoints.toLocaleString()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Disponibles: <span className="font-medium text-green-600">{availablePoints.toLocaleString()}</span>
                  </div>
                  {userPoints !== availablePoints && (
                    <div className="text-xs text-orange-600">
                      Reservados: {(userPoints - availablePoints).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content based on toggle */}
            {!showHistory ? (
              <>
                {/* Solicitudes pendientes */}
                {pendingRequests.length > 0 && (
                  <div className="bg-orange-50 rounded-lg p-4 mb-6">
                    <h4 className="text-sm font-medium text-orange-900 mb-3 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Solicitudes Pendientes ({pendingRequests.length})
                    </h4>
                    <div className="space-y-2">
                      {pendingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between bg-white rounded p-3 border border-orange-200">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{request.prizeTitle}</div>
                            <div className="text-xs text-gray-500">
                              Solicitado: {new Date(request.requestDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-orange-600">
                              {request.prizePoints.toLocaleString()} pts
                            </div>
                            <div className="text-xs text-orange-500">En revisión</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lista de premios */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {rewards.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Gift className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                      <p>No hay premios disponibles para {userType.toLowerCase()}</p>
                    </div>
                  ) : (
                    rewards.map((reward) => {
                      const canAfford = availablePoints >= reward.points;
                      const redemptionCheck = canRedeemProduct(reward.id);
                      const canRedeem = canAfford && redemptionCheck.canRedeem;
                    
                    return (
                      <div 
                        key={reward.id}
                        className={`border rounded-lg p-4 ${canRedeem ? 'border-gray-200' : 'border-gray-100 bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            {/* Imagen del premio */}
                            {reward.image ? (
                              <img 
                                src={reward.image} 
                                alt={reward.title} 
                                className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Gift className="h-8 w-8 text-white" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <h4 className={`text-sm font-medium ${canRedeem ? 'text-gray-900' : 'text-gray-500'}`}>
                                {reward.title}
                              </h4>
                              <p className={`text-sm mt-1 ${canRedeem ? 'text-gray-600' : 'text-gray-400'}`}>
                                {reward.description}
                              </p>
                              <div className="flex items-center mt-2">
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                <span className={`text-sm font-medium ${canRedeem ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {reward.points.toLocaleString()} puntos
                                </span>
                              </div>
                              {!redemptionCheck.canRedeem && (
                                <div className="text-xs text-red-500 mt-1">
                                  Producto canjeado recientemente
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            {canRedeem ? (
                              <button
                                onClick={() => handleRedeem(reward)}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                              >
                                Canjear
                              </button>
                            ) : (
                              <div className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-400 bg-gray-100 cursor-not-allowed">
                                <Lock className="h-4 w-4 mr-1" />
                                No disponible
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })
                  )}
                </div>
              </>
            ) : (
              /* Historial de solicitudes */
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {allUserRequests.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No tienes solicitudes de premios</p>
                  </div>
                ) : (
                  allUserRequests
                    .sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime())
                    .map((request) => {
                      const statusInfo = getStatusInfo(request.status);
                      const StatusIcon = statusInfo.icon;
                      
                      return (
                        <div 
                          key={request.id}
                          className={`border rounded-lg p-4 ${statusInfo.borderColor} ${statusInfo.bgColor}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                              <div className={`w-16 h-16 ${statusInfo.bgColor} rounded-lg flex items-center justify-center flex-shrink-0 border ${statusInfo.borderColor}`}>
                                <Gift className={`h-8 w-8 ${statusInfo.color}`} />
                              </div>
                              
                              <div className="flex-1">
                                <h4 className="text-sm font-medium text-gray-900">
                                  {request.prizeTitle}
                                </h4>
                                <div className="flex items-center mt-1">
                                  <StatusIcon className={`h-4 w-4 ${statusInfo.color} mr-1`} />
                                  <span className={`text-sm font-medium ${statusInfo.color}`}>
                                    {statusInfo.text}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  Solicitado: {new Date(request.requestDate).toLocaleDateString()}
                                  {request.processedDate && (
                                    <span className="ml-2">
                                      • Procesado: {new Date(request.processedDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {request.processedBy && (
                                  <div className="text-xs text-gray-500">
                                    Procesado por: {request.processedBy}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="ml-4 text-right">
                              <div className={`text-sm font-medium ${statusInfo.color}`}>
                                {request.prizePoints.toLocaleString()} pts
                              </div>
                              <div className={`text-xs ${statusInfo.color}`}>
                                {request.status === 'pending' && 'Puntos reservados'}
                                {request.status === 'approved' && 'Puntos deducidos'}
                                {request.status === 'rejected' && 'Puntos liberados'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-200"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
