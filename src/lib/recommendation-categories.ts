import { RecommendationCategory } from '../types/event';

export const RECOMMENDATION_CATEGORIES: RecommendationCategory[] = [
  { id: 'dress_code', name: 'Vestimenta', icon: '👔' },
  { id: 'parking', name: 'Estacionamiento', icon: '🚗' },
  { id: 'timing', name: 'Horarios', icon: '⏰' },
  { id: 'location', name: 'Ubicación', icon: '📍' },
  { id: 'weather', name: 'Clima', icon: '🌤️' },
  { id: 'gifts', name: 'Regalos', icon: '🎁' },
  { id: 'food', name: 'Comida/Bebida', icon: '🍽️' },
  { id: 'transport', name: 'Transporte', icon: '🚌' },
  { id: 'accommodation', name: 'Alojamiento', icon: '🏨' },
  { id: 'protocol', name: 'Protocolo', icon: '📋' },
  { id: 'entertainment', name: 'Entretenimiento', icon: '🎵' },
  { id: 'other', name: 'Otros', icon: '📝' }
];

export const CUSTOM_CATEGORY_ICONS = [
  '📝', '💡', '⚠️', '✨', '🎯', '🔔', '📢', '💼', 
  '🎪', '🎭', '🎨', '🏆', '🌟', '💫', '🎊', '🎉',
  '📱', '💻', '📷', '🎥', '🎤', '🎧', '🎸', '🥳',
  '😷', '🧼', '🩺', '💊', '🌡️', '🧴', '🧽', '🧹'
];

export function getCategoryById(id: string): RecommendationCategory | undefined {
  return RECOMMENDATION_CATEGORIES.find(cat => cat.id === id);
}

export function getDefaultCategory(): RecommendationCategory {
  return RECOMMENDATION_CATEGORIES[0]; // Vestimenta
}
