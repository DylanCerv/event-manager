import React from 'react';
import { PartyPopper, Phone, Play, Check, X, AlertTriangle, Pencil, Maximize2, Trash2, Upload } from 'lucide-react';
import type { Event, EventFinalization, EventCard } from '../types/event';
import { finalizationStorage } from '../lib/finalization-storage';
import { storage } from '../lib/storage';
import { getTemplateById } from '../lib/event-templates';

interface EventFinalizationProps {
  event: Event;
}

export function EventFinalization({ event }: EventFinalizationProps) {
  const [isFinalized, setIsFinalized] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [finalMessage, setFinalMessage] = React.useState(
    `¡Gracias por acompañarnos en ${event.name}! Esperamos que hayas disfrutado de este momento tan especial.`
  );
  const [finalTitle, setFinalTitle] = React.useState(
    `¡Gracias por acompañarnos en ${event.name}!`
  );
  const [finalSubtitle, setFinalSubtitle] = React.useState(
    'Esperamos que hayas disfrutado de este momento tan especial.'
  );
  const [coverImage, setCoverImage] = React.useState<string>();
  const [videoUrl, setVideoUrl] = React.useState<string>();
  const [videoMessage, setVideoMessage] = React.useState('');
  const [whatsappNumber, setWhatsappNumber] = React.useState('');
  const [whatsappButtonText, setWhatsappButtonText] = React.useState('¿Te gustaría obtener las fotos del evento? 📸');
  const [settings, setSettings] = React.useState<EventFinalization | null>(null);
  const [showCardForm, setShowCardForm] = React.useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = React.useState(false);
  const [showFullView, setShowFullView] = React.useState(false);
  const [eventCard, setEventCard] = React.useState<EventCard | null>(null);

  // Cargar datos existentes al montar el componente
  React.useEffect(() => {
    loadExistingData();
  }, [event.id]);

  const loadExistingData = async () => {
    try {
      // Cargar configuración de finalización existente
      const existingSettings = await finalizationStorage.getEventFinalization(event.id);
      if (existingSettings) {
        setSettings(existingSettings);
        setIsFinalized(existingSettings.is_finalized);
        setFinalMessage(existingSettings.final_message);
        
        // Cargar título y subtítulo si existen, sino dividir el mensaje existente
        if (existingSettings.final_title && existingSettings.final_subtitle) {
          setFinalTitle(existingSettings.final_title);
          setFinalSubtitle(existingSettings.final_subtitle);
        } else if (existingSettings.final_message) {
          // Dividir el mensaje existente automáticamente para compatibilidad
          const parts = existingSettings.final_message.split(/[.!]/).filter(part => part.trim());
          if (parts.length >= 2) {
            setFinalTitle(parts[0].trim() + '!');
            setFinalSubtitle(parts.slice(1).join('. ').trim());
          } else {
            setFinalTitle(existingSettings.final_message);
            setFinalSubtitle('');
          }
        }
        
        setCoverImage(existingSettings.cover_image);
        setVideoUrl(existingSettings.video_url);
        setVideoMessage(existingSettings.video_message || '');
        setWhatsappNumber(existingSettings.whatsapp_number || '');
        setWhatsappButtonText(existingSettings.whatsapp_button_text || '¿Te gustaría obtener las fotos del evento? 📸');
      }

      // Cargar tarjeta interactiva para obtener el tema
      const card = await storage.getEventCard(event.id);
      setEventCard(card);
    } catch (error) {
      console.error('Error loading existing data:', error);
    }
  };

  // Solo toggle de finalización del evento
  const handleToggleFinalization = async () => {
    try {
      setIsLoading(true);
      const newStatus = !isFinalized;
      setIsFinalized(newStatus);

      // Crear o actualizar la configuración de finalización
      const finalizationData: Omit<EventFinalization, 'id' | 'created_at'> = settings ? {
        ...settings,
        is_finalized: newStatus
      } : {
        event_id: event.id,
        is_finalized: newStatus,
        final_message: `¡Gracias por acompañarnos en ${event.name}! Esperamos que hayas disfrutado de este momento tan especial.`,
        final_title: `¡Gracias por acompañarnos en ${event.name}!`,
        final_subtitle: 'Esperamos que hayas disfrutado de este momento tan especial.',
        // Obtener tema de la tarjeta interactiva o usar el predeterminado
        event_type: eventCard?.event_type || 'wedding',
        theme_colors: eventCard?.theme_colors || getTemplateById('wedding')!.colors
      };

      await finalizationStorage.saveEventFinalization(finalizationData);
      setSettings(finalizationData as EventFinalization);
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error toggling finalization:', error);
      alert('Error al cambiar el estado del evento');
      setIsFinalized(!isFinalized); // Revertir el cambio
    } finally {
      setIsLoading(false);
    }
  };

  // Guardar/crear tarjeta de finalización
  const handleSaveFinalizationCard = async () => {
    try {
      setIsLoading(true);

      if (videoUrl && !whatsappNumber) {
        alert('El número de WhatsApp es requerido cuando se sube un video');
        return;
      }

      // Obtener tema de la tarjeta interactiva o usar el predeterminado
      let eventType: 'wedding' | 'quinceanera' | 'birthday' | 'corporate' | 'conference' = 'wedding';
      let themeColors = getTemplateById('wedding')!.colors;

      if (eventCard) {
        eventType = eventCard.event_type || 'wedding';
        themeColors = eventCard.theme_colors || getTemplateById(eventType)!.colors;
      }

      const newSettings: Omit<EventFinalization, 'id' | 'created_at'> = {
        event_id: event.id,
        is_finalized: isFinalized,
        cover_image: coverImage,
        final_message: finalTitle + (finalSubtitle ? '. ' + finalSubtitle : ''), // Combinar para compatibilidad
        final_title: finalTitle,
        final_subtitle: finalSubtitle,
        video_url: videoUrl,
        video_message: videoMessage,
        whatsapp_number: whatsappNumber,
        whatsapp_button_text: whatsappButtonText,
        event_type: eventType,
        theme_colors: themeColors,
      };

      await finalizationStorage.saveEventFinalization(newSettings);
      setSettings(newSettings as EventFinalization);
      setShowCardForm(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error saving finalization card:', error);
      alert('Error al guardar la tarjeta. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCard = () => {
    setShowCardForm(true);
  };

  const handleDeleteCard = async () => {
    if (!confirm('¿Estás seguro de que deseas eliminar la tarjeta de finalización?')) {
      return;
    }

    try {
      setIsLoading(true);
      await finalizationStorage.deleteEventFinalization(event.id);
      setSettings(null);
      setCoverImage(undefined);
      setFinalMessage(`¡Gracias por acompañarnos en ${event.name}! Esperamos que hayas disfrutado de este momento tan especial.`);
      setFinalTitle(`¡Gracias por acompañarnos en ${event.name}!`);
      setFinalSubtitle('Esperamos que hayas disfrutado de este momento tan especial.');
      setVideoUrl(undefined);
      setVideoMessage('');
      setWhatsappNumber('');
      setWhatsappButtonText('¿Te gustaría obtener las fotos del evento? 📸');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error deleting finalization card:', error);
      alert('Error al eliminar la tarjeta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoverImageUpload = (file: File) => {
    // Validar tamaño (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`La imagen es demasiado grande.\n\n📏 Tamaño de tu archivo: ${(file.size / 1024 / 1024).toFixed(1)}MB\n✅ Tamaño máximo: 10MB\n\n💡 Tip: Comprime la imagen antes de subirla.`);
      return;
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      alert(`Formato de imagen no soportado: ${file.type}\n\n✅ Formatos permitidos:\n• JPEG/JPG (recomendado)\n• PNG (para transparencias)\n• WebP (mejor compresión)\n• GIF (para animaciones)`);
      return;
    }

    // Procesar archivo
    const reader = new FileReader();
    
    reader.onload = (e) => {
      setCoverImage(e.target?.result as string);
      console.log(`✅ Imagen cargada: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
    };
    
    reader.onerror = () => {
      alert('❌ Error al cargar la imagen. Por favor, intenta de nuevo.');
      console.error('Error reading image file:', file.name);
    };
    
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = (file: File) => {
    console.log(`📁 Archivo seleccionado: ${file.name}`);
    console.log(`📏 Tamaño: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    console.log(`🎬 Tipo MIME: ${file.type}`);

    // Validar tamaño (15MB = 15 * 1024 * 1024 bytes)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`El video es demasiado grande.\n\n📏 Tamaño de tu archivo: ${(file.size / 1024 / 1024).toFixed(1)}MB\n✅ Tamaño máximo: 15MB\n\n💡 Tips para reducir tamaño:\n• Usar MP4 con H.264\n• Resolución máxima 1080p\n• Duración recomendada: 1-3 minutos\n• Comprimir con HandBrake o similar`);
      return;
    }

    // Validar tipo de archivo - versión más flexible
    const allowedTypes = [
      'video/mp4',           // MP4 (más compatible)
      'video/webm',          // WebM (buena compresión)
      'video/ogg',           // OGG (código abierto)
      'video/quicktime',     // MOV (QuickTime)
      'video/x-msvideo',     // AVI
      'video/x-ms-wmv',      // WMV
      'video/3gpp',          // 3GP
      'video/x-flv',         // FLV
      'video/mp2t',          // TS
      'video/avi',           // AVI alternativo
      'video/mov'            // MOV alternativo
    ];

    // También validar por extensión si el tipo MIME no es reconocido
    const fileExtension = file.name.toLowerCase().split('.').pop();
    const allowedExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', '3gp', 'flv', 'ts'];

    const isValidType = allowedTypes.includes(file.type.toLowerCase());
    const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension);

    if (!isValidType && !isValidExtension) {
      alert(`Formato de video no soportado.\n\n🎬 Tipo detectado: ${file.type || 'Desconocido'}\n📁 Extensión: .${fileExtension || 'Desconocida'}\n\n✅ Formatos permitidos:\n• MP4 (recomendado - mejor compatibilidad)\n• WebM (buena compresión)\n• MOV (QuickTime)\n• AVI (amplio soporte)\n• WMV (Windows Media)\n• 3GP (móviles)\n• OGG, FLV, TS\n\n🎥 Calidad recomendada:\n• Resolución: 720p-1080p\n• Bitrate: 1-5 Mbps\n• Duración: 1-3 minutos\n• Códec: H.264 (MP4)`);
      return;
    }

    // Mostrar progreso
    console.log(`🎥 Iniciando carga del video: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log('📤 Iniciando lectura del archivo...');
    };

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        console.log(`📊 Progreso: ${percentComplete.toFixed(1)}%`);
      }
    };
    
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        if (result && result.startsWith('data:')) {
          setVideoUrl(result);
          console.log(`✅ Video cargado exitosamente: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        } else {
          throw new Error('Resultado de lectura inválido');
        }
      } catch (error) {
        console.error('❌ Error procesando el video:', error);
        alert('❌ Error al procesar el video. El archivo podría estar corrupto.');
      }
    };
    
    reader.onerror = (error) => {
      console.error('❌ Error leyendo el archivo:', error);
      alert(`❌ Error al cargar el video.\n\n💡 Posibles soluciones:\n• Verificar que el archivo no esté corrupto\n• Intentar con un archivo más pequeño\n• Usar formato MP4 si tienes problemas\n• Reintentar la subida\n\nDetalles técnicos: ${error}`);
    };
    
    reader.readAsDataURL(file);
  };

  // Obtener colores del tema seleccionado
  const getThemeColors = () => {
    if (settings?.theme_colors) {
      return settings.theme_colors;
    }
    if (eventCard?.theme_colors) {
      return eventCard.theme_colors;
    }
    const defaultTemplate = getTemplateById(eventCard?.event_type || 'wedding')!;
    return defaultTemplate.colors;
  };

  const themeColors = getThemeColors();

  return (
    <div className="space-y-8">
      {/* 1. SECCIÓN FINALIZAR EVENTO - Siempre visible - COLORES ORIGINALES */}
      <div className="bg-white shadow-lg rounded-xl p-8 border border-gray-100 bg-gradient-to-br from-white via-indigo-50/10 to-purple-50/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PartyPopper className="h-10 w-10 text-indigo-600" />
            <h3 className="text-2xl font-['Ginger'] text-gray-900">Finalización del Evento</h3>
          </div>
          <button
            onClick={handleToggleFinalization}
            disabled={isLoading}
            className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              isFinalized
                ? 'bg-gray-600 text-white hover:bg-gray-700 border-transparent'
                : 'bg-green-600 text-white hover:bg-green-700 border-transparent'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isFinalized ? 'focus:ring-gray-500' : 'focus:ring-green-500'
            } disabled:opacity-50`}
          >
            {isLoading ? (
              'Guardando...'
            ) : isFinalized ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Evento Finalizado
              </>
            ) : (
              'Evento Activo'
            )}
          </button>
        </div>

        <div className="mt-4 mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Cuando se finaliza un evento, la tarjeta interactiva dejará de estar disponible.
                Los invitados, al acceder al mismo enlace, verán la tarjeta de finalización del evento.
                (Si no hay una creada, se generará una versión básica automáticamente).
              </p>
            </div>
          </div>
        </div>

        {showSuccessMessage && (
          <div className="mb-6 rounded-md bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <PartyPopper className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  ¡Configuración guardada exitosamente!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SECCIÓN TARJETA DE FINALIZACIÓN */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Tarjeta de Finalización</h3>
            <p className="text-sm text-gray-600">
              Crea una tarjeta personalizada que verán los invitados cuando el evento esté finalizado.
            </p>
          </div>



          {/* Lógica de mostrar: Formulario / Preview / Estado inicial */}
          {showCardForm ? (
            /* FORMULARIO */
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Imagen de Portada
                </label>
                <div 
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg"
                  style={{
                    borderColor: `${themeColors.primary}40`,
                    backgroundColor: `${themeColors.background}30`
                  }}
                >
                  <div className="space-y-1 text-center">
                    {coverImage ? (
                      <div className="space-y-4">
                        <img
                          src={coverImage}
                          alt="Portada"
                          className="mx-auto h-32 w-auto rounded-lg shadow-md object-cover"
                        />
                        <button
                          onClick={() => setCoverImage(undefined)}
                          className="text-sm text-red-600 hover:text-red-500 font-medium"
                        >
                          Eliminar imagen
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label 
                            className="relative cursor-pointer bg-white rounded-md font-medium hover:opacity-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2"
                            style={{ color: themeColors.primary }}
                          >
                            <span>Subir imagen (máx. 10MB)</span>
                            <input
                              type="file"
                              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleCoverImageUpload(file);
                              }}
                            />
                          </label>
                          <p className="pl-1">o arrastra y suelta</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          <strong>Formatos:</strong> JPEG, PNG, WebP, GIF (hasta 10MB)
                          <br />
                          <strong>Recomendado:</strong> JPEG para fotos, PNG para transparencias
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Título Principal
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Se mostrará en grande con gradiente de colores y estilo destacado
                </p>
                <input
                  type="text"
                  value={finalTitle}
                  onChange={(e) => setFinalTitle(e.target.value)}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-serif text-lg"
                  placeholder="¡Gracias por acompañarnos en nuestro evento!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Subtítulo (opcional)
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Se mostrará en tamaño menor, cursiva y más sutil
                </p>
                <textarea
                  value={finalSubtitle}
                  onChange={(e) => setFinalSubtitle(e.target.value)}
                  rows={3}
                  className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-serif"
                  placeholder="Esperamos que hayas disfrutado de este momento tan especial..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Video del Evento
                </label>
                <div 
                  className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg"
                  style={{
                    borderColor: `${themeColors.primary}40`,
                    backgroundColor: `${themeColors.background}30`
                  }}
                >
                  <div className="space-y-1 text-center">
                    {videoUrl ? (
                      <div className="space-y-4">
                        <video
                          src={videoUrl}
                          className="mx-auto h-32 w-auto rounded-lg shadow-md"
                          controls
                        />
                        <button
                          onClick={() => setVideoUrl(undefined)}
                          className="text-sm text-red-600 hover:text-red-500 font-medium"
                        >
                          Eliminar video
                        </button>
                      </div>
                    ) : (
                      <>
                        <Play className="mx-auto h-12 w-12 text-gray-400" />
                        <div className="flex text-sm text-gray-600">
                          <label 
                            className="relative cursor-pointer bg-white rounded-md font-medium hover:opacity-80 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2"
                            style={{ color: themeColors.primary }}
                          >
                            <span>Subir video (máx. 15MB)</span>
                            <input
                              type="file"
                              accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-ms-wmv,video/3gpp,video/x-flv,video/mp2t"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVideoUpload(file);
                              }}
                            />
                          </label>
                          <p className="pl-1">o arrastra y suelta</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          <strong>Formatos:</strong> MP4, WebM, MOV, AVI, WMV, 3GP, OGG, FLV (hasta 15MB)
                          <br />
                          <strong>Recomendado:</strong> MP4 con H.264, 720p-1080p, 1-3 minutos
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {videoUrl && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Mensaje para el Video
                    </label>
                    <input
                      type="text"
                      value={videoMessage}
                      onChange={(e) => setVideoMessage(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Mensaje que acompañará al video..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Número de WhatsApp (para solicitar fotos)
                    </label>
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="Ej: +5493515123456"
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Los invitados podrán contactarte para solicitar fotos del evento
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Texto del Botón de WhatsApp
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Personaliza el mensaje que aparecerá en el botón. Los iconos se mantienen automáticamente.
                    </p>
                    <input
                      type="text"
                      value={whatsappButtonText}
                      onChange={(e) => setWhatsappButtonText(e.target.value)}
                      className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="¿Te gustaría obtener las fotos del evento? 📸"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-between pt-6">
                <button
                  onClick={() => setShowCardForm(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveFinalizationCard}
                  disabled={isLoading || (!!videoUrl && !whatsappNumber.trim())}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Guardando...' : 'Guardar Tarjeta'}
                </button>
              </div>
            </div>
          ) : settings ? (
            /* PREVIEW DE LA TARJETA */
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {settings.cover_image && (
                  <div className="flex justify-center pt-6 pb-4">
                    <div className="relative">
                      <img
                        src={settings.cover_image}
                        alt="Portada del evento"
                        className="w-32 h-32 object-cover rounded-full shadow-lg border-4 border-white"
                        style={{ borderColor: `${themeColors?.primary || '#6366f1'}20` }}
                      />
                      <div 
                        className="absolute inset-0 rounded-full border-2 opacity-30"
                        style={{ borderColor: themeColors?.primary || '#6366f1' }}
                      />
                    </div>
                  </div>
                )}
                <div className="p-6">
                  <div className="text-center space-y-2">
                    {/* Título Principal */}
                    {(settings.final_title || settings.final_message) && (
                      <h3 
                        className="text-lg font-bold line-clamp-2 leading-tight"
                        style={{ 
                          fontFamily: "'Playfair Display', 'Georgia', serif",
                          background: `linear-gradient(135deg, ${themeColors?.primary || '#6366f1'}, ${themeColors?.secondary || '#8b5cf6'})`,
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        {settings.final_title || settings.final_message.split(/[.!]/)[0]?.trim() + '!'}
                      </h3>
                    )}
                    
                    {/* Subtítulo */}
                    {settings.final_subtitle && (
                      <p 
                        className="text-sm font-light italic line-clamp-2 leading-relaxed opacity-80"
                        style={{ 
                          fontFamily: "'Playfair Display', 'Georgia', serif",
                          color: themeColors?.text || '#374151'
                        }}
                      >
                        {settings.final_subtitle}
                      </p>
                    )}
                    
                    {/* Línea decorativa sutil */}
                    <div className="flex justify-center items-center mt-3">
                      <div 
                        className="w-12 h-0.5 rounded-full opacity-60"
                        style={{ backgroundColor: themeColors?.primary || '#6366f1' }}
                      />
                    </div>
                  </div>
                  {settings.video_url && (
                    <div className="mt-2 flex items-center justify-center text-sm text-gray-500">
                      <Play className="h-4 w-4 mr-1" />
                      Video del evento disponible
                    </div>
                  )}
                  {settings.whatsapp_number && (
                    <div className="mt-2 flex items-center justify-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-1" />
                      Botón WhatsApp: "{settings.whatsapp_button_text || 'Contactar por WhatsApp'}"
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleEditCard}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </button>
                <button
                  onClick={() => setShowFullView(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Maximize2 className="h-4 w-4 mr-2" />
                  Vista Completa
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </button>
              </div>
            </div>
          ) : (
            /* ESTADO INICIAL - SIN TARJETA DE FINALIZACIÓN */
            <div className="text-center py-12">
              <PartyPopper className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">No hay tarjeta de finalización creada</p>
              
              {!eventCard ? (
                /* SIN TARJETA INTERACTIVA - BOTÓN BLOQUEADO */
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-3 max-w-md mx-auto">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-amber-700">
                          Primero debes crear una tarjeta interactiva para definir el estilo
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    disabled
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-gray-400 bg-gray-200 cursor-not-allowed"
                    title="Crea primero una tarjeta interactiva"
                  >
                    Crear Tarjeta
                  </button>
                </div>
              ) : (
                /* CON TARJETA INTERACTIVA - BOTÓN HABILITADO */
                <div className="space-y-3">
                  <button
                    onClick={() => setShowCardForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Crear Tarjeta
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Vista Completa */}
      {showFullView && settings && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-50">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg">
            <div className="sticky top-0 z-10 bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Vista Completa - Tarjeta de Finalización</h3>
              <button
                onClick={() => setShowFullView(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div 
                className="relative rounded-xl overflow-hidden"
                style={{ backgroundColor: themeColors.background }}
              >
                {/* Bordes decorativos */}
                <div 
                  className="absolute inset-0 border-[24px] border-double rounded-xl pointer-events-none"
                  style={{ borderColor: `${themeColors.primary}30` }}
                />
                <div 
                  className="absolute inset-8 border rounded-lg pointer-events-none"
                  style={{ borderColor: `${themeColors.secondary}40` }}
                />

                {settings.cover_image && (
                  <div className="flex justify-center pt-8 pb-6">
                    <div className="relative">
                      <img
                        src={settings.cover_image}
                        alt="Portada del evento"
                        className="w-40 h-40 object-cover rounded-full shadow-xl border-4 border-white"
                        style={{ borderColor: `${themeColors?.primary || '#6366f1'}20` }}
                      />
                      <div 
                        className="absolute inset-0 rounded-full border-2 opacity-30"
                        style={{ borderColor: themeColors?.primary || '#6366f1' }}
                      />
                    </div>
                  </div>
                )}
                <div className="relative p-12 space-y-12">
                  {/* Separador decorativo superior */}
                  <div className="flex items-center justify-center space-x-4 mb-8">
                    <div 
                      className="h-px w-16 bg-gradient-to-r from-transparent to-transparent"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)`
                      }}
                    />
                    <PartyPopper className="w-6 h-6" style={{ color: themeColors.primary }} />
                    <div 
                      className="h-px w-16 bg-gradient-to-r from-transparent to-transparent"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)`
                      }}
                    />
                  </div>

                  <div className="relative">
                    {/* Fondo decorativo sutil */}
                    <div 
                      className="absolute inset-0 rounded-2xl opacity-5"
                      style={{ backgroundColor: themeColors.primary }}
                    />
                    
                    {/* Contenedor del texto con mejor estructura */}
                    <div className="relative px-8 py-12">
                      <div 
                        className="text-center space-y-6"
                        style={{ 
                          fontFamily: "'Playfair Display', 'Georgia', serif",
                          color: themeColors.text
                        }}
                      >
                        {/* Título Principal */}
                        {(settings?.final_title || finalTitle) && (
                          <h1 
                            className="text-5xl md:text-6xl font-bold leading-tight"
                            style={{ 
                              textShadow: `2px 2px 4px ${themeColors.primary}20`,
                              background: `linear-gradient(135deg, ${themeColors.primary}, ${themeColors.secondary})`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text'
                            }}
                          >
                            {settings?.final_title || finalTitle}
                          </h1>
                        )}
                        
                        {/* Subtítulo */}
                        {(settings?.final_subtitle || finalSubtitle) && (
                          <p 
                            className="text-2xl md:text-3xl font-light italic leading-relaxed opacity-90"
                            style={{ 
                              textShadow: `1px 1px 2px ${themeColors.primary}10`,
                              color: themeColors.text
                            }}
                          >
                            {settings?.final_subtitle || finalSubtitle}
                          </p>
                        )}
                        
                        {/* Elemento decorativo final */}
                        <div className="flex justify-center items-center space-x-3 mt-8">
                          <div 
                            className="w-8 h-0.5 rounded-full"
                            style={{ backgroundColor: `${themeColors.accent}60` }}
                          />
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: themeColors.accent }}
                          />
                          <div 
                            className="w-8 h-0.5 rounded-full"
                            style={{ backgroundColor: `${themeColors.accent}60` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {videoUrl && videoMessage && (
                    <div className="space-y-8 mt-12">
                      {/* Separador */}
                      <div className="flex items-center justify-center">
                        <div 
                          className="h-px w-32 bg-gradient-to-r from-transparent to-transparent"
                          style={{ 
                            backgroundImage: `linear-gradient(to right, transparent, ${themeColors.secondary}60, transparent)`
                          }}
                        />
                      </div>

                      <video
                        src={videoUrl}
                        className="mx-auto max-w-full rounded-xl shadow-xl border-8"
                        style={{ borderColor: themeColors.background }}
                        controls
                      />
                      <p 
                        className="text-center text-2xl font-['Bailey'] italic"
                        style={{ color: themeColors.text }}
                      >
                        {videoMessage}
                      </p>
                      {whatsappNumber && (
                        <div className="flex justify-center">
                          <a
                            href={`https://wa.me/${whatsappNumber}?text=Hola, me gustaría obtener las imágenes del evento ${event.name}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-8 py-4 border-2 text-lg font-medium rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
                            style={{
                              borderColor: themeColors.primary,
                              color: themeColors.text,
                              backgroundColor: themeColors.background
                            }}
                          >
                            <Phone className="h-5 w-5 mr-2" style={{ color: themeColors.primary }} />
                            {settings?.whatsapp_button_text || whatsappButtonText}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Separador decorativo inferior */}
                  <div className="flex items-center justify-center space-x-4 mt-8">
                    <div 
                      className="h-px w-16 bg-gradient-to-r from-transparent to-transparent"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)`
                      }}
                    />
                    <PartyPopper className="w-6 h-6" style={{ color: themeColors.primary }} />
                    <div 
                      className="h-px w-16 bg-gradient-to-r from-transparent to-transparent"
                      style={{ 
                        backgroundImage: `linear-gradient(to right, transparent, ${themeColors.primary}60, transparent)`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}