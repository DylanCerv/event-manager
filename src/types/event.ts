export interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  contractor_name: string;
  guest_count: number;
  logo_url?: string;
  created_at: string;
  created_by: string;
  request_status?: 'pending' | 'approved' | 'rejected';
  qr_access_active: boolean;
  is_finalized: boolean;
}

export interface EventCard {
  id: string;
  event_id: string;
  cover_image: string;
  gallery_images?: string[]; // Para el modo galería - hasta 3 imágenes
  event_name: string;
  maps_iframe: string;
  recommendations: string; // Mantener para compatibilidad
  recommendation_items?: RecommendationItem[]; // Nuevo sistema
  created_at: string;
  // Nuevos campos para el sistema de plantillas
  event_type?: 'wedding' | 'quinceanera' | 'birthday' | 'corporate' | 'conference';
  layout_model?: 'cover' | 'fixed-background' | 'circular' | 'gallery' | 'portada';
  theme_colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  show_cronograma: boolean;
  cronograma_items: CronogramaItem[];
  show_health_form?: boolean;
  show_mobility_form?: boolean;
  show_contact_footer?: boolean;
  contact_message?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  facebook_url?: string;
  instagram_url?: string;
  background_option?: 1 | 2 | 3; // Opción de fondo seleccionada (1=sin número, 2=con "2", 3=con "3")
}

export interface CronogramaItem {
  id: string;
  time: string;
  description: string;
}

export interface RecommendationItem {
  id: string;
  category_id: string;
  category_name: string;
  category_icon: string;
  text: string;
  is_custom_category: boolean;
}

export interface RecommendationCategory {
  id: string;
  name: string;
  icon: string;
}

// Nuevos tipos para las plantillas
export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  gradients: {
    header: string;
    card: string;
    button: string;
  };
}

export interface Guest {
  id: string;
  event_id: string;
  name?: string;
  guest_number: number;
  table_number?: number;
  email?: string;
  phone?: string;
  confirmed: boolean;
  attended: boolean;
  attended_at?: string; // Timestamp de cuándo marcó asistencia
  profile_photo?: string;
  health_info?: string;
  qr_code: string;
  created_at: string;
  dietary_restrictions?: string;
  mobility_restrictions?: string;
  health_form_submitted?: boolean;
  mobility_form_submitted?: boolean;
  forms_completed?: boolean;
  access_denied?: boolean;
  age_category?: 'minor' | 'adult'; // Categoría de edad explícita
}

export interface GuestAccessSettings {
  id: string;
  event_id: string;
  access_type: 'video' | 'message';
  is_active: boolean;
  welcome_message?: string;
  rejection_message?: string;
  created_at: string;
}

export interface GuestAccessVideo {
  id: string;
  guest_id: string;
  video_url: string;
  created_at: string;
}



export interface EventFinalization {
  id: string;
  event_id: string;
  is_finalized: boolean;
  final_message: string; // Mantener por compatibilidad
  final_title?: string; // Nuevo campo para título
  final_subtitle?: string; // Nuevo campo para subtítulo
  cover_image?: string;
  video_url?: string;
  video_message?: string;
  whatsapp_number?: string;
  whatsapp_button_text?: string; // Texto personalizable del botón de WhatsApp
  created_at: string;
  // Nuevos campos para mantener coherencia con la tarjeta interactiva
  event_type?: 'wedding' | 'quinceanera' | 'birthday' | 'corporate' | 'conference';
  theme_colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
}

export interface EventFormData {
  name: string;
  date: string;
  location: string;
  contractor_name: string;
  guest_count: number;
}

export interface EventRequest {
  id: string;
  event_id: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by: string;
  processed_by?: string;
  processed_at?: string;
  created_at: string;
}