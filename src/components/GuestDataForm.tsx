import React from 'react';
import { Calendar, User, Mail, Phone, Users, ArrowLeft } from 'lucide-react';
import type { Event, Guest } from '../types/event';

interface GuestDataFormProps {
  guest: Guest;
  event: Event;
  onDataSubmitted: (guestData: Partial<Guest>) => void;
}

export function GuestDataForm({ guest, event, onDataSubmitted }: GuestDataFormProps) {
  const [step, setStep] = React.useState<'age' | 'data'>('age');
  const [isMinor, setIsMinor] = React.useState<boolean | null>(null);
  const [formData, setFormData] = React.useState({
    name: guest.name || '',
    email: guest.email || '',
    phone: guest.phone || ''
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAgeSelection = (isUnder16: boolean) => {
    setIsMinor(isUnder16);
    setStep('data');
  };

  const goBackToAge = () => {
    setStep('age');
    setIsMinor(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Nombre siempre es obligatorio
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio';
    }

    // Para mayores de 16, email y teléfono son obligatorios
    if (!isMinor) {
      if (!formData.email.trim()) {
        newErrors.email = 'El email es obligatorio para mayores de 16 años';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }

      if (!formData.phone.trim()) {
        newErrors.phone = 'El teléfono es obligatorio para mayores de 16 años';
      } else if (!/^\+?[\d\s\-\(\)]{8,}$/.test(formData.phone)) {
        newErrors.phone = 'Número de teléfono inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const guestData: Partial<Guest> = {
        name: formData.name.trim(),
        // Establecer categoría de edad explícita
        age_category: isMinor ? 'minor' : 'adult',
        // Solo incluir email y phone para mayores de 16
        ...(isMinor ? {} : {
          email: formData.email.trim(),
          phone: formData.phone.trim()
        })
      };

      await onDataSubmitted(guestData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (step === 'age') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
            {/* Icono del evento */}
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            
            {/* Bienvenida */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ¡Bienvenido!
            </h1>
            
            <p className="text-gray-600 mb-6">
              Estás invitado a{' '}
              <span className="font-semibold text-indigo-600 block mt-1">
                {event.name}
              </span>
            </p>

            {/* Información del evento */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 mb-8">
              <div className="flex items-center justify-center text-gray-600 mb-2">
                <Calendar className="w-5 h-5 mr-2" />
                <span className="text-sm">
                  {new Date(event.date).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Invitado #{guest.guest_number}
              </p>
            </div>

            {/* Selección de edad */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Confirma tu edad
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                Esto nos ayuda a personalizar tu experiencia
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => handleAgeSelection(false)}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200"
                >
                  Soy mayor de 16 años
                </button>
                
                <button
                  onClick={() => handleAgeSelection(true)}
                  className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-md transform hover:scale-105 transition-all duration-200 border-2 border-gray-300"
                >
                  Soy menor de 16 años
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-2xl p-8 relative">
          {/* Botón de regreso */}
          <button
            onClick={goBackToAge}
            className="absolute top-6 left-6 p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          {/* Header */}
          <div className="text-center mb-8 pt-4">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Completa tus datos
            </h1>
            
            <p className="text-gray-600">
              {isMinor 
                ? 'Solo necesitamos tu nombre para personalizar tu invitación'
                : 'Completa tus datos para acceder a tu invitación personalizada'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre - siempre obligatorio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Ingresa tu nombre completo"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Email y Teléfono - solo para mayores de 16 */}
            {!isMinor && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="ejemplo@email.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Teléfono <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="+56 9 1234 5678"
                    />
                  </div>
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                  )}
                </div>
              </>
            )}

            {/* Información sobre menor de edad */}
            {isMinor && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  <strong>Menor de 16 años:</strong> Solo necesitamos tu nombre para personalizar tu invitación. 
                  No recopilaremos datos de contacto adicionales.
                </p>
              </div>
            )}

            {/* Botón de envío */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Guardando...
                </div>
              ) : (
                'Acceder a mi invitación'
              )}
            </button>
          </form>

          {/* Información de privacidad */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Tus datos serán utilizados únicamente para este evento y no serán compartidos con terceros.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 