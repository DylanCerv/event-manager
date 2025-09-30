import React from 'react';
import { Heart, Crown, PartyPopper, Building, GraduationCap, Star, Sparkles, Gift, Flower, Circle } from 'lucide-react';

interface ThemeDecorationsProps {
  eventType?: 'wedding' | 'quinceanera' | 'birthday' | 'corporate' | 'conference';
  themeColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

interface SectionSeparatorProps {
  eventType?: 'wedding' | 'quinceanera' | 'birthday' | 'corporate' | 'conference';
  themeColors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export function SectionSeparator({ eventType = 'wedding', themeColors }: SectionSeparatorProps) {
  const renderSeparator = () => {
    switch (eventType) {
      case 'wedding':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center space-x-3">
              <div 
                className="h-px w-16 opacity-30"
                style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
              />
              <Heart className="w-4 h-4 opacity-40" style={{ color: themeColors.primary }} />
              <div 
                className="h-px w-16 opacity-30"
                style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
              />
            </div>
          </div>
        );
      
      case 'quinceanera':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center space-x-2">
              <Star className="w-3 h-3 opacity-30" style={{ color: themeColors.accent }} />
              <div 
                className="h-px w-12 opacity-40"
                style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
              />
              <Sparkles className="w-4 h-4 opacity-50" style={{ color: themeColors.primary }} />
              <div 
                className="h-px w-12 opacity-40"
                style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
              />
              <Star className="w-3 h-3 opacity-30" style={{ color: themeColors.accent }} />
            </div>
          </div>
        );
      
      case 'birthday':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center space-x-3">
              <div 
                className="w-2 h-2 rounded-full opacity-40"
                style={{ backgroundColor: themeColors.accent }}
              />
              <div 
                className="h-px w-20 opacity-30"
                style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
              />
              <Gift className="w-4 h-4 opacity-40" style={{ color: themeColors.primary }} />
              <div 
                className="h-px w-20 opacity-30"
                style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
              />
              <div 
                className="w-2 h-2 rounded-full opacity-40"
                style={{ backgroundColor: themeColors.accent }}
              />
            </div>
          </div>
        );
      
      case 'corporate':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center space-x-4">
              <div 
                className="w-1 h-1 bg-current opacity-40"
                style={{ color: themeColors.primary }}
              />
              <div 
                className="h-px w-24 opacity-30"
                style={{ backgroundColor: themeColors.primary }}
              />
              <div 
                className="w-2 h-2 bg-current opacity-50"
                style={{ color: themeColors.primary }}
              />
              <div 
                className="h-px w-24 opacity-30"
                style={{ backgroundColor: themeColors.primary }}
              />
              <div 
                className="w-1 h-1 bg-current opacity-40"
                style={{ color: themeColors.primary }}
              />
            </div>
          </div>
        );
      
