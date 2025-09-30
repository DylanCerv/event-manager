import * as React from 'react';
import { Clock, Settings, Gift, X } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  transactions: any[];
}

export function HistoryModal({ isOpen, onClose, user, transactions }: HistoryModalProps) {
  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Clock className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Historial de Transacciones</h3>
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
              <p className="text-xs text-gray-500">
                {user.userType === 'admin' ? 'Administrador' : 'Creador'}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de transacciones */}
        <div className="max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sin historial</h3>
              <p className="mt-1 text-sm text-gray-500">
                No hay transacciones registradas para este usuario.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {transaction.type === 'points_adjustment' ? (
                        <Settings className={`h-5 w-5 mr-3 ${
                          transaction.action === 'add' ? 'text-green-600' : 'text-red-600'
                        }`} />
                      ) : transaction.type === 'earned' ? (
                        <Settings className="h-5 w-5 mr-3 text-green-600" />
                      ) : (
                        <Gift className="h-5 w-5 mr-3 text-purple-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.type === 'points_adjustment' 
                            ? `${transaction.action === 'add' ? 'Puntos agregados' : 'Puntos descontados'}`
                            : transaction.type === 'earned'
                            ? 'Puntos agregados'
                            : `Premio otorgado: ${transaction.prizeName || 'Premio desconocido'}`
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.timestamp || transaction.date).toLocaleString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${
                        transaction.type === 'points_adjustment'
                          ? transaction.action === 'add' ? 'text-green-600' : 'text-red-600'
                          : transaction.type === 'earned'
                          ? 'text-green-600'
                          : 'text-purple-600'
                      }`}>
                        {transaction.type === 'points_adjustment'
                          ? `${transaction.action === 'add' ? '+' : '-'}${transaction.points} pts`
                          : transaction.type === 'earned'
                          ? `+${transaction.points} pts`
                          : transaction.type === 'deduction'
                          ? `-${transaction.amount} pts`
                          : transaction.type === 'refund'
                          ? `+${transaction.amount} pts`
                          : `-${transaction.prizeCost || transaction.amount} pts`
                        }
                      </p>
                    </div>
                  </div>
                  {transaction.reason && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      <strong>Razón:</strong> {transaction.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón cerrar */}
        <div className="flex justify-end pt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
