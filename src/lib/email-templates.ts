export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  preview: string;
  html: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'corporativa',
    name: 'Corporativa Elegante',
    description: 'Diseño profesional con logo del león y toques dorados',
    preview: 'https://via.placeholder.com/300x200/FFFFFF/000000?text=Corporativa',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eventos Manager</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 30px 20px !important; }
            .header { padding: 30px 20px 20px 20px !important; }
            .footer { padding: 20px !important; }
            .title { font-size: 28px !important; letter-spacing: 2px !important; }
            .subtitle { font-size: 16px !important; letter-spacing: 4px !important; }
            .text { font-size: 15px !important; line-height: 1.6 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Arial', sans-serif; background-color: #f8f9fa;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table cellpadding="0" cellspacing="0" border="0" width="650" class="container" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.1); overflow: hidden; max-width: 650px;">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background-color: #ffffff; padding: 50px 40px 30px 40px; text-align: center; border-bottom: 3px solid #D4AF37;">

                            
                            <h1 class="title" style="margin: 0 0 10px 0; color: #000000; font-size: 36px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase;">
                                EVENTOS
                            </h1>
                            <h2 class="subtitle" style="margin: 0; color: #000000; font-size: 20px; font-weight: 300; letter-spacing: 8px; text-transform: uppercase;">
                                MANAGER
                            </h2>
                            <div style="width: 60px; height: 2px; background: linear-gradient(90deg, #D4AF37, #FFD700); margin: 20px auto;"></div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 60px 50px; text-align: left;">
                            <div class="text" style="color: #333333; font-size: 16px; line-height: 1.8; font-family: 'Georgia', serif;">
                                {ADMIN_MESSAGE}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="background-color: #000000; padding: 30px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #ffffff; font-size: 14px; font-weight: 500; letter-spacing: 1px;">
                                EVENTOS MANAGER
                            </p>
                            <div style="width: 40px; height: 1px; background-color: #D4AF37; margin: 8px auto;"></div>
                            <p style="margin: 8px 0 0 0; color: #cccccc; font-size: 12px; letter-spacing: 0.5px;">
                                2025 • Excelencia en cada evento
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  
  {
    id: 'elegante',
    name: 'Ejecutiva Premium',
    description: 'Diseño ejecutivo de máxima elegancia y sobriedad',
    preview: 'https://via.placeholder.com/300x200/2D2D2D/FFFFFF?text=Ejecutiva',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eventos Manager</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 40px 20px !important; }
            .header { padding: 40px 20px !important; }
            .footer { padding: 25px 20px !important; }
            .title { font-size: 32px !important; letter-spacing: 3px !important; }
            .subtitle { font-size: 14px !important; letter-spacing: 2px !important; }
            .text { font-size: 15px !important; line-height: 1.7 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #2D2D2D;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #2D2D2D;">
        <tr>
            <td align="center" style="padding: 50px 20px;">
                <table cellpadding="0" cellspacing="0" border="0" width="650" class="container" style="background-color: #ffffff; border-radius: 0; box-shadow: 0 0 40px rgba(0,0,0,0.3); max-width: 650px;">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="background: linear-gradient(135deg, #4A5568 0%, #718096 100%); padding: 60px 40px; text-align: center;">
 
                            
                            <h1 class="title" style="margin: 0 0 15px 0; color: #ffffff; font-size: 42px; font-weight: 100; letter-spacing: 6px; text-transform: uppercase;">
                                EVENTOS
                            </h1>
                            <h2 class="subtitle" style="margin: 0 0 20px 0; color: #D4AF37; font-size: 18px; font-weight: 300; letter-spacing: 4px; text-transform: uppercase;">
                                MANAGER
                            </h2>
                            <div style="width: 80px; height: 1px; background: linear-gradient(90deg, #D4AF37, #FFD700, #D4AF37); margin: 0 auto;"></div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 70px 60px; text-align: left; background-color: #f7fafc;">
                            <div class="text" style="color: #2D3748; font-size: 17px; line-height: 1.9; font-weight: 300; text-align: justify;">
                                {ADMIN_MESSAGE}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="background-color: #4A5568; padding: 40px; text-align: center;">
                            <div style="border-top: 1px solid #718096; padding-top: 25px;">
                                <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 16px; font-weight: 300; letter-spacing: 2px;">
                                    EVENTOS MANAGER
                                </p>
                                <div style="width: 60px; height: 1px; background-color: #D4AF37; margin: 10px auto;"></div>
                                <p style="margin: 10px 0 0 0; color: #E2E8F0; font-size: 11px; letter-spacing: 1px; text-transform: uppercase;">
                                    Liderazgo • Excelencia • Confianza
                                </p>
                                <p style="margin: 5px 0 0 0; color: #CBD5E0; font-size: 10px;">
                                    © 2025
                                </p>
                            </div>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  },
  
  {
    id: 'minimalista',
    name: 'Minimalista de Lujo',
    description: 'Pureza y elegancia en su máxima expresión',
    preview: 'https://via.placeholder.com/300x200/FFFFFF/000000?text=Minimalista',
    html: `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Eventos Manager</title>
    <style>
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; }
            .content { padding: 40px 20px !important; }
            .header { padding: 50px 20px 40px 20px !important; }
            .footer { padding: 30px 20px 40px 20px !important; }
            .title { font-size: 22px !important; letter-spacing: 4px !important; }
            .subtitle { font-size: 12px !important; letter-spacing: 3px !important; }
            .text { font-size: 15px !important; line-height: 1.8 !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #FBF8F3;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #FBF8F3;">
        <tr>
            <td align="center" style="padding: 60px 20px;">
                <table cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="background-color: #FFFCF7; max-width: 600px;">
                    <!-- Header -->
                    <tr>
                        <td class="header" style="padding: 80px 60px 60px 60px; text-align: center; background-color: #FFFCF7;">
 
                            
                            <h1 class="title" style="margin: 0 0 20px 0; color: #8B4513; font-size: 28px; font-weight: 100; letter-spacing: 8px; text-transform: uppercase;">
                                EVENTOS
                            </h1>
                            <h2 class="subtitle" style="margin: 0 0 30px 0; color: #A0522D; font-size: 14px; font-weight: 300; letter-spacing: 6px; text-transform: uppercase;">
                                MANAGER
                            </h2>
                            
                            <!-- Línea dorada sutil -->
                            <div style="width: 1px; height: 40px; background-color: #D4AF37; margin: 0 auto;"></div>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td class="content" style="padding: 0 80px 80px 80px; text-align: left; background-color: #FFFCF7;">
                            <div class="text" style="color: #654321; font-size: 16px; line-height: 2.0; font-weight: 300; text-align: justify; margin-top: 40px;">
                                {ADMIN_MESSAGE}
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td class="footer" style="padding: 40px 80px 60px 80px; text-align: center; background-color: #F5F0E8;">
                            <div style="width: 1px; height: 30px; background-color: #D4AF37; margin: 0 auto 30px auto;"></div>
                            <p style="margin: 0; color: #8B4513; font-size: 12px; font-weight: 300; letter-spacing: 2px; text-transform: uppercase;">
                                Eventos Manager
                            </p>
                            <p style="margin: 15px 0 0 0; color: #A0522D; font-size: 10px; letter-spacing: 1px;">
                                © 2025
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  }
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(template => template.id === id);
}

export function renderTemplate(templateId: string, adminMessage: string): string {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template with id "${templateId}" not found`);
  }
  
  return template.html.replace('{ADMIN_MESSAGE}', adminMessage);
}

export function getDefaultTemplate(): EmailTemplate {
  return EMAIL_TEMPLATES[0]; // Corporativa por defecto
} 