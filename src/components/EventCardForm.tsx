import React, { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react';
import { Upload, Map, FileText, AlertCircle, Clock, Plus, Trash2, Palette, ImageIcon, Tag, Utensils, Phone } from 'lucide-react';
import type { EventCard, CronogramaItem, RecommendationItem } from '../types/event';
import { EVENT_TEMPLATES, getTemplateById } from '../lib/event-templates';
import { RECOMMENDATION_CATEGORIES, CUSTOM_CATEGORY_ICONS, getCategoryById } from '../lib/recommendation-categories';
import { createInteractiveCard } from '../endpoints/interactiveCard';
import { notify } from '../lib/notify';

// Background previews (imported so Vite bundles them for production)
import fondoBoda from '../assets/backgrounds/wedding/fondoboda.png';
import fondoBoda2 from '../assets/backgrounds/wedding/fondoboda2.png';
import fondoBoda3 from '../assets/backgrounds/wedding/fondoboda3.png';
import fondoCumple from '../assets/backgrounds/birthday/fondocumple.png';
import fondoCumple2 from '../assets/backgrounds/birthday/fondocumple2.png';
import fondoCumple3 from '../assets/backgrounds/birthday/fondocumple3.png';
import fondoQuince from '../assets/backgrounds/quinceanos/fondoquince.png';
import fondoQuince2 from '../assets/backgrounds/quinceanos/fondoquince2.png';
import fondoQuince3 from '../assets/backgrounds/quinceanos/fondoquince3.png';
import fondoEmpresarial from '../assets/backgrounds/corporate/fondoempresarial.png';
import fondoEmpresarial2 from '../assets/backgrounds/corporate/fondoempresarial2.png';
import fondoEmpresarial3 from '../assets/backgrounds/corporate/fondoempresarial3.png';
import fondoConferencia from '../assets/backgrounds/conference/fondoconferencia.png';
import fondoConferencia2 from '../assets/backgrounds/conference/fondoconferencia2.png';
import fondoConferencia3 from '../assets/backgrounds/conference/fondoconferencia3.png';

const BACKGROUND_PREVIEWS: Record<string, [string, string, string]> = {
  wedding: [fondoBoda, fondoBoda2, fondoBoda3],
  birthday: [fondoCumple, fondoCumple2, fondoCumple3],
  quinceanera: [fondoQuince, fondoQuince2, fondoQuince3],
  corporate: [fondoEmpresarial, fondoEmpresarial2, fondoEmpresarial3],
  conference: [fondoConferencia, fondoConferencia2, fondoConferencia3]
};

interface FormErrors {
  main_image?: string;
  event_name?: string;
  event_location?: string;
  event_recommendations?: string;
}

interface EventCardFormProps {
  isLoading?: boolean;
  initialData?: Partial<EventCard>;
  eventId: string;
  onSuccess?: (savedCard: EventCard) => void;
}

export function EventCardForm({ isLoading: externalIsLoading, initialData, eventId, onSuccess }: EventCardFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(externalIsLoading || false);
  const [formData, setFormData] = useState<Partial<EventCard>>({
    event_id: eventId,
    bolt_event_id: initialData?.bolt_event_id || Number(eventId),
    main_image: initialData?.main_image || '',
    event_name: initialData?.event_name || '',
    event_location: initialData?.event_location || '',
    recommendations: initialData?.recommendations || '',
    event_recommendations: initialData?.event_recommendations || [],
    event_type: initialData?.event_type || 'wedding',
    card_model: initialData?.card_model || 'circular',
    gallery_images: [
      initialData?.main_image || '',
      ...(initialData?.gallery_images || [])
    ],
    theme_colors: initialData?.theme_colors || EVENT_TEMPLATES[0].colors,
    show_cronograma: initialData?.event_schedule && (initialData?.event_schedule?.length > 0 || false),
    event_schedule: initialData?.event_schedule || [],
    include_health_form: initialData?.include_health_form || false,
    include_mobility_form: initialData?.include_mobility_form || false,
    show_contact_footer: initialData?.show_contact_footer || false,
    contact_message: initialData?.contact_message || '',
    contact_whatsapp: initialData?.contact_whatsapp || '',
    contact_email: initialData?.contact_email || '',
    facebook_url: initialData?.facebook_url || '',
    instagram_url: initialData?.instagram_url || '',
    background_option: initialData?.background_option ? Number(initialData.background_option) : 1,
  });

  // Estados para el nuevo sistema de recomendaciones
  const [newRecommendation, setNewRecommendation] = useState({
    category_id: RECOMMENDATION_CATEGORIES[0].id,
    category_name: RECOMMENDATION_CATEGORIES[0].name,
    category_icon: RECOMMENDATION_CATEGORIES[0].icon,
    text: '',
    is_custom_category: false
  });
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [customCategoryIcon, setCustomCategoryIcon] = useState(CUSTOM_CATEGORY_ICONS[0]);

  // Obtener el template seleccionado para usar sus propiedades
  const selectedTemplate = getTemplateById(formData.event_type || 'wedding');

  const handleTemplateChange = (templateId: string) => {
    const template = getTemplateById(templateId);
    if (template) {
      setFormData(prev => ({
        ...prev,
        event_type: templateId as any,
        theme_colors: template.colors
      }));
    }
  };

  const addCronogramaItem = () => {
    setFormData(prev => ({
      ...prev,
      event_schedule: [
        ...(prev.event_schedule || []),
        { id: crypto.randomUUID(), time: '', description: '' }
      ]
    }));
  };

  const removeCronogramaItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      event_schedule: prev.event_schedule?.filter(item => item.id !== id) || []
    }));
  };

  const updateCronogramaItem = (id: string, field: keyof CronogramaItem, value: string) => {
    setFormData(prev => ({
      ...prev,
      event_schedule: prev.event_schedule?.map(item =>
        item.id === id ? { ...item, [field]: value } : item
      ) || []
    }));
  };

  useEffect(() => {
    if (initialData) {
        setFormData({
          event_id: eventId,
          bolt_event_id: initialData.bolt_event_id || Number(eventId),
          main_image: initialData.main_image || '',
          event_name: initialData.event_name || '',
          event_location: initialData.event_location || '',
          event_type: initialData.event_type || 'wedding',
          card_model: initialData.card_model || 'circular',
          gallery_images: [
            initialData.main_image || '',
            ...(initialData.gallery_images || [])
          ],
          theme_colors: initialData.theme_colors || EVENT_TEMPLATES[0].colors,
          show_cronograma: initialData.event_schedule && (initialData?.event_schedule?.length > 0 || false),
          event_schedule: initialData.event_schedule || [],
          include_health_form: initialData.include_health_form || false,
          include_mobility_form: initialData.include_mobility_form || false,
          show_contact_footer: initialData.show_contact_footer || false,
          contact_message: initialData.contact_message || '',
          contact_whatsapp: initialData.contact_whatsapp || '',
          contact_email: initialData.contact_email || '',
          facebook_url: initialData.facebook_url || '',
          instagram_url: initialData.instagram_url || '',
          background_option: initialData.background_option ? Number(initialData.background_option) : 1,
          event_recommendations: initialData.event_recommendations || [],
          recommendations: initialData.recommendations || '',
        });
    }
  }, [initialData, eventId]);

  const [errors, setErrors] = useState<FormErrors>({});

  // Función para obtener el fondo temático según el tipo de evento
  // Función para obtener el fondo temático según el tipo de evento
  const getGalleryBackground = (eventType?: string) => {
    switch (eventType) {
      case 'wedding':
        return 'bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 relative overflow-hidden before:absolute before:inset-0 before:bg-[url("data:image/svg+xml,%3Csvg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23d4af37" fill-opacity="0.3"%3E%3Cpath d="M40 20c11.046 0 20 8.954 20 20s-8.954 20-20 20-20-8.954-20-20 8.954-20 20-20zm0 4c-8.837 0-16 7.163-16 16s7.163 16 16 16 16-7.163 16-16-7.163-16-16-16z"/%3E%3Cpath d="M40 30l5 10h-10z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] after:absolute after:inset-0 after:bg-[url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ec4899" fill-opacity="0.15"%3E%3Cpath d="M20 5l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z"/%3E%3C/g%3E%3C/svg%3E")] after:opacity-60';
      case 'birthday':
        return 'bg-gradient-to-br from-yellow-200 via-orange-100 to-pink-100 relative overflow-hidden before:absolute before:inset-0 before:bg-[url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23f59e0b" fill-opacity="0.4"%3E%3Ccircle cx="15" cy="15" r="3"/%3E%3Ccircle cx="45" cy="15" r="3"/%3E%3Ccircle cx="30" cy="30" r="4"/%3E%3Ccircle cx="15" cy="45" r="3"/%3E%3Ccircle cx="45" cy="45" r="3"/%3E%3C/g%3E%3C/svg%3E")] after:absolute after:inset-0 after:bg-[url("data:image/svg+xml,%3Csvg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23ec4899" fill-opacity="0.3"%3E%3Cpath d="M15 5l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/%3E%3C/g%3E%3C/svg%3E")] after:animate-pulse';
      case 'corporate':
        return 'bg-gradient-to-br from-slate-200 via-gray-100 to-blue-50 relative overflow-hidden before:absolute before:inset-0 before:bg-[url("data:image/svg+xml,%3Csvg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23475569" fill-opacity="0.2"%3E%3Cpath d="M25 0l25 25-25 25L0 25z"/%3E%3Cpath d="M12.5 12.5l12.5 12.5-12.5 12.5L0 25z" fill-opacity="0.1"/%3E%3C/g%3E%3C/svg%3E")]';
      case 'business':
        return 'bg-gradient-to-br from-blue-100 via-indigo-50 to-slate-100 relative overflow-hidden before:absolute before:inset-0 before:bg-[url("data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%232563eb" fill-opacity="0.2"%3E%3Crect x="5" y="5" width="30" height="2"/%3E%3Crect x="5" y="15" width="30" height="2"/%3E%3Crect x="5" y="25" width="30" height="2"/%3E%3Crect x="5" y="35" width="30" height="2"/%3E%3C/g%3E%3C/svg%3E")]';
      default:
        return 'bg-gradient-to-br from-gray-50 to-gray-100';
    }
  };

  // Funciones para manejar recomendaciones
  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === 'custom') {
      setShowCustomCategory(true);
      setNewRecommendation(prev => ({
        ...prev,
        category_id: 'custom',
        category_name: '',
        category_icon: CUSTOM_CATEGORY_ICONS[0],
        is_custom_category: true
      }));
    } else {
      setShowCustomCategory(false);
      const category = getCategoryById(categoryId);
      if (category) {
        setNewRecommendation(prev => ({
          ...prev,
          category_id: category.id,
          category_name: category.name,
          category_icon: category.icon,
          is_custom_category: false
        }));
      }
    }
  };

  const addRecommendation = () => {
    if (!newRecommendation.text.trim()) return;
    
    const finalCategory = showCustomCategory ? {
      id: `custom_${Date.now()}`,
      name: customCategoryName || 'Personalizada',
      icon: customCategoryIcon
    } : {
      id: newRecommendation.category_id,
      name: newRecommendation.category_name,
      icon: newRecommendation.category_icon
    };

    const recommendation: RecommendationItem = {
      id: `rec_${Date.now()}`,
      category_id: finalCategory.id,
      category_name: finalCategory.name,
      category_icon: finalCategory.icon,
      text: newRecommendation.text.trim(),
      is_custom_category: showCustomCategory
    };

    setFormData(prev => ({
      ...prev,
      event_recommendations: [...(prev.event_recommendations || []), recommendation]
    }));

    // Reset form
    setNewRecommendation({
      category_id: RECOMMENDATION_CATEGORIES[0].id,
      category_name: RECOMMENDATION_CATEGORIES[0].name,
      category_icon: RECOMMENDATION_CATEGORIES[0].icon,
      text: '',
      is_custom_category: false
    });
    setShowCustomCategory(false);
    setCustomCategoryName('');
    setCustomCategoryIcon(CUSTOM_CATEGORY_ICONS[0]);
  };

  const removeRecommendation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      event_recommendations: prev.event_recommendations?.filter(item => item.id !== id) || []
    }));
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    // Validar imagen según el layout
    if (formData.card_model === 'gallery') {
      // Para galería, validar que al menos tenga una imagen en gallery_images
      if (!formData.gallery_images?.some(img => img)) newErrors.main_image = 'Al menos una imagen es requerida para la galería';
    } else {
      // Para circular y portada, validar main_image
      if (!formData.main_image) {
        newErrors.main_image = formData.card_model === 'portada' 
          ? 'La imagen de portada es requerida'
          : 'La foto de portada es requerida';
      }
    }
    
    if (!formData.event_name) newErrors.event_name = 'El nombre del evento es requerido';
    if (!formData.event_location) newErrors.event_location = 'El iframe de Google Maps es requerido';
    if (!formData.recommendations && (!formData.event_recommendations || formData.event_recommendations.length === 0)) {
      newErrors.event_recommendations = 'Al menos una recomendación es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const formDataObj = new FormData();
      
      formDataObj.append('bolt_event_id', String(eventId));
      formDataObj.append('event_type', formData.event_type || '');
      formDataObj.append('card_model', formData.card_model || '');
      formDataObj.append('background_option', String(formData.background_option || 1));
      
      // Función auxiliar para convertir URL a File de manera asíncrona
      const urlToFile = async (url: string, fileName: string): Promise<File | null> => {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          return new File([blob], fileName, { type: blob.type || 'image/jpeg' });
        } catch (error) {
          console.error('Error al convertir URL a File:', error);
          return null;
        }
      };
      
      if (formData.card_model === 'gallery') {
        // La primera imagen (index 0) siempre va como main_image
        if (formData.gallery_images?.[0]) {
          if (formData.gallery_images[0].startsWith('http')) {
            // Si es una URL, primero la enviamos como string
            formDataObj.append('main_image_url', formData.gallery_images[0]);
            
            // Luego intentamos convertirla a File
            try {
              const mainFile = await urlToFile(formData.gallery_images[0], 'main_image.jpg');
              if (mainFile) {
                formDataObj.append('main_image', mainFile);
              }
            } catch (error) {
              console.error('Error al procesar la imagen principal:', error);
            }
          } else {
            // Si es base64, convertir a File
            const mainImageFile = base64ToFile(formData.gallery_images[0], 'main_image.jpg');
            if (mainImageFile) {
              formDataObj.append('main_image', mainImageFile);
            }
          }
        }
        
        // Las imágenes adicionales (desde index 1) van como gallery_images
        if (formData.gallery_images && formData.gallery_images.length > 1) {
          // Empezamos desde el índice 1 (la segunda imagen)
          const galleryImages = formData.gallery_images.slice(1).filter(img => img); // Filtrar imágenes vacías
          
          // Procesamos todas las imágenes de manera asíncrona
          await Promise.all(galleryImages.map(async (image, index) => {
            if (image.startsWith('http')) {
              // Si es una URL existente, primero la enviamos como string
              formDataObj.append(`gallery_images_urls[${index}]`, image);
              
              // Luego intentamos convertirla a File
              try {
                const galleryFile = await urlToFile(image, `gallery_image_${index}.jpg`);
                if (galleryFile) {
                  formDataObj.append(`gallery_images[${index}]`, galleryFile);
                }
              } catch (error) {
                console.error(`Error al procesar la imagen de galería ${index}:`, error);
              }
            } else if (image) {
              // Si es base64, convertir a File
              const galleryFile = base64ToFile(image, `gallery_image_${index}.jpg`);
              if (galleryFile) {
                formDataObj.append(`gallery_images[${index}]`, galleryFile);
              }
            }
          }));
        }
      } else if (formData.main_image) {
        // Convertir base64 a File para main_image
        if (formData.main_image.startsWith('http')) {
          // Si es una URL, primero la enviamos como string
          formDataObj.append('main_image_url', formData.main_image);
          
          // Luego intentamos convertirla a File
          try {
            const coverFile = await urlToFile(formData.main_image, 'main_image.jpg');
            if (coverFile) {
              formDataObj.append('main_image', coverFile);
            }
          } catch (error) {
            console.error('Error al procesar la imagen de portada:', error);
          }
        } else {
          // Si es base64, convertir a File
          const coverImageFile = base64ToFile(formData.main_image, 'main_image.jpg');
          if (coverImageFile) {
            formDataObj.append('main_image', coverImageFile);
          }
        }
      }
      
      formDataObj.append('event_name', formData.event_name || '');
      formDataObj.append('event_location', formData.event_location || '');
      formDataObj.append('event_recommendations', JSON.stringify(formData.event_recommendations || []));
      formDataObj.append('event_schedule', JSON.stringify(formData.event_schedule || []));
      
      formDataObj.append('include_health_form', String(formData.include_health_form || false));
      formDataObj.append('include_mobility_form', String(formData.include_mobility_form || false));
      
      formDataObj.append('show_contact_footer', String(formData.show_contact_footer || false));
      if (formData.contact_message) formDataObj.append('contact_message', formData.contact_message || '');
      if (formData.contact_whatsapp) formDataObj.append('contact_whatsapp', formData.contact_whatsapp || '');
      if (formData.contact_email) formDataObj.append('contact_email', formData.contact_email || '');
      if (formData.facebook_url) formDataObj.append('facebook_url', formData.facebook_url || '');
      if (formData.instagram_url) formDataObj.append('instagram_url', formData.instagram_url || '');

      // Función auxiliar para convertir base64 a File
      function base64ToFile(base64String: string, fileName: string): File | null {
        // Verificar si es una URL o una cadena base64
        if (base64String.startsWith('http://') || base64String.startsWith('https://')) {
          console.log('Imagen ya es una URL, no se necesita convertir:', base64String);
          return null; // No necesitamos convertir URLs
        }
        
        try {
          // Asegurarse de que sea una cadena base64 válida
          if (!base64String.includes(',')) {
            console.error('Formato base64 inválido:', base64String.substring(0, 50) + '...');
            return null;
          }
          
          const arr = base64String.split(',');
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
          
          try {
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            
            return new File([u8arr], fileName, { type: mime });
          } catch (error) {
            console.error('Error al decodificar base64:', error);
            return null;
          }
        } catch (error) {
          console.error('Error al procesar la imagen:', error);
          return null;
        }
      }

      console.log('formData', formData);
      const savedCard = await createInteractiveCard(formDataObj);
      
      // Si la tarjeta se guardó correctamente y existe un callback de éxito, lo llamamos
      if (savedCard && onSuccess) {
        // Preparamos los datos para el callback
        const completeCard: EventCard = {
          ...formData as any,
          id: savedCard.id,
          bolt_event_id: Number(eventId),
          event_type: formData.event_type || 'wedding',
          card_model: formData.card_model || 'circular',
          background_option: formData.background_option || 1,
          main_image: formData.main_image || '',
          event_name: formData.event_name || '',
          event_location: formData.event_location || '',
          event_recommendations: formData.event_recommendations || [],
          event_schedule: formData.event_schedule || [],
          include_health_form: formData.include_health_form || false,
          include_mobility_form: formData.include_mobility_form || false,
          show_contact_footer: formData.show_contact_footer || false,
          created_at: savedCard.created_at || new Date().toISOString(),
          updated_at: savedCard.updated_at || new Date().toISOString()
        };
        
        // Llamamos al callback con la tarjeta guardada
        onSuccess(completeCard);
      }
    } catch (error) {
      console.error('Error saving event card:', error);
      notify.error('Error al guardar la tarjeta del evento. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({
          ...errors,
          main_image: 'El archivo no debe superar los 10MB'
        });
        return;
      }

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setErrors({
          ...errors,
          main_image: 'Solo se permiten archivos JPG, PNG o WEBP'
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData({
          ...formData,
          main_image: e.target?.result as string
        });
        setErrors({
          ...errors,
          main_image: undefined
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* NUEVA SECCIÓN: Selector de Tipo de Evento */}
      <div className="space-y-4 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <Palette className="h-6 w-6 text-indigo-600" />
            <span>Selecciona el Tipo de Evento</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Cada tipo de evento tiene su propio diseño y colores temáticos
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {EVENT_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => handleTemplateChange(template.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                formData.event_type === template.id
                  ? 'border-indigo-500 bg-white ring-4 ring-indigo-200 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="text-center space-y-3">
                <div className="text-3xl">{template.icon}</div>
                <div className="text-sm font-semibold text-gray-900">{template.name}</div>
                <div className="text-xs text-gray-500 leading-tight">{template.description}</div>
                <div className="flex justify-center space-x-1">
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: template.colors.primary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: template.colors.secondary }}
                  />
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: template.colors.accent }}
                  />
                </div>
              </div>
            </button>
          ))}
        </div>
        
      </div>

      {/* SECCIÓN: Selector de Modelo de Layout */}
      <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <Palette className="h-6 w-6 text-blue-600" />
            <span>Selecciona el Modelo de Tarjeta</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Elige cómo quieres que se vea tu invitación en móviles
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, card_model: 'circular' })}
            className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
              formData.card_model === 'circular'
                ? 'border-blue-500 bg-white ring-4 ring-blue-200 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="text-center space-y-3">
              <div className="text-3xl">⭕</div>
              <div className="text-sm font-semibold text-gray-900">Imagen Circular</div>
              <div className="text-xs text-gray-500 leading-tight">Imagen centrada en forma circular</div>
            </div>
          </button>
          
          <button
            type="button"
            onClick={() => setFormData({ ...formData, card_model: 'gallery' })}
            className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
              formData.card_model === 'gallery'
                ? 'border-blue-500 bg-white ring-4 ring-blue-200 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="text-center space-y-3">
              <div className="text-3xl">🎠</div>
              <div className="text-sm font-semibold text-gray-900">Carrusel Polaroid</div>
              <div className="text-xs text-gray-500 leading-tight">Carrusel interactivo con miniaturas laterales</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setFormData({ ...formData, card_model: 'portada' })}
            className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
              formData.card_model === 'portada'
                ? 'border-blue-500 bg-white ring-4 ring-blue-200 shadow-lg'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
            }`}
          >
            <div className="text-center space-y-3">
              <div className="text-3xl">🎨</div>
              <div className="text-sm font-semibold text-gray-900">Imagen Portada</div>
              <div className="text-xs text-gray-500 leading-tight">Imagen rectangular que deja ver el fondo en los bordes</div>
            </div>
          </button>
        </div>
        
      </div>

      {/* SECCIÓN: Selector de Fondo Temático */}
      <div className="space-y-4 bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <ImageIcon className="h-6 w-6 text-purple-600" />
            <span>Selecciona el Fondo Temático</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Elige el fondo que mejor se adapte a tu evento
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData({ ...formData, background_option: option as 1 | 2 | 3 })}
              className={`relative p-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                formData.background_option === option
                  ? 'border-purple-500 bg-white ring-4 ring-purple-200 shadow-lg'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="text-center space-y-3">
                {/* Vista previa del fondo */}
                <div className="w-full h-24 rounded-lg overflow-hidden border border-gray-200">
                  <div 
                    className="w-full h-full"
                    style={{
                      backgroundImage: `url(${BACKGROUND_PREVIEWS[formData.event_type || 'wedding']?.[option - 1] ?? BACKGROUND_PREVIEWS.wedding[0]})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center center',
                      backgroundRepeat: 'no-repeat'
                    }}
                  />
                </div>
                
                <div className="text-sm font-semibold text-gray-900">
                  Opción {option}
                </div>
                
                {formData.background_option === option && (
                  <div className="text-xs text-purple-600 font-medium">
                    ✓ Seleccionado
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Sección de imágenes según el layout seleccionado */}
      {formData.card_model === 'gallery' ? (
        /* Modo Galería - 3 campos de imagen */
        <div className="space-y-4 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
          <label className="block text-lg font-semibold text-gray-800">
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-6 w-6 text-green-600" />
              <span>Galería de Imágenes</span>
            </div>
          </label>
          <p className="text-sm text-gray-600">
            Sube hasta 3 imágenes para crear una galería decorativa
          </p>
          
          {[0, 1, 2].map((index) => {
            // Asegurar que gallery_images tenga al menos 3 elementos
            const galleryImages = [...(formData.gallery_images || [])];
            while (galleryImages.length < 3) {
              galleryImages.push('');
            }
            
            return (
              <div key={index} className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">
                  Imagen {index + 1} {index === 0 ? '(Principal)' : '(Opcional)'}
                </label>
                <div className="flex justify-center px-4 pt-3 pb-3 border-2 border-gray-300 border-dashed rounded-md">
                  <div className="space-y-2 text-center w-full">
                    {galleryImages[index] ? (
                      <div className="space-y-2">
                        <img
                          src={galleryImages[index]}
                          alt={`Imagen ${index + 1}`}
                          className="mx-auto h-20 w-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/jpeg,image/png,image/webp';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  if (e.target?.result) {
                                    const newGalleryImages = [...galleryImages];
                                    newGalleryImages[index] = e.target.result as string;
                                    setFormData({
                                      ...formData,
                                      gallery_images: newGalleryImages
                                    });
                                  }
                                };
                                reader.onerror = () => {
                                  console.error('Error reading file');
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/jpeg,image/png,image/webp';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  if (e.target?.result) {
                                    const newGalleryImages = [...galleryImages];
                                    newGalleryImages[index] = e.target.result as string;
                                    setFormData({
                                      ...formData,
                                      gallery_images: newGalleryImages
                                    });
                                  }
                                };
                                reader.onerror = () => {
                                  console.error('Error reading file');
                                };
                                reader.readAsDataURL(file);
                              }
                            };
                            input.click();
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-500 font-medium"
                        >
                          Cargar imagen
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
        </div>
      ) : (
        /* Modo Circular y Portada - 1 campo de imagen */
        <div className="space-y-4 bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
          <label className="block text-lg font-semibold text-gray-800">
            <div className="flex items-center space-x-2">
              <ImageIcon className="h-6 w-6 text-green-600" />
              <span>{formData.card_model === 'portada' ? 'Imagen de Portada' : 'Imagen Principal'}</span>
            </div>
          </label>
          <p className="text-sm text-gray-600">
            {formData.card_model === 'portada' 
              ? 'Sube la imagen que aparecerá como portada rectangular'
              : 'Sube la imagen principal que aparecerá en formato circular'
            }
          </p>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-4 text-center w-full">
              {formData.main_image ? (
                <div className="space-y-4">
                  {/* Preview según el modelo */}
                  <div className="mx-auto" style={{ width: '288px' }}>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden p-6">
                      <div className="text-center">
                        {formData.card_model === 'portada' ? (
                          <img
                            src={formData.main_image}
                            alt="Vista previa portada"
                            className="w-48 h-32 rounded-lg object-cover border-2 border-white shadow-lg mx-auto"
                          />
                        ) : (
                          <img
                            src={formData.main_image}
                            alt="Vista previa circular"
                            className="w-32 h-32 rounded-full object-cover border-2 border-white shadow-lg mx-auto"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Información de la imagen */}
                  <div className="text-xs text-gray-500 space-y-1">
                    {formData.card_model === 'portada' ? (
                      <>
                        <div>📐 Imagen rectangular: 384x256px</div>
                        <div>🎨 Layout: Imagen Portada</div>
                      </>
                    ) : (
                      <>
                        <div>📐 Imagen circular: 208x208px</div>
                        <div>🎨 Layout: Imagen Circular</div>
                      </>
                    )}
                  </div>
                  
                  {/* Botón para cambiar imagen */}
                  <label className="cursor-pointer text-sm text-indigo-600 hover:text-indigo-500 font-medium">
                    Cambiar imagen
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Cargar imagen</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                    <p className="pl-1">o arrastra y suelta</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG hasta 10MB</p>
                </>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            📷 Recomendado: usa imágenes cuadradas (1:1), tamaño ideal 400 x 400 px.
          </p>
          {errors.main_image && (
            <p className="text-sm text-red-600 flex items-center mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.main_image}
            </p>
          )}
        </div>
      )}

      <div className="space-y-4 bg-gradient-to-r from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-amber-600" />
            <span>Nombre del Evento</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Ingresa el nombre que aparecerá en la invitación
        </p>
        <input
          type="text"
          value={formData.event_name}
          onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
          placeholder="Ingresa el nombre del evento"
        />
        {errors.event_name && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.event_name}
          </p>
        )}
      </div>

      <div className="space-y-4 bg-gradient-to-r from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <Map className="h-6 w-6 text-teal-600" />
            <span>Ubicación del Evento</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Pega el código iframe de Google Maps para mostrar la ubicación
        </p>
        <textarea
          value={formData.event_location}
          onChange={(e) => setFormData({ ...formData, event_location: e.target.value })}
          rows={4}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
          placeholder="Pega aquí el código iframe de Google Maps"
        />
        {errors.event_location && (
          <p className="text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.event_location}
          </p>
        )}
      </div>

      {/* SECCIÓN: Recomendaciones Categorizadas */}
      <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <Tag className="h-6 w-6 text-blue-600" />
            <span>Recomendaciones del Evento</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Organiza las recomendaciones por categorías para una mejor presentación
        </p>

        {/* Formulario para agregar nueva recomendación */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {errors.event_recommendations && (
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.event_recommendations}
              </p>
            )}
            {/* Selector de categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={showCustomCategory ? 'custom' : newRecommendation.category_id}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                {RECOMMENDATION_CATEGORIES.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
                <option value="custom">➕ Personalizada...</option>
              </select>
            </div>

            {/* Campo de texto para la recomendación */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recomendación
              </label>
              <input
                type="text"
                value={newRecommendation.text}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, text: e.target.value }))}
                placeholder="Ej: llegar temprano, ir vestido de blanco..."
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          {/* Campos para categoría personalizada */}
          {showCustomCategory && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la categoría
                </label>
                <input
                  type="text"
                  value={customCategoryName}
                  onChange={(e) => setCustomCategoryName(e.target.value)}
                  placeholder="Ej: Protocolo COVID"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Icono
                </label>
                <select
                  value={customCategoryIcon}
                  onChange={(e) => setCustomCategoryIcon(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  {CUSTOM_CATEGORY_ICONS.map(icon => (
                    <option key={icon} value={icon}>
                      {icon} {icon}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addRecommendation}
            disabled={!newRecommendation.text.trim() || (showCustomCategory && !customCategoryName.trim())}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar Recomendación
          </button>
        </div>

        {/* Lista de recomendaciones agregadas */}
        {formData.event_recommendations && formData.event_recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Recomendaciones agregadas:</h4>
            {formData.event_recommendations.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{item.category_icon}</span>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {item.category_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.text}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeRecommendation(item.id)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Mantener el campo original para compatibilidad */}
        <div className="hidden">
          <textarea
            value={formData.recommendations}
            onChange={(e) => setFormData({ ...formData, recommendations: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-4 bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-xl border border-rose-100">
        <div className="flex items-center justify-between">
          <label className="block text-lg font-semibold text-gray-800">
            <div className="flex items-center space-x-2">
              <Clock className="h-6 w-6 text-rose-600" />
              <span>Cronograma del Evento</span>
            </div>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={formData.show_cronograma}
              onChange={(e) => setFormData({ ...formData, show_cronograma: e.target.checked })}
              className="rounded border-gray-300 text-rose-600 shadow-sm focus:border-rose-300 focus:ring focus:ring-rose-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Mostrar cronograma</span>
          </label>
        </div>
        <p className="text-sm text-gray-600">
          Agrega un cronograma con las actividades del evento
        </p>

        {formData.show_cronograma && (
          <div className="space-y-4">
            {/* Asegurar que siempre hay al menos un elemento en el cronograma */}
            {(formData.event_schedule && formData.event_schedule.length > 0) ? formData.event_schedule.map((item) => (
              <div key={item.id} className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg">
                <div className="flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <Clock className="h-4 w-4 inline-block mr-1" />
                        Hora
                      </label>
                      <input
                        type="time"
                        value={item.time}
                        onChange={(e) => updateCronogramaItem(item.id, 'time', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        <FileText className="h-4 w-4 inline-block mr-1" />
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateCronogramaItem(item.id, 'description', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Descripción de la actividad"
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeCronogramaItem(item.id)}
                  className="mt-6 text-red-600 hover:text-red-800"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            )) : (
              <p className="text-sm text-gray-500 italic">No hay actividades en el cronograma.</p>
            )}
            <button
              type="button"
              onClick={addCronogramaItem}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Actividad
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 bg-gradient-to-r from-violet-50 to-purple-50 p-6 rounded-xl border border-violet-100">
        <label className="block text-lg font-semibold text-gray-800">
          <div className="flex items-center space-x-2">
            <Utensils className="h-6 w-6 text-violet-600" />
            <span>Formularios Adicionales</span>
          </div>
        </label>
        <p className="text-sm text-gray-600">
          Incluye formularios opcionales para recopilar información de los invitados
        </p>
        <div className="space-y-4">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.include_health_form}
                onChange={(e) => setFormData({ ...formData, include_health_form: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-300 focus:ring focus:ring-violet-200 focus:ring-opacity-50"
              />
              <span className="ml-3 text-sm text-gray-700">Incluir formulario de salud</span>
            </label>
          </div>
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.include_mobility_form}
                onChange={(e) => setFormData({ ...formData, include_mobility_form: e.target.checked })}
                className="rounded border-gray-300 text-violet-600 shadow-sm focus:border-violet-300 focus:ring focus:ring-violet-200 focus:ring-opacity-50"
              />
              <span className="ml-3 text-sm text-gray-700">Incluir formulario de movilidad</span>
            </label>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-gradient-to-r from-slate-50 to-gray-50 p-6 rounded-xl border border-slate-100">
        <div className="flex items-center justify-between">
          <label className="block text-lg font-semibold text-gray-800">
            <div className="flex items-center space-x-2">
              <Phone className="h-6 w-6 text-slate-600" />
              <span>Pie de Contacto</span>
            </div>
          </label>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={formData.show_contact_footer}
              onChange={(e) => setFormData({ ...formData, show_contact_footer: e.target.checked })}
              className="rounded border-gray-300 text-slate-600 shadow-sm focus:border-slate-300 focus:ring focus:ring-slate-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">Mostrar pie de contacto</span>
          </label>
        </div>
        <p className="text-sm text-gray-600">
          Agrega información de contacto al final de la invitación
        </p>

        {formData.show_contact_footer && (
          <div className="space-y-4 bg-white p-4 rounded-lg border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Mensaje de Contacto
              </label>
              <textarea
                value={formData.contact_message}
                onChange={(e) => setFormData({ ...formData, contact_message: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Contáctanos para más información sobre nuestros eventos"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.contact_whatsapp}
                  onChange={(e) => setFormData({ ...formData, contact_whatsapp: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="+1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="contacto@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Facebook URL
                </label>
                <input
                  type="url"
                  value={formData.facebook_url}
                  onChange={(e) => setFormData({ ...formData, facebook_url: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://facebook.com/..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Instagram URL
                </label>
                <input
                  type="url"
                  value={formData.instagram_url}
                  onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="https://instagram.com/..."
                />
              </div>
            </div>
          </div>
        )}
      </div>


      <div>
        <button
          type="submit"
          disabled={isLoading || externalIsLoading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading || externalIsLoading ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </form>
  );
}