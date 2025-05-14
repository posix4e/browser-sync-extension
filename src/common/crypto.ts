import CryptoJS from 'crypto-js';

export function encryptData(data: string, secret: string): { data: string, iv: string } {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(data, secret, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return {
    data: encrypted.toString(),
    iv: iv.toString(CryptoJS.enc.Hex)
  };
}

export function decryptData(encryptedData: string, iv: string, secret: string): string {
  const ivWordArray = CryptoJS.enc.Hex.parse(iv);
  const decrypted = CryptoJS.AES.decrypt(encryptedData, secret, {
    iv: ivWordArray,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });
  
  return decrypted.toString(CryptoJS.enc.Utf8);
}

export function generateDeviceId(): string {
  // Generate a random device ID
  const randomBytes = new Uint8Array(16);
  // Use self.crypto for service worker compatibility
  (self.crypto || crypto).getRandomValues(randomBytes);
  
  return Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hashUrl(url: string): string {
  return CryptoJS.SHA256(url).toString(CryptoJS.enc.Hex);
}