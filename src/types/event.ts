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
  status?: 'pending' | 'approved' | 'rejected';
  request?: EventRequest;
  qr_access_active: boolean;
  is_finalized: boolean;
}

export interface EventCard {
  id: number | string;
  bolt_event_id: number;
  event_id?: string; // Campo interno para compatibilidad
  event_type: string;
  card_model: string;
  background_option: string | number;
  main_image: string;
  gallery_images?: string[];
  event_name: string;
  event_location: string;
  event_recommendations: RecommendationItem[];
  event_schedule: CronogramaItem[];
  include_health_form: boolean;
  include_mobility_form: boolean;
  show_contact_footer: boolean;
  contact_message?: string;
  contact_whatsapp?: string;
  contact_email?: string;
  facebook_url?: string;
  instagram_url?: string;
  created_at: string;
  updated_at: string;
  
  // Campos para compatibilidad con el código existente
  theme_colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  show_cronograma?: boolean;
  recommendations?: string;
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
  id: number;
  bolt_event_id: number;
  creator_id: number;
  request_details?: string;
  processed: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  creator?: {
    id: number;
    name?: string;
    last_name?: string;
    username?: string;
    email?: string;
    country?: string;
    city?: string;
    address?: string;
    phone?: string;
    company?: string;
    commission_percentage?: number;
    role_id?: number;
    creator_id?: number;
    status?: string;
    email_verified_at?: string;
    created_at?: string;
    updated_at?: string;
  };
}