import React from 'react';
import { Check, Eye, Palette } from 'lucide-react';
import { EMAIL_TEMPLATES, type EmailTemplate, renderTemplate } from '../lib/email-templates';
import { configStorage, type EmailTemplateConfig } from '../lib/config-storage';

interface EmailTemplateSelectorProps {
  onTemplateChange: (templateId: string) => void;
}

export function EmailTemplateSelector({ onTemplateChange }: EmailTemplateSelectorProps) {
  const [activeTemplateId, setActiveTemplateId] = React.useState<string>('corporativa');
  const [previewTemplate, setPreviewTemplate] = React.useState<EmailTemplate | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    loadActiveTemplate();
  }, []);

  const loadActiveTemplate = async () => {
    try {
      const activeConfig = await configStorage.getActiveEmailTemplate();
      if (activeConfig) {
        setActiveTemplateId(activeConfig.templateId);
      }
    } catch (error) {
      console.error('Error loading active template:', error);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      await configStorage.setActiveEmailTemplate(templateId);
      setActiveTemplateId(templateId);
      onTemplateChange(templateId);
    } catch (error) {
      console.error('Error setting active template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (template: EmailTemplate) => {
    setPreviewTemplate(template);
  };

  const closePreview = () => {
    setPreviewTemplate(null);
  };

  const sampleMessage = "Estimado invitado,\n\nTenemos el placer de invitarte a nuestro próximo evento. Será una ocasión especial donde compartiremos momentos únicos.\n\n¡Esperamos contar con tu presencia!\n\nSaludos cordiales,\nEl equipo organizador";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-gray-900">Plantillas de Email</h3>
        <p className="text-sm text-gray-500">
          Selecciona el diseño que se usará para todos los emails masivos
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {EMAIL_TEMPLATES.map((template) => (
          <div
            key={template.id}
            className={`relative bg-white rounded-lg border-2 transition-all duration-200 hover:shadow-md ${
              activeTemplateId === template.id
                ? 'border-indigo-500 ring-2 ring-indigo-200'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Preview Image */}
            <div className="relative">
              <div 
                className={`h-48 rounded-t-lg flex items-center justify-center font-semibold text-lg relative overflow-hidden ${
                  template.id === 'corporativa' ? 'bg-gradient-to-br from-gray-50 to-white' :
                  template.id === 'elegante' ? 'bg-gradient-to-br from-gray-600 to-gray-700' :
                  'bg-gradient-to-br from-orange-50 to-orange-100'
                }`}
              >
                <div className="text-center relative z-10">

                  
                  <div className={`text-sm font-light tracking-widest ${
                    template.id === 'elegante' ? 'text-white' : 
                    template.id === 'minimalista' ? 'text-amber-800' : 'text-black'
                  }`}>
                    EVENT
                  </div>
                  <div className={`text-xs font-light tracking-wider ${
                    template.id === 'elegante' ? 'text-yellow-400' : 
                    template.id === 'minimalista' ? 'text-amber-700' : 'text-black'
                  }`}>
                    MANAGER
                  </div>
                  
                  {/* Línea dorada */}
                  <div className={`w-8 h-px mx-auto mt-2 mb-3 ${
                    template.id === 'elegante' ? 'bg-yellow-400' : 'bg-yellow-600'
                  }`}></div>
                  
                  <div className={`text-xs p-2 rounded ${
                    template.id === 'corporativa' ? 'bg-black/5 text-gray-700' :
                    template.id === 'elegante' ? 'bg-white/10 text-gray-300' :
                    'bg-amber-50 text-amber-800'
                  }`}>
                    Mensaje profesional...
                  </div>
                  
                  <div className={`text-xs mt-2 ${
                    template.id === 'elegante' ? 'text-gray-400' : 
                    template.id === 'minimalista' ? 'text-amber-600' : 'text-gray-500'
                  }`}>
                    © 2024
                  </div>
                </div>
                
                {/* Elementos decorativos */}
                {template.id === 'corporativa' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
                )}
                {template.id === 'minimalista' && (
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-px h-20 bg-yellow-600 opacity-30"></div>
                )}
              </div>

              {/* Active Badge */}
              {activeTemplateId === template.id && (
                <div className="absolute top-3 right-3 bg-indigo-500 text-white rounded-full p-2">
                  <Check className="w-4 h-4" />
                </div>
              )}

              {/* Preview Button */}
              <button
                onClick={() => handlePreview(template)}
                className="absolute top-3 left-3 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors"
                title="Vista previa"
              >
                <Eye className="w-4 h-4" />
              </button>
            </div>

            {/* Template Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{template.name}</h4>
                <div className={`w-3 h-3 rounded-full ${
                  template.id === 'corporativa' ? 'bg-yellow-600' :
                  template.id === 'elegante' ? 'bg-gray-600' :
                  'bg-amber-600'
                }`} />
              </div>
              <p className="text-sm text-gray-500 mb-4">{template.description}</p>

              {/* Select Button */}
              <button
                onClick={() => handleTemplateSelect(template.id)}
                disabled={isLoading || activeTemplateId === template.id}
                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTemplateId === template.id
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                }`}
              >
                {isLoading ? 'Guardando...' : 
                 activeTemplateId === template.id ? '✓ Activa' : 'Seleccionar'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Palette className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-medium text-gray-900">
                  Vista Previa: {previewTemplate.name}
                </h3>
              </div>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-auto max-h-[calc(90vh-120px)]">
              <div className="bg-gray-100 p-4 rounded-lg">
                <iframe
                  srcDoc={renderTemplate(previewTemplate.id, sampleMessage)}
                  className="w-full h-96 border-0 rounded"
                  title={`Preview ${previewTemplate.name}`}
                />
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Mensaje de ejemplo:</h4>
                <p className="text-sm text-blue-700 whitespace-pre-line">{sampleMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 