      case 'conference':
        return (
          <div className="flex items-center justify-center py-2">
            <div className="flex items-center space-x-3">
              <div 
                className="h-px w-16 opacity-25"
                style={{ backgroundColor: themeColors.primary }}
              />
              <div className="flex space-x-1">
                <div 
                  className="w-1 h-1 rounded-full opacity-40"
                  style={{ backgroundColor: themeColors.accent }}
                />
                <div 
                  className="w-1 h-1 rounded-full opacity-40"
                  style={{ backgroundColor: themeColors.primary }}
                />
                <div 
                  className="w-1 h-1 rounded-full opacity-40"
                  style={{ backgroundColor: themeColors.accent }}
                />
              </div>
              <div 
                className="h-px w-16 opacity-25"
                style={{ backgroundColor: themeColors.primary }}
              />
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return renderSeparator();
}

export function ThemeDecorations({ eventType = 'wedding', themeColors }: ThemeDecorationsProps) {
  const renderWeddingDecorations = () => (
    <>
      {/* Flores en esquinas */}
      <div className="absolute top-2 left-2 opacity-20">
        <Flower className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute top-2 right-2 opacity-20">
        <Flower className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Corazones flotantes */}
      <div className="absolute top-4 left-1/4 opacity-30 animate-pulse">
        <Heart className="w-4 h-4" style={{ color: themeColors.accent }} />
      </div>
      <div className="absolute bottom-4 right-1/4 opacity-30 animate-pulse" style={{ animationDelay: '1s' }}>
        <Heart className="w-4 h-4" style={{ color: themeColors.accent }} />
      </div>
      
      {/* Anillos decorativos */}
      <div className="absolute bottom-2 left-2 opacity-25">
        <Circle className="w-6 h-6" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute bottom-2 right-2 opacity-25">
        <Circle className="w-6 h-6" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Líneas decorativas elegantes */}
      <div 
        className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-px opacity-30"
        style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
      />
      <div 
        className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-px opacity-30"
        style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}, transparent)` }}
      />
    </>
  );

  const renderQuinceaneraDecorations = () => (
    <>
      {/* Coronas en esquinas */}
      <div className="absolute top-2 left-2 opacity-30">
        <Crown className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute top-2 right-2 opacity-30">
        <Crown className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Estrellas mágicas parpadeando */}
      <div className="absolute top-1/4 left-8 opacity-40 animate-ping">
        <Star className="w-3 h-3" style={{ color: themeColors.accent }} />
      </div>
      <div className="absolute top-1/3 right-8 opacity-40 animate-ping" style={{ animationDelay: '0.5s' }}>
        <Star className="w-3 h-3" style={{ color: themeColors.accent }} />
      </div>
      <div className="absolute bottom-1/4 left-12 opacity-40 animate-ping" style={{ animationDelay: '1s' }}>
        <Star className="w-3 h-3" style={{ color: themeColors.accent }} />
      </div>
      <div className="absolute bottom-1/3 right-12 opacity-40 animate-ping" style={{ animationDelay: '1.5s' }}>
        <Star className="w-3 h-3" style={{ color: themeColors.accent }} />
      </div>
      
      {/* Brillos en movimiento */}
      <div className="absolute top-12 left-1/3 opacity-50 animate-pulse">
        <Sparkles className="w-5 h-5" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute bottom-12 right-1/3 opacity-50 animate-pulse" style={{ animationDelay: '2s' }}>
        <Sparkles className="w-5 h-5" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Marcos de cristal */}
      <div 
        className="absolute inset-2 border-2 border-dashed rounded-lg opacity-20 pointer-events-none"
        style={{ borderColor: themeColors.primary }}
      />
    </>
  );

  const renderBirthdayDecorations = () => (
    <>
      {/* Globos flotantes */}
      <div className="absolute top-4 left-4 opacity-40 animate-bounce">
        <div 
          className="w-6 h-8 rounded-full border-2"
          style={{ 
            backgroundColor: `${themeColors.accent}80`,
            borderColor: themeColors.primary 
          }}
        />
      </div>
      <div className="absolute top-4 right-4 opacity-40 animate-bounce" style={{ animationDelay: '0.5s' }}>
        <div 
          className="w-6 h-8 rounded-full border-2"
          style={{ 
            backgroundColor: `${themeColors.accent}80`,
            borderColor: themeColors.primary 
          }}
        />
      </div>
      
      {/* Confeti disperso */}
      <div className="absolute top-8 left-1/4 opacity-60">
        <PartyPopper className="w-4 h-4" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute top-16 right-1/4 opacity-60">
        <PartyPopper className="w-4 h-4" style={{ color: themeColors.accent }} />
      </div>
      <div className="absolute bottom-8 left-1/3 opacity-60">
        <PartyPopper className="w-4 h-4" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Regalos en esquinas */}
      <div className="absolute bottom-2 left-2 opacity-35">
        <Gift className="w-6 h-6" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute bottom-2 right-2 opacity-35">
        <Gift className="w-6 h-6" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Patrones festivos */}
      <div className="absolute top-0 left-0 w-full h-2 opacity-30">
        <div 
          className="h-full"
          style={{ 
            background: `repeating-linear-gradient(45deg, ${themeColors.primary}, ${themeColors.primary} 10px, transparent 10px, transparent 20px)`
          }}
        />
      </div>
    </>
  );

  const renderCorporateDecorations = () => (
    <>
      {/* Elementos geométricos en esquinas */}
      <div className="absolute top-2 left-2 opacity-20">
        <Building className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute top-2 right-2 opacity-20">
        <Building className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Líneas geométricas profesionales */}
      <div 
        className="absolute top-0 left-0 w-16 h-px opacity-40"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute top-0 right-0 w-16 h-px opacity-40"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute bottom-0 left-0 w-16 h-px opacity-40"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute bottom-0 right-0 w-16 h-px opacity-40"
        style={{ backgroundColor: themeColors.primary }}
      />
      
      {/* Formas geométricas sutiles */}
      <div 
        className="absolute top-4 left-1/4 w-2 h-2 opacity-30"
        style={{ backgroundColor: themeColors.accent }}
      />
      <div 
        className="absolute bottom-4 right-1/4 w-2 h-2 opacity-30"
        style={{ backgroundColor: themeColors.accent }}
      />
      
      {/* Marco minimalista */}
      <div 
        className="absolute inset-4 border-l-2 border-r-2 opacity-10 pointer-events-none"
        style={{ borderColor: themeColors.primary }}
      />
    </>
  );

  const renderConferenceDecorations = () => (
    <>
      {/* Elementos académicos */}
      <div className="absolute top-2 left-2 opacity-25">
        <GraduationCap className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      <div className="absolute top-2 right-2 opacity-25">
        <GraduationCap className="w-8 h-8" style={{ color: themeColors.primary }} />
      </div>
      
      {/* Líneas académicas sobrias */}
      <div 
        className="absolute top-1/4 left-0 w-8 h-px opacity-30"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute top-1/2 left-0 w-12 h-px opacity-30"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute top-3/4 left-0 w-8 h-px opacity-30"
        style={{ backgroundColor: themeColors.primary }}
      />
      
      <div 
        className="absolute top-1/4 right-0 w-8 h-px opacity-30"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute top-1/2 right-0 w-12 h-px opacity-30"
        style={{ backgroundColor: themeColors.primary }}
      />
      <div 
        className="absolute top-3/4 right-0 w-8 h-px opacity-30"
        style={{ backgroundColor: themeColors.primary }}
      />
      
      {/* Puntos de conocimiento */}
      <div 
        className="absolute bottom-4 left-1/4 w-1 h-1 rounded-full opacity-40"
        style={{ backgroundColor: themeColors.accent }}
      />
      <div 
        className="absolute bottom-6 left-1/3 w-1 h-1 rounded-full opacity-40"
        style={{ backgroundColor: themeColors.accent }}
      />
      <div 
        className="absolute bottom-4 right-1/4 w-1 h-1 rounded-full opacity-40"
        style={{ backgroundColor: themeColors.accent }}
      />
    </>
  );

  const renderDecorations = () => {
    switch (eventType) {
      case 'wedding':
        return renderWeddingDecorations();
      case 'quinceanera':
        return renderQuinceaneraDecorations();
      case 'birthday':
        return renderBirthdayDecorations();
      case 'corporate':
        return renderCorporateDecorations();
      case 'conference':
        return renderConferenceDecorations();
      default:
        return renderWeddingDecorations();
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {renderDecorations()}
    </div>
  );
} 