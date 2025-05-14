import { SettingsManager } from './settings-manager';
import { SyncSettings } from './types';

document.addEventListener('DOMContentLoaded', () => {
  const settingsManager = new SettingsManager();
  
  const discoveryServerSelect = document.getElementById('discoveryServer') as HTMLSelectElement;
  const customServerFields = document.getElementById('customServerFields') as HTMLDivElement;
  const customServerUrlInput = document.getElementById('customServerUrl') as HTMLInputElement;
  const sharedSecretInput = document.getElementById('sharedSecret') as HTMLInputElement;
  const syncIntervalInput = document.getElementById('syncInterval') as HTMLInputElement;
  const syncOnStartupCheckbox = document.getElementById('syncOnStartup') as HTMLInputElement;
  const syncOnNewHistoryCheckbox = document.getElementById('syncOnNewHistory') as HTMLInputElement;
  const excludeIncognitoCheckbox = document.getElementById('excludeIncognito') as HTMLInputElement;
  const excludeDomainsTextarea = document.getElementById('excludeDomains') as HTMLTextAreaElement;
  const saveSettingsButton = document.getElementById('saveSettings') as HTMLButtonElement;
  const statusElement = document.getElementById('status') as HTMLDivElement;
  
  // Load settings
  async function loadSettings() {
    try {
      const settings = await settingsManager.getSettings();
      
      discoveryServerSelect.value = settings.discoveryServer;
      customServerUrlInput.value = settings.customServerUrl || '';
      sharedSecretInput.value = settings.sharedSecret;
      syncIntervalInput.value = settings.syncInterval.toString();
      syncOnStartupCheckbox.checked = settings.syncOnStartup;
      syncOnNewHistoryCheckbox.checked = settings.syncOnNewHistory;
      excludeIncognitoCheckbox.checked = settings.excludeIncognito;
      excludeDomainsTextarea.value = settings.excludeDomains.join('\\n');
      
      // Show/hide custom server fields
      if (settings.discoveryServer === 'custom') {
        customServerFields.style.display = 'block';
      } else {
        customServerFields.style.display = 'none';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showStatus('Error loading settings: ' + errorMessage, false);
    }
  }
  
  // Save settings
  async function saveSettings() {
    try {
      const excludeDomains = excludeDomainsTextarea.value
        .split('\\n')
        .map(domain => domain.trim())
        .filter(domain => domain.length > 0);
      
      const settings: SyncSettings = {
        discoveryServer: discoveryServerSelect.value as 'google' | 'twilio' | 'custom',
        customServerUrl: customServerUrlInput.value,
        sharedSecret: sharedSecretInput.value,
        syncInterval: parseInt(syncIntervalInput.value, 10),
        syncOnStartup: syncOnStartupCheckbox.checked,
        syncOnNewHistory: syncOnNewHistoryCheckbox.checked,
        excludeIncognito: excludeIncognitoCheckbox.checked,
        excludeDomains
      };
      
      await settingsManager.saveSettings(settings);
      
      // Notify background script that settings have been updated
      chrome.runtime.sendMessage({ action: 'settingsUpdated' }, (response) => {
        if (response && response.success) {
          showStatus('Settings saved successfully!', true);
        } else {
          showStatus('Error applying settings: ' + (response?.error || 'Unknown error'), false);
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showStatus('Error saving settings: ' + errorMessage, false);
    }
  }
  
  // Show status message
  function showStatus(message: string, isSuccess: boolean) {
    statusElement.textContent = message;
    statusElement.className = isSuccess ? 'status success' : 'status error';
    statusElement.style.display = 'block';
    
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 5000);
  }
  
  // Set up event listeners
  discoveryServerSelect.addEventListener('change', () => {
    if (discoveryServerSelect.value === 'custom') {
      customServerFields.style.display = 'block';
    } else {
      customServerFields.style.display = 'none';
    }
  });
  
  saveSettingsButton.addEventListener('click', saveSettings);
  
  // Load settings on page load
  loadSettings();
});