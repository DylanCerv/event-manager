import React from 'react';
import { Mail, MessageSquare, Plus } from 'lucide-react';

interface NotificationFormProps {
  onSend: (message: string, additionalEmails: string[]) => void;
  selectedCount: number;
  isLoading?: boolean;
}

export function NotificationForm({ onSend, selectedCount, isLoading }: NotificationFormProps) {
  const [message, setMessage] = React.useState('');
  const [additionalEmails, setAdditionalEmails] = React.useState('');

  const parseAdditionalEmails = (emailString: string): string[] => {
    return emailString
      .split(',')
      .map(email => email.trim())
      .filter(email => email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  };

  const additionalEmailsList = parseAdditionalEmails(additionalEmails);
  const totalEmails = selectedCount + additionalEmailsList.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSend(message, additionalEmailsList);
    setMessage('');
    setAdditionalEmails('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
          Mensaje
        </label>
        <div className="mt-1">
          <textarea
            id="message"
            name="message"
            rows={4}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="Escribe tu mensaje aquí..."
            required
          />
          <p className="mt-2 text-sm text-gray-500">
            {message.length}/1000 caracteres
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="additionalEmails" className="block text-sm font-medium text-gray-700">
          Emails adicionales (opcional)
        </label>
        <div className="mt-1">
          <input
            id="additionalEmails"
            name="additionalEmails"
            type="text"
            value={additionalEmails}
            onChange={(e) => setAdditionalEmails(e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="email1@dominio.com, email2@dominio.com"
          />
          <p className="mt-2 text-sm text-gray-500">
            Separa múltiples emails con comas. {additionalEmailsList.length > 0 && `${additionalEmailsList.length} email(s) válido(s) agregado(s).`}
          </p>
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <div className="space-y-1">
              <p className="text-sm text-blue-700">
                📧 Enviando a {selectedCount} invitados seleccionados con email válido
              </p>
              {additionalEmailsList.length > 0 && (
                <p className="text-sm text-blue-700">
                  ➕ {additionalEmailsList.length} email(s) adicional(es)
                </p>
              )}
              <p className="text-sm font-medium text-blue-800">
                Total de emails a enviar: {totalEmails}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Enviando a {selectedCount} invitado{selectedCount !== 1 ? 's' : ''} seleccionado{selectedCount !== 1 ? 's' : ''}
        </span>
        <button
          type="submit"
          disabled={isLoading || !message.trim() || totalEmails === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mail className="h-4 w-4 mr-2" />
          {isLoading ? 'Enviando E-mails...' : `Enviar ${totalEmails} E-mail${totalEmails !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  );
}