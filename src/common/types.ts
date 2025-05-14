export interface HistoryItem {
  id: string;
  url: string;
  title: string;
  visitTime: number;
  browserType: BrowserType;
  deviceId: string;
}

export enum BrowserType {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari'
}

export interface SyncSettings {
  discoveryServer: 'google' | 'twilio' | 'custom';
  customServerUrl?: string;
  sharedSecret: string;
  syncInterval: number;
  syncOnStartup: boolean;
  syncOnNewHistory: boolean;
  excludeIncognito: boolean;
  excludeDomains: string[];
}

export interface PeerInfo {
  id: string;
  deviceName: string;
  browserType: BrowserType;
  lastSeen: number;
}

export interface SyncStats {
  lastSync: number | null;
  peerCount: number;
  syncCount: number;
}

export interface EncryptedHistoryItem {
  data: string;
  iv: string;
}

export interface SyncMessage {
  type: 'HISTORY_SYNC' | 'PEER_INFO' | 'SYNC_REQUEST';
  payload: any;
  timestamp: number;
  sender: {
    id: string;
    browserType: BrowserType;
    deviceName: string;
  };
}