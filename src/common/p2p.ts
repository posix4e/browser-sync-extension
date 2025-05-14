import { createLibp2p } from 'libp2p';
import { webRTC } from '@libp2p/webrtc';
import { webSockets } from '@libp2p/websockets';
import { noise } from '@chainsafe/libp2p-noise';
import { BrowserType, EncryptedHistoryItem, HistoryItem, PeerInfo, SyncMessage, SyncSettings } from './types';
import { decryptData, encryptData, generateDeviceId } from './crypto';

export class P2PSync {
  private libp2p: any;
  private settings: SyncSettings = {} as SyncSettings;
  private deviceId: string;
  private browserType: BrowserType;
  private peers: Map<string, PeerInfo> = new Map();
  private onMessageCallback: ((message: SyncMessage) => void) | null = null;
  private onPeerConnectCallback: ((peerId: string) => void) | null = null;
  private onPeerDisconnectCallback: ((peerId: string) => void) | null = null;
  
  constructor(browserType: BrowserType) {
    this.browserType = browserType;
    this.deviceId = generateDeviceId();
  }
  
  async init(settings: SyncSettings): Promise<void> {
    this.settings = settings;
    
    // Configure libp2p with the appropriate discovery server
    const bootstrapList = this.getBootstrapList();
    
    // Use any type to bypass TypeScript errors with libp2p configuration
    const config: any = {
      addresses: {
        listen: ['/webrtc']
      },
      transports: [
        webSockets(),
        webRTC()
      ],
      connectionEncryption: [noise()],
      connectionGater: {
        denyDialMultiaddr: () => false
      },
      connectionManager: {
        minConnections: 0,
        maxConnections: 50
      },
      peerDiscovery: [
        {
          tag: 'bootstrap',
          list: bootstrapList
        }
      ]
    };
    
    this.libp2p = await createLibp2p(config);
    
    // Set up event listeners
    this.libp2p.addEventListener('peer:connect', (evt: any) => {
      const peerId = evt.detail.remotePeer.toString();
      console.log('Connected to peer:', peerId);
      
      if (this.onPeerConnectCallback) {
        this.onPeerConnectCallback(peerId);
      }
    });
    
    this.libp2p.addEventListener('peer:disconnect', (evt: any) => {
      const peerId = evt.detail.remotePeer.toString();
      console.log('Disconnected from peer:', peerId);
      
      if (this.onPeerDisconnectCallback) {
        this.onPeerDisconnectCallback(peerId);
      }
      
      // Remove peer from the list
      this.peers.delete(peerId);
    });
    
    // Set up pubsub for message exchange
    this.libp2p.pubsub.subscribe('history-sync', (message: any) => {
      try {
        const encryptedData = JSON.parse(message.data.toString());
        const decryptedData = decryptData(encryptedData.data, encryptedData.iv, this.settings.sharedSecret);
        const syncMessage: SyncMessage = JSON.parse(decryptedData);
        
        // Update peer info
        if (syncMessage.sender && syncMessage.sender.id) {
          this.peers.set(syncMessage.sender.id, {
            id: syncMessage.sender.id,
            deviceName: syncMessage.sender.deviceName || 'Unknown Device',
            browserType: syncMessage.sender.browserType,
            lastSeen: Date.now()
          });
        }
        
        // Process the message
        if (this.onMessageCallback) {
          this.onMessageCallback(syncMessage);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    await this.libp2p.start();
    console.log('P2P network started');
  }
  
  async sendHistoryItems(items: HistoryItem[]): Promise<void> {
    const message: SyncMessage = {
      type: 'HISTORY_SYNC',
      payload: items,
      timestamp: Date.now(),
      sender: {
        id: this.deviceId,
        browserType: this.browserType,
        deviceName: this.getDeviceName()
      }
    };
    
    await this.sendMessage(message);
  }
  
  async requestSync(): Promise<void> {
    const message: SyncMessage = {
      type: 'SYNC_REQUEST',
      payload: null,
      timestamp: Date.now(),
      sender: {
        id: this.deviceId,
        browserType: this.browserType,
        deviceName: this.getDeviceName()
      }
    };
    
    await this.sendMessage(message);
  }
  
  async sendPeerInfo(): Promise<void> {
    const message: SyncMessage = {
      type: 'PEER_INFO',
      payload: {
        deviceId: this.deviceId,
        browserType: this.browserType,
        deviceName: this.getDeviceName()
      },
      timestamp: Date.now(),
      sender: {
        id: this.deviceId,
        browserType: this.browserType,
        deviceName: this.getDeviceName()
      }
    };
    
    await this.sendMessage(message);
  }
  
  private async sendMessage(message: SyncMessage): Promise<void> {
    try {
      const messageStr = JSON.stringify(message);
      const encrypted = encryptData(messageStr, this.settings.sharedSecret);
      
      await this.libp2p.pubsub.publish('history-sync', new TextEncoder().encode(JSON.stringify(encrypted)));
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  onMessage(callback: (message: SyncMessage) => void): void {
    this.onMessageCallback = callback;
  }
  
  onPeerConnect(callback: (peerId: string) => void): void {
    this.onPeerConnectCallback = callback;
  }
  
  onPeerDisconnect(callback: (peerId: string) => void): void {
    this.onPeerDisconnectCallback = callback;
  }
  
  getPeers(): PeerInfo[] {
    return Array.from(this.peers.values());
  }
  
  async stop(): Promise<void> {
    if (this.libp2p) {
      await this.libp2p.stop();
      console.log('P2P network stopped');
    }
  }
  
  private getBootstrapList(): string[] {
    switch (this.settings.discoveryServer) {
      case 'google':
        return [
          '/dns4/stun.l.google.com/tcp/19302/wss/p2p-webrtc-star/',
          '/dns4/stun1.l.google.com/tcp/19302/wss/p2p-webrtc-star/',
          '/dns4/stun2.l.google.com/tcp/19302/wss/p2p-webrtc-star/'
        ];
      case 'twilio':
        return [
          '/dns4/global.stun.twilio.com/tcp/3478/wss/p2p-webrtc-star/'
        ];
      case 'custom':
        if (this.settings.customServerUrl) {
          return [this.settings.customServerUrl];
        }
        // Fall back to Google if custom URL is not provided
        return [
          '/dns4/stun.l.google.com/tcp/19302/wss/p2p-webrtc-star/'
        ];
      default:
        return [
          '/dns4/stun.l.google.com/tcp/19302/wss/p2p-webrtc-star/'
        ];
    }
  }
  
  private getDeviceName(): string {
    const platform = navigator.platform;
    const userAgent = navigator.userAgent;
    
    let deviceName = 'Unknown Device';
    
    if (userAgent.includes('Firefox')) {
      deviceName = 'Firefox';
    } else if (userAgent.includes('Chrome')) {
      deviceName = 'Chrome';
    } else if (userAgent.includes('Safari')) {
      deviceName = 'Safari';
    }
    
    if (platform.includes('Win')) {
      deviceName += ' on Windows';
    } else if (platform.includes('Mac')) {
      deviceName += ' on macOS';
    } else if (platform.includes('Linux')) {
      deviceName += ' on Linux';
    } else if (platform.includes('iPhone') || platform.includes('iPad') || platform.includes('iPod')) {
      deviceName += ' on iOS';
    } else if (platform.includes('Android')) {
      deviceName += ' on Android';
    }
    
    return deviceName;
  }
}