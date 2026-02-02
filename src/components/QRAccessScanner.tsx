import React from 'react';
import { Camera, Scan, Search, Users, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import type { Guest, GuestAccessSettings } from '../types/event';
import { storage } from '../lib/storage';
import { updateEventGuestAPI } from '../endpoints/eventGuest';
import { clearAccessControlScansAPI, getAccessControlScansAPI, logAccessControlScanAPI } from '../endpoints/accessControlScans';
import { QRAccessModal } from './QRAccessModal';
import { QRAccessVideoModal } from './QRAccessVideoModal';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import { notify } from '../lib/notify';
import { appConfirm } from '../lib/dialogs';

// Extender el tipo jsPDF para incluir autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface QRAccessScannerProps {
  eventId: string;
  guests: Guest[];
  accessSettings: GuestAccessSettings | null;
  onGuestProcessed: (guest: Guest) => void;
  // Callbacks para screensaver (OPCIONALES - no rompen nada si no se usan)
  onActivity?: () => void;
  onMethodChange?: (method: string) => void;
  onModalStateChange?: (hasModals: boolean) => void;
  onScreensaverToggle?: (enabled: boolean) => void;
  onScanningStateChange?: (isScanning: boolean) => void;
}

type ScanMethod = 'reader' | 'camera' | 'manual';

interface ScanResult {
  success: boolean;
  guest?: Guest;
  message: string;
  type: 'success' | 'error' | 'warning';
}

interface SearchResult {
  guest: Guest;
  status: 'attended' | 'pending' | 'denied';
}

interface RecentScan {
  id: string;
  guest: Guest;
  timestamp: Date;
  status: 'success' | 'duplicate' | 'denied' | 'invalid';
  eventId: string;
  scanMethod: ScanMethod;
}

interface MethodAvailability {
  camera: {
    available: boolean;
    status: 'checking' | 'available' | 'denied' | 'unavailable';
    error?: string;
  };
  reader: {
    available: boolean;
    status: 'checking' | 'available' | 'unavailable';
    lastActivity?: Date;
    error?: string;
  };
}

