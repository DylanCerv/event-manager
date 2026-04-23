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

const SINGLE_FONT = {
  fontFamily: '"Poppins", "Lato", "Helvetica Neue", sans-serif',
  fontWeight: '500',
  letterSpacing: '0.01em',
};

export function ThemeStyles({ eventType = 'wedding', themeColors, children, singleFont }: ThemeStylesProps) {
  const themeVariables = {
    '--theme-primary': themeColors.primary,
    '--theme-secondary': themeColors.secondary,
    '--theme-accent': themeColors.accent,
    '--theme-background': themeColors.background,
    '--theme-text': themeColors.text,
  } as React.CSSProperties;

  const shellStyles: React.CSSProperties = {
    minHeight: '100vh',
    color: themeColors.text,
    colorScheme: 'light',
    background: `
      radial-gradient(circle at top left, ${themeColors.primary}22 0%, transparent 35%),
      radial-gradient(circle at top right, ${themeColors.accent}1c 0%, transparent 30%),
      radial-gradient(circle at bottom center, ${themeColors.secondary}22 0%, transparent 42%),
      linear-gradient(180deg, #ffffff 0%, ${themeColors.background} 45%, #f8fafc 100%)
    `,
  };

  const getContainerStyles = () => {
    const baseStyles = {
      background: `linear-gradient(160deg, ${themeColors.background} 0%, #ffffff 100%)`,
      position: 'relative' as const,
      overflow: 'hidden' as const,
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
          fontFamily: '"Poppins", "Lato", "Helvetica Neue", sans-serif',
          fontWeight: '500',
          letterSpacing: '0.02em'
        };
      
      case 'birthday':
        return {
          fontFamily: '"Poppins", "Lato", "Helvetica Neue", sans-serif',
          fontWeight: '500',
          letterSpacing: '0.01em'
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
    if (singleFont) {
      return {
        fontFamily: '"Playfair Display", "Times New Roman", serif',
        fontWeight: '400',
        fontSize: '2.25rem',
        mobileFontSize: '1.75rem',
        smallMobileFontSize: '1.5rem',
        extraSmallMobileFontSize: '1.35rem',
      };
    }
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
          fontFamily: '"Playfair Display", "Times New Roman", serif',
          fontSize: '4rem',
          mobileFontSize: '2.8rem',
          smallMobileFontSize: '2.2rem',
          extraSmallMobileFontSize: '2rem',
          fontWeight: '600',
          textShadow: `0 8px 24px ${themeColors.primary}25`
        };
      
      case 'birthday':
        return {
          fontFamily: '"Playfair Display", "Times New Roman", serif',
          fontSize: '3.5rem',
          mobileFontSize: '2.5rem',
          smallMobileFontSize: '2rem',
          extraSmallMobileFontSize: '1.8rem',
          fontWeight: '600',
          textShadow: `0 8px 24px ${themeColors.primary}22`
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
          fontFamily: '"Playfair Display", "Times New Roman", serif',
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
    <div className="theme-shell relative overflow-hidden px-3 py-4 sm:px-6 sm:py-8" style={shellStyles}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-20 left-[-5rem] h-52 w-52 rounded-full blur-3xl"
          style={{ background: `${themeColors.primary}22` }}
        />
        <div
          className="absolute right-[-4rem] top-1/4 h-56 w-56 rounded-full blur-3xl"
          style={{ background: `${themeColors.accent}1f` }}
        />
        <div
          className="absolute bottom-[-6rem] left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: `${themeColors.secondary}2a` }}
        />
      </div>

      <div className="relative z-10" style={{ ...themeVariables, ...getContainerStyles(), ...getTextStyles(), color: themeColors.text, colorScheme: 'light' }}>
      <style>
        {`
          .theme-shell,
          .theme-shell * {
            color-scheme: light;
          }

          .theme-shell {
            color: ${themeColors.text};
          }

          .theme-shell input,
          .theme-shell textarea,
          .theme-shell select,
          .theme-shell button {
            color-scheme: light;
            font-family: "Poppins", "Lato", "Helvetica Neue", sans-serif;
          }

          .invitation-frame {
            position: relative;
            overflow: hidden;
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.75);
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.72) 100%);
            box-shadow:
              0 30px 80px -40px rgba(15, 23, 42, 0.55),
              0 18px 36px -24px ${themeColors.primary}55;
            backdrop-filter: blur(18px) saturate(140%);
            -webkit-backdrop-filter: blur(18px) saturate(140%);
            isolation: isolate;
          }

          .invitation-frame::before {
            content: '';
            position: absolute;
            inset: 0;
            pointer-events: none;
            background:
              linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 35%),
              radial-gradient(circle at top right, ${themeColors.accent}24 0%, transparent 30%),
              radial-gradient(circle at bottom left, ${themeColors.primary}18 0%, transparent 36%);
            z-index: 0;
          }

          .invitation-frame > * {
            position: relative;
            z-index: 1;
          }

          .invitation-panel {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.82) 0%, rgba(255, 255, 255, 0.68) 100%);
            border: 1px solid rgba(255, 255, 255, 0.72);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.6),
              0 20px 45px -32px rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: ${themeColors.text};
          }

          .invitation-soft-panel {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.72) 0%, rgba(255, 255, 255, 0.58) 100%);
            border: 1px solid rgba(255, 255, 255, 0.68);
            box-shadow:
              inset 0 1px 0 rgba(255, 255, 255, 0.52),
              0 18px 36px -30px rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            color: ${themeColors.text};
          }

          .invitation-kicker {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.55rem 0.95rem;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.72);
            border: 1px solid rgba(255, 255, 255, 0.78);
            box-shadow: 0 10px 24px -18px rgba(15, 23, 42, 0.45);
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-size: 0.72rem;
          }

          .invitation-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            border-radius: 9999px;
            padding: 0.7rem 1.15rem;
            border: 1px solid ${themeColors.primary}25;
            background: linear-gradient(180deg, ${themeColors.primary}18 0%, rgba(255, 255, 255, 0.78) 100%);
            box-shadow: 0 12px 28px -18px ${themeColors.primary}45;
          }

          .invitation-detail-card {
            background: rgba(255, 255, 255, 0.68);
            border: 1px solid rgba(255, 255, 255, 0.78);
            box-shadow: 0 16px 32px -28px rgba(15, 23, 42, 0.4);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            transition:
              transform 220ms ease,
              box-shadow 220ms ease,
              border-color 220ms ease,
              background-color 220ms ease;
            color: ${themeColors.text};
          }

          .invitation-detail-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 22px 42px -26px rgba(15, 23, 42, 0.42);
            border-color: rgba(255, 255, 255, 0.92);
            background: rgba(255, 255, 255, 0.8);
          }

          .invitation-primary-button {
            box-shadow:
              0 18px 36px -20px ${themeColors.primary}88,
              inset 0 1px 0 rgba(255, 255, 255, 0.22);
          }

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
            color: ${themeColors.text};
            -webkit-text-fill-color: currentColor;
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
            color: inherit;
            -webkit-text-fill-color: currentColor;
          }
        `}
      </style>
      {children}
      </div>
    </div>
  );
} 