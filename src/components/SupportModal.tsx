import React from 'react';
import { X, Mail, Phone, Wrench, Copy, Check } from 'lucide-react';
import { getUserByIdAPI } from '../endpoints/user';
import type { User } from '../types/auth';

interface CreatorInfo {
  id: string;
  name: string;
  phone?: string;
}

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User;
}

export function SupportModal({ isOpen, onClose, user }: SupportModalProps) {
  const [copiedEmail, setCopiedEmail] = React.useState(false);
  const [copiedPhone, setCopiedPhone] = React.useState(false);
  const [assignedCreator, setAssignedCreator] = React.useState<CreatorInfo | null>(null);
  const [loadingCreator, setLoadingCreator] = React.useState(false);

  React.useEffect(() => {
    const fetchCreatorData = async () => {
      if (!user?.createdBy) return;
      setLoadingCreator(true);
      try {
        let creatorId: string | undefined = user.createdBy;

        // For ACCESS_CONTROL and MODERATOR, createdBy points to the admin user.
        // We need to walk up one level to find the admin's creator (CREATOR role).
        if (user.role === 'ACCESS_CONTROL' || user.role === 'MODERATOR') {
          const adminRes = await getUserByIdAPI({ id: Number(user.createdBy) });
          const adminData = adminRes?.data ?? adminRes;
          creatorId = adminData?.creator_id ? String(adminData.creator_id) : undefined;
        }

        if (creatorId) {
          const creatorRes = await getUserByIdAPI({ id: Number(creatorId) });
          const creatorData = creatorRes?.data ?? creatorRes;
          if (creatorData?.id) {
            setAssignedCreator({
              id: String(creatorData.id),
              name: [creatorData.name, creatorData.last_name].filter(Boolean).join(' '),
              phone: creatorData.phone || undefined,
            });
          } else {
            setAssignedCreator(null);
          }
        } else {
          setAssignedCreator(null);
        }
      } catch (error) {
        console.error('Error al obtener datos del creador:', error);
        setAssignedCreator(null);
      } finally {
        setLoadingCreator(false);
      }
    };

    if (isOpen) {
      fetchCreatorData();
    } else {
      setAssignedCreator(null);
    }
  }, [isOpen, user?.createdBy, user?.role]);

  if (!isOpen) return null;

  const supportEmail = "eventos@eventosmanager.com";
  const personalizedPhone = assignedCreator?.phone || "+54 11 1234-5678";
  const personalizedName = "Atención Personalizada";
  const creatorDisplayName = assignedCreator?.name ?? "";
  const technicalPhone = "+5493512880173";

  const copyToClipboard = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const openWhatsApp = (phone: string, message: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Centro de Soporte</h2>
              <p className="text-sm text-gray-500">Estamos aquí para ayudarte</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Email de Contacto */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Mail className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Email de Contacto</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Envíanos tu consulta y te responderemos en menos de 24 horas
                </p>
                <div className="flex items-center space-x-2">
                  <code className="bg-white px-3 py-2 rounded-lg text-sm font-mono text-blue-600 border">
                    {supportEmail}
                  </code>
                  <button
                    onClick={() => copyToClipboard(supportEmail, 'email')}
                    className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                    title="Copiar email"
                  >
                    {copiedEmail ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-blue-600" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Atención Personalizada */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">{personalizedName}</h3>
                <p className="text-sm text-gray-600 mb-3">
                  {loadingCreator 
                    ? "Cargando información..."
                    : assignedCreator 
                      ? creatorDisplayName
                      : "Habla directamente con nuestro equipo de atención al cliente"
                  }
                </p>
                
                {/* Solo mostrar contacto si hay creador asignado o si no es usuario con roles especiales */}
                {(assignedCreator || !['ADMIN', 'ACCESS_CONTROL', 'MODERATOR'].includes(user?.role || '')) && !loadingCreator && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <code className="bg-white px-3 py-2 rounded-lg text-sm font-mono text-green-600 border">
                        {personalizedPhone}
                      </code>
                      <button
                        onClick={() => copyToClipboard(personalizedPhone, 'phone')}
                        className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                        title="Copiar teléfono"
                      >
                        {copiedPhone ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4 text-green-600" />
                        )}
                      </button>
                    </div>
                    <button
                      onClick={() => openWhatsApp(personalizedPhone, `Hola, me comunico de ${user?.company || 'Eventos Manager'}`)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>📱</span>
                      <span>Contactar por WhatsApp</span>
                    </button>
                  </div>
                )}
                
                {/* Mensaje cuando no hay creador asignado */}
                {!assignedCreator && ['ADMIN', 'ACCESS_CONTROL', 'MODERATOR'].includes(user?.role || '') && !loadingCreator && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Sin creador asignado:</strong> Contacta al administrador para que te asigne un creador personalizado.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Soporte Técnico */}
          <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Wrench className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">Soporte Técnico</h3>
                <p className="text-sm text-gray-600 mb-3">
                  Para problemas técnicos, bugs o errores del sistema
                </p>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <code className="bg-white px-3 py-2 rounded-lg text-sm font-mono text-purple-600 border">
                      {technicalPhone}
                    </code>
                    <button
                      onClick={() => copyToClipboard(technicalPhone, 'phone')}
                      className="p-2 hover:bg-purple-100 rounded-lg transition-colors"
                      title="Copiar teléfono"
                    >
                      <Copy className="h-4 w-4 text-purple-600" />
                    </button>
                  </div>
                  <button
                    onClick={() => openWhatsApp(technicalPhone, `Hola, me comunico de ${user?.company || 'Eventos Manager'}`)}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>🔧</span>
                    <span>Soporte Técnico WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Eventos Manager - Soporte 24/7
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
