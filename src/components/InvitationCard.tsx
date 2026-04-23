import { useCallback, useEffect, useState } from 'react';
import { Calendar, Clock, MapPin, Phone, Mail, Facebook, Instagram, Sparkles, Heart, Check, Utensils, Music, Gift, Timer, Accessibility, Star, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Importar todas las opciones de fondos disponibles
// Bodas
import fondoBoda from '../assets/backgrounds/wedding/fondoboda.jpg';
import fondoBoda2 from '../assets/backgrounds/wedding/fondoboda2.jpg';
import fondoBoda3 from '../assets/backgrounds/wedding/fondoboda3.jpg';

// Cumpleaños
import fondoCumple from '../assets/backgrounds/birthday/fondocumple.jpg';
import fondoCumple2 from '../assets/backgrounds/birthday/fondocumple2.jpg';
import fondoCumple3 from '../assets/backgrounds/birthday/fondocumple3.jpg';

// Quinceañeras
import fondoQuince from '../assets/backgrounds/quinceanos/fondoquince.jpg';
import fondoQuince2 from '../assets/backgrounds/quinceanos/fondoquince2.jpg';
import fondoQuince3 from '../assets/backgrounds/quinceanos/fondoquince3.jpg';

// Empresarial
import fondoEmpresarial from '../assets/backgrounds/corporate/fondoempresarial.jpg';
import fondoEmpresarial2 from '../assets/backgrounds/corporate/fondoempresarial2.jpg';
import fondoEmpresarial3 from '../assets/backgrounds/corporate/fondoempresarial3.jpg';

// Conferencias
import fondoConferencia from '../assets/backgrounds/conference/fondoconferencia.jpg';
import fondoConferencia2 from '../assets/backgrounds/conference/fondoconferencia2.jpg';
import fondoConferencia3 from '../assets/backgrounds/conference/fondoconferencia3.jpg';

import { Event, Guest, EventCard } from '../types/event';
import { getTemplateById } from '../lib/event-templates';
import { ThemeDecorations, SectionSeparator } from './ThemeDecorations';
import { ThemeStyles } from './ThemeStyles';

interface InvitationCardProps {
  event: Event;
  guest: Guest;
  eventCard: EventCard;
  onConfirmAttendance: (guestId: string, confirmed: boolean) => void;
  onUpdateGuest: (guest: Partial<Guest>) => Promise<void>;
}

function InvitationCard({ event, guest, eventCard, onConfirmAttendance, onUpdateGuest }: InvitationCardProps) {
  
  // Función para obtener el fondo correcto según tipo de evento y opción seleccionada
  const getBackgroundImage = (eventType: string, backgroundOption: number = 1) => {
    switch (eventType) {
      case 'wedding':
        return backgroundOption === 1 ? fondoBoda : backgroundOption === 2 ? fondoBoda2 : fondoBoda3;
      case 'birthday':
        return backgroundOption === 1 ? fondoCumple : backgroundOption === 2 ? fondoCumple2 : fondoCumple3;
      case 'quinceanera':
        return backgroundOption === 1 ? fondoQuince : backgroundOption === 2 ? fondoQuince2 : fondoQuince3;
      case 'corporate':
        return backgroundOption === 1 ? fondoEmpresarial : backgroundOption === 2 ? fondoEmpresarial2 : fondoEmpresarial3;
      case 'conference':
        return backgroundOption === 1 ? fondoConferencia : backgroundOption === 2 ? fondoConferencia2 : fondoConferencia3;
      default:
        return fondoBoda; // Fallback
    }
  };

  const [timeLeft, setTimeLeft] = useState('');
  const [showHealthForm, setShowHealthForm] = useState(!guest.health_form_submitted);
  const [showMobilityForm, setShowMobilityForm] = useState(!guest.mobility_form_submitted);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(guest.dietary_restrictions || '');
  const [mobilityRestrictions, setMobilityRestrictions] = useState(guest.mobility_restrictions || '');
  const [isSubmittingHealth, setIsSubmittingHealth] = useState(false);
  const [isSubmittingMobility, setIsSubmittingMobility] = useState(false);

  // Actualizar estados cuando cambia el invitado
  useEffect(() => {
    setShowHealthForm(!guest.health_form_submitted);
    setShowMobilityForm(!guest.mobility_form_submitted);
    setDietaryRestrictions(guest.dietary_restrictions || '');
    setMobilityRestrictions(guest.mobility_restrictions || '');
  }, [guest]);
  const [imageBrightness, setImageBrightness] = useState<'light' | 'dark' | 'medium'>('medium');
  const [showContent, setShowContent] = useState(false);
  
  // Estados para el carrusel
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Obtener el tema seleccionado o usar el tema por defecto
  const template = getTemplateById(eventCard.event_type || 'wedding') || getTemplateById('wedding')!;
  const themeColors = eventCard.theme_colors || template.colors;
  const eventTypeLabelMap: Record<string, string> = {
    wedding: 'Boda',
    quinceanera: '15 Años',
    birthday: 'Cumpleaños',
    corporate: 'Empresarial',
    conference: 'Conferencia',
  };
  const eventTypeLabel = eventTypeLabelMap[eventCard.event_type || 'wedding'] || 'Evento';
  const isGuestConfirmed = guest.status === 'confirmed' || guest.confirmation_status === 'confirmed';
  const formattedEventDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.date));
  const eventShortDate = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(event.date));
  const eventTimeLabel = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(event.date));
  const eventOccasionTextMap: Record<string, string> = {
    wedding: 'A celebrar nuestro matrimonio',
    quinceanera: 'A vivir una noche inolvidable',
    birthday: 'A celebrar un dia muy especial',
    corporate: 'A compartir este gran evento',
    conference: 'A compartir una experiencia inspiradora',
  };
  const eventOccasionText = eventOccasionTextMap[eventCard.event_type || 'wedding'] || 'A celebrar juntos este momento';
  const countdownDescriptionMap: Record<string, string> = {
    wedding: 'Cada minuto nos acerca a un dia que queremos vivir contigo.',
    quinceanera: 'Cada instante nos acerca a una celebracion llena de magia, alegria y recuerdos inolvidables.',
    birthday: 'La cuenta regresiva ya comenzo para reunirnos, celebrar y pasarla increible.',
    corporate: 'Cada minuto nos acerca a una experiencia pensada para compartir, conectar y disfrutar juntos.',
    conference: 'Cada minuto nos acerca a una jornada de ideas, aprendizaje y encuentros valiosos.',
  };
  const countdownDescription = countdownDescriptionMap[eventCard.event_type || 'wedding'] || 'La cuenta regresiva ya comenzo para este gran evento.';
  const locationHeadingMap: Record<string, string> = {
    wedding: 'Te esperamos en un lugar muy especial',
    quinceanera: 'Te esperamos en un lugar pensado para una noche inolvidable',
    birthday: 'Te esperamos en el lugar donde comenzara la celebracion',
    corporate: 'El encuentro se llevara a cabo en este espacio',
    conference: 'La jornada se realizara en esta ubicación',
  };
  const locationHeading = locationHeadingMap[eventCard.event_type || 'wedding'] || 'Te esperamos en este lugar';
  const rsvpHeadingMap: Record<string, string> = {
    wedding: 'Nos encantaria contar contigo',
    quinceanera: 'Queremos celebrar contigo esta noche especial',
    birthday: 'Queremos celebrar este gran dia contigo',
    corporate: 'Confirma tu participación',
    conference: 'Confirma tu asistencia',
  };
  const rsvpHeading = rsvpHeadingMap[eventCard.event_type || 'wedding'] || 'Confirma tu asistencia';
  const rsvpDescriptionMap: Record<string, string> = {
    wedding: 'Confirma tu asistencia para reservar tu lugar y preparar cada detalle de este dia tan especial.',
    quinceanera: 'Confirma tu asistencia para preparar cada detalle y vivir juntos una celebracion inolvidable.',
    birthday: 'Confirma tu asistencia para prepararlo todo y disfrutar juntos esta celebracion.',
    corporate: 'Confirma tu participación para prepararnos y recibirte en este encuentro de la mejor manera.',
    conference: 'Confirma tu asistencia para organizar tu participación y brindarte una mejor experiencia durante la jornada.',
  };
  const rsvpDescription = rsvpDescriptionMap[eventCard.event_type || 'wedding'] || 'Confirma tu asistencia para reservar tu lugar.';
  const confirmedMessageMap: Record<string, string> = {
    wedding: 'Gracias por confirmar, te esperamos con muchisima ilusion.',
    quinceanera: 'Gracias por confirmar, sera un placer celebrar contigo esta noche tan especial.',
    birthday: 'Gracias por confirmar, nos encantara celebrar contigo.',
    corporate: 'Gracias por confirmar tu participación. Te esperamos en este encuentro.',
    conference: 'Gracias por confirmar tu asistencia. Te esperamos en la jornada.',
  };
  const confirmedMessage = confirmedMessageMap[eventCard.event_type || 'wedding'] || 'Gracias por confirmar tu asistencia.';
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location || eventCard.event_name)}`;
  const normalizedWhatsapp = eventCard.contact_whatsapp?.replace(/\D/g, '') || '';
  const whatsappUrl = normalizedWhatsapp ? `https://wa.me/${normalizedWhatsapp}` : '';
  const scheduleItems = [...(eventCard.event_schedule || [])].sort((a, b) => a.time.localeCompare(b.time));
  const renderPrimaryAttendanceCta = (fullWidth = false) => (
    isGuestConfirmed ? (
      <div className={`${fullWidth ? 'w-full' : ''} invitation-badge px-8 py-4 text-base font-medium tracking-wide relative overflow-hidden`}>
        <span className="flex items-center justify-center" style={{ color: themeColors.primary }}>
          <Check className="w-5 h-5 mr-2" />
          ¡Asistencia Confirmada!
        </span>
        <p className="text-xs mt-1 text-center" style={{ color: themeColors.text }}>
          {confirmedMessage}
        </p>
      </div>
    ) : (
      <button
        onClick={() => onConfirmAttendance(guest.id, true)}
        className={`invitation-primary-button group ${fullWidth ? 'w-full' : ''} px-6 py-4 md:px-10 md:py-4 rounded-full text-sm md:text-base font-medium tracking-[0.14em] uppercase transform transition hover:scale-[1.02] duration-300 ease-in-out relative overflow-hidden backdrop-blur-sm border border-white/30 text-white`}
        style={{ backgroundColor: themeColors.primary }}
      >
        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/25 via-transparent to-white/10 opacity-80" />
        <span className="relative flex items-center justify-center theme-text">
          <Heart className="w-5 h-5 mr-2" />
          Confirmar asistencia
        </span>
      </button>
    )
  );
  
  // Obtener la imagen de fondo seleccionada
  const selectedBackground = getBackgroundImage(eventCard.event_type || 'wedding', typeof eventCard.background_option === 'string' ? parseInt(eventCard.background_option) : (eventCard.background_option || 1));
  const heroImage = eventCard.main_image || selectedBackground;
  
  // Determinar el modelo de layout (por defecto 'cover' para compatibilidad)
  // Usar estado para layoutModel para asegurar que se actualice correctamente
  const [layoutModel, setLayoutModel] = useState(eventCard.card_model || 'cover');
  
  // Actualizar layoutModel cuando cambia eventCard.card_model
  useEffect(() => {
    setLayoutModel(eventCard.card_model || 'cover');
  }, [eventCard.card_model]);

  // Función para renderizar recomendaciones categorizadas
  const renderRecommendations = (styleProps: any = {}) => {
    // Si tiene el nuevo sistema de recomendaciones, usarlo
    if (eventCard.event_recommendations && eventCard.event_recommendations.length > 0) {
      // Agrupar por categoría
      const groupedRecommendations = eventCard.event_recommendations.reduce((acc, item) => {
        if (!acc[item.category_id]) {
          acc[item.category_id] = {
            category: {
              id: item.category_id,
              name: item.category_name,
              icon: item.category_icon
            },
            items: []
          };
        }
        acc[item.category_id].items.push(item);
        return acc;
      }, {} as Record<string, { category: { id: string; name: string; icon: string }; items: typeof eventCard.event_recommendations }>);

      return (
        <div className="grid gap-4 md:grid-cols-2" style={styleProps}>
          {Object.values(groupedRecommendations).map(({ category, items }) => (
            <div key={category.id} className="invitation-detail-card rounded-[24px] p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full text-lg" style={{ backgroundColor: `${themeColors.primary}18` }}>
                  {category.icon || '•'}
                </span>
                <div>
                  <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>
                    Recomendación
                  </p>
                  <h4 className="mt-1 text-base font-semibold capitalize" style={{ color: themeColors.text }}>
                    {category.name}
                  </h4>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="rounded-2xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.56)' }}>
                    <p className="text-sm leading-7" style={{ color: themeColors.text }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Fallback al sistema anterior si no hay recomendaciones categorizadas
    if (eventCard.recommendations) {
      return (
        <div className="invitation-detail-card rounded-[24px] p-5" style={styleProps}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: `${themeColors.primary}18` }}>
              <Star className="w-5 h-5" style={{ color: themeColors.primary }} />
            </span>
            <div>
              <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>
                Recomendaciones
              </p>
              <h4 className="mt-1 text-base font-semibold" style={{ color: themeColors.text }}>
                Ten en cuenta estos detalles
              </h4>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 whitespace-pre-wrap" style={{ color: themeColors.text }}>
            {eventCard.recommendations}
          </p>
        </div>
      );
    }

    return null;
  };

  // Funciones para el carrusel
  const galleryImages = eventCard.gallery_images?.filter(img => img) || [];
  const totalSlides = galleryImages.length;

  const nextSlide = () => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const prevSlide = () => {
    if (isTransitioning || totalSlides <= 1) return;
    setIsTransitioning(true);
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const goToSlide = (index: number) => {
    if (isTransitioning || index === currentSlide) return;
    setIsTransitioning(true);
    setCurrentSlide(index);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  // Auto-play cada 3 segundos
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    
    const interval = setInterval(() => {
      nextSlide();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [currentSlide, totalSlides, isPaused, isTransitioning]);

  // Función para detectar luminosidad de la imagen
  const detectImageBrightness = useCallback((imageUrl: string) => {
    if (!imageUrl) return;
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        let brightness = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          brightness += (r * 299 + g * 587 + b * 114) / 1000;
        }

        const avgBrightness = brightness / (data.length / 4);
        
        if (avgBrightness > 180) {
          setImageBrightness('light');
        } else if (avgBrightness < 80) {
          setImageBrightness('dark');
        } else {
          setImageBrightness('medium');
        }
      } catch (error) {
        console.log('Error detecting image brightness:', error);
        setImageBrightness('medium');
      }
    };
    
    img.onerror = () => {
      setImageBrightness('medium');
    };
    
    img.src = imageUrl;
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const eventDate = new Date(event.date);
      const now = new Date();
      const difference = eventDate.getTime() - now.getTime();

      if (difference <= 0) return 'El evento ya comenzó';

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      return `${days}d ${hours}h ${minutes}m`;
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 60000);
    return () => clearInterval(timer);
  }, [event.date]);

  // Detectar luminosidad cuando cambie la imagen de fondo
  useEffect(() => {
    if (layoutModel === 'fixed-background' && eventCard.main_image) {
      detectImageBrightness(eventCard.main_image);
    }
  }, [layoutModel, eventCard.main_image, detectImageBrightness]);

  // Animación de entrada retardada para modelo de fondo fijo
  useEffect(() => {
    if (layoutModel === 'fixed-background') {
      setShowContent(false);
      const timer = setTimeout(() => {
        setShowContent(true);
      }, 4000);
      
      return () => clearTimeout(timer);
    } else {
      setShowContent(true);
    }
  }, [layoutModel]);
  
  // Efecto para actualizar el componente cuando cambian las props
  useEffect(() => {
    // Reiniciar estados cuando cambia la tarjeta o el evento
    if (layoutModel === 'fixed-background' && eventCard.main_image) {
      detectImageBrightness(eventCard.main_image);
    }
    
    // Forzar actualización del componente
    setShowContent(false);
    setTimeout(() => setShowContent(true), 100);
  }, [eventCard, event, detectImageBrightness, layoutModel]);

  const renderPremiumInvitationLayout = () => {
    const visualMoments = galleryImages
      .filter(Boolean)
      .filter((image) => image !== heroImage)
      .slice(0, 3);

    return (
      <ThemeStyles
        eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"}
        themeColors={themeColors}
        singleFont
      >
        <div
          className="invitation-frame max-w-5xl mx-auto relative"
          style={{
            backgroundImage: `url(${selectedBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          <ThemeDecorations
            eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"}
            themeColors={{
              primary: themeColors.primary,
              secondary: themeColors.secondary,
              accent: themeColors.accent
            }}
          />

          <div
            className="absolute inset-0 border-[16px] border-double rounded-xl pointer-events-none opacity-30"
            style={{ borderColor: themeColors.accent }}
          />

          <div className="relative min-h-[88vh] overflow-hidden">
            <img
              src={heroImage}
              alt="Portada del evento"
              className="w-full h-full absolute inset-0 object-cover"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(180deg,rgba(29,29,29,0.12)_0%,rgba(29,29,29,0.28)_35%,rgba(29,29,29,0.76)_100%)]" />

            <div className="relative z-10 flex min-h-[88vh] flex-col justify-between px-5 py-6 sm:px-8 sm:py-8">
              <div className="flex items-start justify-between gap-4">
                <span className="invitation-kicker" style={{ color: '#ffffff' }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  {eventTypeLabel}
                </span>
                {isGuestConfirmed && (
                  <div className="invitation-badge text-white font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: 'white' }}>
                    <Check className="w-4 h-4" />
                    <span>Confirmado</span>
                  </div>
                )}
              </div>

              <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
                <div className="invitation-soft-panel w-full rounded-[32px] px-6 py-8 sm:px-10 sm:py-12" style={{ backgroundColor: 'rgba(255,255,255,0.28)' }}>
                  <p className="text-sm font-medium uppercase tracking-[0.35em] text-black/85">Estás invitado</p>
                  <h1
                    className={`theme-title mt-5 ${
                      eventCard.event_name.length > 25 ? 'very-long-title' :
                      eventCard.event_name.length > 15 ? 'long-title' : ''
                    }`}
                    style={{ color: '#000000', textShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                  >
                    {eventCard.event_name}
                  </h1>
                  <p className="mt-4 text-lg sm:text-xl italic text-black/70">{eventOccasionText}</p>

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-black/75">
                    <span className="rounded-full border border-white/40 bg-white/45 px-4 py-2 backdrop-blur-md">
                      {eventShortDate}
                    </span>
                    <span className="rounded-full border border-white/40 bg-white/45 px-4 py-2 backdrop-blur-md">
                      {eventTimeLabel}
                    </span>
                  </div>

                  <div className="mt-8 flex justify-center">
                    {renderPrimaryAttendanceCta()}
                  </div>
                </div>
              </div>

              <div className="mx-auto mt-6 grid w-full max-w-lg grid-cols-2 gap-3">
                <div className="invitation-soft-panel rounded-2xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                  <Gift className="mx-auto mb-2 h-5 w-5 text-black" />
                  <p className="text-[11px] uppercase tracking-[0.24em] text-black/70">Invitado</p>
                  <p className="mt-1 text-sm font-medium text-black">#{guest.guest_number}</p>
                </div>
                <div className="invitation-soft-panel rounded-2xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                  <Music className="mx-auto mb-2 h-5 w-5 text-black" />
                  <p className="text-[11px] uppercase tracking-[0.24em] text-black/70">Mesa</p>
                  <p className="mt-1 text-sm font-medium text-black">#{guest.table_number || '--'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">
            {visualMoments.length > 0 && (
              <div className="invitation-panel rounded-[30px] p-6 md:p-8">
                <div className="text-center">
                  <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Recuerdos
                  </span>
                </div>
                <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-7" style={{ color: themeColors.text }}>
                  Una pequeña mirada a la esencia de este dia tan especial.
                </p>
                <div className={`mt-6 grid gap-4 ${visualMoments.length === 1 ? 'grid-cols-1' : visualMoments.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                  {visualMoments.map((image, index) => (
                    <div key={`${image}-${index}`} className="invitation-soft-panel overflow-hidden rounded-[26px] p-3">
                      <div className="overflow-hidden rounded-[20px]">
                        <img
                          src={image}
                          alt={`Momento ${index + 1}`}
                          className="h-64 w-full object-cover transition-transform duration-700 hover:scale-105"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SectionSeparator
              eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"}
              themeColors={{
                primary: themeColors.primary,
                secondary: themeColors.secondary,
                accent: themeColors.accent
              }}
            />

            <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="invitation-panel rounded-[30px] p-6 md:p-8 text-center lg:text-left">
                <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                  <Clock className="w-3.5 h-3.5" />
                  Cuenta regresiva
                </span>
                <p className="mt-5 text-sm uppercase tracking-[0.28em]" style={{ color: themeColors.primary }}>Faltan</p>
                <p className="mt-2 text-5xl md:text-6xl font-semibold" style={{ color: themeColors.text }}>
                  {timeLeft}
                </p>
                <p className="mt-4 text-base leading-7" style={{ color: themeColors.text }}>
                  {countdownDescription}
                </p>
              </div>

              <div className="space-y-4">
                <div className="invitation-detail-card rounded-[26px] p-5">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Fecha</p>
                      <p className="mt-1 text-base leading-7" style={{ color: themeColors.text }}>{formattedEventDate}</p>
                    </div>
                  </div>
                </div>
                <div className="invitation-detail-card rounded-[26px] p-5">
                  <div className="flex items-center gap-3">
                    <Heart className="w-5 h-5" style={{ color: themeColors.primary }} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Celebración</p>
                      <p className="mt-1 text-base leading-7" style={{ color: themeColors.text }}>{eventOccasionText}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="invitation-panel rounded-[30px] p-6 md:p-8">
              <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                <div>
                  <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                    <MapPin className="w-3.5 h-3.5" />
                    Ubicación
                  </span>
                  <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                    {locationHeading}
                  </h3>
                  <p className="mt-4 text-base leading-8" style={{ color: themeColors.text }}>
                    {event.location}
                  </p>
                  <div className="mt-6">
                    <a
                      href={googleMapsSearchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="invitation-primary-button inline-flex items-center rounded-full px-7 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white"
                      style={{ backgroundColor: themeColors.primary }}
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      Ver en Google Maps
                    </a>
                  </div>
                </div>

                {eventCard.event_location && (
                  <div className="invitation-soft-panel overflow-hidden rounded-[28px] p-3">
                    <div
                      className="h-[320px] overflow-hidden rounded-[22px]"
                      dangerouslySetInnerHTML={{
                        __html: eventCard.event_location.replace(
                          'frameborder="0"',
                          'style="border:0; width:100%; height:100%;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"'
                        )
                      }}
                    />
                  </div>
                )}
              </div>
            </section>

            {scheduleItems.length > 0 && (
              <section className="invitation-panel rounded-[30px] p-6 md:p-8">
                <div className="text-center">
                  <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                    <Timer className="w-3.5 h-3.5" />
                    Cronograma
                  </span>
                  <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                    Asi viviremos el evento
                  </h3>
                </div>

                <div className="relative mx-auto mt-8 max-w-3xl">
                  <div className="absolute left-5 top-0 bottom-0 hidden w-px md:block" style={{ background: `linear-gradient(to bottom, transparent, ${themeColors.accent}, transparent)` }} />
                  <div className="space-y-4">
                    {scheduleItems.map((item) => (
                      <div key={item.id} className="invitation-detail-card relative rounded-[24px] p-5 md:pl-14">
                        <div className="absolute left-[14px] top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 md:block" style={{ backgroundColor: themeColors.primary, borderColor: '#ffffff' }} />
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
                          <div className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: `${themeColors.primary}18`, color: themeColors.primary }}>
                            {item.time}
                          </div>
                          <p className="text-base leading-7" style={{ color: themeColors.text }}>
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {((eventCard.event_recommendations && eventCard.event_recommendations.length > 0) || eventCard.recommendations) && (
              <section className="invitation-panel rounded-[30px] p-6 md:p-8">
                <div className="text-center">
                  <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                    <Star className="w-3.5 h-3.5" />
                    Recomendaciones
                  </span>
                </div>
                <div className="mt-6">
                  {renderRecommendations()}
                </div>
              </section>
            )}

            {(eventCard.include_health_form || eventCard.include_mobility_form) && (
              <section className="space-y-5">
                <div className="text-center">
                  <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                    <Sparkles className="w-3.5 h-3.5" />
                    Detalles para recibirte mejor
                  </span>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {eventCard.include_health_form && (
                    <div className="invitation-panel rounded-[30px] p-6">
                      <div className="flex items-center gap-3">
                        <Utensils className="w-5 h-5" style={{ color: themeColors.primary }} />
                        <h3 className="text-xl" style={{ color: themeColors.text }}>Salud y alimentacion</h3>
                      </div>
                      <p className="mt-3 text-sm leading-7" style={{ color: themeColors.text }}>
                        Queremos prepararlo todo para que disfrutes el evento con total tranquilidad.
                      </p>

                      {showHealthForm ? (
                        <div className="mt-5 space-y-3">
                          {['Ninguna', 'Vegetariano', 'Vegano', 'Sin Gluten', 'Sin Lactosa', 'Diabético'].map((option) => (
                            <label key={option} className="invitation-detail-card flex cursor-pointer items-center gap-3 rounded-2xl p-4">
                              <input
                                type="radio"
                                name="dietary"
                                value={option}
                                checked={dietaryRestrictions === option}
                                onChange={(e) => setDietaryRestrictions(e.target.value)}
                                style={{ accentColor: themeColors.primary }}
                              />
                              <span style={{ color: themeColors.text }}>{option}</span>
                            </label>
                          ))}
                          <button
                            onClick={async () => {
                              setIsSubmittingHealth(true);
                              try {
                                await onUpdateGuest({
                                  ...guest,
                                  dietary_restrictions: dietaryRestrictions || 'Ninguna',
                                  health_form_submitted: true
                                });
                                setShowHealthForm(false);
                              } catch {}
                              finally { setIsSubmittingHealth(false); }
                            }}
                            disabled={isSubmittingHealth}
                            className="invitation-primary-button mt-3 w-full rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{ backgroundColor: themeColors.primary }}
                          >
                            {isSubmittingHealth ? 'Guardando...' : 'Guardar preferencia'}
                          </button>
                        </div>
                      ) : (
                        <div className="invitation-soft-panel mt-5 rounded-2xl p-5 text-center">
                          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Tu respuesta</p>
                          <p className="mt-2 text-base font-medium" style={{ color: themeColors.text }}>
                            {guest.dietary_restrictions || 'Ninguna'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {eventCard.include_mobility_form && (
                    <div className="invitation-panel rounded-[30px] p-6">
                      <div className="flex items-center gap-3">
                        <Accessibility className="w-5 h-5" style={{ color: themeColors.primary }} />
                        <h3 className="text-xl" style={{ color: themeColors.text }}>Movilidad y accesibilidad</h3>
                      </div>
                      <p className="mt-3 text-sm leading-7" style={{ color: themeColors.text }}>
                        Si necesitas apoyo especial, queremos saberlo para recibirte de la mejor manera.
                      </p>

                      {showMobilityForm ? (
                        <div className="mt-5 space-y-3">
                          {['Ninguna', 'Silla de Ruedas', 'Bastón', 'Andador'].map((option) => (
                            <label key={option} className="invitation-detail-card flex cursor-pointer items-center gap-3 rounded-2xl p-4">
                              <input
                                type="radio"
                                name="mobility"
                                value={option}
                                checked={mobilityRestrictions === option}
                                onChange={(e) => setMobilityRestrictions(e.target.value)}
                                style={{ accentColor: themeColors.primary }}
                              />
                              <span style={{ color: themeColors.text }}>{option}</span>
                            </label>
                          ))}
                          <button
                            onClick={async () => {
                              setIsSubmittingMobility(true);
                              try {
                                await onUpdateGuest({
                                  ...guest,
                                  mobility_restrictions: mobilityRestrictions || 'Ninguna',
                                  mobility_form_submitted: true
                                });
                                setShowMobilityForm(false);
                              } catch {}
                              finally { setIsSubmittingMobility(false); }
                            }}
                            disabled={isSubmittingMobility}
                            className="invitation-primary-button mt-3 w-full rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{ backgroundColor: themeColors.primary }}
                          >
                            {isSubmittingMobility ? 'Guardando...' : 'Guardar informacion'}
                          </button>
                        </div>
                      ) : (
                        <div className="invitation-soft-panel mt-5 rounded-2xl p-5 text-center">
                          <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Tu respuesta</p>
                          <p className="mt-2 text-base font-medium" style={{ color: themeColors.text }}>
                            {guest.mobility_restrictions || 'Ninguna'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="invitation-panel rounded-[30px] px-6 py-8 text-center md:px-10">
              <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                <Heart className="w-3.5 h-3.5" />
                RSVP
              </span>
              <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                {rsvpHeading}
              </h3>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-8" style={{ color: themeColors.text }}>
                {rsvpDescription}
              </p>
              <div className="mx-auto mt-8 flex max-w-md justify-center">
                {renderPrimaryAttendanceCta(true)}
              </div>
            </section>

            {eventCard.show_contact_footer && (
              <section className="invitation-panel rounded-[30px] p-6 md:p-8 text-center">
                <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                  <Mail className="w-3.5 h-3.5" />
                  Contacto
                </span>
                <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                  Estamos para ayudarte
                </h3>

                {eventCard.contact_message && (
                  <p className="mx-auto mt-4 max-w-2xl text-base leading-8 whitespace-pre-wrap" style={{ color: themeColors.text }}>
                    {eventCard.contact_message}
                  </p>
                )}

                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  {whatsappUrl && (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-w-[220px] items-center justify-center rounded-full px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-white shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      WhatsApp
                    </a>
                  )}

                  {eventCard.contact_email && (
                    <a
                      href={`mailto:${eventCard.contact_email}`}
                      className="inline-flex min-w-[220px] items-center justify-center rounded-full px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-white shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                      style={{ backgroundColor: themeColors.primary }}
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </a>
                  )}
                </div>

                {(eventCard.facebook_url || eventCard.instagram_url) && (
                  <div className="mt-8 flex justify-center gap-4">
                    {eventCard.facebook_url && (
                      <a
                        href={eventCard.facebook_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="invitation-soft-panel rounded-full p-4 transition-transform duration-300 hover:scale-105"
                      >
                        <Facebook className="h-5 w-5" style={{ color: themeColors.primary }} />
                      </a>
                    )}
                    {eventCard.instagram_url && (
                      <a
                        href={eventCard.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="invitation-soft-panel rounded-full p-4 transition-transform duration-300 hover:scale-105"
                      >
                        <Instagram className="h-5 w-5" style={{ color: themeColors.primary }} />
                      </a>
                    )}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </ThemeStyles>
    );
  };

  if (['portada', 'circular', 'gallery', 'fixed-background', 'cover'].includes(layoutModel)) {
    return renderPremiumInvitationLayout();
  }

  // Renderizar modelo portada
  if (eventCard.card_model === 'portada') {
    return (
      <ThemeStyles 
        eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
        themeColors={themeColors}
        singleFont
      >
        <div 
          className="invitation-frame max-w-5xl mx-auto relative"
          style={{
            backgroundImage: `url(${selectedBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* Contenedor de contenido scrolleable */}
          <div className="relative z-10 h-full overflow-y-auto" style={{
            backgroundColor: 'transparent'
          }}>

          {/* Elementos decorativos SVG por tipo de evento */}
          {eventCard.event_type === 'wedding' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#d4af37" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#86efac" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#86efac" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#86efac" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#86efac" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#86efac" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#86efac" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#86efac" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 82 72 88 Q62 94 52 84" stroke="#d4af37" strokeWidth="1.2" fill="none" opacity="0.3"/>
                  <ellipse cx="82" cy="88" rx="4" ry="2" fill="#86efac" opacity="0.3" transform="rotate(15 82 88)"/>
                  <ellipse cx="72" cy="90" rx="3" ry="1.5" fill="#86efac" opacity="0.2" transform="rotate(-25 72 90)"/>
                  <circle cx="77" cy="89" r="1" fill="#fbbf24" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}

          {/* Decoraciones para quinceañeras */}
          {eventCard.event_type === 'quinceanera' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#e91e63" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#f8bbd9" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#f8bbd9" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#f8bbd9" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#ec4899" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#ec4899" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#e91e63" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#f8bbd9" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#f8bbd9" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#ec4899" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#e91e63" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#f8bbd9" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#f8bbd9" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#ec4899" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 82 72 88 Q62 94 52 84" stroke="#e91e63" strokeWidth="1.2" fill="none" opacity="0.3"/>
                  <ellipse cx="82" cy="88" rx="4" ry="2" fill="#f8bbd9" opacity="0.3" transform="rotate(15 82 88)"/>
                  <ellipse cx="72" cy="90" rx="3" ry="1.5" fill="#f8bbd9" opacity="0.2" transform="rotate(-25 72 90)"/>
                  <circle cx="77" cy="89" r="1" fill="#ec4899" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}

          {/* Decoraciones para cumpleaños */}
          {eventCard.event_type === 'birthday' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#ff6b35" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#ffb366" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#ffb366" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#ffb366" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#f59e0b" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#f59e0b" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#ff6b35" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#ffb366" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#ffb366" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#f59e0b" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#ff6b35" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#ffb366" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#ffb366" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#f59e0b" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 82 72 88 Q62 94 52 84" stroke="#ff6b35" strokeWidth="1.2" fill="none" opacity="0.3"/>
                  <ellipse cx="82" cy="88" rx="4" ry="2" fill="#ffb366" opacity="0.3" transform="rotate(15 82 88)"/>
                  <ellipse cx="72" cy="90" rx="3" ry="1.5" fill="#ffb366" opacity="0.2" transform="rotate(-25 72 90)"/>
                  <circle cx="77" cy="89" r="1" fill="#f59e0b" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}

          {/* Decoraciones para eventos empresariales */}
          {eventCard.event_type === 'corporate' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#1e40af" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#60a5fa" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#60a5fa" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#60a5fa" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#3b82f6" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#3b82f6" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#1e40af" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#60a5fa" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#60a5fa" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#3b82f6" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#1e40af" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#60a5fa" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#60a5fa" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#3b82f6" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 82 72 88 Q62 94 52 84" stroke="#1e40af" strokeWidth="1.2" fill="none" opacity="0.3"/>
                  <ellipse cx="82" cy="88" rx="4" ry="2" fill="#60a5fa" opacity="0.3" transform="rotate(15 82 88)"/>
                  <ellipse cx="72" cy="90" rx="3" ry="1.5" fill="#60a5fa" opacity="0.2" transform="rotate(-25 72 90)"/>
                  <circle cx="77" cy="89" r="1" fill="#3b82f6" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}

          {/* Decoraciones para conferencias */}
          {eventCard.event_type === 'conference' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#7c3aed" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#a78bfa" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#a78bfa" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#a78bfa" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#8b5cf6" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#8b5cf6" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#a78bfa" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#a78bfa" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#8b5cf6" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#a78bfa" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#a78bfa" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#8b5cf6" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 82 72 88 Q62 94 52 84" stroke="#7c3aed" strokeWidth="1.2" fill="none" opacity="0.3"/>
                  <ellipse cx="82" cy="88" rx="4" ry="2" fill="#a78bfa" opacity="0.3" transform="rotate(15 82 88)"/>
                  <ellipse cx="72" cy="90" rx="3" ry="1.5" fill="#a78bfa" opacity="0.2" transform="rotate(-25 72 90)"/>
                  <circle cx="77" cy="89" r="1" fill="#8b5cf6" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}
            
            {/* Imagen de portada rectangular centrada - Responsive */}
            <div className="flex justify-center pt-6 md:pt-10 pb-4 md:pb-6 px-4 md:px-8">
              <div className="relative overflow-hidden rounded-lg md:rounded-xl shadow-2xl w-[90%] max-w-[500px] h-48 md:h-72">
                <img
                  src={eventCard.main_image}
                  alt="Portada del evento"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Sección de bienvenida - Usando la misma estructura que circular/galería */}
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <div 
                className="text-center p-4 md:p-6 rounded-lg border space-y-4 md:space-y-6"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
              >
                <div className="flex items-center justify-center space-x-2 text-sm">
                  <Sparkles className="w-4 h-4" style={{ color: themeColors.primary }} />
                  <span className="tracking-wider theme-text font-bold" style={{ 
                    color: themeColors.primary
                  }}>
                    Invitación Especial
                  </span>
                </div>
                
                <h2 
                  className="text-2xl tracking-wide relative pb-2 theme-text font-bold"
                  style={{ 
                    color: themeColors.text
                  }}
                >
                  ¡Hola {guest.name || 'Invitado'}!
                  <span 
                    className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
                  />
                </h2>
                
                <p 
                  className="italic text-lg tracking-wide theme-text font-bold"
                  style={{ 
                    color: themeColors.text
                  }}
                >
                  Has sido invitado a
                </p>
                
                <h1 
                  className={`theme-title relative font-bold ${
                    eventCard.event_name.length > 25 ? 'very-long-title' : 
                    eventCard.event_name.length > 15 ? 'long-title' : ''
                  }`}
                  style={{ 
                    color: themeColors.text
                  }}
                >
                  {eventCard.event_name}
                  <span 
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-px"
                    style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
                  />
                </h1>
                
                {guest.status === 'confirmed' && (
                  <div 
                    className="inline-flex items-center rounded-full px-6 py-3 border-2 shadow-sm theme-text"
                    style={{ 
                      backgroundColor: `${themeColors.primary}20`,
                      borderColor: `${themeColors.primary}40`,
                      color: themeColors.primary
                    }}
                  >
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">¡Asistencia Confirmada!</span>
                  </div>
                )}
              </div>

              {/* Separador decorativo específico por tipo de evento */}
              <SectionSeparator 
                eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
                themeColors={{
                  primary: themeColors.primary,
                  secondary: themeColors.secondary,
                  accent: themeColors.accent
                }}
              />
            </div>

            {/* Cronómetro cuenta regresiva - Usando la misma estructura que circular/galería */}
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <div 
                className="text-center rounded-xl p-8 border transform hover:scale-102 transition-transform duration-300 shadow-md theme-text bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundImage: eventCard.event_type === 'wedding' 
                    ? 'none'
                    : eventCard.event_type === 'birthday'
                    ? 'none'
                    : eventCard.event_type === 'quinceanera'
                    ? 'none'
                    : eventCard.event_type === 'corporate'
                    ? 'none'
                    : eventCard.event_type === 'conference'
                    ? 'none'
                    : `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.accent} 100%)`,
                  backgroundColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                  backdropFilter: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'blur(2px)' : 'none',
                  borderColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.1)' : `${themeColors.primary}30`,
                  backgroundSize: '100% 100%'
                }}
              >
                <div className="relative z-10 rounded-lg p-4">
                  <p 
                    className="text-sm font-medium uppercase tracking-wide mb-2 theme-text"
                    style={{ color: themeColors.primary }}
                  >
                    Faltan
                  </p>
                  <Clock 
                    className="w-6 h-6 mx-auto mt-2 animate-pulse" 
                    style={{ color: themeColors.primary }}
                  />
                  <p 
                    className="text-2xl font-bold mt-1 theme-text"
                    style={{ 
                      background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.text} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text'
                    }}
                  >
                    {timeLeft}
                  </p>
                </div>
              </div>

              {/* Separador decorativo específico por tipo de evento */}
              <SectionSeparator 
                eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
                themeColors={{
                  primary: themeColors.primary,
                  secondary: themeColors.secondary,
                  accent: themeColors.accent
                }}
              />
            </div>

            {/* Event Details - Fecha y Ubicación */}
            <div className="px-4 md:px-6 pb-4 md:pb-6">
              <div className="space-y-4 theme-text">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className="flex items-center space-x-3 p-4 rounded-lg transition-colors duration-300 theme-text"
                    style={eventCard.event_type === 'wedding' ? { 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)'
                    } : { 
                      backgroundColor: `${themeColors.secondary}`
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.1)' : themeColors.secondary}
                  >
                    <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                    <span className="theme-text" style={{ color: themeColors.text }}>
                      {new Date(event.date).toLocaleDateString('es-ES', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>

                  <div 
                    className="flex items-center space-x-3 p-4 rounded-lg transition-colors duration-300 theme-text"
                    style={eventCard.event_type === 'wedding' ? { 
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)'
                    } : { 
                      backgroundColor: `${themeColors.secondary}`
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.1)' : themeColors.secondary}
                  >
                    <MapPin className="w-5 h-5" style={{ color: themeColors.primary }} />
                    <span className="theme-text" style={{ color: themeColors.text }}>{event.location}</span>
                  </div>
                </div>

                {/* Separador decorativo */}
                <SectionSeparator 
                  eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
                  themeColors={{
                    primary: themeColors.primary,
                    secondary: themeColors.secondary,
                    accent: themeColors.accent
                  }} 
                />

                {/* Confirmation Button */}
                <div className="flex justify-center pt-4">
                  {guest.status === 'confirmed' ? (
                    <div className="px-12 py-4 rounded-full text-base font-medium tracking-wide shadow-lg relative overflow-hidden ring-2 ring-offset-2 bg-green-100 border-green-300">
                      <span className="flex items-center justify-center text-green-700">
                        <Check className="w-5 h-5 mr-2" />
                        ¡Asistencia Confirmada!
                      </span>
                      <p className="text-xs text-green-600 mt-1 text-center">
                        Tu confirmación ha sido registrada exitosamente
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => onConfirmAttendance(guest.id, true)}
                      className="group px-6 py-3 md:px-12 md:py-4 rounded-full text-sm md:text-base font-medium tracking-wide shadow-lg transform transition hover:scale-105 duration-300 ease-in-out relative overflow-hidden ring-2 ring-offset-2 theme-text"
                      style={{
                        backgroundColor: themeColors.primary,
                        color: 'white',
                        borderColor: `${themeColors.primary}60`
                      }}
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/20 to-transparent transform -skew-x-45 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      <span className="relative flex items-center justify-center theme-text">
                        <Heart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Confirmar Asistencia
                      </span>
                    </button>
                  )}
                </div>

                {/* Código y Mesa */}
                <div className="flex justify-center space-x-8 pt-4">
                  <div className="text-center">
                    <Gift className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Código: #{guest.guest_number}</p>
                  </div>
                  <div className="text-center">
                    <Music className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Mesa: #{guest.table_number || '--'}</p>
                  </div>
                </div>
              </div>

              {/* Google Maps */}
              {eventCard.event_location && (
                <div className="rounded-xl overflow-hidden shadow-lg transform hover:scale-102 transition-transform duration-300 mx-auto max-w-2xl mt-6">
                  <div
                    className="h-48"
                    dangerouslySetInnerHTML={{
                      __html: eventCard.event_location.replace(
                        'frameborder="0"',
                        'frameborder="0" style="border:0; width:100%; height:100%;"'
                      )
                    }}
                  />
                </div>
              )}
            </div>

            {/* Cronograma Section - Usando la misma estructura que circular/galería */}
            {(eventCard.show_cronograma || eventCard.event_schedule?.length > 0) && (eventCard.event_schedule && eventCard.event_schedule.length > 0) && (
              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="rounded-lg p-4 border" style={(eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}>
                  <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center justify-center">
                    <Timer className="w-4 h-4 mr-2 text-amber-600" />
                    Cronograma del Evento
                  </h3>
                  <div className="space-y-1.5">
                    {(eventCard.event_schedule || []).map((item) => (
                      <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md" style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(1px)'
                      }}>
                        <div className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            backdropFilter: 'blur(1px)'
                          }}>
                            <Clock className="w-3 h-3 text-amber-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-xs font-semibold text-amber-700">{item.time}</span>
                            <span className="text-gray-500 text-xs">•</span>
                            <span className="text-xs text-gray-700">{item.description}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recommendations - Usando la misma estructura que circular/galería */}
            {(eventCard.event_recommendations?.length > 0 || eventCard.recommendations) && (
              <div className="px-4 md:px-6 pb-4 md:pb-6">
                <div className="bg-cover bg-center bg-no-repeat rounded-lg p-4 border border-indigo-100/50" style={(eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : {
                  backgroundImage: 'none',
                  backgroundColor: 'transparent'
                }}>
                  {renderRecommendations()}
                </div>
              </div>
            )}


            {/* Forms Section - Usando la misma estructura que circular/galería */}
            {(eventCard.include_health_form || eventCard.include_mobility_form) && (
              <div className="px-4 md:px-6 pb-4 md:pb-6 text-center">
                <div className="space-y-4 flex flex-col items-center">
                  {eventCard.include_health_form && (
                    <div className={`bg-cover bg-center bg-no-repeat rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 w-full max-w-md ${!showHealthForm ? 'opacity-75' : ''}`} style={eventCard.event_type === 'wedding' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : eventCard.event_type === 'birthday' || eventCard.event_type === 'quinceanera' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : eventCard.event_type === 'corporate' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : eventCard.event_type === 'conference' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : {
                      backgroundSize: '100% 100%'
                    }}>
                      <div className="flex items-center justify-center space-x-2 mb-3">
                        <Utensils className="w-4 h-4 text-indigo-600" />
                        <h3 className="text-base font-medium text-gray-900">Información de Salud</h3>
                      </div>
                      {showHealthForm ? (
                        <div className="space-y-3 flex flex-col items-center">
                          <div className="space-y-1">
                            <p className="text-sm text-gray-600">¿Tienes alguna restricción alimentaria?</p>
                            <div className="space-y-2 flex flex-col">
                              {['Ninguna', 'Diabético', 'Celíaco', 'Vegetariano', 'Vegano'].map((option) => (
                                <label key={option} className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="dietary"
                                    value={option}
                                    checked={dietaryRestrictions === option}
                                    onChange={(e) => setDietaryRestrictions(e.target.value)}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              setIsSubmittingHealth(true);
                              try {
                                const finalDietaryRestrictions = dietaryRestrictions || 'Ninguna';
                                await onUpdateGuest({
                                  ...guest,
                                  dietary_restrictions: finalDietaryRestrictions,
                                  health_form_submitted: true
                                });
                                setShowHealthForm(false);
                              } catch {
                                // Solo ocultar en success; estado se actualiza desde backend
                              } finally {
                                setIsSubmittingHealth(false);
                              }
                            }}
                            disabled={isSubmittingHealth}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                          >
                            {isSubmittingHealth ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Enviar'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Tu respuesta</p>
                          <p className="font-medium text-gray-900 mt-1">{guest.dietary_restrictions || 'Ninguna'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {eventCard.include_mobility_form && (
                    <div className={`bg-cover bg-center bg-no-repeat rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 ${!showMobilityForm ? 'opacity-75' : ''}`} style={eventCard.event_type === 'wedding' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : eventCard.event_type === 'birthday' || eventCard.event_type === 'quinceanera' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : eventCard.event_type === 'corporate' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : eventCard.event_type === 'conference' ? {
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      backdropFilter: 'blur(2px)',
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    } : {
                      backgroundSize: '100% 100%'
                    }}>
                      <div className="flex items-center justify-center space-x-2 mb-4">
                        <Accessibility className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-medium text-gray-900">Información de Movilidad</h3>
                      </div>
                      {showMobilityForm ? (
                        <div className="space-y-4 flex flex-col items-center">
                          <div className="space-y-2">
                            <p className="text-sm text-gray-600">¿Necesitas asistencia especial de movilidad?</p>
                            <div className="space-y-2 flex flex-col">
                              {['Ninguna', 'Silla de Ruedas'].map((option) => (
                                <label key={option} className="flex items-center cursor-pointer">
                                  <input
                                    type="radio"
                                    name="mobility"
                                    value={option}
                                    checked={mobilityRestrictions === option}
                                    onChange={(e) => setMobilityRestrictions(e.target.value)}
                                    className="text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700">{option}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              setIsSubmittingMobility(true);
                              try {
                                const finalMobilityRestrictions = mobilityRestrictions || 'Ninguna';
                                await onUpdateGuest({
                                  ...guest,
                                  mobility_restrictions: finalMobilityRestrictions,
                                  mobility_form_submitted: true
                                });
                                setShowMobilityForm(false);
                              } catch {
                                // Solo ocultar en success
                              } finally {
                                setIsSubmittingMobility(false);
                              }
                            }}
                            disabled={isSubmittingMobility}
                            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                          >
                            {isSubmittingMobility ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Enviar'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <p className="text-sm text-gray-600">Tu respuesta</p>
                          <p className="font-medium text-gray-900 mt-1">{guest.mobility_restrictions || 'Ninguna'}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contact Footer - Usando la misma estructura que circular/galería */}
            {eventCard.show_contact_footer && (
              <div className="mt-8 pt-8 pb-12 border-t border-gray-200" style={eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'none'
              } : {}}>
                <div className="text-center space-y-6">
                  {eventCard.contact_message && (
                    <p className="text-gray-600 italic text-lg px-6 leading-relaxed">{eventCard.contact_message}</p>
                  )}

                  <div className="flex justify-center space-x-4">
                    {eventCard.contact_whatsapp && (
                      <a
                        href={`https://wa.me/${eventCard.contact_whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm border border-transparent font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        WhatsApp
                      </a>
                    )}

                    {eventCard.contact_email && (
                      <a
                        href={`mailto:${eventCard.contact_email}`}
                        className="inline-flex items-center px-4 py-2 text-sm border border-transparent font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        Email
                      </a>
                    )}
                  </div>

                  {(eventCard.facebook_url || eventCard.instagram_url) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500 tracking-wide">Síguenos en redes sociales</p>
                      <div className="flex justify-center space-x-6">
                        <div className="flex space-x-4">
                      {eventCard.facebook_url && (
                        <a
                          href={eventCard.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transform hover:scale-110 transition-all duration-200 p-2"
                        >
                          <Facebook className="h-6 w-6" />
                        </a>
                      )}

                      {eventCard.instagram_url && (
                        <a
                          href={eventCard.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-800 transform hover:scale-110 transition-all duration-200 p-2"
                        >
                          <Instagram className="h-6 w-6" />
                        </a>
                      )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
          </div>
        </div>
      </ThemeStyles>
    );
  }

  // Renderizar modelo circular
  if (eventCard.card_model === 'circular') {
    return (
      <ThemeStyles 
        eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
        themeColors={themeColors}
        singleFont
      >
        <div 
          className="invitation-frame max-w-5xl mx-auto relative"
          style={{
            backgroundImage: `url(${selectedBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* Contenedor de contenido scrolleable completamente transparente */}
          <div className="relative z-10 h-full overflow-y-auto" style={{
            backgroundColor: 'transparent'
          }}>
          {/* Elementos florales decorativos para bodas - Fondo */}
          {eventCard.event_type === 'wedding' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#d4af37" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#86efac" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#86efac" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#86efac" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#86efac" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#86efac" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#86efac" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#86efac" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.3"/>
                  <ellipse cx="85" cy="90" rx="4" ry="2" fill="#86efac" opacity="0.2" transform="rotate(-30 85 90)"/>
                  <circle cx="75" cy="92" r="1" fill="#fbbf24" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}
          
          {/* Elementos decorativos para quinceaños */}
          {eventCard.event_type === 'quinceanera' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#e91e63" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#f8bbd9" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#f8bbd9" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#f8bbd9" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#e91e63" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#f8bbd9" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#f8bbd9" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#e91e63" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#f8bbd9" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#f8bbd9" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#e91e63" strokeWidth="1" fill="none" opacity="0.3"/>
                  <ellipse cx="85" cy="90" rx="4" ry="2" fill="#f8bbd9" opacity="0.2" transform="rotate(-30 85 90)"/>
                  <circle cx="75" cy="92" r="1" fill="#fbbf24" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}
          
          {/* Elementos decorativos para cumpleaños */}
          {eventCard.event_type === 'birthday' && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Esquina superior izquierda */}
              <div className="absolute top-0 left-0 w-40 h-40 opacity-15">
                <svg viewBox="0 0 160 160" className="w-full h-full">
                  <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#ff6b35" strokeWidth="2" fill="none" opacity="0.6"/>
                  <ellipse cx="30" cy="25" rx="8" ry="4" fill="#ffb366" opacity="0.5" transform="rotate(45 30 25)"/>
                  <ellipse cx="50" cy="22" rx="6" ry="3" fill="#ffb366" opacity="0.4" transform="rotate(-30 50 22)"/>
                  <ellipse cx="70" cy="28" rx="7" ry="4" fill="#ffb366" opacity="0.5" transform="rotate(60 70 28)"/>
                  <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.6"/>
                  <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina superior derecha */}
              <div className="absolute top-0 right-0 w-36 h-36 opacity-12">
                <svg viewBox="0 0 144 144" className="w-full h-full">
                  <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#ff6b35" strokeWidth="1.5" fill="none" opacity="0.5"/>
                  <ellipse cx="115" cy="22" rx="6" ry="3" fill="#ffb366" opacity="0.4" transform="rotate(-45 115 22)"/>
                  <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#ffb366" opacity="0.3" transform="rotate(30 100 28)"/>
                  <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.5"/>
                </svg>
              </div>
              
              {/* Esquina inferior izquierda */}
              <div className="absolute bottom-0 left-0 w-32 h-32 opacity-10">
                <svg viewBox="0 0 128 128" className="w-full h-full">
                  <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#ff6b35" strokeWidth="1.5" fill="none" opacity="0.4"/>
                  <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#ffb366" opacity="0.3" transform="rotate(25 30 102)"/>
                  <ellipse cx="50" cy="100" rx="4" ry="2" fill="#ffb366" opacity="0.4" transform="rotate(-40 50 100)"/>
                  <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.4"/>
                </svg>
              </div>
              
              {/* Esquina inferior derecha */}
              <div className="absolute bottom-0 right-0 w-28 h-28 opacity-8">
                <svg viewBox="0 0 112 112" className="w-full h-full">
                  <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#ff6b35" strokeWidth="1" fill="none" opacity="0.3"/>
                  <ellipse cx="85" cy="90" rx="4" ry="2" fill="#ffb366" opacity="0.2" transform="rotate(-30 85 90)"/>
                  <circle cx="75" cy="92" r="1" fill="#fbbf24" opacity="0.3"/>
                </svg>
              </div>
            </div>
          )}
          
          {/* Theme-specific Decorative Elements */}
          <ThemeDecorations 
            eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
            themeColors={{
              primary: themeColors.primary,
              secondary: themeColors.secondary,
              accent: themeColors.accent
            }} 
          />
          
          {/* Decorative Border */}
          <div 
            className="absolute inset-0 border-[16px] border-double rounded-xl pointer-events-none opacity-30"
            style={{ borderColor: themeColors.accent }}
          />
          
          {/* Additional theme-specific background elements */}
          <div 
            className="absolute top-0 left-0 w-40 h-40 rounded-br-full opacity-20"
            style={{ 
              background: `linear-gradient(135deg, ${themeColors.primary} 0%, transparent 70%)`
            }}
          />
          <div 
            className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20"
            style={{ 
              background: `linear-gradient(225deg, ${themeColors.secondary} 0%, transparent 70%)`
            }}
          />

          {/* Header con fondo completamente transparente */}
          <div 
            className="relative pt-8 pb-6"
            style={{
              backgroundColor: 'transparent'
            }}
          >
            {/* Patrón decorativo sutil */}
            <div className="absolute inset-0 opacity-10">
              {eventCard.event_type === 'wedding' && (
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2080%2080%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23d4af37%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M40%2040c0-8.837-7.163-16-16-16s-16%207.163-16%2016\207.163%2016%2016%2016%2016-7.163%2016-16zm32-16c0-8.837-5.373-12-12-12s-12%205.373-12%2012\205.373%2012%2012%2012%2012-5.373%2012-12z%22/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
              )}
              {eventCard.event_type === 'quinceanera' && (
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2080%2080%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23e91e63%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M40%2040c0-8.837-7.163-16-16-16s-16%207.163-16%2016\207.163%2016%2016%2016%2016-7.163%2016-16zm32-16c0-8.837-5.373-12-12-12s-12%205.373-12%2012\205.373%2012%2012%2012%2012-5.373%2012-12z%22/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
              )}
              {eventCard.event_type === 'birthday' && (
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2280%22%20height%3D%2280%22%20viewBox%3D%220%200%2080%2080%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ff6b35%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M40%2040c0-8.837-7.163-16-16-16s-16%207.163-16%2016\207.163%2016%2016%2016%2016-7.163%2016-16zm32-16c0-8.837-5.373-12-12-12s-12%205.373-12%2012\205.373%2012%2012%2012%2012-5.373%2012-12z%22/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
              )}
            </div>

            {/* Imagen circular centrada */}
            {eventCard.main_image && (
              <div className="flex justify-center relative z-10">
                <div className="w-52 h-52 rounded-full overflow-hidden shadow-2xl border-4 border-white">
                  <img 
                    src={eventCard.main_image} 
                    alt="Imagen del evento" 
                    className="w-full h-full" 
                    style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Invitation Content */}
          <div className="px-4 py-6 space-y-6">
            {/* Guest Welcome Section */}
            <div 
              className="text-center space-y-4 rounded-xl p-6 border theme-text relative bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: 'none',
                backgroundColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                backdropFilter: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'blur(2px)' : 'none',
                borderColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.2)' : `${themeColors.primary}30`,
                backgroundSize: '100% 100%'
              }}
            >
              {/* Elementos florales decorativos para bodas */}
              {eventCard.event_type === 'wedding' && (
                <>
                  <div className="absolute top-2 left-2 w-8 h-8 opacity-5">
                    <svg viewBox="0 0 32 32" className="w-full h-full">
                      <path d="M8 8 Q12 10 16 8 Q20 6 24 10" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.6"/>
                      <ellipse cx="12" cy="9" rx="3" ry="1.5" fill="#86efac" opacity="0.5" transform="rotate(30 12 9)"/>
                      <circle cx="16" cy="8" r="1" fill="#fbbf24" opacity="0.6"/>
                    </svg>
                  </div>
                  <div className="absolute top-2 right-2 w-8 h-8 opacity-5">
                    <svg viewBox="0 0 32 32" className="w-full h-full">
                      <path d="M24 8 Q20 10 16 8 Q12 6 8 10" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.6"/>
                      <ellipse cx="20" cy="9" rx="3" ry="1.5" fill="#86efac" opacity="0.5" transform="rotate(-30 20 9)"/>
                      <circle cx="16" cy="8" r="1" fill="#fbbf24" opacity="0.6"/>
                    </svg>
                  </div>
                </>
              )}
              
              {/* Elementos decorativos para quinceaños */}
              {eventCard.event_type === 'quinceanera' && (
                <>
                  <div className="absolute top-2 left-2 w-8 h-8 opacity-5">
                    <svg viewBox="0 0 32 32" className="w-full h-full">
                      <path d="M8 8 Q12 10 16 8 Q20 6 24 10" stroke="#e91e63" strokeWidth="1" fill="none" opacity="0.6"/>
                      <ellipse cx="12" cy="9" rx="3" ry="1.5" fill="#f8bbd9" opacity="0.5" transform="rotate(30 12 9)"/>
                      <circle cx="16" cy="8" r="1" fill="#fbbf24" opacity="0.6"/>
                    </svg>
                  </div>
                  <div className="absolute top-2 right-2 w-8 h-8 opacity-5">
                    <svg viewBox="0 0 32 32" className="w-full h-full">
                      <path d="M24 8 Q20 10 16 8 Q12 6 8 10" stroke="#e91e63" strokeWidth="1" fill="none" opacity="0.6"/>
                      <ellipse cx="20" cy="9" rx="3" ry="1.5" fill="#f8bbd9" opacity="0.5" transform="rotate(-30 20 9)"/>
                      <circle cx="16" cy="8" r="1" fill="#fbbf24" opacity="0.6"/>
                    </svg>
                  </div>
                </>
              )}
              
              {/* Elementos decorativos para cumpleaños */}
              {eventCard.event_type === 'birthday' && (
                <>
                  <div className="absolute top-2 left-2 w-8 h-8 opacity-5">
                    <svg viewBox="0 0 32 32" className="w-full h-full">
                      <path d="M8 8 Q12 10 16 8 Q20 6 24 10" stroke="#ff6b35" strokeWidth="1" fill="none" opacity="0.6"/>
                      <ellipse cx="12" cy="9" rx="3" ry="1.5" fill="#ffb366" opacity="0.5" transform="rotate(30 12 9)"/>
                      <circle cx="16" cy="8" r="1" fill="#fbbf24" opacity="0.6"/>
                    </svg>
                  </div>
                  <div className="absolute top-2 right-2 w-8 h-8 opacity-5">
                    <svg viewBox="0 0 32 32" className="w-full h-full">
                      <path d="M24 8 Q20 10 16 8 Q12 6 8 10" stroke="#ff6b35" strokeWidth="1" fill="none" opacity="0.6"/>
                      <ellipse cx="20" cy="9" rx="3" ry="1.5" fill="#ffb366" opacity="0.5" transform="rotate(-30 20 9)"/>
                      <circle cx="16" cy="8" r="1" fill="#fbbf24" opacity="0.6"/>
                    </svg>
                  </div>
                </>
              )}
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Sparkles className="w-4 h-4" style={{ color: themeColors.primary }} />
                <span className="tracking-wider theme-text font-bold" style={{ 
                  color: themeColors.primary
                }}>
                  Invitación Especial
                </span>
              </div>
              
              <h2 
                className="text-2xl tracking-wide relative pb-2 theme-text font-bold"
                style={{ 
                  color: themeColors.text
                }}
              >
                ¡Hola {guest.name || 'Invitado'}!
                <span 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
                />
              </h2>
              
              <p 
                className="italic text-lg tracking-wide theme-text font-bold"
                style={{ 
                  color: themeColors.text
                }}
              >
                Has sido invitado a
              </p>
              
              <h1 
                className={`theme-title relative font-bold ${
                  eventCard.event_name.length > 25 ? 'very-long-title' : 
                  eventCard.event_name.length > 15 ? 'long-title' : ''
                }`}
                style={{ 
                  color: themeColors.text
                }}
              >
                {eventCard.event_name}
                <span 
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
                />
              </h1>
              
              {guest.status === 'confirmed' && (
                <div 
                  className="inline-flex items-center rounded-full px-6 py-3 border-2 shadow-sm theme-text"
                  style={{ 
                    backgroundColor: `${themeColors.primary}20`,
                    borderColor: `${themeColors.primary}40`,
                    color: themeColors.primary
                  }}
                >
                  <Check className="w-5 h-5 mr-2" />
                  <span className="font-medium">¡Asistencia Confirmada!</span>
                </div>
              )}
            </div>

            {/* Subtle Section Separator */}
            <SectionSeparator 
              eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
              themeColors={{
                primary: themeColors.primary,
                secondary: themeColors.secondary,
                accent: themeColors.accent
              }} 
            />

            {/* Countdown */}
            <div 
              className="text-center rounded-xl p-8 border transform hover:scale-102 transition-transform duration-300 shadow-md theme-text bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: eventCard.event_type === 'wedding' 
                  ? 'none'
                  : eventCard.event_type === 'birthday'
                  ? 'none'
                  : eventCard.event_type === 'quinceanera'
                  ? 'none'
                  : eventCard.event_type === 'corporate'
                  ? 'none'
                  : eventCard.event_type === 'conference'
                  ? 'none'
                  : `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.accent} 100%)`,
                backgroundColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                backdropFilter: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'blur(2px)' : 'none',
                borderColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.1)' : `${themeColors.primary}30`,
                backgroundSize: '100% 100%'
              }}
            >
              <div className="relative z-10 rounded-lg p-4">
                <p 
                  className="text-sm font-medium uppercase tracking-wide mb-2 theme-text"
                  style={{ color: themeColors.primary }}
                >
                  Faltan
                </p>
                <Clock 
                  className="w-6 h-6 mx-auto mt-2 animate-pulse" 
                  style={{ color: themeColors.primary }}
                />
                <p 
                  className="text-2xl font-bold mt-1 theme-text"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.text} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {timeLeft}
                </p>
              </div>
            </div>

            {/* Subtle Section Separator */}
            <SectionSeparator 
              eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
              themeColors={{
                primary: themeColors.primary,
                secondary: themeColors.secondary,
                accent: themeColors.accent
              }} 
            />

            {/* Event Details */}
            <div className="space-y-4 theme-text">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="flex items-center space-x-3 p-4 rounded-lg transition-colors duration-300 theme-text"
                  style={eventCard.event_type === 'wedding' ? { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  } : { 
                    backgroundColor: `${themeColors.secondary}`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.1)' : themeColors.secondary}
                >
                  <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                  <span className="theme-text" style={{ color: themeColors.text }}>
                    {new Date(event.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div 
                  className="flex items-center space-x-3 p-4 rounded-lg transition-colors duration-300 theme-text"
                  style={eventCard.event_type === 'wedding' ? { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  } : { 
                    backgroundColor: `${themeColors.secondary}`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.1)' : themeColors.secondary}
                >
                  <MapPin className="w-5 h-5" style={{ color: themeColors.primary }} />
                  <span className="theme-text" style={{ color: themeColors.text }}>{event.location}</span>
                </div>
              </div>


              {/* Subtle Section Separator */}
              <SectionSeparator 
                eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
                themeColors={{
                  primary: themeColors.primary,
                  secondary: themeColors.secondary,
                  accent: themeColors.accent
                }} 
              />

              {/* Confirmation Button */}
              <div className="flex justify-center pt-4">
                {guest.status === 'confirmed' ? (
                  <div className="px-12 py-4 rounded-full text-base font-medium tracking-wide shadow-lg relative overflow-hidden ring-2 ring-offset-2 bg-green-100 border-green-300">
                    <span className="flex items-center justify-center text-green-700">
                      <Check className="w-5 h-5 mr-2" />
                      ¡Asistencia Confirmada!
                    </span>
                    <p className="text-xs text-green-600 mt-1 text-center">
                      Tu confirmación ha sido registrada exitosamente
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => onConfirmAttendance(guest.id, true)}
                    className="group px-6 py-3 md:px-12 md:py-4 rounded-full text-sm md:text-base font-medium tracking-wide shadow-lg transform transition hover:scale-105 duration-300 ease-in-out relative overflow-hidden ring-2 ring-offset-2 theme-text"
                    style={{
                      backgroundColor: themeColors.primary,
                      color: 'white',
                      borderColor: `${themeColors.primary}60`
                    }}
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/20 to-transparent transform -skew-x-45 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                    <span className="relative flex items-center justify-center theme-text">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Confirmar Asistencia
                    </span>
                  </button>
                )}
              </div>

              <div className="flex justify-center space-x-8 pt-4">
                <div className="text-center">
                  <Gift className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Código: #{guest.guest_number}</p>
                </div>
                <div className="text-center">
                  <Music className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Mesa: #{guest.table_number || '--'}</p>
                </div>
              </div>
            </div>

            {/* Google Maps */}
            <div className="rounded-xl overflow-hidden shadow-lg transform hover:scale-102 transition-transform duration-300 mx-auto max-w-2xl">
              <div
                className="h-48"
                dangerouslySetInnerHTML={{
                  __html: eventCard.event_location.replace(
                    'frameborder="0"',
                    'style="border:0; width: 100%; height: 100%;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"'
                  )
                }}
              />
            </div>

            {/* Cronograma Section */}
            {(eventCard.show_cronograma || eventCard.event_schedule?.length > 0) && (eventCard.event_schedule && eventCard.event_schedule.length > 0) && (
              <div className="rounded-lg p-4 border" style={(eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              } : {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}>
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center justify-center">
                  <Timer className="w-4 h-4 mr-2 text-amber-600" />
                  Cronograma del Evento
                </h3>
                <div className="space-y-1.5">
                  {(eventCard.event_schedule || []).map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md" style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(1px)'
                    }}>
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(1px)'
                        }}>
                          <Clock className="w-3 h-3 text-amber-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-amber-700">{item.time}</span>
                          <span className="text-gray-500 text-xs">•</span>
                          <span className="text-xs text-gray-700">{item.description}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-cover bg-center bg-no-repeat rounded-lg p-4 border border-indigo-100/50" style={(eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              } : {
                backgroundImage: 'none',
                backgroundColor: 'transparent'
              }}>
             {renderRecommendations()}
             </div>

            {/* Forms Section */}
            <div className="space-y-4 text-center flex flex-col items-center">
              {eventCard.include_health_form && (
                <div className={`bg-cover bg-center bg-no-repeat rounded-lg p-4 border border-gray-200 shadow-sm transition-all duration-300 w-full max-w-md ${!showHealthForm ? 'opacity-75' : ''}`} style={eventCard.event_type === 'wedding' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'birthday' || eventCard.event_type === 'quinceanera' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'corporate' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'conference' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : {
                  backgroundSize: '100% 100%'
                }}>
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Utensils className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-base font-medium text-gray-900">Información de Salud</h3>
                  </div>
                  {showHealthForm ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">¿Tienes alguna restricción alimentaria?</p>
                        <div className="space-y-2 flex flex-col">
                          {['Ninguna', 'Diabético', 'Celíaco', 'Vegetariano', 'Vegano'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="dietary"
                                value={option}
                                checked={dietaryRestrictions === option}
                                onChange={(e) => setDietaryRestrictions(e.target.value)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setIsSubmittingHealth(true);
                          try {
                            const finalDietaryRestrictions = dietaryRestrictions || 'Ninguna';
                            await onUpdateGuest({
                              ...guest,
                              dietary_restrictions: finalDietaryRestrictions,
                              health_form_submitted: true
                            });
                            setShowHealthForm(false);
                          } catch {}
                          finally { setIsSubmittingHealth(false); }
                        }}
                        disabled={isSubmittingHealth}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingHealth ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Enviar'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Tu respuesta</p>
                      <p className="font-medium text-gray-900 mt-1">{guest.dietary_restrictions || 'Ninguna'}</p>
                    </div>
                  )}
                </div>
              )}

              {eventCard.include_mobility_form && (
                <div className={`bg-cover bg-center bg-no-repeat rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 w-full max-w-md ${!showMobilityForm ? 'opacity-75' : ''}`} style={eventCard.event_type === 'wedding' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'birthday' || eventCard.event_type === 'quinceanera' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'corporate' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'conference' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : {
                  backgroundSize: '100% 100%'
                }}>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Accessibility className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-medium text-gray-900">Información de Movilidad</h3>
                  </div>
                  {showMobilityForm ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">¿Necesitas asistencia especial de movilidad?</p>
                        <div className="space-y-2 flex flex-col">
                          {['Ninguna', 'Silla de Ruedas'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="mobility"
                                value={option}
                                checked={mobilityRestrictions === option}
                                onChange={(e) => setMobilityRestrictions(e.target.value)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setIsSubmittingMobility(true);
                          try {
                            const finalMobilityRestrictions = mobilityRestrictions || 'Ninguna';
                            await onUpdateGuest({
                              ...guest,
                              mobility_restrictions: finalMobilityRestrictions,
                              mobility_form_submitted: true
                            });
                            setShowMobilityForm(false);
                          } catch {}
                          finally { setIsSubmittingMobility(false); }
                        }}
                        disabled={isSubmittingMobility}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingMobility ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Enviar'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Tu respuesta</p>
                      <p className="font-medium text-gray-900 mt-1">{guest.mobility_restrictions || 'Ninguna'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Footer */}
            {eventCard.show_contact_footer && (
              <div className="mt-8 pt-8 pb-12 border-t border-gray-200" style={eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'none'
              } : {}}>
                <div className="text-center space-y-6">
                  {eventCard.contact_message && (
                    <p className="text-gray-600 italic text-lg px-6 leading-relaxed">{eventCard.contact_message}</p>
                  )}

                  <div className="flex justify-center space-x-4">
                    {eventCard.contact_whatsapp && (
                      <a
                        href={`https://wa.me/${eventCard.contact_whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm border border-transparent font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        WhatsApp
                      </a>
                    )}

                    {eventCard.contact_email && (
                      <a
                        href={`mailto:${eventCard.contact_email}`}
                        className="inline-flex items-center px-4 py-2 text-sm border border-transparent font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        Email
                      </a>
                    )}
                  </div>

                  {(eventCard.facebook_url || eventCard.instagram_url) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500 tracking-wide">Síguenos en redes sociales</p>
                      <div className="flex justify-center space-x-6">
                        <div className="flex space-x-4">
                      {eventCard.facebook_url && (
                        <a
                          href={eventCard.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transform hover:scale-110 transition-all duration-200 p-2"
                        >
                          <Facebook className="h-6 w-6" />
                        </a>
                      )}

                      {eventCard.instagram_url && (
                        <a
                          href={eventCard.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-800 transform hover:scale-110 transition-all duration-200 p-2"
                        >
                          <Instagram className="h-6 w-6" />
                        </a>
                      )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </ThemeStyles>
    );
  }

  // Renderizar modelo de galería
  if (layoutModel === 'gallery') {
    return (
      <ThemeStyles 
        eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
        themeColors={{
          primary: themeColors.primary,
          secondary: themeColors.secondary,
          accent: themeColors.accent,
          background: themeColors.background,
          text: themeColors.text
        }}
        singleFont
      >
        <div 
          className="max-w-4xl mx-auto shadow-2xl overflow-hidden relative rounded-2xl border border-gray-100"
          style={{
            backgroundImage: `url(${selectedBackground})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            backgroundAttachment: 'fixed'
          }}
        >
          {/* Contenedor de contenido scrolleable completamente transparente */}
          <div className="relative z-10 h-full overflow-y-auto" style={{
            backgroundColor: 'transparent'
          }}>
          
          {/* Header con galería de imágenes - Completamente transparente */}
          <div className="relative h-96 overflow-hidden" style={{
            backgroundColor: 'transparent'
          }}>
            {/* Elementos decorativos temáticos */}
            <div className="absolute inset-0 opacity-5">
              {eventCard.event_type === 'wedding' && (
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23d4af37%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M50%2010c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10zm0%2030c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10zm0%2030c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10z%22/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
              )}
              {eventCard.event_type === 'quinceanera' && (
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23e91e63%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M50%2010c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10zm0%2030c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10zm0%2030c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10z%22/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
              )}
              {eventCard.event_type === 'birthday' && (
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22100%22%20height%3D%22100%22%20viewBox%3D%220%200%20100%20100%22%20xmlns%3D%22http://www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22%23ff6b35%22%20fill-opacity%3D%220.1%22%3E%3Cpath%20d%3D%22M50%2010c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10zm0%2030c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10zm0%2030c-5%200-10%205-10%2010s5%2010%2010%2010%2010-5%2010-10-5-10-10-10z%22/%3E%3C/g%3E%3C/svg%3E')] bg-repeat"></div>
              )}
            </div>
            
            {/* Elementos florales elegantes para bodas */}
            {eventCard.event_type === 'wedding' && (
              <>
                {/* Esquina superior izquierda */}
                <div className="absolute top-0 left-0 w-40 h-40 opacity-10">
                  <svg viewBox="0 0 160 160" className="w-full h-full">
                    <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#d4af37" strokeWidth="2" fill="none" opacity="0.8"/>
                    <ellipse cx="30" cy="25" rx="8" ry="4" fill="#86efac" opacity="0.6" transform="rotate(45 30 25)"/>
                    <ellipse cx="50" cy="22" rx="6" ry="3" fill="#86efac" opacity="0.5" transform="rotate(-30 50 22)"/>
                    <ellipse cx="70" cy="28" rx="7" ry="4" fill="#86efac" opacity="0.6" transform="rotate(60 70 28)"/>
                    <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.7"/>
                    <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina superior derecha */}
                <div className="absolute top-0 right-0 w-36 h-36 opacity-5">
                  <svg viewBox="0 0 144 144" className="w-full h-full">
                    <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.7"/>
                    <ellipse cx="115" cy="22" rx="6" ry="3" fill="#86efac" opacity="0.5" transform="rotate(-45 115 22)"/>
                    <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#86efac" opacity="0.4" transform="rotate(30 100 28)"/>
                    <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina inferior izquierda */}
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-5">
                  <svg viewBox="0 0 128 128" className="w-full h-full">
                    <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#d4af37" strokeWidth="1.5" fill="none" opacity="0.6"/>
                    <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#86efac" opacity="0.4" transform="rotate(25 30 102)"/>
                    <ellipse cx="50" cy="100" rx="4" ry="2" fill="#86efac" opacity="0.5" transform="rotate(-40 50 100)"/>
                    <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.5"/>
                  </svg>
                </div>
                
                {/* Esquina inferior derecha */}
                <div className="absolute bottom-0 right-0 w-28 h-28 opacity-15">
                  <svg viewBox="0 0 112 112" className="w-full h-full">
                    <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.5"/>
                    <ellipse cx="85" cy="90" rx="4" ry="2" fill="#86efac" opacity="0.3" transform="rotate(-30 85 90)"/>
                    <circle cx="75" cy="92" r="1" fill="#fbbf24" opacity="0.4"/>
                  </svg>
                </div>
              </>
            )}
            
            {/* Elementos decorativos elegantes para quinceaños */}
            {eventCard.event_type === 'quinceanera' && (
              <>
                {/* Esquina superior izquierda */}
                <div className="absolute top-0 left-0 w-40 h-40 opacity-10">
                  <svg viewBox="0 0 160 160" className="w-full h-full">
                    <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#e91e63" strokeWidth="2" fill="none" opacity="0.8"/>
                    <ellipse cx="30" cy="25" rx="8" ry="4" fill="#f8bbd9" opacity="0.6" transform="rotate(45 30 25)"/>
                    <ellipse cx="50" cy="22" rx="6" ry="3" fill="#f8bbd9" opacity="0.5" transform="rotate(-30 50 22)"/>
                    <ellipse cx="70" cy="28" rx="7" ry="4" fill="#f8bbd9" opacity="0.6" transform="rotate(60 70 28)"/>
                    <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.7"/>
                    <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina superior derecha */}
                <div className="absolute top-0 right-0 w-36 h-36 opacity-5">
                  <svg viewBox="0 0 144 144" className="w-full h-full">
                    <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#e91e63" strokeWidth="1.5" fill="none" opacity="0.7"/>
                    <ellipse cx="115" cy="22" rx="6" ry="3" fill="#f8bbd9" opacity="0.5" transform="rotate(-45 115 22)"/>
                    <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#f8bbd9" opacity="0.4" transform="rotate(30 100 28)"/>
                    <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina inferior izquierda */}
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-5">
                  <svg viewBox="0 0 128 128" className="w-full h-full">
                    <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#e91e63" strokeWidth="1.5" fill="none" opacity="0.6"/>
                    <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#f8bbd9" opacity="0.4" transform="rotate(25 30 102)"/>
                    <ellipse cx="50" cy="100" rx="4" ry="2" fill="#f8bbd9" opacity="0.5" transform="rotate(-40 50 100)"/>
                    <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.5"/>
                  </svg>
                </div>
                
                {/* Esquina inferior derecha */}
                <div className="absolute bottom-0 right-0 w-28 h-28 opacity-15">
                  <svg viewBox="0 0 112 112" className="w-full h-full">
                    <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#e91e63" strokeWidth="1" fill="none" opacity="0.5"/>
                    <ellipse cx="85" cy="90" rx="4" ry="2" fill="#f8bbd9" opacity="0.3" transform="rotate(-30 85 90)"/>
                    <circle cx="75" cy="92" r="1" fill="#fbbf24" opacity="0.4"/>
                  </svg>
                </div>
              </>
            )}
            
            {/* Elementos decorativos elegantes para cumpleaños */}
            {eventCard.event_type === 'birthday' && (
              <>
                {/* Esquina superior izquierda */}
                <div className="absolute top-0 left-0 w-40 h-40 opacity-10">
                  <svg viewBox="0 0 160 160" className="w-full h-full">
                    <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#ff6b35" strokeWidth="2" fill="none" opacity="0.8"/>
                    <ellipse cx="30" cy="25" rx="8" ry="4" fill="#ffb366" opacity="0.6" transform="rotate(45 30 25)"/>
                    <ellipse cx="50" cy="22" rx="6" ry="3" fill="#ffb366" opacity="0.5" transform="rotate(-30 50 22)"/>
                    <ellipse cx="70" cy="28" rx="7" ry="4" fill="#ffb366" opacity="0.6" transform="rotate(60 70 28)"/>
                    <circle cx="40" cy="20" r="3" fill="#fbbf24" opacity="0.7"/>
                    <circle cx="60" cy="25" r="2.5" fill="#fbbf24" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina superior derecha */}
                <div className="absolute top-0 right-0 w-36 h-36 opacity-5">
                  <svg viewBox="0 0 144 144" className="w-full h-full">
                    <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#ff6b35" strokeWidth="1.5" fill="none" opacity="0.7"/>
                    <ellipse cx="115" cy="22" rx="6" ry="3" fill="#ffb366" opacity="0.5" transform="rotate(-45 115 22)"/>
                    <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#ffb366" opacity="0.4" transform="rotate(30 100 28)"/>
                    <circle cx="108" cy="25" r="2" fill="#fbbf24" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina inferior izquierda */}
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-5">
                  <svg viewBox="0 0 128 128" className="w-full h-full">
                    <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#ff6b35" strokeWidth="1.5" fill="none" opacity="0.6"/>
                    <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#ffb366" opacity="0.4" transform="rotate(25 30 102)"/>
                    <ellipse cx="50" cy="100" rx="4" ry="2" fill="#ffb366" opacity="0.5" transform="rotate(-40 50 100)"/>
                    <circle cx="40" cy="104" r="1.5" fill="#fbbf24" opacity="0.5"/>
                  </svg>
                </div>
                
                {/* Esquina inferior derecha */}
                <div className="absolute bottom-0 right-0 w-28 h-28 opacity-15">
                  <svg viewBox="0 0 112 112" className="w-full h-full">
                    <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#ff6b35" strokeWidth="1" fill="none" opacity="0.5"/>
                    <ellipse cx="85" cy="90" rx="4" ry="2" fill="#ffb366" opacity="0.3" transform="rotate(-30 85 90)"/>
                    <circle cx="75" cy="92" r="1" fill="#fbbf24" opacity="0.4"/>
                  </svg>
                </div>
              </>
            )}
            
            {/* Elementos decorativos elegantes para empresariales */}
            {eventCard.event_type === 'corporate' && (
              <>
                {/* Esquina superior izquierda */}
                <div className="absolute top-0 left-0 w-40 h-40 opacity-10">
                  <svg viewBox="0 0 160 160" className="w-full h-full">
                    <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#1e40af" strokeWidth="2" fill="none" opacity="0.8"/>
                    <ellipse cx="30" cy="25" rx="8" ry="4" fill="#60a5fa" opacity="0.6" transform="rotate(45 30 25)"/>
                    <ellipse cx="50" cy="22" rx="6" ry="3" fill="#60a5fa" opacity="0.5" transform="rotate(-30 50 22)"/>
                    <ellipse cx="70" cy="28" rx="7" ry="4" fill="#60a5fa" opacity="0.6" transform="rotate(60 70 28)"/>
                    <circle cx="40" cy="20" r="3" fill="#3b82f6" opacity="0.7"/>
                    <circle cx="60" cy="25" r="2.5" fill="#3b82f6" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina superior derecha */}
                <div className="absolute top-0 right-0 w-36 h-36 opacity-5">
                  <svg viewBox="0 0 144 144" className="w-full h-full">
                    <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#1e40af" strokeWidth="1.5" fill="none" opacity="0.7"/>
                    <ellipse cx="115" cy="22" rx="6" ry="3" fill="#60a5fa" opacity="0.5" transform="rotate(-45 115 22)"/>
                    <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#60a5fa" opacity="0.4" transform="rotate(30 100 28)"/>
                    <circle cx="108" cy="25" r="2" fill="#3b82f6" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina inferior izquierda */}
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-5">
                  <svg viewBox="0 0 128 128" className="w-full h-full">
                    <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#1e40af" strokeWidth="1.5" fill="none" opacity="0.6"/>
                    <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#60a5fa" opacity="0.4" transform="rotate(25 30 102)"/>
                    <ellipse cx="50" cy="100" rx="4" ry="2" fill="#60a5fa" opacity="0.5" transform="rotate(-40 50 100)"/>
                    <circle cx="40" cy="104" r="1.5" fill="#3b82f6" opacity="0.5"/>
                  </svg>
                </div>
                
                {/* Esquina inferior derecha */}
                <div className="absolute bottom-0 right-0 w-28 h-28 opacity-15">
                  <svg viewBox="0 0 112 112" className="w-full h-full">
                    <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#1e40af" strokeWidth="1" fill="none" opacity="0.5"/>
                    <ellipse cx="85" cy="90" rx="4" ry="2" fill="#60a5fa" opacity="0.3" transform="rotate(-30 85 90)"/>
                    <circle cx="75" cy="92" r="1" fill="#3b82f6" opacity="0.4"/>
                  </svg>
                </div>
              </>
            )}
            
            {/* Elementos decorativos elegantes para conferencias */}
            {eventCard.event_type === 'conference' && (
              <>
                {/* Esquina superior izquierda */}
                <div className="absolute top-0 left-0 w-40 h-40 opacity-10">
                  <svg viewBox="0 0 160 160" className="w-full h-full">
                    <path d="M20 20 Q40 30 60 20 Q80 10 100 25" stroke="#7c3aed" strokeWidth="2" fill="none" opacity="0.8"/>
                    <ellipse cx="30" cy="25" rx="8" ry="4" fill="#a78bfa" opacity="0.6" transform="rotate(45 30 25)"/>
                    <ellipse cx="50" cy="22" rx="6" ry="3" fill="#a78bfa" opacity="0.5" transform="rotate(-30 50 22)"/>
                    <ellipse cx="70" cy="28" rx="7" ry="4" fill="#a78bfa" opacity="0.6" transform="rotate(60 70 28)"/>
                    <circle cx="40" cy="20" r="3" fill="#8b5cf6" opacity="0.7"/>
                    <circle cx="60" cy="25" r="2.5" fill="#8b5cf6" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina superior derecha */}
                <div className="absolute top-0 right-0 w-36 h-36 opacity-5">
                  <svg viewBox="0 0 144 144" className="w-full h-full">
                    <path d="M124 20 Q110 25 95 30 Q80 35 65 28" stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity="0.7"/>
                    <ellipse cx="115" cy="22" rx="6" ry="3" fill="#a78bfa" opacity="0.5" transform="rotate(-45 115 22)"/>
                    <ellipse cx="100" cy="28" rx="5" ry="2.5" fill="#a78bfa" opacity="0.4" transform="rotate(30 100 28)"/>
                    <circle cx="108" cy="25" r="2" fill="#8b5cf6" opacity="0.6"/>
                  </svg>
                </div>
                
                {/* Esquina inferior izquierda */}
                <div className="absolute bottom-0 left-0 w-32 h-32 opacity-5">
                  <svg viewBox="0 0 128 128" className="w-full h-full">
                    <path d="M20 108 Q35 98 50 102 Q65 106 80 96" stroke="#7c3aed" strokeWidth="1.5" fill="none" opacity="0.6"/>
                    <ellipse cx="30" cy="102" rx="5" ry="2.5" fill="#a78bfa" opacity="0.4" transform="rotate(25 30 102)"/>
                    <ellipse cx="50" cy="100" rx="4" ry="2" fill="#a78bfa" opacity="0.5" transform="rotate(-40 50 100)"/>
                    <circle cx="40" cy="104" r="1.5" fill="#8b5cf6" opacity="0.5"/>
                  </svg>
                </div>
                
                {/* Esquina inferior derecha */}
                <div className="absolute bottom-0 right-0 w-28 h-28 opacity-15">
                  <svg viewBox="0 0 112 112" className="w-full h-full">
                    <path d="M92 92 Q82 88 72 92 Q62 96 52 88" stroke="#7c3aed" strokeWidth="1" fill="none" opacity="0.5"/>
                    <ellipse cx="85" cy="90" rx="4" ry="2" fill="#a78bfa" opacity="0.3" transform="rotate(-30 85 90)"/>
                    <circle cx="75" cy="92" r="1" fill="#8b5cf6" opacity="0.4"/>
                  </svg>
                </div>
              </>
            )}


            {/* Carrusel con Preview - Responsive */}
            {totalSlides > 0 && (
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 px-6 md:px-4 py-8">
                
                {/* Miniatura izquierda - Solo desktop */}
                <div className="hidden md:block">
                  {totalSlides > 1 && (
                    <div 
                      className={`w-24 h-32 bg-white rounded-lg shadow-lg transform -rotate-12 cursor-pointer transition-all duration-300 p-2 ${
                        currentSlide === (currentSlide - 1 + totalSlides) % totalSlides ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                      }`}
                      onClick={() => goToSlide((currentSlide - 1 + totalSlides) % totalSlides)}
                    >
                      <div className="w-full h-24 rounded overflow-hidden">
                        <img 
                          src={galleryImages[(currentSlide - 1 + totalSlides) % totalSlides]} 
                          alt="Imagen anterior" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="h-6 flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Imagen principal */}
                <div 
                  className="relative group"
                  onMouseEnter={() => setIsPaused(true)}
                  onMouseLeave={() => setIsPaused(false)}
                  onTouchStart={() => setIsPaused(true)}
                  onTouchEnd={() => setTimeout(() => setIsPaused(false), 2000)}
                >
                  <div className="w-64 h-72 md:w-80 md:h-96 bg-white rounded-lg shadow-2xl transform rotate-1 p-4 transition-all duration-300">
                    <div className="w-full h-56 md:h-80 rounded overflow-hidden relative">
                      <img 
                        src={galleryImages[currentSlide]} 
                        alt={`Imagen ${currentSlide + 1}`} 
                        className={`w-full h-full object-cover transition-all duration-300 ${
                          isTransitioning ? 'opacity-80 scale-95' : 'opacity-100 scale-100'
                        }`}
                      />
                      
                      {/* Controles de navegación sutiles - Solo si hay más de 1 imagen */}
                      {totalSlides > 1 && (
                        <>
                          <button
                            onClick={() => {
                              setIsPaused(true);
                              prevSlide();
                              setTimeout(() => setIsPaused(false), 1000);
                            }}
                            className="absolute left-1 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-all duration-200 opacity-0 hover:opacity-100 group-hover:opacity-100"
                            disabled={isTransitioning}
                          >
                            <ChevronLeft className="w-3 h-3 text-white" />
                          </button>
                          <button
                            onClick={() => {
                              setIsPaused(true);
                              nextSlide();
                              setTimeout(() => setIsPaused(false), 1000);
                            }}
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-all duration-200 opacity-0 hover:opacity-100 group-hover:opacity-100"
                            disabled={isTransitioning}
                          >
                            <ChevronRight className="w-3 h-3 text-white" />
                          </button>
                        </>
                      )}
                    </div>
                    <div className="h-12 flex items-center justify-center">
                      <div className="w-12 h-1 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>

                {/* Miniatura derecha - Solo desktop */}
                <div className="hidden md:block">
                  {totalSlides > 1 && (
                    <div 
                      className={`w-24 h-32 bg-white rounded-lg shadow-lg transform rotate-12 cursor-pointer transition-all duration-300 p-2 ${
                        currentSlide === (currentSlide + 1) % totalSlides ? 'opacity-100 scale-105' : 'opacity-60 hover:opacity-80'
                      }`}
                      onClick={() => goToSlide((currentSlide + 1) % totalSlides)}
                    >
                      <div className="w-full h-24 rounded overflow-hidden">
                        <img 
                          src={galleryImages[(currentSlide + 1) % totalSlides]} 
                          alt="Imagen siguiente" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="h-6 flex items-center justify-center">
                        <div className="w-4 h-0.5 bg-gray-200 rounded"></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Miniaturas horizontales - Solo móvil */}
            {totalSlides > 1 && (
              <div className="flex md:hidden justify-center gap-3 px-4 pb-4">
                {galleryImages.map((image, index) => (
                  <div
                    key={index}
                    className={`w-16 h-20 bg-white rounded-md shadow-md cursor-pointer transition-all duration-300 p-1.5 ${
                      index === currentSlide ? 'opacity-100 scale-110 ring-2 ring-white' : 'opacity-60'
                    }`}
                    onClick={() => goToSlide(index)}
                  >
                    <div className="w-full h-12 rounded overflow-hidden">
                      <img 
                        src={image} 
                        alt={`Miniatura ${index + 1}`} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <div className="h-4 flex items-center justify-center">
                      <div className="w-3 h-0.5 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Indicadores de posición */}
            {totalSlides > 1 && (
              <div className="flex justify-center gap-2 pb-4">
                {galleryImages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-white scale-125' 
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
            )}

          </div>

          {/* Invitation Content */}
          <div className="px-4 py-6 space-y-6">
            {/* Guest Welcome Section */}
            <div 
              className="text-center space-y-4 rounded-xl p-6 border theme-text relative bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: 'none',
                backgroundColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                backdropFilter: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'blur(2px)' : 'none',
                borderColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.2)' : `${themeColors.primary}30`,
                backgroundSize: '100% 100%'
              }}
            >
              <div className="flex items-center justify-center space-x-2 text-sm">
                <Sparkles className="w-4 h-4" style={{ color: themeColors.primary }} />
                <span className="tracking-wider theme-text font-bold" style={{ 
                  color: themeColors.primary
                }}>
                  Invitación Especial
                </span>
              </div>
              
              <h2 
                className="text-2xl tracking-wide relative pb-2 theme-text font-bold"
                style={{ 
                  color: themeColors.text
                }}
              >
                ¡Hola {guest.name || 'Invitado'}!
                <span 
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-24 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
                />
              </h2>
              
              <p 
                className="italic text-lg tracking-wide theme-text font-bold"
                style={{ 
                  color: themeColors.text
                }}
              >
                Has sido invitado a
              </p>
              
              <h1 
                className={`theme-title relative font-bold ${
                  eventCard.event_name.length > 25 ? 'very-long-title' : 
                  eventCard.event_name.length > 15 ? 'long-title' : ''
                }`}
                style={{ 
                  color: themeColors.text
                }}
              >
                {eventCard.event_name}
                <span 
                  className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-px"
                  style={{ background: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)` }}
                />
              </h1>
              
              {guest.status === 'confirmed' && (
                <div 
                  className="inline-flex items-center rounded-full px-6 py-3 border-2 shadow-sm theme-text"
                  style={{ 
                    backgroundColor: `${themeColors.primary}20`,
                    borderColor: `${themeColors.primary}40`,
                    color: themeColors.primary
                  }}
                >
                  <Check className="w-5 h-5 mr-2" />
                  <span className="font-medium">¡Asistencia Confirmada!</span>
                </div>
              )}
            </div>

            {/* Subtle Section Separator */}
            <SectionSeparator 
              eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
              themeColors={{
                primary: themeColors.primary,
                secondary: themeColors.secondary,
                accent: themeColors.accent
              }} 
            />

            {/* Countdown */}
            <div 
              className="text-center rounded-xl p-8 border transform hover:scale-102 transition-transform duration-300 shadow-md theme-text bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: eventCard.event_type === 'wedding' 
                  ? 'none'
                  : eventCard.event_type === 'birthday'
                  ? 'none'
                  : eventCard.event_type === 'quinceanera'
                  ? 'none'
                  : eventCard.event_type === 'corporate'
                  ? 'none'
                  : eventCard.event_type === 'conference'
                  ? 'none'
                  : `linear-gradient(135deg, ${themeColors.secondary} 0%, ${themeColors.accent} 100%)`,
                backgroundColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                backdropFilter: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'blur(2px)' : 'none',
                borderColor: (eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? 'rgba(255, 255, 255, 0.1)' : `${themeColors.primary}30`,
                backgroundSize: '100% 100%'
              }}
            >
              <div className="relative z-10 rounded-lg p-4">
                <p 
                  className="text-sm font-medium uppercase tracking-wide mb-2 theme-text"
                  style={{ color: themeColors.primary }}
                >
                  Faltan
                </p>
                <Clock 
                  className="w-6 h-6 mx-auto mt-2 animate-pulse" 
                  style={{ color: themeColors.primary }}
                />
                <p 
                  className="text-2xl font-bold mt-1 theme-text"
                  style={{ 
                    background: `linear-gradient(135deg, ${themeColors.primary} 0%, ${themeColors.text} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}
                >
                  {timeLeft}
                </p>
              </div>
            </div>

            {/* Subtle Section Separator */}
            <SectionSeparator 
              eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
              themeColors={{
                primary: themeColors.primary,
                secondary: themeColors.secondary,
                accent: themeColors.accent
              }} 
            />

            {/* Event Details */}
            <div className="space-y-4 theme-text">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="flex items-center space-x-3 p-4 rounded-lg transition-colors duration-300 theme-text"
                  style={eventCard.event_type === 'wedding' ? { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  } : { 
                    backgroundColor: `${themeColors.secondary}`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.1)' : themeColors.secondary}
                >
                  <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                  <span className="theme-text" style={{ color: themeColors.text }}>
                    {new Date(event.date).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div 
                  className="flex items-center space-x-3 p-4 rounded-lg transition-colors duration-300 theme-text"
                  style={eventCard.event_type === 'wedding' ? { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    backdropFilter: 'blur(10px)'
                  } : { 
                    backgroundColor: `${themeColors.secondary}`
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.2)' : themeColors.accent}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = eventCard.event_type === 'wedding' ? 'rgba(255, 255, 255, 0.1)' : themeColors.secondary}
                >
                  <MapPin className="w-5 h-5" style={{ color: themeColors.primary }} />
                  <span className="theme-text" style={{ color: themeColors.text }}>{event.location}</span>
                </div>
              </div>


              {/* Subtle Section Separator */}
              <SectionSeparator 
                eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
                themeColors={{
                  primary: themeColors.primary,
                  secondary: themeColors.secondary,
                  accent: themeColors.accent
                }} 
              />

              {/* Confirmation Button */}
              <div className="flex justify-center pt-4">
                {guest.status === 'confirmed' ? (
                  <div className="px-12 py-4 rounded-full text-base font-medium tracking-wide shadow-lg relative overflow-hidden ring-2 ring-offset-2 bg-green-100 border-green-300">
                    <span className="flex items-center justify-center text-green-700">
                      <Check className="w-5 h-5 mr-2" />
                      ¡Asistencia Confirmada!
                    </span>
                    <p className="text-xs text-green-600 mt-1 text-center">
                      Tu confirmación ha sido registrada exitosamente
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => onConfirmAttendance(guest.id, true)}
                    className="group px-6 py-3 md:px-12 md:py-4 rounded-full text-sm md:text-base font-medium tracking-wide shadow-lg transform transition hover:scale-105 duration-300 ease-in-out relative overflow-hidden ring-2 ring-offset-2 theme-text"
                    style={{
                      backgroundColor: themeColors.primary,
                      color: 'white',
                      borderColor: `${themeColors.primary}60`
                    }}
                  >
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/20 to-transparent transform -skew-x-45 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                    <span className="relative flex items-center justify-center theme-text">
                      <Heart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                      Confirmar Asistencia
                    </span>
                  </button>
                )}
              </div>

              <div className="flex justify-center space-x-8 pt-4">
                <div className="text-center">
                  <Gift className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Código: #{guest.guest_number}</p>
                </div>
                <div className="text-center">
                  <Music className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Mesa: #{guest.table_number || '--'}</p>
                </div>
              </div>
            </div>

            {/* Google Maps */}
            <div className="rounded-xl overflow-hidden shadow-lg transform hover:scale-102 transition-transform duration-300 mx-auto max-w-2xl">
              <div
                className="h-48"
                dangerouslySetInnerHTML={{
                  __html: eventCard.event_location.replace(
                    'frameborder="0"',
                    'style="border:0; width: 100%; height: 100%;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"'
                  )
                }}
              />
            </div>

            {/* Cronograma Section */}
            {(eventCard.show_cronograma || eventCard.event_schedule?.length > 0) && (eventCard.event_schedule && eventCard.event_schedule.length > 0) && (
              <div className="rounded-lg p-4 border" style={(eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              } : {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}>
                <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center justify-center">
                  <Timer className="w-4 h-4 mr-2 text-amber-600" />
                  Cronograma del Evento
                </h3>
                <div className="space-y-1.5">
                  {(eventCard.event_schedule || []).map((item) => (
                    <div key={item.id} className="flex items-center space-x-2 p-2 rounded-md" style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(1px)'
                    }}>
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          backdropFilter: 'blur(1px)'
                        }}>
                          <Clock className="w-3 h-3 text-amber-600" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs font-semibold text-amber-700">{item.time}</span>
                          <span className="text-gray-500 text-xs">•</span>
                          <span className="text-xs text-gray-700">{item.description}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-cover bg-center bg-no-repeat rounded-lg p-4 border border-indigo-100/50" style={(eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' || eventCard.event_type === 'corporate' || eventCard.event_type === 'conference' || eventCard.event_type === 'birthday') ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)'
              } : {
                backgroundImage: 'none',
                backgroundColor: 'transparent'
              }}>
              {renderRecommendations()}
              </div>

            {/* Forms Section */}
            <div className="space-y-4 text-center flex flex-col items-center">
              {eventCard.include_health_form && (
                <div className={`bg-cover bg-center bg-no-repeat rounded-lg p-4 border border-gray-200 shadow-sm transition-all duration-300 w-full max-w-md ${!showHealthForm ? 'opacity-75' : ''}`} style={eventCard.event_type === 'wedding' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'birthday' || eventCard.event_type === 'quinceanera' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'corporate' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'conference' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : {
                  backgroundSize: '100% 100%'
                }}>
                  <div className="flex items-center justify-center space-x-2 mb-3">
                    <Utensils className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-base font-medium text-gray-900">Información de Salud</h3>
                  </div>
                  {showHealthForm ? (
                    <div className="space-y-3 flex flex-col items-center">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">¿Tienes alguna restricción alimentaria?</p>
                        <div className="space-y-2 flex flex-col">
                          {['Ninguna', 'Diabético', 'Celíaco', 'Vegetariano', 'Vegano'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="dietary"
                                value={option}
                                checked={dietaryRestrictions === option}
                                onChange={(e) => setDietaryRestrictions(e.target.value)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setIsSubmittingHealth(true);
                          try {
                            const finalDietaryRestrictions = dietaryRestrictions || 'Ninguna';
                            await onUpdateGuest({
                              ...guest,
                              dietary_restrictions: finalDietaryRestrictions,
                              health_form_submitted: true
                            });
                            setShowHealthForm(false);
                          } catch {}
                          finally { setIsSubmittingHealth(false); }
                        }}
                        disabled={isSubmittingHealth}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingHealth ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Enviar'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Tu respuesta</p>
                      <p className="font-medium text-gray-900 mt-1">{guest.dietary_restrictions || 'Ninguna'}</p>
                    </div>
                  )}
                </div>
              )}

              {eventCard.include_mobility_form && (
                <div className={`bg-cover bg-center bg-no-repeat rounded-xl p-6 border border-gray-200 shadow-sm transition-all duration-300 w-full max-w-md ${!showMobilityForm ? 'opacity-75' : ''}`} style={eventCard.event_type === 'wedding' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'birthday' || eventCard.event_type === 'quinceanera' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'corporate' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : eventCard.event_type === 'conference' ? {
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  backdropFilter: 'blur(2px)',
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                } : {
                  backgroundSize: '100% 100%'
                }}>
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <Accessibility className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-lg font-medium text-gray-900">Información de Movilidad</h3>
                  </div>
                  {showMobilityForm ? (
                    <div className="space-y-4 flex flex-col items-center">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">¿Necesitas asistencia especial de movilidad?</p>
                        <div className="space-y-2 flex flex-col">
                          {['Ninguna', 'Silla de Ruedas'].map((option) => (
                            <label key={option} className="flex items-center cursor-pointer">
                              <input
                                type="radio"
                                name="mobility"
                                value={option}
                                checked={mobilityRestrictions === option}
                                onChange={(e) => setMobilityRestrictions(e.target.value)}
                                className="text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className="ml-2 text-sm text-gray-700">{option}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setIsSubmittingMobility(true);
                          try {
                            const finalMobilityRestrictions = mobilityRestrictions || 'Ninguna';
                            await onUpdateGuest({
                              ...guest,
                              mobility_restrictions: finalMobilityRestrictions,
                              mobility_form_submitted: true
                            });
                            setShowMobilityForm(false);
                          } catch {}
                          finally { setIsSubmittingMobility(false); }
                        }}
                        disabled={isSubmittingMobility}
                        className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                      >
                        {isSubmittingMobility ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Enviar'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Tu respuesta</p>
                      <p className="font-medium text-gray-900 mt-1">{guest.mobility_restrictions || 'Ninguna'}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact Footer */}
            {eventCard.show_contact_footer && (
              <div className="mt-8 pt-8 pb-12 border-t border-gray-200" style={eventCard.event_type === 'wedding' || eventCard.event_type === 'quinceanera' ? {
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                backdropFilter: 'blur(2px)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                background: 'none'
              } : {}}>
                <div className="text-center space-y-6">
                  {eventCard.contact_message && (
                    <p className="text-gray-600 italic text-lg px-6 leading-relaxed">{eventCard.contact_message}</p>
                  )}

                  <div className="flex justify-center space-x-4">
                    {eventCard.contact_whatsapp && (
                      <a
                        href={`https://wa.me/${eventCard.contact_whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 text-sm border border-transparent font-medium rounded-full shadow-sm text-white bg-green-600 hover:bg-green-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <Phone className="h-5 w-5 mr-2" />
                        WhatsApp
                      </a>
                    )}

                    {eventCard.contact_email && (
                      <a
                        href={`mailto:${eventCard.contact_email}`}
                        className="inline-flex items-center px-4 py-2 text-sm border border-transparent font-medium rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 transform hover:scale-105 transition-all duration-200"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        Email
                      </a>
                    )}
                  </div>

                  {(eventCard.facebook_url || eventCard.instagram_url) && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500 tracking-wide">Síguenos en redes sociales</p>
                      <div className="flex justify-center space-x-6">
                        <div className="flex space-x-4">
                      {eventCard.facebook_url && (
                        <a
                          href={eventCard.facebook_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 transform hover:scale-110 transition-all duration-200 p-2"
                        >
                          <Facebook className="h-6 w-6" />
                        </a>
                      )}

                      {eventCard.instagram_url && (
                        <a
                          href={eventCard.instagram_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-600 hover:text-pink-800 transform hover:scale-110 transition-all duration-200 p-2"
                        >
                          <Instagram className="h-6 w-6" />
                        </a>
                      )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </ThemeStyles>
    );
  }

  // Renderizar modelo de fondo fijo
  if (layoutModel === 'fixed-background') {
    return (
      <ThemeStyles 
        eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
        themeColors={themeColors}
        singleFont
      >
        <div className="relative min-h-screen overflow-hidden">
          {/* Imagen de fondo fija - altura fija del viewport */}
          <div 
            className="absolute inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${eventCard.main_image})`,
            }}
          >
            {/* Overlay dinámico basado en luminosidad de la imagen */}
            <div 
              className={`absolute inset-0 ${
                imageBrightness === 'light' 
                  ? 'bg-black/25' 
                  : imageBrightness === 'dark' 
                    ? 'bg-black/5' 
                    : 'bg-black/15'
              }`} 
            />
          </div>

          {/* Contenido scrolleable sobre la imagen fija */}
          <div className="relative z-10 h-full overflow-y-auto">
            <div className="p-4 sm:p-6 flex flex-col items-center justify-start min-h-full">
                {/* Contenedor principal con glassmorphism más transparente */}
                <div 
                  className={`invitation-panel w-full max-w-3xl rounded-[30px] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5 transition-all duration-700 ${
                    showContent 
                      ? 'opacity-100 transform translate-y-0' 
                      : 'opacity-0 transform translate-y-8'
                  }`}
              >
                {/* Header con bienvenida */}
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center">
                    <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                      <Sparkles className="w-3.5 h-3.5" />
                      {eventTypeLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 text-xs">
                    <Sparkles className="w-3 h-3" style={{ color: themeColors.primary }} />
                    <span className="tracking-wider" style={{ color: themeColors.text }}>
                      Invitación Especial
                    </span>
                  </div>
                  
                  <h2 className="text-3xl sm:text-4xl tracking-wide font-bold" style={{ color: themeColors.text }}>
                    ¡Hola {guest.name || 'Invitado'}!
                  </h2>
                  
                  <p className="italic text-base tracking-wide opacity-80" style={{ color: themeColors.text }}>
                    Has sido invitado a
                  </p>
                  
                  <h1 className="text-3xl font-bold mb-3" style={{ color: themeColors.primary }}>
                    {eventCard.event_name}
                  </h1>
                  
                  {isGuestConfirmed && (
                    <div 
                      className="invitation-badge font-medium"
                      style={{ 
                        color: themeColors.primary
                      }}
                    >
                      <Check className="w-5 h-5 mr-2" />
                      <span>¡Confirmado!</span>
                    </div>
                  )}
                </div>

                {/* Countdown con glassmorphism mejorado */}
                <div 
                  className="invitation-soft-panel text-center rounded-[26px] p-4 sm:p-5"
                  style={{ 
                    backgroundColor: `${themeColors.secondary}80`
                  }}
                >
                  <p className="text-sm font-medium uppercase tracking-wide mb-2 opacity-80" style={{ color: themeColors.text }}>
                    Faltan
                  </p>
                  <Clock className="w-6 h-6 mx-auto mt-2 animate-pulse" style={{ color: themeColors.primary }} />
                  <p className="text-3xl font-bold mt-1" style={{ color: themeColors.primary }}>
                    {timeLeft}
                  </p>
                </div>

                {/* Detalles del evento con glassmorphism mejorado */}
                <div className="space-y-3">
                  <div 
                    className="invitation-detail-card flex items-center space-x-3 p-3 sm:p-4 rounded-2xl"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}68`
                    }}
                  >
                    <Calendar className="w-5 h-5 flex-shrink-0" style={{ color: themeColors.primary }} />
                    <span className="text-xs sm:text-sm font-medium" style={{ color: themeColors.text }}>
                      {formattedEventDate}
                    </span>
                  </div>

                  <div 
                    className="invitation-detail-card flex items-center space-x-3 p-3 sm:p-4 rounded-2xl"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}68`
                    }}
                  >
                    <MapPin className="w-5 h-5 flex-shrink-0" style={{ color: themeColors.primary }} />
                    <span className="text-xs sm:text-sm font-medium" style={{ color: themeColors.text }}>{event.location}</span>
                  </div>
                </div>

                {/* Botón de confirmación */}
                <div className="flex justify-center pt-2">
                  {isGuestConfirmed ? (
                    <div 
                      className="invitation-badge px-8 py-3 text-base tracking-wide"
                      style={{ color: themeColors.primary }}
                    >
                      <span className="flex items-center justify-center">
                        <Check className="w-5 h-5 mr-2" />
                        ¡Confirmado!
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => onConfirmAttendance(guest.id, true)}
                      className="invitation-primary-button group px-6 py-3 md:px-8 md:py-3 rounded-full text-sm md:text-base font-medium tracking-wide transform transition hover:scale-[1.02] duration-300 ease-in-out relative overflow-hidden backdrop-blur-sm border border-white/30 text-white"
                      style={{ backgroundColor: `${themeColors.primary}E6` }}
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-white/20 to-transparent transform -skew-x-45 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                      <span className="relative flex items-center justify-center">
                        <Heart className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                        Confirmar Asistencia
                      </span>
                    </button>
                  )}
                </div>

                {/* Información adicional */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="invitation-soft-panel rounded-2xl p-3 text-center">
                    <Gift className="w-5 h-5 mx-auto mb-1" style={{ color: themeColors.primary }} />
                    <p className="text-xs opacity-80" style={{ color: themeColors.text }}>Código: #{guest.guest_number}</p>
                  </div>
                  <div className="invitation-soft-panel rounded-2xl p-3 text-center">
                    <Music className="w-5 h-5 mx-auto mb-1" style={{ color: themeColors.primary }} />
                    <p className="text-xs opacity-80" style={{ color: themeColors.text }}>Mesa: #{guest.table_number || '--'}</p>
                  </div>
                </div>

                {/* Google Maps iframe */}
                {eventCard.event_location && (
                  <div 
                    className="invitation-soft-panel rounded-2xl overflow-hidden"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}60`
                    }}
                  >
                    <div className="p-3">
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="w-5 h-5" style={{ color: themeColors.primary }} />
                        <span className="text-sm font-medium" style={{ color: themeColors.text }}>Ubicación</span>
                      </div>
                      <div 
                        className="rounded-xl overflow-hidden"
                        dangerouslySetInnerHTML={{ __html: eventCard.event_location }}
                      />
                    </div>
                  </div>
                )}

                {/* Recomendaciones - Debajo del mapa */}
                {((eventCard.event_recommendations && eventCard.event_recommendations.length > 0) || eventCard.recommendations) && (
                  <div 
                    className="invitation-soft-panel rounded-2xl p-4"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}60`
                    }}
                  >
                    <div className="space-y-3">
                      {renderRecommendations()}
                    </div>
                  </div>
                )}

                {/* Cronograma - Debajo de recomendaciones */}
                {(eventCard.show_cronograma || eventCard.event_schedule?.length > 0) && (eventCard.event_schedule && eventCard.event_schedule.length > 0) && (
                  <div 
                    className="invitation-soft-panel rounded-2xl p-4"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}60`
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-center space-x-2">
                        <Clock className="w-4 h-4" style={{ color: themeColors.primary }} />
                        <h3 className="text-xs font-semibold text-center" style={{ color: themeColors.text }}>Itinerario</h3>
                      </div>
                      
                      <div className="relative">
                        {/* Línea vertical del timeline */}
                        <div 
                          className="absolute left-5 top-0 bottom-0 w-0.5 opacity-60"
                          style={{ backgroundColor: themeColors.primary }}
                        />
                        
                        <div className="space-y-2">
                          {(eventCard.event_schedule || []).map((item) => (
                            <div key={item.id} className="relative flex items-start space-x-3">
                              {/* Punto del timeline */}
                              <div 
                                className="relative z-10 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: themeColors.primary }}
                              />
                              
                              {/* Contenido del evento */}
                              <div className="flex-1 min-w-0">
                                <div 
                                  className="inline-block px-2 py-0.5 rounded-full text-xs font-medium border border-white/20"
                                  style={{ 
                                    backgroundColor: `${themeColors.primary}40`,
                                    color: themeColors.text 
                                  }}
                                >
                                  {item.time}
                                </div>
                                <p 
                                  className="text-xs mt-0.5 leading-relaxed"
                                  style={{ color: themeColors.text }}
                                >
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Formularios de salud y movilidad */}
                {eventCard.include_health_form && (
                  <div 
                    className="rounded-2xl backdrop-blur-md border border-white/25 transition-all duration-300"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}60`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Utensils className="w-5 h-5" style={{ color: themeColors.primary }} />
                        <h3 className="text-sm font-medium" style={{ color: themeColors.text }}>Información Alimentaria</h3>
                      </div>
                      {showHealthForm ? (
                        <div className="space-y-3">
                          <p className="text-xs" style={{ color: themeColors.text }}>¿Tienes alguna restricción alimentaria?</p>
                          <div className="space-y-2">
                            {['Ninguna', 'Vegetariano', 'Vegano', 'Sin Gluten', 'Sin Lactosa', 'Diabético'].map((option) => (
                              <label key={option} className="flex items-center text-xs">
                                <input
                                  type="radio"
                                  name="dietary"
                                  value={option}
                                  checked={dietaryRestrictions === option}
                                  onChange={(e) => setDietaryRestrictions(e.target.value)}
                                  className="mr-2"
                                  style={{ accentColor: themeColors.primary }}
                                />
                                <span style={{ color: themeColors.text }}>{option}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={async () => {
                              setIsSubmittingHealth(true);
                              try {
                                await onUpdateGuest({ ...guest, dietary_restrictions: dietaryRestrictions || 'Ninguna', health_form_submitted: true });
                                setShowHealthForm(false);
                              } catch {}
                              finally { setIsSubmittingHealth(false); }
                            }}
                            disabled={isSubmittingHealth}
                            className="w-full py-2 px-4 rounded-xl text-xs font-medium transition-all duration-300 inline-flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{ backgroundColor: themeColors.primary, color: 'white' }}
                          >
                            {isSubmittingHealth ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Guardar Preferencias'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs" style={{ color: themeColors.text }}>Tu respuesta</p>
                          <p className="text-xs font-medium mt-1" style={{ color: themeColors.primary }}>{guest.dietary_restrictions || 'Ninguna'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {eventCard.include_mobility_form && (
                  <div 
                    className="rounded-2xl backdrop-blur-md border border-white/25 transition-all duration-300"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}60`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="p-4">
                      <div className="flex items-center space-x-2 mb-3">
                        <Accessibility className="w-5 h-5" style={{ color: themeColors.primary }} />
                        <h3 className="text-sm font-medium" style={{ color: themeColors.text }}>Información de Movilidad</h3>
                      </div>
                      {showMobilityForm ? (
                        <div className="space-y-3">
                          <p className="text-xs" style={{ color: themeColors.text }}>¿Necesitas asistencia especial de movilidad?</p>
                          <div className="space-y-2">
                            {['Ninguna', 'Silla de Ruedas', 'Bastón', 'Andador'].map((option) => (
                              <label key={option} className="flex items-center text-xs">
                                <input
                                  type="radio"
                                  name="mobility"
                                  value={option}
                                  checked={mobilityRestrictions === option}
                                  onChange={(e) => setMobilityRestrictions(e.target.value)}
                                  className="mr-2"
                                  style={{ accentColor: themeColors.primary }}
                                />
                                <span style={{ color: themeColors.text }}>{option}</span>
                              </label>
                            ))}
                          </div>
                          <button
                            onClick={async () => {
                              setIsSubmittingMobility(true);
                              try {
                                await onUpdateGuest({ ...guest, mobility_restrictions: mobilityRestrictions || 'Ninguna', mobility_form_submitted: true });
                                setShowMobilityForm(false);
                              } catch {}
                              finally { setIsSubmittingMobility(false); }
                            }}
                            disabled={isSubmittingMobility}
                            className="w-full py-2 px-4 rounded-xl text-xs font-medium transition-all duration-300 inline-flex items-center justify-center gap-1.5 disabled:opacity-70 disabled:cursor-not-allowed"
                            style={{ backgroundColor: themeColors.primary, color: 'white' }}
                          >
                            {isSubmittingMobility ? (<><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>) : 'Guardar Información'}
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-xs" style={{ color: themeColors.text }}>Tu respuesta</p>
                          <p className="text-xs font-medium mt-1" style={{ color: themeColors.primary }}>{guest.mobility_restrictions || 'Ninguna'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recomendaciones */}
                {((eventCard.event_recommendations && eventCard.event_recommendations.length > 0) || eventCard.recommendations) && (
                  <div 
                    className="rounded-2xl backdrop-blur-md border border-white/25 p-4"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}60`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                  >
                    <div className="space-y-3">
                      {renderRecommendations()}
                    </div>
                  </div>
                )}

                {/* Pie de contacto - Solo si está habilitado */}
                {eventCard.show_contact_footer && (
                  <div 
                    className="rounded-2xl backdrop-blur-md border border-white/25 p-4"
                    style={{ 
                      backgroundColor: `${themeColors.secondary}50`,
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)'
                    }}
                  >
                    <div className="text-center space-y-3">
                      <h3 className="text-sm font-medium" style={{ color: themeColors.text }}>
                        {eventCard.contact_message || '¿Dudas o consultas?'}
                      </h3>
                      <div className="flex justify-center space-x-6">
                        {eventCard.contact_whatsapp && (
                          <a 
                            href={`https://wa.me/${eventCard.contact_whatsapp}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 text-xs hover:scale-105 transition-transform duration-300"
                            style={{ color: themeColors.primary }}
                          >
                            <Phone className="w-4 h-4" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                        {eventCard.contact_email && (
                          <a 
                            href={`mailto:${eventCard.contact_email}`}
                            className="flex items-center space-x-2 text-xs hover:scale-105 transition-transform duration-300"
                            style={{ color: themeColors.primary }}
                          >
                            <Mail className="w-4 h-4" />
                            <span>Email</span>
                          </a>
                        )}
                      </div>
                      {(eventCard.facebook_url || eventCard.instagram_url) && (
                        <div className="flex justify-center space-x-4 pt-2">
                          {eventCard.facebook_url && (
                            <a 
                              href={eventCard.facebook_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Facebook className="w-5 h-5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" style={{ color: themeColors.primary }} />
                            </a>
                          )}
                          {eventCard.instagram_url && (
                            <a 
                              href={eventCard.instagram_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Instagram className="w-5 h-5 opacity-60 hover:opacity-100 transition-opacity cursor-pointer" style={{ color: themeColors.primary }} />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ThemeStyles>
    );
  }

  // Renderizar modelo de portada clásica (código existente)
  return (
    <ThemeStyles 
              eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"}
      themeColors={themeColors}
      singleFont
    >
      <div className="invitation-frame max-w-5xl mx-auto relative">
        {/* Theme-specific Decorative Elements */}
        <ThemeDecorations 
          eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
          themeColors={{
            primary: themeColors.primary,
            secondary: themeColors.secondary,
            accent: themeColors.accent
          }} 
        />
        
        {/* Decorative Border */}
        <div 
          className="absolute inset-0 border-[16px] border-double rounded-xl pointer-events-none opacity-30"
          style={{ borderColor: themeColors.accent }}
        />
        
        {/* Additional theme-specific background elements */}
        <div 
          className="absolute top-0 left-0 w-40 h-40 rounded-br-full opacity-20"
          style={{ 
            background: `linear-gradient(135deg, ${themeColors.primary} 0%, transparent 70%)`
          }}
        />
        <div 
          className="absolute top-0 right-0 w-40 h-40 rounded-bl-full opacity-20"
          style={{ 
            background: `linear-gradient(225deg, ${themeColors.secondary} 0%, transparent 70%)`
          }}
        />
        <div 
          className="absolute -bottom-20 -left-20 w-40 h-40 rounded-tr-full opacity-15"
          style={{ 
            background: `linear-gradient(45deg, ${themeColors.accent} 0%, transparent 70%)`
          }}
        />
        <div 
          className="absolute -bottom-20 -right-20 w-40 h-40 rounded-tl-full opacity-15"
          style={{ 
            background: `linear-gradient(315deg, ${themeColors.primary} 0%, transparent 70%)`
          }}
        />

        <div className="relative min-h-[88vh] overflow-hidden">
          <img
            src={heroImage}
            alt="Portada del evento"
            className="w-full h-full absolute inset-0 object-cover"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.18),_transparent_28%),linear-gradient(180deg,rgba(29,29,29,0.12)_0%,rgba(29,29,29,0.28)_35%,rgba(29,29,29,0.76)_100%)]" />

          <div className="relative z-10 flex min-h-[88vh] flex-col justify-between px-5 py-6 sm:px-8 sm:py-8">
            <div className="flex items-start justify-between gap-4">
              <span className="invitation-kicker" style={{ color: '#ffffff' }}>
                <Sparkles className="w-3.5 h-3.5" />
                {eventTypeLabel}
              </span>
              {isGuestConfirmed && (
                <div className="invitation-badge text-white font-medium" style={{ backgroundColor: 'rgba(255,255,255,0.16)', color: 'white' }}>
                  <Check className="w-4 h-4" />
                  <span>Confirmado</span>
                </div>
              )}
            </div>

            <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
              <div className="invitation-soft-panel w-full rounded-[32px] px-6 py-8 sm:px-10 sm:py-12" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <p className="text-sm font-medium uppercase tracking-[0.35em] text-black/85">Estás invitado</p>
                <h1
                  className={`theme-title mt-5 ${
                    eventCard.event_name.length > 25 ? 'very-long-title' :
                    eventCard.event_name.length > 15 ? 'long-title' : ''
                  }`}
                  style={{ color: '#000000', textShadow: '0 10px 30px rgba(0,0,0,0.25)' }}
                >
                  {eventCard.event_name}
                </h1>
                <p className="mt-4 text-lg sm:text-xl italic text-black/90">{eventOccasionText}</p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-black/90">
                  <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-md">
                    {eventShortDate}
                  </span>
                  <span className="rounded-full border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-md">
                    {eventTimeLabel}
                  </span>
                </div>

                <div className="mt-8 flex justify-center">
                  {renderPrimaryAttendanceCta()}
                </div>
              </div>
            </div>

            <div className="mx-auto mt-6 grid w-full max-w-lg grid-cols-2 gap-3">
              <div className="invitation-soft-panel rounded-2xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Gift className="mx-auto mb-2 h-5 w-5 text-black" />  
                <p className="text-[11px] uppercase tracking-[0.24em] text-black/70">Invitado</p>
                <p className="mt-1 text-sm font-medium text-black">#{guest.guest_number}</p>
              </div>
              <div className="invitation-soft-panel rounded-2xl p-4 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.16)' }}>
                <Music className="mx-auto mb-2 h-5 w-5 text-black" />
                <p className="text-[11px] uppercase tracking-[0.24em] text-black/70">Mesa</p>
                <p className="mt-1 text-sm font-medium text-black">#{guest.table_number || '--'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-8 md:px-8 md:py-10 space-y-8">
          <SectionSeparator 
            eventType={eventCard.event_type as "wedding" | "quinceanera" | "birthday" | "corporate" | "conference"} 
            themeColors={{
              primary: themeColors.primary,
              secondary: themeColors.secondary,
              accent: themeColors.accent
            }} 
          />

          <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="invitation-panel rounded-[30px] p-6 md:p-8 text-center lg:text-left">
              <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                <Clock className="w-3.5 h-3.5" />
                Cuenta regresiva
              </span>
              <p className="mt-5 text-sm uppercase tracking-[0.28em]" style={{ color: themeColors.primary }}>Faltan</p>
              <p className="mt-2 text-5xl md:text-6xl font-semibold" style={{ color: themeColors.text }}>
                {timeLeft}
              </p>
              <p className="mt-4 text-base leading-7" style={{ color: themeColors.text }}>
                Cada minuto nos acerca a un dia que queremos vivir contigo.
              </p>
            </div>

            <div className="space-y-4">
              <div className="invitation-detail-card rounded-[26px] p-5">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5" style={{ color: themeColors.primary }} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Fecha</p>
                    <p className="mt-1 text-base leading-7" style={{ color: themeColors.text }}>{formattedEventDate}</p>
                  </div>
                </div>
              </div>
              <div className="invitation-detail-card rounded-[26px] p-5">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5" style={{ color: themeColors.primary }} />
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Momento</p>
                    <p className="mt-1 text-base leading-7" style={{ color: themeColors.text }}>{eventOccasionText}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="invitation-panel rounded-[30px] p-6 md:p-8">
            <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                  <MapPin className="w-3.5 h-3.5" />
                  Ubicación
                </span>
                <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                  Te esperamos en un lugar muy especial
                </h3>
                <p className="mt-4 text-base leading-8" style={{ color: themeColors.text }}>
                  {event.location}
                </p>
                <div className="mt-6">
                  <a
                    href={googleMapsSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="invitation-primary-button inline-flex items-center rounded-full px-7 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white"
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Ver en Google Maps
                  </a>
                </div>
              </div>

              {eventCard.event_location && (
                <div className="invitation-soft-panel overflow-hidden rounded-[28px] p-3">
                  <div
                    className="h-[320px] overflow-hidden rounded-[22px]"
                    dangerouslySetInnerHTML={{
                      __html: eventCard.event_location.replace(
                        'frameborder="0"',
                        'style="border:0; width:100%; height:100%;" loading="lazy" referrerpolicy="no-referrer-when-downgrade"'
                      )
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          {scheduleItems.length > 0 && (
            <section className="invitation-panel rounded-[30px] p-6 md:p-8">
              <div className="text-center">
                <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                  <Timer className="w-3.5 h-3.5" />
                  Cronograma
                </span>
                <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                  Asi viviremos el evento
                </h3>
              </div>

              <div className="relative mx-auto mt-8 max-w-3xl">
                <div className="absolute left-5 top-0 bottom-0 hidden w-px md:block" style={{ background: `linear-gradient(to bottom, transparent, ${themeColors.accent}, transparent)` }} />
                <div className="space-y-4">
                  {scheduleItems.map((item) => (
                    <div key={item.id} className="invitation-detail-card relative rounded-[24px] p-5 md:pl-14">
                      <div className="absolute left-[14px] top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 md:block" style={{ backgroundColor: themeColors.primary, borderColor: '#ffffff' }} />
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
                        <div className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold" style={{ backgroundColor: `${themeColors.primary}18`, color: themeColors.primary }}>
                          {item.time}
                        </div>
                        <p className="text-base leading-7" style={{ color: themeColors.text }}>
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {((eventCard.event_recommendations && eventCard.event_recommendations.length > 0) || eventCard.recommendations) && (
            <section className="invitation-panel rounded-[30px] p-6 md:p-8">
              <div className="text-center">
                <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                  <Star className="w-3.5 h-3.5" />
                  Recomendaciones
                </span>
              </div>
              <div className="mt-6">
                {renderRecommendations()}
              </div>
            </section>
          )}

          {(eventCard.include_health_form || eventCard.include_mobility_form) && (
            <section className="space-y-5">
              <div className="text-center">
                <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                  <Sparkles className="w-3.5 h-3.5" />
                  Detalles para recibirte mejor
                </span>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                {eventCard.include_health_form && (
                  <div className="invitation-panel rounded-[30px] p-6">
                    <div className="flex items-center gap-3">
                      <Utensils className="w-5 h-5" style={{ color: themeColors.primary }} />
                      <h3 className="text-xl" style={{ color: themeColors.text }}>Salud y alimentacion</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7" style={{ color: themeColors.text }}>
                      Queremos prepararlo todo para que disfrutes el evento con total tranquilidad.
                    </p>

                    {showHealthForm ? (
                      <div className="mt-5 space-y-3">
                        {['Ninguna', 'Vegetariano', 'Vegano', 'Sin Gluten', 'Sin Lactosa', 'Diabético'].map((option) => (
                          <label key={option} className="invitation-detail-card flex cursor-pointer items-center gap-3 rounded-2xl p-4">
                            <input
                              type="radio"
                              name="dietary"
                              value={option}
                              checked={dietaryRestrictions === option}
                              onChange={(e) => setDietaryRestrictions(e.target.value)}
                              style={{ accentColor: themeColors.primary }}
                            />
                            <span style={{ color: themeColors.text }}>{option}</span>
                          </label>
                        ))}
                        <button
                          onClick={async () => {
                            setIsSubmittingHealth(true);
                            try {
                              await onUpdateGuest({
                                ...guest,
                                dietary_restrictions: dietaryRestrictions || 'Ninguna',
                                health_form_submitted: true
                              });
                              setShowHealthForm(false);
                            } catch {}
                            finally { setIsSubmittingHealth(false); }
                          }}
                          disabled={isSubmittingHealth}
                          className="invitation-primary-button mt-3 w-full rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white disabled:opacity-70 disabled:cursor-not-allowed"
                          style={{ backgroundColor: themeColors.primary }}
                        >
                          {isSubmittingHealth ? 'Guardando...' : 'Guardar preferencia'}
                        </button>
                      </div>
                    ) : (
                      <div className="invitation-soft-panel mt-5 rounded-2xl p-5 text-center">
                        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Tu respuesta</p>
                        <p className="mt-2 text-base font-medium" style={{ color: themeColors.text }}>
                          {guest.dietary_restrictions || 'Ninguna'}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {eventCard.include_mobility_form && (
                  <div className="invitation-panel rounded-[30px] p-6">
                    <div className="flex items-center gap-3">
                      <Accessibility className="w-5 h-5" style={{ color: themeColors.primary }} />
                      <h3 className="text-xl" style={{ color: themeColors.text }}>Movilidad y accesibilidad</h3>
                    </div>
                    <p className="mt-3 text-sm leading-7" style={{ color: themeColors.text }}>
                      Si necesitas apoyo especial, queremos saberlo para recibirte de la mejor manera.
                    </p>

                    {showMobilityForm ? (
                      <div className="mt-5 space-y-3">
                        {['Ninguna', 'Silla de Ruedas', 'Bastón', 'Andador'].map((option) => (
                          <label key={option} className="invitation-detail-card flex cursor-pointer items-center gap-3 rounded-2xl p-4">
                            <input
                              type="radio"
                              name="mobility"
                              value={option}
                              checked={mobilityRestrictions === option}
                              onChange={(e) => setMobilityRestrictions(e.target.value)}
                              style={{ accentColor: themeColors.primary }}
                            />
                            <span style={{ color: themeColors.text }}>{option}</span>
                          </label>
                        ))}
                        <button
                          onClick={async () => {
                            setIsSubmittingMobility(true);
                            try {
                              await onUpdateGuest({
                                ...guest,
                                mobility_restrictions: mobilityRestrictions || 'Ninguna',
                                mobility_form_submitted: true
                              });
                              setShowMobilityForm(false);
                            } catch {}
                            finally { setIsSubmittingMobility(false); }
                          }}
                          disabled={isSubmittingMobility}
                          className="invitation-primary-button mt-3 w-full rounded-full px-6 py-3 text-sm font-medium uppercase tracking-[0.16em] text-white disabled:opacity-70 disabled:cursor-not-allowed"
                          style={{ backgroundColor: themeColors.primary }}
                        >
                          {isSubmittingMobility ? 'Guardando...' : 'Guardar informacion'}
                        </button>
                      </div>
                    ) : (
                      <div className="invitation-soft-panel mt-5 rounded-2xl p-5 text-center">
                        <p className="text-xs uppercase tracking-[0.22em]" style={{ color: themeColors.primary }}>Tu respuesta</p>
                        <p className="mt-2 text-base font-medium" style={{ color: themeColors.text }}>
                          {guest.mobility_restrictions || 'Ninguna'}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="invitation-panel rounded-[30px] px-6 py-8 text-center md:px-10">
            <span className="invitation-kicker" style={{ color: themeColors.primary }}>
              <Heart className="w-3.5 h-3.5" />
              RSVP
            </span>
            <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
              Nos encantaria contar contigo
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8" style={{ color: themeColors.text }}>
              Confirma tu asistencia para reservar tu lugar y preparar cada detalle de este dia tan especial.
            </p>
            <div className="mx-auto mt-8 flex max-w-md justify-center">
              {renderPrimaryAttendanceCta(true)}
            </div>
          </section>

          {eventCard.show_contact_footer && (
            <section className="invitation-panel rounded-[30px] p-6 md:p-8 text-center">
              <span className="invitation-kicker" style={{ color: themeColors.primary }}>
                <Mail className="w-3.5 h-3.5" />
                Contacto
              </span>
              <h3 className="mt-5 text-3xl md:text-4xl" style={{ color: themeColors.text }}>
                Estamos para ayudarte
              </h3>

              {eventCard.contact_message && (
                <p className="mx-auto mt-4 max-w-2xl text-base leading-8 whitespace-pre-wrap" style={{ color: themeColors.text }}>
                  {eventCard.contact_message}
                </p>
              )}

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-[220px] items-center justify-center rounded-full px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-white shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                    style={{ backgroundColor: '#25D366' }}
                  >
                    <Phone className="mr-2 h-4 w-4" />
                    WhatsApp
                  </a>
                )}

                {eventCard.contact_email && (
                  <a
                    href={`mailto:${eventCard.contact_email}`}
                    className="inline-flex min-w-[220px] items-center justify-center rounded-full px-7 py-4 text-sm font-medium uppercase tracking-[0.18em] text-white shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                    style={{ backgroundColor: themeColors.primary }}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Email
                  </a>
                )}
              </div>

              {(eventCard.facebook_url || eventCard.instagram_url) && (
                <div className="mt-8 flex justify-center gap-4">
                  {eventCard.facebook_url && (
                    <a
                      href={eventCard.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="invitation-soft-panel rounded-full p-4 transition-transform duration-300 hover:scale-105"
                    >
                      <Facebook className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </a>
                  )}
                  {eventCard.instagram_url && (
                    <a
                      href={eventCard.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="invitation-soft-panel rounded-full p-4 transition-transform duration-300 hover:scale-105"
                    >
                      <Instagram className="h-5 w-5" style={{ color: themeColors.primary }} />
                    </a>
                  )}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </ThemeStyles>
  );
}

export { InvitationCard };