export function QRAccessScanner({ 
  eventId, 
  guests, 
  accessSettings, 
  onGuestProcessed,
  onActivity,
  onMethodChange,
  onModalStateChange,
  onScreensaverToggle,
  onScanningStateChange
}: QRAccessScannerProps) {
  // Estado local de guests para evitar problemas de sincronización
  const [localGuests, setLocalGuests] = React.useState<Guest[]>(guests);
  const [selectedMethod, setSelectedMethod] = React.useState<ScanMethod>('reader');
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanResult, setScanResult] = React.useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = React.useState<RecentScan[]>([]);
  const [manualInput, setManualInput] = React.useState('');
  const [showMethodSelection, setShowMethodSelection] = React.useState(true);
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [isInitializingCamera, setIsInitializingCamera] = React.useState(false);
  const [methodAvailability, setMethodAvailability] = React.useState<MethodAvailability>({
    camera: { available: false, status: 'checking' },
    reader: { available: false, status: 'checking' }
  });
  // Estados del modal
  const [showAccessModal, setShowAccessModal] = React.useState(false);
  const [modalType, setModalType] = React.useState<'pre-activation' | 'welcome' | 'rejection'>('welcome');
  const [modalGuest, setModalGuest] = React.useState<Guest | undefined>(undefined);
  const [pendingGuestUpdate, setPendingGuestUpdate] = React.useState<Guest | null>(null);
  const [showVideoModal, setShowVideoModal] = React.useState(false);
  const [videoModalGuest, setVideoModalGuest] = React.useState<Guest | undefined>(undefined);
  const [currentVideoUrl, setCurrentVideoUrl] = React.useState<string>('');
  
  const [statistics, setStatistics] = React.useState({
    total: 0,
    attended: 0,
    pending: 0
  });
  
  const scannerRef = React.useRef<Html5QrcodeScanner | null>(null);
  const hidInputRef = React.useRef<string>('');
  const readerTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastKeypressRef = React.useRef<number>(0);
  const readerDetectionTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [eventName, setEventName] = React.useState<string>('');
  const [screensaverEnabled, setScreensaverEnabled] = React.useState(true);

  // Sincronizar guests props con estado local
  React.useEffect(() => {
    setLocalGuests(guests);
  }, [guests]);

  // Calcular estadísticas
  React.useEffect(() => {
    const total = localGuests.length;
    const attended = localGuests.filter(g => g.confirmation_status === 'attended').length;
    setStatistics({
      total,
      attended,
      pending: total - attended
    });
  }, [localGuests]);

  // Detectar métodos disponibles al cargar
  React.useEffect(() => {
    detectAvailableMethods();
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
      } catch (error) {
        console.log('Scanner cleanup:', error);
      }
      scannerRef.current = null;
    }
    if (readerTimeoutRef.current) {
      clearTimeout(readerTimeoutRef.current);
    }
    if (readerDetectionTimeoutRef.current) {
      clearTimeout(readerDetectionTimeoutRef.current);
    }
  };

  const detectAvailableMethods = async () => {
    // Detectar cámara
    await detectCameraAvailability();
    // Detectar lector QR (detección real)
    await detectReaderAvailability();
  };

  const detectCameraAvailability = async () => {
    setMethodAvailability(prev => ({
      ...prev,
      camera: { ...prev.camera, status: 'checking' }
    }));

    try {
      // Verificar si el navegador soporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no soporta acceso a cámara');
      }

      // Intentar obtener lista de dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        throw new Error('No se encontraron cámaras disponibles en este dispositivo');
      }

      // Verificar permisos de cámara
      try {
        const permissionResult = await navigator.permissions?.query({ name: 'camera' as PermissionName });
        
        if (permissionResult?.state === 'denied') {
          throw new Error('Permisos de cámara denegados. Permite el acceso en configuración del navegador');
        }
      } catch (permError) {
        // Si no se puede verificar permisos, intentaremos más tarde
        console.log('Cannot check camera permissions:', permError);
      }

      setMethodAvailability(prev => ({
        ...prev,
        camera: { 
          available: true, 
          status: 'available',
          error: undefined
        }
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al detectar cámara';
      console.error('Error detecting camera:', error);
      
      setMethodAvailability(prev => ({
        ...prev,
        camera: { 
          available: false, 
          status: 'unavailable',
          error: errorMessage
        }
      }));
    }
  };

  const detectReaderAvailability = async () => {
    // ESTADO NEUTRO: No asumimos nada sobre la disponibilidad del lector
    // El usuario puede seleccionarlo siempre, funcionará si está conectado
    setMethodAvailability(prev => ({
      ...prev,
      reader: { 
        available: true, // Siempre seleccionable
        status: 'available', // Estado neutro
        error: undefined
      }
    }));
  };

  // Listener ultra-optimizado para Nitcom 6200+ (captura masiva)
  React.useEffect(() => {
    if (selectedMethod !== 'reader' || !isScanning) return;

    let inputBuffer = '';
    let bufferTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevenir comportamiento por defecto
      event.preventDefault();
      event.stopPropagation();
      
      if (event.key === 'Enter') {
        // Fin de código QR - procesar buffer completo
        if (inputBuffer.length > 10) {
          // Limpiar el código: remover caracteres extra y normalizar
          let cleanCode = inputBuffer
            .trim()
            .toLowerCase()
            .replace(/[^a-f0-9\-]/g, ''); // Solo caracteres válidos
          
          // Intentar reconstruir formato UUID si es necesario
          if (cleanCode.length >= 32 && cleanCode.length <= 36) {
            // Si no tiene guiones, agregarlos
            if (!cleanCode.includes('-') && cleanCode.length === 32) {
              cleanCode = cleanCode.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
            }
            
            // Validar formato UUID final
            const isValidUUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(cleanCode);
            
            if (isValidUUID) {
              // Marcar actividad del lector
              setMethodAvailability(prev => ({
                ...prev,
                reader: { 
                  ...prev.reader, 
                  status: 'available',
                  available: true,
                  lastActivity: new Date(),
                  error: undefined
                }
              }));
              
              onActivity?.();
              
              // Procesar directamente: los guests vienen del backend via props
              processQRCode(cleanCode);
              
            } else {
              showScanResult({
                success: false,
                message: 'Código QR con formato incorrecto. Intente escanear nuevamente.',
                type: 'warning'
              });
            }
          } else {
            showScanResult({
              success: false,
              message: 'Código QR incompleto. Intente escanear nuevamente.',
              type: 'warning'
            });
          }
        }
        
        // Limpiar buffer
        inputBuffer = '';
        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
          bufferTimeout = null;
        }
        
      } else if (event.key.length === 1) {
        // Agregar carácter al buffer
        inputBuffer += event.key.toLowerCase();
        
        // Resetear timeout de limpieza
        if (bufferTimeout) {
          clearTimeout(bufferTimeout);
        }
        
        // Auto-limpiar después de 2 segundos sin actividad
        bufferTimeout = setTimeout(() => {
          if (inputBuffer.length > 0) {
            inputBuffer = '';
          }
        }, 2000);
      }
    };

    // Agregar listeners con máxima prioridad
    document.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    window.addEventListener('keydown', handleKeyDown, { capture: true, passive: false });
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      if (bufferTimeout) {
        clearTimeout(bufferTimeout);
      }
    };
  }, [selectedMethod, isScanning]);

  const startScanning = (method: ScanMethod) => {
    setSelectedMethod(method);
    setShowMethodSelection(false);
    setIsScanning(true);
    setScanResult(null);
    setCameraError(null);
    
    // Notificar cambio de método (SOLO UNA LÍNEA)
    onMethodChange?.(method);
    
    // Notificar estado del screensaver
    onScreensaverToggle?.(screensaverEnabled);
    
    // Notificar que está escaneando
    onScanningStateChange?.(true);

    if (method === 'camera') {
      // Delay para asegurar que el DOM esté actualizado
      setTimeout(() => {
        initCameraScanner();
      }, 100);
    } else if (method === 'reader') {
      // Limpiar buffer del lector para evitar caracteres residuales
      hidInputRef.current = '';
      lastKeypressRef.current = 0;
      
      // Confirmar que el lector está disponible
      setMethodAvailability(prev => ({
        ...prev,
        reader: { 
          ...prev.reader, 
          status: 'available',
          available: true,
          lastActivity: new Date(),
          error: undefined
        }
      }));
    }
  };

  const initCameraScanner = async () => {
    setIsInitializingCamera(true);
    setCameraError(null);

    try {
      // Verificar que el contenedor existe
      const container = document.getElementById('qr-scanner-container');
      if (!container) {
        throw new Error('Contenedor de cámara no encontrado');
      }

      // Solicitar permisos de cámara explícitamente
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment', // Cámara trasera preferida
            width: { ideal: 640 },
            height: { ideal: 480 }
          } 
        });
        
        // Cerrar el stream inmediatamente, solo era para verificar permisos
        stream.getTracks().forEach(track => track.stop());
        
      } catch (permissionError) {
        throw new Error('Permisos de cámara denegados. Por favor permite el acceso a la cámara.');
      }

      // Configurar scanner
      const config = {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        disableFlip: false,
        videoConstraints: {
          facingMode: 'environment'
        }
      };

      // Limpiar scanner anterior si existe
      if (scannerRef.current) {
        await scannerRef.current.clear();
      }

      scannerRef.current = new Html5QrcodeScanner(
        "qr-scanner-container",
        config,
        false
      );

      await scannerRef.current.render(
        (decodedText) => {
          console.log('QR Code detected:', decodedText);
          processQRCode(decodedText);
        },
        (error) => {
          // Errores de escaneo son normales, no los mostramos
          console.debug('Scan error (normal):', error);
        }
      );

      // Actualizar estado de disponibilidad
      setMethodAvailability(prev => ({
        ...prev,
        camera: { ...prev.camera, status: 'available' }
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error al inicializar cámara';
      console.error('Camera initialization error:', error);
      
      setCameraError(errorMessage);
      setMethodAvailability(prev => ({
        ...prev,
        camera: { 
          available: false, 
          status: 'unavailable',
          error: errorMessage
        }
      }));
    } finally {
      setIsInitializingCamera(false);
    }
  };

  const handleModalClose = () => {
    setShowAccessModal(false);
    
    // Notificar que no hay modales (SOLO UNA LÍNEA)
    onModalStateChange?.(false);
    
    // Continuar con el flujo después de cerrar el modal
    if (pendingGuestUpdate) {
      finalizeScanProcess(pendingGuestUpdate);
      setPendingGuestUpdate(null);
    }
  };

  const handleVideoModalClose = () => {
    setShowVideoModal(false);
    
    // Continuar con el flujo después de cerrar el modal
    if (videoModalGuest) {
      finalizeScanProcess(videoModalGuest);
      setVideoModalGuest(undefined);
      setCurrentVideoUrl('');
    }
  };

  const finalizeScanProcess = async (updatedGuest: Guest) => {
    try {
      // Persist check-in in backend (Access Control is authenticated)
      await updateEventGuestAPI(Number(eventId), updatedGuest.guest_number, {
        guest_number: String(updatedGuest.guest_number),
        confirmation_status: 'attended',
        status: 'attended',
        check_in_time: new Date().toISOString(),
      });
      
      // IMPORTANTE: Actualizar estado local INMEDIATAMENTE
      setLocalGuests(prevGuests => 
        prevGuests.map(guest => 
          guest.id === updatedGuest.id ? updatedGuest : guest
        )
      );
      
      // Actualizar en componente padre
      onGuestProcessed(updatedGuest);

      // Agregar al historial
      addToRecentScans(updatedGuest, 'success');

      // Sonido de confirmación
      playSuccessSound();

      // Mostrar resultado en la interfaz
      const welcomeMessage = accessSettings?.welcome_message
        ?.replace('{name}', updatedGuest.name || `Invitado #${updatedGuest.guest_number}`)
        ?.replace('{table}', updatedGuest.table_number?.toString() || '--') || 
        `¡Bienvenido/a ${updatedGuest.name || `Invitado #${updatedGuest.guest_number}`}!`;

      showScanResult({
        success: true,
        guest: updatedGuest,
        message: welcomeMessage,
        type: 'success'
      });

    } catch (error) {
      console.error('Error finalizing scan process:', error);
      showScanResult({
        success: false,
        message: 'Error al completar el proceso de ingreso',
        type: 'error'
      });
      playErrorSound();
    }
  };

  const processQRCode = async (qrCode: string) => {
    try {
      console.log('Processing QR Code:', qrCode);
      
      // Buscar invitado por QR code
      const guest = localGuests.find(g => g.qr_code === qrCode);
      
      if (!guest) {
        // Log invalid scan (best-effort)
        try {
          await logAccessControlScanAPI({
            bolt_event_id: Number(eventId),
            qr_code: qrCode,
            scan_method: selectedMethod,
            status: 'invalid',
            message: 'Código QR no válido para este evento',
            meta: null,
          });
        } catch (e) {
          console.error('Error logging invalid scan:', e);
        }

        showScanResult({
          success: false,
          message: 'Código QR no válido para este evento',
          type: 'error'
        });
        playErrorSound();
        return;
      }

      // Verificar si el acceso está activo
      if (!accessSettings?.is_active) {
        // Log denied scan (not active)
        try {
          await logAccessControlScanAPI({
            bolt_event_id: Number(eventId),
            qr_code: guest.qr_code,
            scan_method: selectedMethod,
            status: 'denied',
            message: 'El acceso QR no está activado',
            meta: null,
          });
        } catch (e) {
          console.error('Error logging denied scan:', e);
        }

        // Mostrar modal de pre-activación si está configurado para mensajes
        if (accessSettings?.access_type === 'message') {
          setModalType('pre-activation');
          setModalGuest(guest);
          setShowAccessModal(true);
          onModalStateChange?.(true); // Notificar modal abierto
          playWarningSound();
          return;
        } else {
          showScanResult({
            success: false,
            message: 'El acceso QR no está activado',
            type: 'warning'
          });
          playWarningSound();
          return;
        }
      }

      const isDenied = accessSettings?.access_type === 'video'
        ? guest.video_status === false
        : guest.qr_code_status === false;

      // Verificar si el invitado tiene acceso denegado
      if (isDenied) {
        // Log denied scan
        try {
          await logAccessControlScanAPI({
            bolt_event_id: Number(eventId),
            qr_code: guest.qr_code,
            scan_method: selectedMethod,
            status: 'denied',
            message: accessSettings?.rejection_message || 'Acceso denegado',
            meta: null,
          });
        } catch (e) {
          console.error('Error logging denied scan:', e);
        }

        // Mostrar modal de rechazo si está configurado para mensajes
        if (accessSettings?.access_type === 'message') {
          setModalType('rejection');
          setModalGuest(guest);
          setShowAccessModal(true);
          onModalStateChange?.(true); // Notificar modal abierto
          playErrorSound();
          addToRecentScans(guest, 'denied');
          return;
        } else {
          showScanResult({
            success: false,
            guest,
            message: accessSettings.rejection_message || 'Acceso denegado',
            type: 'error'
          });
          playErrorSound();
          addToRecentScans(guest, 'denied');
          return;
        }
      }

      // Verificar si ya había ingresado
      if (guest.confirmation_status === 'attended') {
        // Log duplicate scan
        try {
          await logAccessControlScanAPI({
            bolt_event_id: Number(eventId),
            qr_code: guest.qr_code,
            scan_method: selectedMethod,
            status: 'duplicate',
            message: `${guest.name || `Invitado #${guest.guest_number}`} ya había ingresado anteriormente.`,
            meta: null,
          });
        } catch (e) {
          console.error('Error logging duplicate scan:', e);
        }

        showScanResult({
          success: false,
          guest,
          message: `${guest.name || `Invitado #${guest.guest_number}`} ya había ingresado anteriormente.`,
          type: 'warning'
        });
        playWarningSound();
        
        // Agregar a escaneados recientes como duplicado
        addToRecentScans(guest, 'duplicate');
        return;
      }

      // ¡Éxito! Preparar actualización del invitado
      const updatedGuest: Guest = { ...guest, confirmation_status: 'attended' };

      // Manejar según el tipo de acceso
      if (accessSettings?.access_type === 'message') {
        // Si está configurado para mensajes, mostrar modal de bienvenida
        setModalType('welcome');
        setModalGuest(updatedGuest);
        setPendingGuestUpdate(updatedGuest);
        setShowAccessModal(true);
        onModalStateChange?.(true); // Notificar modal abierto
      } else if (accessSettings?.access_type === 'video') {
        // Si está configurado para video, intentar obtener y mostrar el video
        try {
          if (guest.video_url) {
            setVideoModalGuest(updatedGuest);
            setCurrentVideoUrl(guest.video_url);
            setShowVideoModal(true);
          } else {
            // Si no hay video, procesar directamente
            await finalizeScanProcess(updatedGuest);
          }
        } catch (error) {
          console.error('Error getting guest video:', error);
          await finalizeScanProcess(updatedGuest);
        }
      } else {
        // Si no es mensaje ni video, procesar directamente
        await finalizeScanProcess(updatedGuest);
      }

    } catch (error) {
      console.error('Error processing QR code:', error);
      showScanResult({
        success: false,
        message: 'Error al procesar el código QR',
        type: 'error'
      });
      playErrorSound();
    }
  };

  const processManualSearch = async () => {
    if (!manualInput.trim()) return;

    // Notificar actividad (SOLO UNA LÍNEA)
    onActivity?.();

    // Buscar por número de invitado o parte del nombre
    const searchTerm = manualInput.toLowerCase();
    const foundGuests = localGuests.filter(g => 
      g.guest_number?.toString() === searchTerm ||
      g.name?.toLowerCase().includes(searchTerm) ||
      g.qr_code === manualInput
    );

    if (foundGuests.length > 0) {
      // Crear resultados de búsqueda con estado
      const results: SearchResult[] = foundGuests.map(guest => ({
        guest,
        status: (accessSettings?.access_type === 'video' ? guest.video_status === false : guest.qr_code_status === false)
          ? 'denied'
          : guest.confirmation_status === 'attended'
            ? 'attended'
            : 'pending'
      }));
      
      setSearchResults(results);
      setShowSearchResults(true);
      setScanResult(null); // Limpiar resultados de escaneo
    } else {
      showScanResult({
        success: false,
        message: 'No se encontró ningún invitado con ese número o nombre',
        type: 'error'
      });
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const confirmGuestAttendance = async (guest: Guest) => {
    // Usar la función de procesamiento de QR existente para registrar asistencia
    await processQRCode(guest.qr_code);
    
    // Actualizar resultados de búsqueda para reflejar el cambio
    setSearchResults(prev => 
      prev.map(result => 
        result.guest.id === guest.id 
          ? { ...result, status: 'attended' as const }
          : result
      )
    );
  };

  const clearSearchResults = () => {
    setSearchResults([]);
    setShowSearchResults(false);
    setManualInput('');
  };

  const showScanResult = (result: ScanResult) => {
    setScanResult(result);
    // Auto-limpiar resultado después de 5 segundos
    setTimeout(() => {
      setScanResult(null);
    }, 5000);
  };

  // Cargar historial persistente al inicializar
  React.useEffect(() => {
    loadScanHistory();
  }, [eventId]);

  const loadScanHistory = async () => {
    try {
      const res = await getAccessControlScansAPI(Number(eventId), 500);
      const rows = Array.isArray(res?.data) ? res.data : [];
      const mapped: RecentScan[] = rows
        .map((r: any) => {
          if (!r?.guest) return null;
          return {
            id: String(r.id ?? crypto.randomUUID()),
            guest: r.guest as Guest,
            timestamp: new Date(r.timestamp || new Date().toISOString()),
            status: (r.status as any) || 'invalid',
            eventId: String(r.eventId ?? eventId),
            scanMethod: (r.scanMethod as any) || 'reader',
          } as RecentScan;
        })
        .filter(Boolean) as RecentScan[];
      setRecentScans(mapped);
    } catch (error) {
      console.error('Error loading scan history from API:', error);
    }
  };

  const addToRecentScans = async (guest: Guest, status: 'success' | 'duplicate' | 'denied' | 'invalid', meta?: Record<string, any>) => {
    const newScan: RecentScan = {
      id: crypto.randomUUID(),
      guest,
      timestamp: new Date(),
      status,
      eventId,
      scanMethod: selectedMethod
    };
    
    setRecentScans(prev => {
      const next = [newScan, ...prev];
      return next.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    });

    // Persist in DB (best-effort)
    try {
      await logAccessControlScanAPI({
        bolt_event_id: Number(eventId),
        qr_code: guest.qr_code || null,
        scan_method: selectedMethod,
        status,
        message: null,
        meta: meta || null,
      });
    } catch (e) {
      console.error('Error logging scan to API:', e);
    }
  };

  const clearScanHistory = async () => {
    const confirmed = await appConfirm({
      title: 'Limpiar historial',
      message: '¿Estás seguro de que quieres limpiar todo el historial de escaneos? Esta acción no se puede deshacer.',
      confirmText: 'Limpiar',
      cancelText: 'Cancelar',
    });
    if (!confirmed) return;

    try {
      await clearAccessControlScansAPI(Number(eventId));
      setRecentScans([]);
      notify.success('Historial de escaneos limpiado correctamente');
    } catch (e) {
      console.error('Error clearing scan history in API:', e);
      notify.error('Error al limpiar el historial de escaneos');
    }
  };

  const exportScanHistory = () => {
    try {
      const doc = new jsPDF();
      
      // Configurar el título y la fecha
      doc.setFontSize(16);
      doc.setTextColor(79, 70, 229); // Color indigo para mantener consistencia con el branding
      doc.text(`Historial de Escaneos - ${eventName}`, 20, 20);
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text(`Fecha: ${getCurrentDate()}`, 20, 30);
      
      // Usar jspdf-autotable para crear una tabla más profesional
      const tableOptions: UserOptions = {
        startY: 40,
        head: [['Fecha/Hora', 'Invitado', 'Mesa', 'Estado', 'Método']],
        body: recentScans.map(scan => [
          new Date(scan.timestamp).toLocaleString(),
          scan.guest.name || `Invitado #${scan.guest.guest_number}`,
          scan.guest.table_number ? `#${scan.guest.table_number}` : '-',
          getStatusText(scan.status),
          scan.scanMethod === 'reader' ? 'Lector' : 'Cámara'
        ]),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [245, 247, 250] }
      };
      
      (doc as any).autoTable(tableOptions);
      
      // Guardar el PDF con el nombre del evento incluido
      const fileName = `historial_escaneos_${eventName.toLowerCase().replace(/[^a-z0-9]/g, '-')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error exporting scan history:', error);
      notify.error('Error al exportar el historial. Por favor, intente nuevamente.');
    }
  };

  const playSuccessSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwgBjuNzPPRgS0HJHLLdTxZgCw=');
      audio.play().catch(() => {}); // Silencioso si falla
    } catch (error) {
      console.log('Sound play failed:', error);
    }
  };

  const playErrorSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwgBjuNzPPRgS0HJHLLdTxZgCw=');
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Sound play failed:', error);
    }
  };

  const playWarningSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwgBjuNzPPRgS0HJHLLdTxZgCw=');
      audio.play().catch(() => {});
    } catch (error) {
      console.log('Sound play failed:', error);
    }
  };

  const changeMethod = () => {
    setIsScanning(false);
    setShowMethodSelection(true);
    setScanResult(null);
    setCameraError(null);
    setShowSearchResults(false);
    setSearchResults([]);
    
    // Notificar que ya no está escaneando
    onScanningStateChange?.(false);
    
    cleanup();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    
    if (isToday) {
      return formatTime(date);
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };

  const getScanMethodIcon = (method: ScanMethod) => {
    switch (method) {
      case 'reader': return '📟';
      case 'camera': return '📱';
      case 'manual': return '⌨️';
      default: return '🔍';
    }
  };

  const getStatusColor = (status: 'success' | 'duplicate' | 'denied' | 'invalid') => {
    switch (status) {
      case 'success': return 'bg-green-400';
      case 'duplicate': return 'bg-yellow-400';
      case 'denied': return 'bg-red-400';
      case 'invalid': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: 'success' | 'duplicate' | 'denied' | 'invalid') => {
    switch (status) {
      case 'success': return 'Ingresó';
      case 'duplicate': return 'Duplicado';
      case 'denied': return 'Denegado';
      case 'invalid': return 'Inválido';
      default: return 'Desconocido';
    }
  };

  const getMethodStatusIcon = (method: 'camera' | 'reader') => {
    const availability = methodAvailability[method];
    
    switch (availability.status) {
      case 'checking':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unavailable':
      case 'denied':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getMethodStatusText = (method: 'camera' | 'reader') => {
    const availability = methodAvailability[method];
    
    switch (availability.status) {
      case 'checking':
        return method === 'camera' ? 'Verificando cámara...' : 'Detectando lector...';
      case 'available':
        return method === 'camera' ? 'Cámara Lista' : 'Lector QR';
      case 'unavailable':
        return method === 'camera' ? 'Cámara No Disponible' : 'Lector No Detectado';
      case 'denied':
        return 'Permisos Denegados';
      default:
        return 'Estado Desconocido';
    }
  };

  // Agregar función para formatear la fecha actual
  const getCurrentDate = () => {
    const date = new Date();
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  React.useEffect(() => {
    const loadEventName = async () => {
      try {
        const events = await storage.getEvents();
        const event = events.find(e => e.id === eventId);
        if (event) {
          setEventName(event.name);
        }
      } catch (error) {
        console.error('Error loading event name:', error);
      }
    };
    loadEventName();
  }, [eventId]);

  if (showMethodSelection) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Configurar Método de Escaneo</h2>
          <p className="text-gray-600 mb-8">Selecciona cómo deseas escanear los códigos QR de los invitados</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Lector QR */}
          <button
            onClick={() => startScanning('reader')}
            disabled={!methodAvailability.reader.available}
            className={`border-2 rounded-xl p-6 transition-all duration-200 group ${
              methodAvailability.reader.available
                ? 'border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 bg-white'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                methodAvailability.reader.available 
                  ? 'bg-indigo-100 group-hover:bg-indigo-200' 
                  : 'bg-gray-100'
              }`}>
                <Scan className={`w-8 h-8 ${
                  methodAvailability.reader.available ? 'text-indigo-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Lector QR</h3>
                <p className="text-sm text-gray-600 mt-2">Lector USB/HID dedicado</p>
                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getMethodStatusIcon('reader')}
                  <span className="text-xs text-gray-500">
                    {getMethodStatusText('reader')}
                  </span>
                </div>
                {methodAvailability.reader.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {methodAvailability.reader.error}
                  </p>
                )}
              </div>
            </div>
          </button>

          {/* Cámara Web */}
          <button
            onClick={() => startScanning('camera')}
            disabled={!methodAvailability.camera.available}
            className={`border-2 rounded-xl p-6 transition-all duration-200 group ${
              methodAvailability.camera.available
                ? 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 bg-white'
                : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
            }`}
          >
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                methodAvailability.camera.available 
                  ? 'bg-gray-100 group-hover:bg-gray-200' 
                  : 'bg-gray-100'
              }`}>
                <Camera className={`w-8 h-8 ${
                  methodAvailability.camera.available ? 'text-gray-600' : 'text-gray-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Cámara Web</h3>
                <p className="text-sm text-gray-600 mt-2">Usar cámara del dispositivo</p>
                <div className="flex items-center justify-center space-x-2 mt-3">
                  {getMethodStatusIcon('camera')}
                  <span className="text-xs text-gray-500">
                    {getMethodStatusText('camera')}
                  </span>
                </div>
                {methodAvailability.camera.error && (
                  <p className="text-xs text-red-600 mt-1">
                    {methodAvailability.camera.error}
                  </p>
                )}
                {methodAvailability.camera.available && (
                  <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mt-2">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Disponible
                  </div>
                )}
              </div>
            </div>
          </button>

          {/* Manual */}
          <button
            onClick={() => startScanning('manual')}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 group"
          >
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto group-hover:bg-gray-200">
                <Search className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Búsqueda Manual</h3>
                <p className="text-sm text-gray-600 mt-2">Buscar por número o nombre</p>
                <div className="flex items-center justify-center space-x-2 mt-3">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-gray-500">Siempre Disponible</span>
                </div>
                <div className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full mt-2">
                  Backup
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900">Información de Dispositivos</h4>
              <ul className="text-sm text-blue-800 mt-1 space-y-1">
                <li>• <strong>Lector QR:</strong> Se detecta automáticamente si hay uno conectado</li>
                <li>• <strong>Cámara Web:</strong> Requiere permisos del navegador en primera ejecución</li>
                <li>• <strong>Manual:</strong> Búsqueda segura sin auto-registro</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header con método actual */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                {selectedMethod === 'reader' && <Scan className="w-5 h-5 text-indigo-600" />}
                {selectedMethod === 'camera' && <Camera className="w-5 h-5 text-indigo-600" />}
                {selectedMethod === 'manual' && <Search className="w-5 h-5 text-indigo-600" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Escaneando con: {
                    selectedMethod === 'reader' ? 'Lector QR' :
                    selectedMethod === 'camera' ? 'Cámara Web' : 'Búsqueda Manual'
                  }
                </h3>
                <div className="flex items-center space-x-2">
                  <p className="text-sm text-gray-600">
                    {isScanning ? 'Listo para escanear...' : 'Preparando...'}
                  </p>
                  {selectedMethod === 'reader' && methodAvailability.reader.lastActivity && (
                    <span className="text-xs text-green-600">
                      • Último: {formatTime(methodAvailability.reader.lastActivity)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={changeMethod}
              className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
            >
              Cambiar Método
            </button>
          </div>
        </div>

        {/* Toggle Protector de pantalla - Para método manual y reader */}
        {(selectedMethod === 'manual' || selectedMethod === 'reader') && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-gray-700">Protector de pantalla</span>
                <span className="text-xs text-gray-500">Se activa tras 5 segundos de inactividad</span>
              </div>
              <button
                onClick={() => {
                  const newState = !screensaverEnabled;
                  setScreensaverEnabled(newState);
                  onScreensaverToggle?.(newState);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  screensaverEnabled ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    screensaverEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white rounded-lg shadow-sm border p-2 sm:p-4 text-center">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{statistics.total}</div>
            <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center mt-1">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Total Invitados</span>
              <span className="sm:hidden">Total</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-2 sm:p-4 text-center">
            <div className="text-lg sm:text-2xl font-bold text-green-600">{statistics.attended}</div>
            <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center mt-1">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Han Ingresado</span>
              <span className="sm:hidden">Ingresaron</span>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-2 sm:p-4 text-center">
            <div className="text-lg sm:text-2xl font-bold text-orange-600">{statistics.pending}</div>
            <div className="text-xs sm:text-sm text-gray-600 flex items-center justify-center mt-1">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden sm:inline">Pendientes</span>
              <span className="sm:hidden">Pendientes</span>
            </div>
          </div>
        </div>

        {/* Área de escaneo */}
        <div className="bg-white rounded-lg shadow-sm border">
          {selectedMethod === 'reader' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scan className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">🟢 LECTOR QR ACTIVO</h3>
              <p className="text-gray-600 mb-4">Presente el código QR al lector USB...</p>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-sm text-green-800">
                  ✅ <strong>Lector detectado:</strong> Escanee cualquier código QR válido
                </p>
              </div>
            </div>
          )}

          {selectedMethod === 'camera' && (
            <div className="p-4">
              {isInitializingCamera && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600">Inicializando cámara...</p>
                  <p className="text-sm text-gray-500 mt-2">Permite el acceso cuando te lo solicite el navegador</p>
                </div>
              )}
              
              {cameraError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center">
                    <XCircle className="w-5 h-5 text-red-500 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Error de Cámara</h4>
                      <p className="text-sm text-red-700 mt-1">{cameraError}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div id="qr-scanner-container" className="max-w-md mx-auto"></div>
            </div>
          )}

          {selectedMethod === 'manual' && (
            <div className="p-6 space-y-4">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Buscar Invitado
                  </label>
                  {showSearchResults && (
                    <button
                      onClick={clearSearchResults}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      ✕ Limpiar búsqueda
                    </button>
                  )}
                </div>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && processManualSearch()}
                    placeholder="Número de invitado, nombre o código QR"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={processManualSearch}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                </div>
                
                {showSearchResults && (
                  <div className="mt-4 space-y-3">
                    <div className="text-sm text-gray-600">
                      {searchResults.length === 1 
                        ? '1 resultado encontrado:' 
                        : `${searchResults.length} resultados encontrados:`
                      }
                    </div>
                    
                    {searchResults.map((result) => (
                      <div key={result.guest.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                              <div className={`w-3 h-3 rounded-full ${
                                result.status === 'attended' ? 'bg-green-400' :
                                result.status === 'denied' ? 'bg-red-400' : 'bg-orange-400'
                              }`} />
                              <h4 className="font-medium text-gray-900 text-sm sm:text-base flex-1 min-w-0">
                                {result.guest.name || `Invitado #${result.guest.guest_number}`}
                              </h4>
                            </div>
                            <div className="mb-2">
                              <span className={`text-xs px-2 py-1 rounded-full inline-block ${
                                result.status === 'attended' ? 'bg-green-100 text-green-800' :
                                result.status === 'denied' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                              }`}>
                                {result.status === 'attended' ? '✅ Ya Ingresó' :
                                 result.status === 'denied' ? '🚫 Acceso Denegado' : '⏳ Pendiente'}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div className="flex items-center space-x-4">
                                <span>📋 Invitado #{result.guest.guest_number}</span>
                                {result.guest.table_number && (
                                  <span>🪑 Mesa #{result.guest.table_number}</span>
                                )}
                              </div>
                              
                              {result.guest.email && (
                                <div>📧 {result.guest.email}</div>
                              )}
                              
                              {result.guest.phone && (
                                <div>📱 {result.guest.phone}</div>
                              )}
                              
                              <div className="text-xs text-gray-400">
                                🔑 QR: {result.guest.qr_code.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col space-y-2 sm:ml-4">
                            {result.status === 'pending' && (
                              <button
                                onClick={() => confirmGuestAttendance(result.guest)}
                                className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs sm:text-sm font-medium w-full sm:w-auto"
                              >
                                <span className="hidden sm:inline">✅ Confirmar Asistencia</span>
                                <span className="sm:hidden">✅ Confirmar</span>
                              </button>
                            )}
                            
                            {result.status === 'attended' && (
                              <div className="px-3 sm:px-4 py-2 bg-green-100 text-green-800 rounded-md text-xs sm:text-sm font-medium text-center w-full sm:w-auto">
                                <span className="hidden sm:inline">✅ Asistencia Confirmada</span>
                                <span className="sm:hidden">✅ Confirmada</span>
                              </div>
                            )}
                            
                            {result.status === 'denied' && (
                              <div className="px-3 sm:px-4 py-2 bg-red-100 text-red-800 rounded-md text-xs sm:text-sm font-medium text-center w-full sm:w-auto">
                                <span className="hidden sm:inline">🚫 Acceso Denegado</span>
                                <span className="sm:hidden">🚫 Denegado</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Resultado del escaneo */}
        {scanResult && (
          <div className={`rounded-lg border-l-4 p-4 ${
            scanResult.type === 'success' ? 'bg-green-50 border-green-400' :
            scanResult.type === 'warning' ? 'bg-yellow-50 border-yellow-400' :
            'bg-red-50 border-red-400'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {scanResult.type === 'success' && <CheckCircle className="w-5 h-5 text-green-400" />}
                {scanResult.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                {scanResult.type === 'error' && <XCircle className="w-5 h-5 text-red-400" />}
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${
                  scanResult.type === 'success' ? 'text-green-800' :
                  scanResult.type === 'warning' ? 'text-yellow-800' :
                  'text-red-800'
                }`}>
                  {scanResult.type === 'success' ? '¡Acceso Autorizado!' :
                   scanResult.type === 'warning' ? 'Advertencia' : 'Acceso Denegado'}
                </h3>
                <div className={`mt-2 text-sm ${
                  scanResult.type === 'success' ? 'text-green-700' :
                  scanResult.type === 'warning' ? 'text-yellow-700' :
                  'text-red-700'
                }`}>
                  <p>{scanResult.message}</p>
                  {scanResult.guest && (
                    <div className="mt-2 space-y-1">
                      <p><strong>Invitado:</strong> {scanResult.guest.name || `#${scanResult.guest.guest_number}`}</p>
                      {scanResult.guest.table_number && (
                        <p><strong>Mesa:</strong> #{scanResult.guest.table_number}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Historial de escaneos */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Historial de Escaneos - {getCurrentDate()}
                </h3>
                <p className="text-sm text-gray-500">
                  {recentScans.length} registro{recentScans.length !== 1 ? 's' : ''} total
                  {recentScans.length > 0 && ` • Último: ${formatDate(recentScans[0]?.timestamp)}`}
                </p>
              </div>
              {recentScans.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={exportScanHistory}
                    className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                    title="Exportar historial"
                  >
                    📥 Exportar
                  </button>
                  <button
                    onClick={clearScanHistory}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Limpiar historial"
                  >
                    🗑️ Limpiar
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {recentScans.length > 0 ? (
            <div className="divide-y divide-gray-200 max-h-80 overflow-y-auto">
              {recentScans.map((scan) => (
                <div key={scan.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(scan.status)}`} />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {scan.guest.name || `Invitado #${scan.guest.guest_number}`}
                          </p>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {getScanMethodIcon(scan.scanMethod)} {
                              scan.scanMethod === 'reader' ? 'Lector' :
                              scan.scanMethod === 'camera' ? 'Cámara' : 'Manual'
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          {scan.guest.table_number && (
                            <p className="text-xs text-gray-500">Mesa #{scan.guest.table_number}</p>
                          )}
                          <p className={`text-xs font-medium ${
                            scan.status === 'success' ? 'text-green-600' :
                            scan.status === 'duplicate' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {getStatusText(scan.status)}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{formatDate(scan.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                📋
              </div>
              <p className="text-sm">No hay escaneos registrados aún</p>
              <p className="text-xs mt-1">Los escaneos aparecerán aquí y se guardarán automáticamente</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de acceso */}
      <QRAccessModal
        isOpen={showAccessModal}
        onClose={handleModalClose}
        messageType={modalType}
        guest={modalGuest}
        accessSettings={accessSettings}
        autoCloseSeconds={5}
      />

      {/* Video Modal */}
      <QRAccessVideoModal
        isOpen={showVideoModal}
        onClose={handleVideoModalClose}
        guest={videoModalGuest!}
        videoUrl={currentVideoUrl}
        autoCloseSeconds={5}
      />
    </>
  );
} 