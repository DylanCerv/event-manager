import type { EventTemplate } from '../types/event';

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'wedding',
    name: 'Boda',
    description: 'Elegante y romántico',
    icon: '💒',
    colors: {
      primary: '#E8AEB7',
      secondary: '#F9EEF0',
      accent: '#D4AF37',
      background: '#FFFDF9',
      text: '#333333'
    },
    gradients: {
      header: 'from-rose-200 via-pink-200 to-amber-200',
      card: 'from-rose-50 via-pink-50 to-white',
      button: 'from-rose-300 to-amber-300'
    }
  },
  {
    id: 'quinceanera',
    name: 'Quinceañera',
    description: 'Mágico y princesa',
    icon: '👑',
    colors: {
      primary: '#C89ACF',
      secondary: '#FBF3FC',
      accent: '#E5C36A',
      background: '#FFFCFE',
      text: '#3E3342'
    },
    gradients: {
      header: 'from-fuchsia-200 via-rose-200 to-amber-200',
      card: 'from-fuchsia-50 via-rose-50 to-white',
      button: 'from-fuchsia-300 to-amber-300'
    }
  },
  {
    id: 'birthday',
    name: 'Cumpleaños',
    description: 'Festivo y alegre',
    icon: '🎉',
    colors: {
      primary: '#F2A66D',
      secondary: '#FFF3E8',
      accent: '#FFCE8C',
      background: '#FFFCF8',
      text: '#43342D'
    },
    gradients: {
      header: 'from-amber-200 via-orange-200 to-rose-200',
      card: 'from-amber-50 via-orange-50 to-white',
      button: 'from-amber-300 to-orange-300'
    }
  },
  {
    id: 'corporate',
    name: 'Empresarial',
    description: 'Profesional y moderno',
    icon: '🏢',
    colors: {
      primary: '#47627C',
      secondary: '#EEF3F7',
      accent: '#AEBECD',
      background: '#FCFDFE',
      text: '#243140'
    },
    gradients: {
      header: 'from-slate-300 via-blue-200 to-slate-200',
      card: 'from-slate-50 via-blue-50 to-white',
      button: 'from-slate-500 to-blue-500'
    }
  },
  {
    id: 'conference',
    name: 'Conferencia',
    description: 'Académico y serio',
    icon: '🎓',
    colors: {
      primary: '#2F6F73',
      secondary: '#EDF7F7',
      accent: '#BFD8C6',
      background: '#FBFDFC',
      text: '#23363A'
    },
    gradients: {
      header: 'from-teal-200 via-emerald-200 to-cyan-200',
      card: 'from-teal-50 via-emerald-50 to-white',
      button: 'from-teal-500 to-emerald-500'
    }
  }
];

export const getTemplateById = (id: string): EventTemplate | undefined => {
  return EVENT_TEMPLATES.find(template => template.id === id);
};

export const getDefaultTemplate = (): EventTemplate => {
  return EVENT_TEMPLATES[0]; // Wedding por defecto
};