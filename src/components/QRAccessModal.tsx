import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react';
import type { Guest, GuestAccessSettings } from '../types/event';

interface QRAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageType: 'pre-activation' | 'welcome' | 'rejection';
  guest?: Guest;
  accessSettings?: GuestAccessSettings | null;
  autoCloseSeconds?: number;
}

export function QRAccessModal({ 
  isOpen, 
  onClose, 
  messageType, 
  guest, 
  accessSettings,
  autoCloseSeconds = 5 
}: QRAccessModalProps) {
  const [countdown, setCountdown] = React.useState(autoCloseSeconds);

  // Auto-close countdown
  React.useEffect(() => {
    if (!isOpen) return;

    setCountdown(autoCloseSeconds);
    
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, onClose, autoCloseSeconds]);

  // Handle escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent scroll when modal is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getMessage = (): string => {
    switch (messageType) {
      case 'pre-activation':
        return 'El acceso aún no está disponible para este evento.';
      
      case 'welcome':
        if (!accessSettings?.welcome_message || !guest) {
          return ''; // Si no hay mensaje personalizado, no mostrar nada adicional
        }
        return accessSettings.welcome_message
          .replace('{name}', guest.name || 'Invitado')
          .replace('{table}', guest.table_number?.toString() || '--');
      
      case 'rejection':
        const rejectionMsg = accessSettings?.rejection_message || 
          'Lo sentimos, pero tu acceso no está autorizado para este evento. Si crees que esto es un error, por favor contacta al organizador.';
        return rejectionMsg.replace('{name}', guest?.name || 'Invitado');
      
      default:
        return 'Mensaje no disponible';
    }
  };

  const getModalConfig = () => {
    switch (messageType) {
      case 'pre-activation':
        return {
          icon: <Clock className="w-16 h-16 md:w-20 md:h-20" />,
          iconColor: 'text-amber-500',
          bgGradient: 'from-amber-50 via-orange-50 to-yellow-50',
          borderColor: 'border-amber-200',
          titleColor: 'text-amber-800',
          textColor: 'text-amber-700',
          title: 'Acceso Pendiente'
        };
      
      case 'welcome':
        return {
          icon: <CheckCircle className="w-16 h-16 md:w-20 md:h-20" />,
          iconColor: 'text-green-500',
          bgGradient: 'from-green-50 via-emerald-50 to-teal-50',
          borderColor: 'border-green-200',
          titleColor: 'text-green-800',
          textColor: 'text-green-700',
          title: '¡Bienvenido/a!'
        };
      
      case 'rejection':
        return {
          icon: <XCircle className="w-16 h-16 md:w-20 md:h-20" />,
          iconColor: 'text-red-500',
          bgGradient: 'from-red-50 via-pink-50 to-rose-50',
          borderColor: 'border-red-200',
          titleColor: 'text-red-800',
          textColor: 'text-red-700',
          title: 'Acceso Denegado'
        };
    }
  };

  const config = getModalConfig();
  const message = getMessage();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`
        relative max-w-4xl mx-4 w-full max-h-[90vh] 
        bg-gradient-to-br ${config.bgGradient}
        border-2 ${config.borderColor}
        rounded-3xl shadow-2xl
        transform transition-all duration-500 ease-out
        animate-in zoom-in-95 slide-in-from-bottom-5
        p-8 md:p-12 lg:p-16
      `}>
        
        {/* Close button - subtle */}
        <button
          onClick={onClose}
          className={`
            absolute top-4 right-4 md:top-6 md:right-6
            w-10 h-10 rounded-full 
            bg-white/20 hover:bg-white/30 
            flex items-center justify-center
            transition-colors duration-200
            ${config.textColor}
          `}
        >
          <XCircle className="w-5 h-5" />
        </button>

        {/* Countdown indicator */}
        <div className={`
          absolute top-4 left-4 md:top-6 md:left-6
          px-3 py-1 rounded-full
          bg-white/30 backdrop-blur-sm
          ${config.textColor}
          text-sm font-medium
        `}>
          {countdown}s
        </div>

        {/* Content */}
        <div className="text-center space-y-6 md:space-y-8">
          {/* Icon with animated background */}
          <div className="relative flex justify-center">
            <div className={`
              absolute inset-0 rounded-full
              bg-white/30 
              animate-pulse
              w-20 h-20 md:w-28 md:h-28 mx-auto
            `} />
            <div className={`
              relative z-10 p-4 md:p-6
              ${config.iconColor}
            `}>
              {config.icon}
            </div>
          </div>

          {/* Title */}
          <h1 className={`
            text-3xl md:text-4xl lg:text-5xl xl:text-6xl 
            font-bold ${config.titleColor}
            tracking-tight leading-tight
          `}>
            {config.title}
          </h1>

          {/* Guest info for welcome messages */}
          {messageType === 'welcome' && guest && (
            <div className={`
              ${config.textColor} 
              text-lg md:text-xl lg:text-2xl
              font-medium space-y-2
            `}>
              <p className="text-2xl md:text-3xl lg:text-4xl font-semibold">
                {guest.name || `Invitado #${guest.guest_number}`}
              </p>
              {guest.table_number && (
                <p className="flex items-center justify-center space-x-2">
                  <span>📍</span>
                  <span>Mesa #{guest.table_number}</span>
                </p>
              )}
            </div>
          )}

          {/* Main message */}
          <div className={`
            max-w-3xl mx-auto
            ${config.textColor}
            text-xl md:text-2xl lg:text-3xl xl:text-4xl
            leading-relaxed font-medium
            px-4
          `}>
            {message && <p>{message}</p>}
          </div>



          {/* Progress bar */}
          <div className="max-w-md mx-auto">
            <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
              <div 
                className={`
                  h-full ${
                    messageType === 'welcome' ? 'bg-green-500' :
                    messageType === 'pre-activation' ? 'bg-amber-500' :
                    'bg-red-500'
                  }
                  transition-all duration-1000 ease-linear
                `}
                style={{
                  width: `${((autoCloseSeconds - countdown) / autoCloseSeconds) * 100}%`
                }}
              />
            </div>
            <p className={`
              text-sm ${config.textColor} mt-2 opacity-75
            `}>
              Se cerrará automáticamente en {countdown} segundo{countdown !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 