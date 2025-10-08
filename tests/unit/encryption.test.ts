/**
 * Encryption Service Unit Tests
 * Tests encryption key management and AES-256-GCM encryption
 * Requirements: 5.1, 5.3, 6.1
 */

import { describe, it, expect } from 'vitest';
import {
  generateEncryptionKey,
  hashEncryptionKey,
  verifyEncryptionKey,
  encryptAudio,
  decryptAudio,
  encryptText,
  decryptText,
  generateSecureToken,
  hashData,
  secureCompare,
} from '@/lib/services/encryption';

describe('Encryption Service', () => {
  describe('generateEncryptionKey', () => {
    it('should generate a valid base64 encryption key', () => {
      const key = generateEncryptionKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      
      // Verify it's valid base64
      const buffer = Buffer.from(key, 'base64');
      expect(buffer.length).toBe(32); // 256 bits
    });

    it('should generate unique keys on each call', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('hashEncryptionKey', () => {
    it('should hash encryption key for storage', () => {
      const key = generateEncryptionKey();
      const hash = hashEncryptionKey(key);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toContain(':'); // Format: salt:hash
      
      const [salt, hashPart] = hash.split(':');
      expect(salt.length).toBeGreaterThan(0);
      expect(hashPart.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for the same key (due to salt)', () => {
      const key = generateEncryptionKey();
      const hash1 = hashEncryptionKey(key);
      const hash2 = hashEncryptionKey(key);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyEncryptionKey', () => {
    it('should verify correct encryption key', () => {
      const key = generateEncryptionKey();
      const hash = hashEncryptionKey(key);
      
      const isValid = verifyEncryptionKey(key, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject incorrect encryption key', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      const hash = hashEncryptionKey(key1);
      
      const isValid = verifyEncryptionKey(key2, hash);
      
      expect(isValid).toBe(false);
    });

    it('should handle invalid hash format gracefully', () => {
      const key = generateEncryptionKey();
      const invalidHash = 'invalid-hash-format';
      
      const isValid = verifyEncryptionKey(key, invalidHash);
      
      expect(isValid).toBe(false);
    });

    it('should prevent timing attacks with constant-time comparison', () => {
      const key = generateEncryptionKey();
      const hash = hashEncryptionKey(key);
      
      // Measure time for correct key
      const start1 = process.hrtime.bigint();
      verifyEncryptionKey(key, hash);
      const end1 = process.hrtime.bigint();
      const time1 = end1 - start1;
      
      // Measure time for incorrect key
      const wrongKey = generateEncryptionKey();
      const start2 = process.hrtime.bigint();
      verifyEncryptionKey(wrongKey, hash);
      const end2 = process.hrtime.bigint();
      const time2 = end2 - start2;
      
      // Times should be similar (within 10x factor for timing safety)
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThan(10);
    });
  });

  describe('encryptAudio and decryptAudio', () => {
    it('should encrypt and decrypt audio data correctly', async () => {
      const key = generateEncryptionKey();
      const originalData = Buffer.from('This is test audio data');
      
      // Encrypt
      const { encryptedData, iv, authTag } = await encryptAudio(originalData, key);
      
      expect(encryptedData).toBeDefined();
      expect(iv).toBeDefined();
      expect(authTag).toBeDefined();
      expect(iv.length).toBe(12); // GCM IV length
      expect(authTag.length).toBe(16); // GCM auth tag length
      expect(encryptedData).not.toEqual(originalData);
      
      // Decrypt
      const decryptedData = await decryptAudio(encryptedData, key, iv, authTag);
      
      expect(decryptedData).toEqual(originalData);
      expect(decryptedData.toString()).toBe('This is test audio data');
    });

    it('should fail decryption with wrong key', async () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      const originalData = Buffer.from('Test data');
      
      const { encryptedData, iv, authTag } = await encryptAudio(originalData, key1);
      
      await expect(
        decryptAudio(encryptedData, key2, iv, authTag)
      ).rejects.toThrow();
    });

    it('should fail decryption with tampered data', async () => {
      const key = generateEncryptionKey();
      const originalData = Buffer.from('Test data');
      
      const { encryptedData, iv, authTag } = await encryptAudio(originalData, key);
      
      // Tamper with encrypted data
      const tamperedData = Buffer.from(encryptedData);
      tamperedData[0] = tamperedData[0] ^ 0xFF;
      
      await expect(
        decryptAudio(tamperedData, key, iv, authTag)
      ).rejects.toThrow();
    });

    it('should fail decryption with wrong auth tag', async () => {
      const key = generateEncryptionKey();
      const originalData = Buffer.from('Test data');
      
      const { encryptedData, iv } = await encryptAudio(originalData, key);
      const wrongAuthTag = Buffer.alloc(16);
      
      await expect(
        decryptAudio(encryptedData, key, iv, wrongAuthTag)
      ).rejects.toThrow();
    });

    it('should handle large audio files', async () => {
      const key = generateEncryptionKey();
      // Simulate 1MB audio file
      const largeData = Buffer.alloc(1024 * 1024, 'a');
      
      const { encryptedData, iv, authTag } = await encryptAudio(largeData, key);
      const decryptedData = await decryptAudio(encryptedData, key, iv, authTag);
      
      expect(decryptedData).toEqual(largeData);
    });
  });

  describe('encryptText and decryptText', () => {
    it('should encrypt and decrypt text correctly', async () => {
      const key = generateEncryptionKey();
      const originalText = 'This is a test transcription with special chars: 你好, émojis 🎉';
      
      const encryptedText = await encryptText(originalText, key);
      
      expect(encryptedText).toBeDefined();
      expect(typeof encryptedText).toBe('string');
      expect(encryptedText).not.toBe(originalText);
      
      const decryptedText = await decryptText(encryptedText, key);
      
      expect(decryptedText).toBe(originalText);
    });

    it('should fail decryption with wrong key', async () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      const text = 'Secret message';
      
      const encryptedText = await encryptText(text, key1);
      
      await expect(
        decryptText(encryptedText, key2)
      ).rejects.toThrow();
    });

    it('should handle empty strings', async () => {
      const key = generateEncryptionKey();
      const emptyText = '';
      
      const encryptedText = await encryptText(emptyText, key);
      const decryptedText = await decryptText(encryptedText, key);
      
      expect(decryptedText).toBe(emptyText);
    });

    it('should handle unicode characters', async () => {
      const key = generateEncryptionKey();
      const unicodeText = '日本語 Español Français 中文 العربية';
      
      const encryptedText = await encryptText(unicodeText, key);
      const decryptedText = await decryptText(encryptedText, key);
      
      expect(decryptedText).toBe(unicodeText);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate secure random token', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    });

    it('should generate unique tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should respect custom length', () => {
      const token = generateSecureToken(16);
      
      expect(token.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe('hashData', () => {
    it('should hash string data', () => {
      const data = 'test data';
      const hash = hashData(data);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 = 64 hex chars
    });

    it('should hash buffer data', () => {
      const data = Buffer.from('test data');
      const hash = hashData(data);
      
      expect(hash).toBeDefined();
      expect(hash.length).toBe(64);
    });

    it('should produce consistent hashes', () => {
      const data = 'test data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);
      
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different data', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('secureCompare', () => {
    it('should return true for equal strings', () => {
      const str = 'test-string';
      
      expect(secureCompare(str, str)).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(secureCompare('string1', 'string2')).toBe(false);
    });

    it('should return false for strings of different lengths', () => {
      expect(secureCompare('short', 'longer-string')).toBe(false);
    });

    it('should be timing-safe', () => {
      const str1 = 'a'.repeat(100);
      const str2 = 'b'.repeat(100);
      const str3 = 'a'.repeat(99) + 'b';
      
      // All comparisons should take similar time
      const start1 = process.hrtime.bigint();
      secureCompare(str1, str2);
      const end1 = process.hrtime.bigint();
      const time1 = end1 - start1;
      
      const start2 = process.hrtime.bigint();
      secureCompare(str1, str3);
      const end2 = process.hrtime.bigint();
      const time2 = end2 - start2;
      
      // Times should be similar (within 10x factor)
      const ratio = Number(time1) / Number(time2);
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThan(10);
    });
  });
});
