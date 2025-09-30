import React from 'react';
import { QrCode, Download } from 'lucide-react';
import { generateQRCodeDataURL } from '../lib/qr';

interface EventBookQRCodeProps {
  publicUrl: string;
  eventBookName: string;
  showDownloadButton?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  description?: string;
}

export function EventBookQRCode({ 
  publicUrl, 
  eventBookName, 
  showDownloadButton = false, 
  size = 'medium',
  className = '',
  description
}: EventBookQRCodeProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = React.useState<string | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  // Generar QR automáticamente cuando se monta el componente
  React.useEffect(() => {
    const generateQRCode = async () => {
      if (!publicUrl || qrCodeDataUrl) return;
      
      setIsGenerating(true);
      try {
        const qrDataUrl = await generateQRCodeDataURL(publicUrl);
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateQRCode();
  }, [publicUrl, qrCodeDataUrl]);

  // Función para descargar el código QR
  const downloadQRCode = () => {
    if (!qrCodeDataUrl || !eventBookName) return;
    
    const link = document.createElement('a');
    link.href = qrCodeDataUrl;
    link.download = `eventbook-qr-${eventBookName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Tamaños del QR según el prop size (aumentados ligeramente)
  const qrSizes = {
    small: 'w-28 h-28',
    medium: 'w-40 h-40',
    large: 'w-56 h-56'
  };

  const qrSizeClass = qrSizes[size];

  return (
    <div className={`text-center space-y-3 ${className}`}>
      {isGenerating ? (
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="text-xs text-gray-500">Generando código QR...</p>
        </div>
      ) : qrCodeDataUrl ? (
        <>
          <div className="flex justify-center">
            <img 
              src={qrCodeDataUrl} 
              alt="Código QR del EventBook"
              className={`${qrSizeClass}`}
            />
          </div>
          <div className="space-y-2">
            {description && (
              <p className="text-base font-semibold text-gray-700 leading-tight">
                {description}
              </p>
            )}
            {showDownloadButton && (
              <button
                onClick={downloadQRCode}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar QR
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center space-y-4">
          <QrCode className="h-16 w-16 text-gray-400" />
          <div className="space-y-2">
            <p className="text-sm text-gray-500">Error al generar el código QR</p>
            <button
              onClick={() => {
                setQrCodeDataUrl(null);
                setIsGenerating(false);
              }}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
