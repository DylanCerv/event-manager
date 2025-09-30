import type { EventTemplate } from '../types/event';

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'wedding',
    name: 'Boda',
    description: 'Elegante y romántico',
    icon: '💒',
    colors: {
      primary: '#ec4899', // Pink-500
      secondary: '#f3e8ff', // Purple-50
      accent: '#fdf2f8', // Pink-50
      background: '#ffffff',
      text: '#4b5563'
    },
    gradients: {
      header: 'from-pink-400 via-rose-400 to-red-400',
      card: 'from-pink-50 via-rose-50 to-white',
      button: 'from-pink-500 to-rose-500'
    }
  },
  {
    id: 'quinceanera',
    name: 'Quinceañera',
    description: 'Mágico y princesa',
    icon: '👑',
    colors: {
      primary: '#a855f7', // Purple-500
      secondary: '#fdf4ff', // Fuchsia-50
      accent: '#f0f9ff', // Sky-50
      background: '#ffffff',
      text: '#4b5563'
    },
    gradients: {
      header: 'from-purple-400 via-pink-400 to-fuchsia-400',
      card: 'from-purple-50 via-fuchsia-50 to-white',
      button: 'from-purple-500 to-fuchsia-500'
    }
  },
  {
    id: 'birthday',
    name: 'Cumpleaños',
    description: 'Festivo y alegre',
    icon: '🎉',
    colors: {
      primary: '#f59e0b', // Amber-500
      secondary: '#fef3c7', // Amber-100
      accent: '#fff7ed', // Orange-50
      background: '#ffffff',
      text: '#4b5563'
    },
    gradients: {
      header: 'from-yellow-400 via-orange-400 to-red-400',
      card: 'from-yellow-50 via-orange-50 to-white',
      button: 'from-yellow-500 to-orange-500'
    }
  },
  {
    id: 'corporate',
    name: 'Empresarial',
    description: 'Profesional y moderno',
    icon: '🏢',
    colors: {
      primary: '#3b82f6', // Blue-500
      secondary: '#eff6ff', // Blue-50
      accent: '#f8fafc', // Slate-50
      background: '#ffffff',
      text: '#374151'
    },
    gradients: {
      header: 'from-blue-500 via-indigo-500 to-purple-500',
      card: 'from-blue-50 via-indigo-50 to-white',
      button: 'from-blue-500 to-indigo-500'
    }
  },
  {
    id: 'conference',
    name: 'Conferencia',
    description: 'Académico y serio',
    icon: '🎓',
    colors: {
      primary: '#059669', // Emerald-600
      secondary: '#ecfdf5', // Emerald-50
      accent: '#f0fdf4', // Green-50
      background: '#ffffff',
      text: '#374151'
    },
    gradients: {
      header: 'from-emerald-500 via-teal-500 to-cyan-500',
      card: 'from-emerald-50 via-teal-50 to-white',
      button: 'from-emerald-500 to-teal-500'
    }
  }
];

export const getTemplateById = (id: string): EventTemplate | undefined => {
  return EVENT_TEMPLATES.find(template => template.id === id);
};

export const getDefaultTemplate = (): EventTemplate => {
  return EVENT_TEMPLATES[0]; // Wedding por defecto
};