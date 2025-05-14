import { SyncSettings } from './types';

export class SettingsManager {
  private static readonly DEFAULT_SETTINGS: SyncSettings = {
    discoveryServer: 'google',
    sharedSecret: '',
    syncInterval: 30,
    syncOnStartup: true,
    syncOnNewHistory: true,
    excludeIncognito: true,
    excludeDomains: []
  };
  
  async getSettings(): Promise<SyncSettings> {
    return new Promise((resolve) => {
      chrome.storage.sync.get('syncSettings', (result) => {
        if (result.syncSettings) {
          resolve(result.syncSettings as SyncSettings);
        } else {
          resolve(SettingsManager.DEFAULT_SETTINGS);
        }
      });
    });
  }
  
  async saveSettings(settings: SyncSettings): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ syncSettings: settings }, () => {
        resolve();
      });
    });
  }
  
  async getSyncStats(): Promise<{ lastSync: number | null; peerCount: number; syncCount: number }> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['lastSync', 'peerCount', 'syncCount'], (result) => {
        resolve({
          lastSync: result.lastSync || null,
          peerCount: result.peerCount || 0,
          syncCount: result.syncCount || 0
        });
      });
    });
  }
  
  async updateSyncStats(stats: { lastSync?: number; peerCount?: number; syncCount?: number }): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['lastSync', 'peerCount', 'syncCount'], (result) => {
        const updatedStats = {
          lastSync: stats.lastSync !== undefined ? stats.lastSync : (result.lastSync || null),
          peerCount: stats.peerCount !== undefined ? stats.peerCount : (result.peerCount || 0),
          syncCount: stats.syncCount !== undefined ? stats.syncCount : (result.syncCount || 0)
        };
        
        chrome.storage.local.set(updatedStats, () => {
          resolve();
        });
      });
    });
  }
}