import type { Creator, CreateCreatorData } from '../types/creator';

class CreatorsStorage {
  private storageKey = 'creators_data';

  async getCreators(): Promise<Creator[]> {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        return JSON.parse(data);
      }
      
      // Initialize with empty creators array if none exist
      const defaultCreators: Creator[] = [];
      
      await this.saveCreators(defaultCreators);
      return defaultCreators;
    } catch (error) {
      console.error('Error loading creators:', error);
      return [];
    }
  }

  async saveCreators(creators: Creator[]): Promise<void> {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(creators));
    } catch (error) {
      console.error('Error saving creators:', error);
      throw new Error('Failed to save creators');
    }
  }

  async createCreator(creatorData: CreateCreatorData): Promise<Creator> {
    try {
      const creators = await this.getCreators();
      
      // Check for duplicate username or email
      const existingCreator = creators.find(c => 
        c.username === creatorData.username || c.email === creatorData.email
      );
      
      if (existingCreator) {
        throw new Error('Username or email already exists');
      }

      const newCreator: Creator = {
        id: `creator-${Date.now()}`,
        ...creatorData,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      const updatedCreators = [...creators, newCreator];
      await this.saveCreators(updatedCreators);
      
      return newCreator;
    } catch (error) {
      console.error('Error creating creator:', error);
      throw error;
    }
  }

  async updateCreator(id: string, updates: Partial<Creator>): Promise<Creator> {
    try {
      const creators = await this.getCreators();
      const creatorIndex = creators.findIndex(c => c.id === id);
      
      if (creatorIndex === -1) {
        throw new Error('Creator not found');
      }

      // Check for duplicate username or email (excluding current creator)
      if (updates.username || updates.email) {
        const existingCreator = creators.find(c => 
          c.id !== id && (
            (updates.username && c.username === updates.username) ||
            (updates.email && c.email === updates.email)
          )
        );
        
        if (existingCreator) {
          throw new Error('Username or email already exists');
        }
      }

      const updatedCreator = { ...creators[creatorIndex], ...updates };
      creators[creatorIndex] = updatedCreator;
      
      await this.saveCreators(creators);
      return updatedCreator;
    } catch (error) {
      console.error('Error updating creator:', error);
      throw error;
    }
  }

  async deleteCreator(id: string): Promise<void> {
    try {
      const creators = await this.getCreators();
      const filteredCreators = creators.filter(c => c.id !== id);
      
      if (filteredCreators.length === creators.length) {
        throw new Error('Creator not found');
      }
      
      await this.saveCreators(filteredCreators);
    } catch (error) {
      console.error('Error deleting creator:', error);
      throw error;
    }
  }

  async getCreatorById(id: string): Promise<Creator | null> {
    try {
      const creators = await this.getCreators();
      return creators.find(c => c.id === id) || null;
    } catch (error) {
      console.error('Error getting creator by ID:', error);
      return null;
    }
  }

  async getCreatorByUsername(username: string): Promise<Creator | null> {
    try {
      const creators = await this.getCreators();
      return creators.find(c => c.username === username) || null;
    } catch (error) {
      console.error('Error getting creator by username:', error);
      return null;
    }
  }

  async suspendCreator(id: string): Promise<Creator> {
    return this.updateCreator(id, { status: 'suspended' });
  }

  async activateCreator(id: string): Promise<Creator> {
    return this.updateCreator(id, { status: 'active' });
  }
}

export const creatorsStorage = new CreatorsStorage();
