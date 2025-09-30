import React from 'react';
import { PartyPopper, Phone, Play } from 'lucide-react';
import type { EventFinalization } from '../types/event';
import { getTemplateById } from '../lib/event-templates';
import { ThemeDecorations } from './ThemeDecorations';

interface GuestFinalizationViewProps {
  finalization: EventFinalization;
}

export function GuestFinalizationView({ finalization }: GuestFinalizationViewProps) {
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Obtener tema y colores
  const eventType = finalization.event_type || 'wedding';
  const template = getTemplateById(eventType) || getTemplateById('wedding')!;
  const themeColors = finalization.theme_colors || template.colors;

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${themeColors.background}, ${themeColors.primary}20, ${themeColors.secondary}10)`
      }}
    >
      <div className="max-w-2xl w-full space-y-8 relative">
        {/* Decoraciones temáticas */}
        <ThemeDecorations eventType={eventType} themeColors={themeColors} />

        {/* Contenido principal */}
        <div 
          className="relative bg-white rounded-2xl shadow-xl p-8 border"
          style={{
            borderColor: `${themeColors.primary}30`,
            background: `linear-gradient(135deg, white, ${themeColors.background}10)`
          }}
        >
          <div 
            className="absolute inset-0 border-[16px] border-double rounded-2xl pointer-events-none"
            style={{ borderColor: `${themeColors.primary}20` }}
          />
          
          {/* Header */}
          <div className="flex justify-center mb-8">
            <PartyPopper 
              className="h-12 w-12 animate-bounce" 
              style={{ color: themeColors.primary }}
            />
          </div>

          {/* Mensaje */}
          <div className="text-center space-y-6 px-6">
            {/* Fondo decorativo sutil */}
            <div 
              className="absolute inset-0 rounded-2xl opacity-5 pointer-events-none"
              style={{ backgroundColor: themeColors.primary }}
            />
            
            <div className="relative">
              <div 
                className="space-y-4"
                style={{ 
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                  color: themeColors.text
                }}
              >
                {/* Título Principal */}
                {(() => {
                  // Usar título específico o dividir el mensaje para compatibilidad
                  const title = finalization.final_title;
                  if (title) {
                    return (
                      <h1 
                        className="text-4xl md:text-5xl font-bold leading-tight"
                        style={{ 
                          textShadow: `2px 2px 4px ${themeColors.primary}20`,
                          background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        {title}
                      </h1>
                    );
                  }
                  
                  // Fallback: usar primera frase del mensaje original
                  const parts = finalization.final_message.split(/[.!]/).filter(part => part.trim());
                  const firstPart = parts[0]?.trim();
                  if (firstPart) {
                    return (
                      <h1 
                        className="text-4xl md:text-5xl font-bold leading-tight"
                        style={{ 
                          textShadow: `2px 2px 4px ${themeColors.primary}20`,
                          background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        {firstPart}!
                      </h1>
                    );
                  }
                })()}
                
                {/* Subtítulo */}
                {(() => {
                  // Usar subtítulo específico o dividir el mensaje para compatibilidad
                  const subtitle = finalization.final_subtitle;
                  if (subtitle) {
                    return (
                      <p 
                        className="text-xl md:text-2xl font-light italic leading-relaxed opacity-90"
                        style={{ 
                          textShadow: `1px 1px 2px ${themeColors.primary}10`,
                          color: themeColors.text
                        }}
                      >
                        {subtitle}
                      </p>
                    );
                  }
                  
                  // Fallback: usar resto del mensaje original
                  const parts = finalization.final_message.split(/[.!]/).filter(part => part.trim());
                  if (parts.length > 1) {
                    const remainingParts = parts.slice(1).join('. ').trim();
                    if (remainingParts) {
                      return (
                        <p 
                          className="text-xl md:text-2xl font-light italic leading-relaxed opacity-90"
                          style={{ 
                            textShadow: `1px 1px 2px ${themeColors.primary}10`,
                            color: themeColors.text
                          }}
                        >
                          {remainingParts}
                        </p>
                      );
                    }
                  }
                })()}
                
                {/* Elemento decorativo final */}
                <div className="flex justify-center items-center space-x-3 mt-6">
                  <div 
                    className="w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: `${themeColors.accent}60` }}
                  />
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: themeColors.accent }}
                  />
                  <div 
                    className="w-6 h-0.5 rounded-full"
                    style={{ backgroundColor: `${themeColors.accent}60` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Video Section */}
          {finalization.video_url && (
            <div className="mt-12 space-y-6">
              {finalization.video_message && (
                <p 
                  className="text-xl text-center font-serif italic"
                  style={{ color: themeColors.text }}
                >
                  {finalization.video_message}
                </p>
              )}
              
              <div 
                className="relative rounded-2xl overflow-hidden shadow-2xl border-4"
                style={{ borderColor: themeColors.primary }}
              >
                {!isPlaying && (
                  <div 
                    className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer group"
                    onClick={() => setIsPlaying(true)}
                  >
                    <div 
                      className="p-6 rounded-full transform group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: `${themeColors.primary}90` }}
                    >
                      <Play className="h-12 w-12 text-white" />
                    </div>
                  </div>
                )}
                <video
                  src={finalization.video_url}
                  className="w-full rounded-2xl"
                  controls={isPlaying}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
              </div>

              {finalization.whatsapp_number && (
                <div className="flex flex-col items-center space-y-3 mt-8">
                  <p 
                    className="text-sm"
                    style={{ color: themeColors.text }}
                  >
                    {finalization.whatsapp_button_text || '¿Te gustaría obtener las fotos del evento? 📸'}
                  </p>
                  <a
                    href={`https://wa.me/${finalization.whatsapp_number}?text=Hola, me gustaría obtener las imágenes del evento.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-8 py-3 border-2 text-base font-medium rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
                    style={{
                      borderColor: themeColors.primary,
                      color: themeColors.primary,
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = themeColors.primary;
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = themeColors.primary;
                    }}
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {finalization.whatsapp_button_text || 'Contactar por WhatsApp'}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}