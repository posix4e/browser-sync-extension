const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

describe('Browser History Sync Extension', () => {
  let browser;
  let page;
  const screenshotsDir = path.join(__dirname, '../screenshots');
  
  beforeAll(async () => {
    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    // Launch browser with the extension
    browser = await puppeteer.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${path.join(__dirname, '../dist/chrome')}`,
        `--load-extension=${path.join(__dirname, '../dist/chrome')}`,
        '--no-sandbox'
      ]
    });
    
    // Get the extension ID
    const targets = await browser.targets();
    const extensionTarget = targets.find(target => 
      target.type() === 'service_worker' && 
      target.url().includes('chrome-extension://')
    );
    
    const extensionUrl = extensionTarget.url();
    const extensionId = extensionUrl.split('/')[2];
    
    // Open a new page
    page = await browser.newPage();
    
    // Navigate to the extension's popup page
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  test('Extension popup loads correctly', async () => {
    // Check if the popup title is correct
    const title = await page.$eval('h2', el => el.textContent);
    expect(title).toBe('Browser History Sync');
    
    // Take a screenshot of the popup
    await page.screenshot({ path: path.join(screenshotsDir, 'popup.png') });
  });
  
  test('Options page loads correctly', async () => {
    // Click the settings button
    await page.click('#openOptions');
    
    // Wait for the options page to open in a new tab
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get all pages
    const pages = await browser.pages();
    const optionsPage = pages[pages.length - 1];
    
    // Check if the options page title is correct
    const title = await optionsPage.$eval('h1', el => el.textContent);
    expect(title).toBe('Browser History Sync Settings');
    
    // Take a screenshot of the options page
    await optionsPage.screenshot({ 
      path: path.join(screenshotsDir, 'options.png'),
      fullPage: true
    });
    
    // Close the options page
    await optionsPage.close();
  });
  
  test('Connection status updates correctly', async () => {
    // Check initial status
    let statusText = await page.$eval('#status', el => el.textContent);
    expect(statusText).toContain('Disconnected');
    
    // Take a screenshot of the disconnected state
    await page.screenshot({ path: path.join(screenshotsDir, 'disconnected.png') });
    
    // Click the connect button
    await page.click('#connect');
    
    // Wait for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check updated status
    statusText = await page.$eval('#status', el => el.textContent);
    expect(statusText).toContain('Connected');
    
    // Take a screenshot of the connected state
    await page.screenshot({ path: path.join(screenshotsDir, 'connected.png') });
  });
});