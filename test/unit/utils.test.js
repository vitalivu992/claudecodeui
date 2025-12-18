import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle conflicting classes by keeping the last one', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isInactive = false;
    expect(cn('base-class', isActive && 'active', isInactive && 'inactive')).toBe('base-class active');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle arrays and objects', () => {
    expect(cn(['class1', 'class2'], { class3: true, class4: false })).toBe('class1 class2 class3');
  });

  it('should handle Tailwind CSS class conflicts', () => {
    expect(cn('bg-red-500 bg-blue-500')).toBe('bg-blue-500');
  });
});
