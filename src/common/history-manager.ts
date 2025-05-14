import { BrowserType, HistoryItem, SyncSettings } from './types';
import { hashUrl } from './crypto';

export class HistoryManager {
  private browserType: BrowserType;
  private settings: SyncSettings = {} as SyncSettings;
  private deviceId: string;
  
  constructor(browserType: BrowserType, deviceId: string) {
    this.browserType = browserType;
    this.deviceId = deviceId;
  }
  
  async init(settings: SyncSettings): Promise<void> {
    this.settings = settings;
  }
  
  async getRecentHistory(maxResults: number = 100): Promise<HistoryItem[]> {
    try {
      // Get history from browser API
      const historyItems = await this.getBrowserHistory(maxResults);
      
      // Filter out excluded domains
      const filteredItems = this.filterExcludedDomains(historyItems);
      
      return filteredItems;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  }
  
  async addHistoryItems(items: HistoryItem[]): Promise<void> {
    try {
      for (const item of items) {
        // Check if the URL should be excluded
        if (this.shouldExcludeDomain(item.url)) {
          continue;
        }
        
        // Add to browser history
        await this.addToBrowserHistory(item);
      }
    } catch (error) {
      console.error('Error adding history items:', error);
    }
  }
  
  private async getBrowserHistory(maxResults: number): Promise<HistoryItem[]> {
    return new Promise((resolve) => {
      chrome.history.search({ text: '', maxResults }, (items) => {
        const historyItems: HistoryItem[] = items.map(item => ({
          id: hashUrl(item.url || ''),
          url: item.url || '',
          title: item.title || '',
          visitTime: item.lastVisitTime || Date.now(),
          browserType: this.browserType,
          deviceId: this.deviceId
        }));
        
        resolve(historyItems);
      });
    });
  }
  
  private async addToBrowserHistory(item: HistoryItem): Promise<void> {
    return new Promise((resolve) => {
      chrome.history.addUrl({ url: item.url }, () => {
        resolve();
      });
    });
  }
  
  private filterExcludedDomains(items: HistoryItem[]): HistoryItem[] {
    return items.filter(item => !this.shouldExcludeDomain(item.url));
  }
  
  private shouldExcludeDomain(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      
      return this.settings.excludeDomains.some(excludedDomain => 
        domain === excludedDomain || domain.endsWith('.' + excludedDomain)
      );
    } catch (error) {
      // Invalid URL, exclude it
      return true;
    }
  }
}