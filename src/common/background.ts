import { BrowserType, HistoryItem, SyncMessage } from './types';
import { P2PSync } from './p2p';
import { HistoryManager } from './history-manager';
import { SettingsManager } from './settings-manager';
import { generateDeviceId } from './crypto';

// Determine browser type
let browserType: BrowserType;
if (navigator.userAgent.includes('Firefox')) {
  browserType = BrowserType.FIREFOX;
} else if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
  browserType = BrowserType.SAFARI;
} else {
  browserType = BrowserType.CHROME;
}

// Generate a device ID
const deviceId = generateDeviceId();

// Initialize managers
const settingsManager = new SettingsManager();
const historyManager = new HistoryManager(browserType, deviceId);
const p2pSync = new P2PSync(browserType);

let syncInterval: number | null = null;
let isConnected = false;

async function initialize() {
  try {
    // Load settings
    const settings = await settingsManager.getSettings();
    
    // Initialize history manager
    await historyManager.init(settings);
    
    // Check if we have a shared secret
    if (!settings.sharedSecret) {
      console.log('No shared secret set. Please configure the extension.');
      return;
    }
    
    // Initialize P2P network
    await p2pSync.init(settings);
    isConnected = true;
    
    // Set up message handler
    p2pSync.onMessage(handleSyncMessage);
    
    // Set up peer connection handlers
    p2pSync.onPeerConnect(async (peerId) => {
      const stats = await settingsManager.getSyncStats();
      await settingsManager.updateSyncStats({ peerCount: p2pSync.getPeers().length });
      
      // Send peer info
      await p2pSync.sendPeerInfo();
    });
    
    p2pSync.onPeerDisconnect(async () => {
      await settingsManager.updateSyncStats({ peerCount: p2pSync.getPeers().length });
    });
    
    // Set up sync interval
    if (syncInterval) {
      clearInterval(syncInterval);
    }
    
    syncInterval = self.setInterval(async () => {
      if (isConnected) {
        await syncHistory();
      }
    }, settings.syncInterval * 60 * 1000);
    
    // Sync on startup if enabled
    if (settings.syncOnStartup) {
      await syncHistory();
    }
    
    // Listen for history changes if enabled
    if (settings.syncOnNewHistory) {
      chrome.history.onVisited.addListener(async (historyItem) => {
        if (isConnected) {
          const item: HistoryItem = {
            id: historyItem.id || '',
            url: historyItem.url || '',
            title: historyItem.title || '',
            visitTime: historyItem.lastVisitTime || Date.now(),
            browserType,
            deviceId
          };
          
          await p2pSync.sendHistoryItems([item]);
        }
      });
    }
    
    console.log('Background service initialized successfully');
  } catch (error) {
    console.error('Error initializing background service:', error);
  }
}

async function syncHistory() {
  try {
    // Get recent history
    const historyItems = await historyManager.getRecentHistory(100);
    
    // Send to peers
    if (historyItems.length > 0) {
      await p2pSync.sendHistoryItems(historyItems);
    }
    
    // Update last sync time
    await settingsManager.updateSyncStats({ lastSync: Date.now() });
    
    console.log(`Synced ${historyItems.length} history items`);
  } catch (error) {
    console.error('Error syncing history:', error);
  }
}

async function handleSyncMessage(message: SyncMessage) {
  try {
    switch (message.type) {
      case 'HISTORY_SYNC':
        // Process history items
        const historyItems = message.payload as HistoryItem[];
        await historyManager.addHistoryItems(historyItems);
        
        // Update sync count
        const stats = await settingsManager.getSyncStats();
        await settingsManager.updateSyncStats({ 
          syncCount: stats.syncCount + historyItems.length,
          lastSync: Date.now()
        });
        
        console.log(`Received ${historyItems.length} history items from peer`);
        break;
        
      case 'SYNC_REQUEST':
        // Send our history in response to a sync request
        await syncHistory();
        break;
        
      case 'PEER_INFO':
        // Just update the peer count
        await settingsManager.updateSyncStats({ peerCount: p2pSync.getPeers().length });
        break;
    }
  } catch (error) {
    console.error('Error handling sync message:', error);
  }
}

// Listen for messages from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.action) {
        case 'getStatus':
          sendResponse({
            isConnected,
            peers: p2pSync.getPeers(),
            stats: await settingsManager.getSyncStats()
          });
          break;
          
        case 'connect':
          if (!isConnected) {
            await initialize();
            sendResponse({ success: true, isConnected });
          } else {
            sendResponse({ success: true, isConnected });
          }
          break;
          
        case 'disconnect':
          if (isConnected) {
            if (syncInterval) {
              clearInterval(syncInterval);
              syncInterval = null;
            }
            
            await p2pSync.stop();
            isConnected = false;
            
            sendResponse({ success: true, isConnected });
          } else {
            sendResponse({ success: true, isConnected });
          }
          break;
          
        case 'syncNow':
          if (isConnected) {
            await syncHistory();
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Not connected' });
          }
          break;
          
        case 'settingsUpdated':
          // Reinitialize with new settings
          if (syncInterval) {
            clearInterval(syncInterval);
            syncInterval = null;
          }
          
          if (isConnected) {
            await p2pSync.stop();
            isConnected = false;
          }
          
          await initialize();
          sendResponse({ success: true });
          break;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      sendResponse({ success: false, error: errorMessage });
    }
  })();
  
  // Return true to indicate that we will send a response asynchronously
  return true;
});

// Initialize on startup
initialize();