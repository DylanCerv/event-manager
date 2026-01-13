export interface EmailRecipient {
  email: string;
  name: string;
}

export interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
}

export async function sendMassiveEmails(
  recipients: EmailRecipient[], 
  subject: string, 
  message: string,
  config?: EmailConfig
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = { success: 0, failed: 0, errors: [] as string[] };

  // Obtener plantilla activa y generar contenido HTML
  let htmlContent = message; // Fallback a mensaje de texto plano
  let templateId: string | null = null;
  try {
    const { configStorage } = await import('./config-storage');
    const { renderTemplate } = await import('./email-templates');
    
    const activeTemplate = await configStorage.getActiveEmailTemplate();
    if (activeTemplate) {
      templateId = activeTemplate.templateId;
      htmlContent = renderTemplate(activeTemplate.templateId, message);
      console.log(`🎨 Usando plantilla: ${activeTemplate.templateId}`);
    } else {
      console.log('📝 Usando mensaje de texto plano (sin plantilla activa)');
    }
  } catch (error) {
    console.warn('No se pudo cargar plantilla activa:', error);
  }

  // Enviar desde backend usando la configuración SMTP guardada + plantilla activa seleccionada
  const token = sessionStorage.getItem('auth_token');
  const response = await fetch(`${import.meta.env.VITE_API_URL}/system/emails/send-bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      recipients,
      subject,
      message,
      html: htmlContent,
      templateId,
    }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.message || 'Error al enviar emails');
  }

  const data = json?.data || {};
  return {
    success: Number(data.success || 0),
    failed: Number(data.failed || 0),
    errors: Array.isArray(data.errors) ? data.errors : [],
  };
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parseEmailList(emailString: string): string[] {
  return emailString
    .split(',')
    .map(email => email.trim())
    .filter(email => email && validateEmail(email));
} 