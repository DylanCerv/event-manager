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
    return this.getItem<SMTPConfig>('smtp_configs');
  }

  async getActiveSMTPConfig(): Promise<SMTPConfig | null> {
    const configs = await this.getSMTPConfigs();
    return configs.find(config => config.isActive) || null;
  }

  async createSMTPConfig(data: Omit<SMTPConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<SMTPConfig> {
    const configs = await this.getSMTPConfigs();
    
    // Si esta configuración se marca como activa, desactivar las demás
    if (data.isActive) {
      configs.forEach(config => config.isActive = false);
    }

    const newConfig: SMTPConfig = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    configs.push(newConfig);
    this.setItem('smtp_configs', configs);
    return newConfig;
  }

  async updateSMTPConfig(id: string, data: Partial<SMTPConfig>): Promise<SMTPConfig | null> {
    const configs = await this.getSMTPConfigs();
    const index = configs.findIndex(config => config.id === id);
    
    if (index === -1) return null;

    // Si esta configuración se marca como activa, desactivar las demás
    if (data.isActive) {
      configs.forEach(config => config.isActive = false);
    }

    configs[index] = {
      ...configs[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.setItem('smtp_configs', configs);
    return configs[index];
  }

  async deleteSMTPConfig(id: string): Promise<boolean> {
    const configs = await this.getSMTPConfigs();
    const filteredConfigs = configs.filter(config => config.id !== id);
    
    if (filteredConfigs.length === configs.length) return false;
    
    this.setItem('smtp_configs', filteredConfigs);
    return true;
  }

  async testSMTPConnection(config: Omit<SMTPConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; message: string }> {
    // TODO: Implementar prueba real de conexión SMTP
    console.log('🧪 Probando conexión SMTP:', {
      host: config.host,
      port: config.port,
      user: config.user,
      secure: config.secure
    });

    // Simulación por ahora
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simular éxito o fallo aleatorio para demo
        const success = Math.random() > 0.3;
        resolve({
          success,
          message: success 
            ? '✅ Conexión SMTP exitosa' 
            : '❌ Error de conexión: Verificar credenciales'
        });
      }, 2000);
    });
  }

  // Email Template Configuration Methods
  async getEmailTemplateConfigs(): Promise<EmailTemplateConfig[]> {
    return this.getItem<EmailTemplateConfig>('email_template_configs');
  }

  async getActiveEmailTemplate(): Promise<EmailTemplateConfig | null> {
    const configs = await this.getEmailTemplateConfigs();
    return configs.find(config => config.isActive) || null;
  }

  async setActiveEmailTemplate(templateId: string): Promise<EmailTemplateConfig> {
    const configs = await this.getEmailTemplateConfigs();
    
    // Desactivar todas las demás
    configs.forEach(config => config.isActive = false);
    
    // Buscar si ya existe esta plantilla
    let existingConfig = configs.find(config => config.templateId === templateId);
    
    if (existingConfig) {
      existingConfig.isActive = true;
      existingConfig.updatedAt = new Date().toISOString();
    } else {
      // Crear nueva configuración
      existingConfig = {
        id: crypto.randomUUID(),
        templateId,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      configs.push(existingConfig);
    }
    
    this.setItem('email_template_configs', configs);
    return existingConfig;
  }

  // Financial Configuration Methods
  async getPricePerGuest(): Promise<number> {
    try {
      const financialConfig = localStorage.getItem('financial_config');
      if (financialConfig) {
        const config: FinancialConfig = JSON.parse(financialConfig);
        return config.pricePerGuest;
      }
      return 1; // Default value
    } catch (error) {
      console.error('Error loading financial config:', error);
      return 1;
    }
  }

  async setPricePerGuest(price: number): Promise<void> {
    try {
      const config: FinancialConfig = { pricePerGuest: price };
      localStorage.setItem('financial_config', JSON.stringify(config));
    } catch (error) {
      console.error('Error saving financial config:', error);
      throw new Error('Failed to save financial configuration');
    }
  }

  // Points Configuration Methods
  async getPointsConfig(): Promise<PointsConfig> {
    try {
      const pointsConfig = localStorage.getItem('points_config');
      if (pointsConfig) {
        const config: PointsConfig = JSON.parse(pointsConfig);
        return config;
      }
      // Valores por defecto
      return {
        admin: 2,
        creator: 1,
        moderator: 1,
        accessControl: 1
      };
    } catch (error) {
      console.error('Error loading points config:', error);
      // Retornar valores por defecto en caso de error
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
      const configWithTimestamp: PointsConfig = {
        ...config,
        updatedAt: new Date().toISOString()
      };
      localStorage.setItem('points_config', JSON.stringify(configWithTimestamp));
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