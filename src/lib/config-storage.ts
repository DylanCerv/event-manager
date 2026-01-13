export interface SMTPConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  secure: boolean; // true for 465, false for other ports
  user: string;
  password: string;
  fromEmail: string;
  fromName: string;
  provider: 'gmail' | 'hostinger' | 'custom';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplateConfig {
  id: string;
  templateId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialConfig {
  pricePerGuest: number;
}

export interface PointsConfig {
  admin: number;
  creator: number;
  moderator: number;
  accessControl: number;
  updatedAt?: string;
}

export interface SystemConfig {
  smtp: SMTPConfig[];
  emailTemplates?: EmailTemplateConfig[];
  financial?: FinancialConfig;
  // Futuras configuraciones
  backups?: any[];
  security?: any[];
}

class ConfigStorage {
  private getAuthHeaders(): Record<string, string> {
    const token = sessionStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getItem<T>(key: string): T[] {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (error) {
      console.error(`Error parsing ${key} from localStorage:`, error);
      return [];
    }
  }

  private setItem<T>(key: string, value: T[]): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving ${key} to localStorage:`, error);
    }
  }

  // SMTP Configuration Methods
  async getSMTPConfigs(): Promise<SMTPConfig[]> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/smtp-configs?include_password=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener configuraciones SMTP');
      }

      return (json?.data || []) as SMTPConfig[];
    } catch (error) {
      console.error('Error loading SMTP configs from API, falling back to localStorage:', error);
      return this.getItem<SMTPConfig>('smtp_configs');
    }
  }

  async getActiveSMTPConfig(): Promise<SMTPConfig | null> {
    const configs = await this.getSMTPConfigs();
    return configs.find(config => config.isActive) || null;
  }

  async createSMTPConfig(data: Omit<SMTPConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SMTPConfig> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/system/smtp-configs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al crear configuración SMTP');
    }

    return json.data as SMTPConfig;
  }

  async updateSMTPConfig(id: string, data: Partial<SMTPConfig>): Promise<SMTPConfig | null> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/system/smtp-configs/${id}?include_password=true`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al actualizar configuración SMTP');
    }

    return json.data as SMTPConfig;
  }

  async deleteSMTPConfig(id: string): Promise<boolean> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/system/smtp-configs/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al eliminar configuración SMTP');
    }

    return true;
  }

  async testSMTPConnection(config: Omit<SMTPConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/smtp-configs/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          host: config.host,
          port: config.port,
          secure: config.secure,
          user: config.user,
          password: config.password,
          fromEmail: config.fromEmail,
          fromName: config.fromName,
          // send test to same from email
          toEmail: config.fromEmail,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        return {
          success: false,
          message: json?.message || '❌ Error de conexión SMTP',
        };
      }

      return {
        success: true,
        message: json?.message || '✅ Conexión SMTP exitosa',
      };
    } catch (error) {
      console.error('SMTP test error:', error);
      return { success: false, message: '❌ Error al probar la conexión SMTP' };
    }
  }

  // Email Template Configuration Methods
  async getEmailTemplateConfigs(): Promise<EmailTemplateConfig[]> {
    const active = await this.getActiveEmailTemplate();
    return active ? [active] : [];
  }

  async getActiveEmailTemplate(): Promise<EmailTemplateConfig | null> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/config/email-template`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener plantilla activa');
      }
      return (json?.data || null) as EmailTemplateConfig | null;
    } catch (error) {
      console.error('Error loading active email template from API, falling back to localStorage:', error);
      const configs = this.getItem<EmailTemplateConfig>('email_template_configs');
      return configs.find(config => config.isActive) || null;
    }
  }

  async setActiveEmailTemplate(templateId: string): Promise<EmailTemplateConfig> {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/system/config/email-template`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify({ templateId }),
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.message || 'Error al guardar plantilla activa');
    }

    return json.data as EmailTemplateConfig;
  }

  // Financial Configuration Methods
  async getPricePerGuest(): Promise<number> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/config/financial`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener configuración financiera');
      }
      return (json?.data?.pricePerGuest ?? 1) as number;
    } catch (error) {
      console.error('Error loading financial config from API, falling back to localStorage:', error);
      try {
        const financialConfig = localStorage.getItem('financial_config');
        if (financialConfig) {
          const config: FinancialConfig = JSON.parse(financialConfig);
          return config.pricePerGuest;
        }
      } catch {
        // ignore
      }
      return 1; // Default value
    }
  }

  async setPricePerGuest(price: number): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/config/financial`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ pricePerGuest: price }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al guardar configuración financiera');
      }
    } catch (error) {
      console.error('Error saving financial config:', error);
      throw new Error('Failed to save financial configuration');
    }
  }

  // Points Configuration Methods
  async getPointsConfig(): Promise<PointsConfig> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/config/points`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al obtener configuración de puntos');
      }

      return (json?.data || {
        admin: 2,
        creator: 1,
        moderator: 1,
        accessControl: 1,
      }) as PointsConfig;
    } catch (error) {
      console.error('Error loading points config from API, falling back to localStorage:', error);
      try {
        const pointsConfig = localStorage.getItem('points_config');
        if (pointsConfig) {
          const config: PointsConfig = JSON.parse(pointsConfig);
          return config;
        }
      } catch {
        // ignore
      }
      return {
        admin: 2,
        creator: 1,
        moderator: 1,
        accessControl: 1
      };
    }
  }

  async savePointsConfig(config: Omit<PointsConfig, 'updatedAt'>): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/system/config/points`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(config),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.message || 'Error al guardar configuración de puntos');
      }
    } catch (error) {
      console.error('Error saving points config:', error);
      throw new Error('Failed to save points configuration');
    }
  }

  // Configuraciones predefinidas para proveedores comunes
  getSMTPPresets(): Record<string, Partial<SMTPConfig>> {
    return {
      gmail: {
        provider: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        name: 'Gmail SMTP'
      },
      hostinger: {
        provider: 'hostinger',
        host: 'smtp.hostinger.com',
        port: 587,
        secure: false,
        name: 'Hostinger SMTP'
      },
      custom: {
        provider: 'custom',
        host: '',
        port: 587,
        secure: false,
        name: 'SMTP Personalizado'
      }
    };
  }
}

export const configStorage = new ConfigStorage();