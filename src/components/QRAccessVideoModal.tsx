import React from 'react';
import { XCircle } from 'lucide-react';
import type { Guest } from '../types/event';

interface QRAccessVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  guest: Guest;
  videoUrl: string;
  autoCloseSeconds?: number;
}

export function QRAccessVideoModal({ 
  isOpen, 
  onClose, 
  guest,
  videoUrl,
  autoCloseSeconds = 0
}: QRAccessVideoModalProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [timeLeft, setTimeLeft] = React.useState(autoCloseSeconds);
  const [isVideoEnded, setIsVideoEnded] = React.useState(false);

  // Manejar el cierre automático después de que termine el video
  React.useEffect(() => {
    if (!isOpen || !isVideoEnded) return;
    
    if (autoCloseSeconds > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      // Si no hay autoCloseSeconds, cerrar inmediatamente al terminar el video
      onClose();
    }
  }, [isOpen, isVideoEnded, autoCloseSeconds, onClose]);

  // Reiniciar estado cuando se abre el modal
  React.useEffect(() => {
    if (isOpen) {
      setTimeLeft(autoCloseSeconds);
      setIsVideoEnded(false);
    }
  }, [isOpen, autoCloseSeconds]);

  // Reproducir video automáticamente cuando se abre el modal
  React.useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="relative transform overflow-hidden rounded-lg bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
          
          {/* Video Container */}
          <div className="aspect-video w-full rounded-lg overflow-hidden bg-black shadow-lg">
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              src={videoUrl}
              controls={false}
              autoPlay
              playsInline
              onEnded={() => setIsVideoEnded(true)}
            />
          </div>

          {/* Guest Info */}
          <div className="mt-4 text-center">
            <h3 className="text-2xl font-semibold text-green-800">
              {guest.name || `Invitado #${guest.guest_number}`}
            </h3>
            {guest.table_number && (
              <p className="mt-1 text-lg text-green-700">
                Mesa #{guest.table_number}
              </p>
            )}
          </div>

          {/* Auto-close message */}
          {isVideoEnded && autoCloseSeconds > 0 && (
            <p className="mt-2 text-sm text-center text-gray-500">
              Se cerrará automáticamente en {timeLeft} segundos
            </p>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-500"
          >
            <XCircle className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
} 