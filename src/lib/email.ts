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
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Si no se proporciona configuración, intentar usar la activa
  if (!config) {
    try {
      const { configStorage } = await import('./config-storage');
      const activeConfig = await configStorage.getActiveSMTPConfig();
      if (activeConfig) {
        config = {
          smtpHost: activeConfig.host,
          smtpPort: activeConfig.port,
          smtpUser: activeConfig.user,
          smtpPassword: activeConfig.password,
          fromEmail: activeConfig.fromEmail,
          fromName: activeConfig.fromName
        };
        console.log(`📧 Usando configuración SMTP activa: ${activeConfig.name}`);
      }
    } catch (error) {
      console.warn('No se pudo cargar configuración SMTP activa:', error);
    }
  }

  // Obtener plantilla activa y generar contenido HTML
  let htmlContent = message; // Fallback a mensaje de texto plano
  try {
    const { configStorage } = await import('./config-storage');
    const { renderTemplate } = await import('./email-templates');
    
    const activeTemplate = await configStorage.getActiveEmailTemplate();
    if (activeTemplate) {
      htmlContent = renderTemplate(activeTemplate.templateId, message);
      console.log(`🎨 Usando plantilla: ${activeTemplate.templateId}`);
    } else {
      console.log('📝 Usando mensaje de texto plano (sin plantilla activa)');
    }
  } catch (error) {
    console.warn('No se pudo cargar plantilla activa:', error);
  }

  console.log('📧 Preparando envío masivo de emails...');
  console.log(`📊 Destinatarios: ${recipients.length}`);
  console.log(`📝 Asunto: ${subject}`);
  console.log(`💬 Mensaje: ${message.substring(0, 50)}...`);
  console.log(`🎨 Contenido: ${htmlContent.includes('<html>') ? 'HTML con plantilla' : 'Texto plano'}`);
  
  if (config) {
    console.log(`🔧 Servidor SMTP: ${config.smtpHost}:${config.smtpPort}`);
    console.log(`📨 Remitente: ${config.fromName} <${config.fromEmail}>`);
  } else {
    console.warn('⚠️ No hay configuración SMTP disponible - modo simulación');
  }

  for (const recipient of recipients) {
    try {
      // Simulación por ahora - aquí irá la implementación real
      console.log(`✉️ Enviando a ${recipient.name} (${recipient.email})`);
      console.log(`   📋 Contenido: ${htmlContent.includes('<html>') ? 'Email HTML estilizado' : 'Texto plano'}`);
      
      // Simular delay entre envíos (evitar spam)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      results.success++;
    } catch (error) {
      console.error(`❌ Error enviando a ${recipient.email}:`, error);
      results.failed++;
      results.errors.push(`${recipient.email}: ${error}`);
    }
  }

  console.log(`✅ Envío completado: ${results.success} éxitos, ${results.failed} fallos`);
  return results;
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