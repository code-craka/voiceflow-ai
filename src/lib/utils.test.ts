import { describe, it, expect } from 'vitest';
import { formatDuration, formatFileSize, cn } from './utils';

describe('utils', () => {
  describe('formatDuration', () => {
    it('should format seconds to mm:ss format', () => {
      expect(formatDuration(65)).toBe('1:05');
      expect(formatDuration(120)).toBe('2:00');
      expect(formatDuration(0)).toBe('0:00');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes to human readable format', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
    });
  });

  describe('cn', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2');
      expect(cn('class1', undefined, 'class2')).toBe('class1 class2');
    });
  });
});