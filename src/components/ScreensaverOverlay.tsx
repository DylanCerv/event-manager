import React from 'react';
import { createPortal } from 'react-dom';

interface ScreensaverOverlayProps {
  isActive: boolean; // Si el método es manual
  lastActivity: number; // Timestamp de última actividad
  hasOpenModals: boolean; // Si hay modales abiertos
  onWakeUp: () => void; // Callback para despertar
}

export function ScreensaverOverlay({ 
  isActive, 
  lastActivity, 
  hasOpenModals, 
  onWakeUp 
}: ScreensaverOverlayProps) {
  const [showScreensaver, setShowScreensaver] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  // Reloj en tiempo real
  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Verificar si debe mostrar screensaver
  React.useEffect(() => {
    if (!isActive) {
      setShowScreensaver(false);
      return;
    }

    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      
      // Mostrar screensaver si:
      // 1. Han pasado 5 segundos de inactividad
      // 2. NO hay modales abiertos
      const shouldShow = timeSinceActivity >= 5000 && !hasOpenModals;
      setShowScreensaver(shouldShow);
    };

    const interval = setInterval(checkInactivity, 1000);
    return () => clearInterval(interval);
  }, [isActive, lastActivity, hasOpenModals]);

  // Detectar actividad para despertar screensaver
  React.useEffect(() => {
    if (!showScreensaver) return;

    const handleWakeUp = () => {
      setShowScreensaver(false);
      onWakeUp();
    };

    // Eventos que despiertan el screensaver
    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'wheel', 'scroll'];
    
    events.forEach(event => {
      document.addEventListener(event, handleWakeUp, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleWakeUp);
      });
    };
  }, [showScreensaver, onWakeUp]);

  // No renderizar si no debe mostrar screensaver
  if (!showScreensaver) return null;

  const handleClickWakeUp = () => {
    setShowScreensaver(false);
    onWakeUp();
  };

  // Renderizar en portal para evitar interferencias
  return createPortal(
    <div 
      className="fixed inset-0 z-40 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center cursor-pointer"
      onClick={handleClickWakeUp}
    >
      {/* Fondo animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-800/30 via-purple-800/30 to-pink-800/30 animate-pulse"></div>
      
      {/* Contenido principal */}
      <div className="text-center text-white">
        <h1 
          className="text-7xl md:text-9xl font-extralight mb-4 tracking-wider"
          style={{
            textShadow: '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)'
          }}
        >
          Bienvenidos
        </h1>
        <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto animate-pulse"></div>
      </div>
      
      {/* Hora en la parte inferior */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="text-2xl text-white/80 font-mono tracking-wider flex items-center justify-center">
          <span>{currentTime.getHours().toString().padStart(2, '0')}</span>
          <span className="animate-pulse mx-1">:</span>
          <span>{currentTime.getMinutes().toString().padStart(2, '0')}</span>
          <span className="animate-pulse mx-1">:</span>
          <span>{currentTime.getSeconds().toString().padStart(2, '0')}</span>
        </div>
      </div>
      
      {/* Indicador de interacción */}
      <div className="absolute bottom-4 right-6 text-white/40 text-sm animate-pulse">
        Toca la pantalla para continuar
      </div>
    </div>,
    document.body
  );
}
