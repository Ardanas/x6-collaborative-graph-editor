type StorageType = 'session' | 'local';

class StorageService {
  private storageType: StorageType;

  constructor(type: StorageType = 'session') {
    this.storageType = type;
  }

  private get storage() {
    return this.storageType === 'session' ? sessionStorage : localStorage;
  }

  setItem(key: string, value: any): void {
    this.storage.setItem(key, JSON.stringify(value));
  }

  getItem<T>(key: string): T | null {
    const item = this.storage.getItem(key);
    return item ? JSON.parse(item) : null;
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

export const storageService = new StorageService('session');