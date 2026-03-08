import React from 'react';

interface ThemeStylesProps {
  eventType?: 'wedding' | 'quinceanera' | 'birthday' | 'corporate' | 'conference';
  themeColors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  children: React.ReactNode;
  /** Una sola fuente para toda la tarjeta (ej. invitación) */
  singleFont?: boolean;
}

const SINGLE_FONT = { fontFamily: '"Playfair Display", "Times New Roman", serif'};

export function ThemeStyles({ eventType = 'wedding', themeColors, children, singleFont }: ThemeStylesProps) {
  const getContainerStyles = () => {
    const baseStyles = {
      background: `linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.secondary} 20%, ${themeColors.accent} 40%, ${themeColors.background} 100%)`
    };

    switch (eventType) {
      case 'wedding':
        return {
          ...baseStyles,
          borderRadius: '24px',
          border: `4px solid ${themeColors.primary}20`,
          boxShadow: `0 25px 50px -12px ${themeColors.primary}40, inset 0 0 50px ${themeColors.accent}30`,
          background: `
            radial-gradient(circle at 20% 20%, ${themeColors.accent}40 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${themeColors.secondary}60 0%, transparent 50%),
            linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.secondary} 100%)
          `
        };
      
      case 'quinceanera':
        return {
          ...baseStyles,
          borderRadius: '20px',
          border: `6px double ${themeColors.primary}`,
          boxShadow: `
            0 0 30px ${themeColors.primary}60,
            inset 0 0 30px ${themeColors.accent}40,
            0 0 60px ${themeColors.primary}30
          `,
          background: `
            conic-gradient(from 0deg at 50% 50%, ${themeColors.primary}20, ${themeColors.accent}40, ${themeColors.secondary}60, ${themeColors.primary}20),
            linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.secondary} 100%)
          `
        };
      
      case 'birthday':
        return {
          ...baseStyles,
          borderRadius: '16px',
          border: `3px solid ${themeColors.primary}60`,
          boxShadow: `0 15px 30px -8px ${themeColors.primary}40, 0 0 0 5px ${themeColors.accent}20`,
          background: `
            radial-gradient(circle at 70% 30%, ${themeColors.accent}20 0%, transparent 40%),
            radial-gradient(circle at 30% 70%, ${themeColors.primary}15 0%, transparent 40%),
            linear-gradient(135deg, ${themeColors.background} 0%, ${themeColors.secondary} 100%)
          `
        };
      
      case 'corporate':
        return {
          ...baseStyles,
          borderRadius: '8px',
          border: `2px solid ${themeColors.primary}`,
          boxShadow: `0 10px 25px -5px ${themeColors.primary}30, inset 0 1px 0 ${themeColors.background}`,
          background: `
            linear-gradient(90deg, ${themeColors.secondary}50 1px, transparent 1px),
            linear-gradient(180deg, ${themeColors.secondary}50 1px, transparent 1px),
            linear-gradient(180deg, ${themeColors.background} 0%, ${themeColors.secondary} 100%)
          `,
          backgroundSize: '20px 20px, 20px 20px, 100% 100%'
        };
      
      case 'conference':
        return {
          ...baseStyles,
          borderRadius: '12px',
          border: `3px solid ${themeColors.primary}`,
          boxShadow: `0 8px 20px -5px ${themeColors.primary}40, inset 0 2px 4px ${themeColors.secondary}`,
          background: `
            linear-gradient(45deg, ${themeColors.secondary}20 25%, transparent 25%),
            linear-gradient(-45deg, ${themeColors.secondary}20 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, ${themeColors.accent}20 75%),
            linear-gradient(-45deg, transparent 75%, ${themeColors.accent}20 75%),
            linear-gradient(180deg, ${themeColors.background} 0%, ${themeColors.secondary} 100%)
          `,
          backgroundSize: '20px 20px, 20px 20px, 20px 20px, 20px 20px, 100% 100%'
        };
      
      default:
        return baseStyles;
    }
  };

  const getTextStyles = () => {
    if (singleFont) return SINGLE_FONT;
    switch (eventType) {
      case 'wedding':
        return {
          fontFamily: '"Playfair Display", "Times New Roman", serif',
          fontWeight: '400',
          letterSpacing: '0.5px'
        };
      
      case 'quinceanera':
        return {
          fontFamily: '"Dancing Script", "Brush Script MT", cursive',
          fontWeight: '600',
          letterSpacing: '1px'
        };
      
      case 'birthday':
        return {
          fontFamily: '"Comic Neue", "Comic Sans MS", cursive',
          fontWeight: '700',
          letterSpacing: '0.5px'
        };
      
      case 'corporate':
        return {
          fontFamily: '"Inter", "Helvetica Neue", sans-serif',
          fontWeight: '500',
          letterSpacing: '0px'
        };
      
      case 'conference':
        return {
          fontFamily: '"Roboto", "Arial", sans-serif',
          fontWeight: '400',
          letterSpacing: '0.25px'
        };
      
      default:
        return {
          fontFamily: '"Playfair Display", serif',
          fontWeight: '400'
        };
    }
  };

  const getTitleStyles = () => {
    const baseTextStyles = getTextStyles();
    if (singleFont) return { ...SINGLE_FONT, fontSize: '2.25rem', mobileFontSize: '1.75rem', smallMobileFontSize: '1.5rem', extraSmallMobileFontSize: '1.35rem' };
    switch (eventType) {
      case 'wedding':
        return {
          ...baseTextStyles,
          fontSize: '3.5rem',
          mobileFontSize: '2.5rem',
          smallMobileFontSize: '2rem',
          extraSmallMobileFontSize: '1.8rem',
          fontWeight: '300',
          fontStyle: 'italic',
          textShadow: `2px 2px 4px ${themeColors.primary}40`
        };
      
      case 'quinceanera':
        return {
          ...baseTextStyles,
          fontSize: '4rem',
          mobileFontSize: '2.8rem',
          smallMobileFontSize: '2.2rem',
          extraSmallMobileFontSize: '2rem',
          fontWeight: '700',
          textShadow: `0 0 20px ${themeColors.primary}80, 2px 2px 4px ${themeColors.primary}60`
        };
      
      case 'birthday':
        return {
          ...baseTextStyles,
          fontSize: '3.5rem',
          mobileFontSize: '2.5rem',
          smallMobileFontSize: '2rem',
          extraSmallMobileFontSize: '1.8rem',
          fontWeight: '900',
          transform: 'rotate(-2deg)',
          textShadow: `3px 3px 0px ${themeColors.primary}, 6px 6px 10px ${themeColors.primary}40`
        };
      
      case 'corporate':
        return {
          ...baseTextStyles,
          fontSize: '3rem',
          mobileFontSize: '2.2rem',
          smallMobileFontSize: '1.8rem',
          extraSmallMobileFontSize: '1.6rem',
          fontWeight: '600',
          textTransform: 'uppercase' as const,
          textShadow: `1px 1px 2px ${themeColors.primary}30`
        };
      
      case 'conference':
        return {
          ...baseTextStyles,
          fontSize: '2.8rem',
          mobileFontSize: '2rem',
          smallMobileFontSize: '1.7rem',
          extraSmallMobileFontSize: '1.5rem',
          fontWeight: '500',
          textShadow: `1px 1px 3px ${themeColors.primary}40`
        };
      
      default:
        return {
          ...baseTextStyles,
          fontSize: '3.5rem',
          mobileFontSize: '2.5rem',
          smallMobileFontSize: '2rem',
          extraSmallMobileFontSize: '1.8rem'
        };
    }
  };

  return (
    <div style={{ ...getContainerStyles(), ...getTextStyles() }}>
      <style>
        {`
          .theme-title {
            font-family: ${getTitleStyles().fontFamily};
            font-size: ${getTitleStyles().fontSize};
            font-weight: ${getTitleStyles().fontWeight};
            font-style: ${(getTitleStyles() as any).fontStyle || 'normal'};
            text-transform: ${(getTitleStyles() as any).textTransform || 'none'};
            text-shadow: ${(getTitleStyles() as any).textShadow};
            transform: ${(getTitleStyles() as any).transform || 'none'};
            word-break: break-word;
            hyphens: none;
            line-height: 1.2;
            text-align: center;
            max-width: 100%;
            overflow-wrap: anywhere;
            white-space: normal;
            overflow: visible;
            text-overflow: clip;
          }
          
          /* Auto-resize for long titles */
          .theme-title.long-title {
            font-size: calc(${getTitleStyles().fontSize} * 0.8);
            white-space: normal;
            word-spacing: 0.1em;
          }
          
          .theme-title.very-long-title {
            font-size: calc(${getTitleStyles().fontSize} * 0.6);
            white-space: normal;
            word-spacing: 0.1em;
          }
          
          /* Responsive font sizes for mobile */
          @media (max-width: 640px) {
            .theme-title {
              font-size: ${(getTitleStyles() as any).mobileFontSize || '2.5rem'};
              line-height: 1.2;
              padding: 0 1rem;
              white-space: normal;
            }
            
            .theme-title.long-title {
              font-size: calc(${(getTitleStyles() as any).mobileFontSize || '2.5rem'} * 0.8);
            }
            
            .theme-title.very-long-title {
              font-size: calc(${(getTitleStyles() as any).mobileFontSize || '2.5rem'} * 0.6);
            }
          }
          
          @media (max-width: 480px) {
            .theme-title {
              font-size: ${(getTitleStyles() as any).smallMobileFontSize || '2rem'};
              line-height: 1.3;
              padding: 0 0.5rem;
              white-space: normal;
            }
            
            .theme-title.long-title {
              font-size: calc(${(getTitleStyles() as any).smallMobileFontSize || '2rem'} * 0.8);
            }
            
            .theme-title.very-long-title {
              font-size: calc(${(getTitleStyles() as any).smallMobileFontSize || '2rem'} * 0.6);
            }
          }
          
          @media (max-width: 360px) {
            .theme-title {
              font-size: ${(getTitleStyles() as any).extraSmallMobileFontSize || '1.8rem'};
              line-height: 1.4;
              padding: 0 0.25rem;
              white-space: normal;
            }
            
            .theme-title.long-title {
              font-size: calc(${(getTitleStyles() as any).extraSmallMobileFontSize || '1.8rem'} * 0.8);
            }
            
            .theme-title.very-long-title {
              font-size: calc(${(getTitleStyles() as any).extraSmallMobileFontSize || '1.8rem'} * 0.6);
            }
          }
          
          .theme-text {
            font-family: ${getTextStyles().fontFamily};
            font-weight: ${getTextStyles().fontWeight};
            letter-spacing: ${(getTextStyles() as { letterSpacing?: string }).letterSpacing ?? '0'};
          }
        `}
      </style>
      {children}
    </div>
  );
} 