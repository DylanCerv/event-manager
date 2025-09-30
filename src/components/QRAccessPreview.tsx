import React from 'react';
import { QrCode, MapPin, Check, X, AlertTriangle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { Guest } from '../types/event';

interface QRAccessPreviewProps {
  message: string;
  guest: Guest;
  isRejected?: boolean;
  isPreActivation?: boolean;
}

export function QRAccessPreview({ message, guest, isRejected, isPreActivation }: QRAccessPreviewProps) {
  // Procesar el mensaje según el tipo
  const processMessage = (msg: string) => {
    return msg
      .replace('{name}', guest.name || 'Invitado')
      .replace('{table}', guest.table_number?.toString() || '--');
  };

  const getIcon = () => {
    if (isPreActivation) return <Clock className="w-12 h-12" />;
    if (isRejected) return <XCircle className="w-12 h-12" />;
    return <CheckCircle className="w-12 h-12" />;
  };

  return (
    <div className={`bg-gradient-to-br ${
      isPreActivation
        ? 'from-amber-50 via-orange-50 to-yellow-50 border-amber-200'
        : isRejected 
        ? 'from-red-50 via-pink-50 to-rose-50 border-red-200'
        : 'from-green-50 via-emerald-50 to-teal-50 border-green-200'
    } rounded-xl p-4 border shadow-lg max-w-sm mx-auto`}>
      <div className="text-center space-y-3">
        {/* Icono con fondo animado */}
        <div className="relative flex justify-center">
          <div className="absolute inset-0 rounded-full bg-white/30 animate-pulse w-14 h-14 mx-auto" />
          <div className={`relative z-10 p-2 ${
            isPreActivation
              ? 'text-amber-500'
              : isRejected
              ? 'text-red-500'
              : 'text-green-500'
          }`}>
            {getIcon()}
          </div>
        </div>

        {/* Título */}
        <h1 className={`text-2xl font-bold tracking-tight leading-tight ${
          isPreActivation
            ? 'text-amber-800'
            : isRejected
            ? 'text-red-800'
            : 'text-green-800'
        }`}>
          {isPreActivation 
            ? 'Acceso Pendiente'
            : isRejected 
            ? 'Acceso Denegado'
            : '¡Bienvenido/a!'}
        </h1>

        {/* Información del invitado (solo para mensajes de bienvenida) */}
        {!isRejected && !isPreActivation && (
          <div className="text-green-700 text-base font-medium space-y-1">
            <p className="text-xl font-semibold">
              {guest.name || `Invitado #${guest.guest_number}`}
            </p>
            {guest.table_number && (
              <p className="flex items-center justify-center space-x-1">
                <span>📍</span>
                <span>Mesa #{guest.table_number}</span>
              </p>
            )}
          </div>
        )}

        {/* Mensaje principal - solo mostrar si hay un mensaje personalizado */}
        {((isPreActivation || isRejected) || (!isRejected && !isPreActivation && message.trim() !== '')) && (
          <div className={`max-w-3xl mx-auto ${
            isPreActivation
              ? 'text-amber-700'
              : isRejected
              ? 'text-red-700'
              : 'text-green-700'
          } text-lg leading-relaxed font-medium px-2`}>
            <p>
              {isPreActivation 
                ? 'El acceso aún no está disponible para este evento.'
                : processMessage(message)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}