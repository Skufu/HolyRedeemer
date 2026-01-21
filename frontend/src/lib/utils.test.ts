import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('merges class names correctly', () => {
    const result = cn('px-4', 'py-2');
    expect(result).toBe('px-4 py-2');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const result = cn('base-class', isActive && 'active-class');
    expect(result).toBe('base-class active-class');
  });

  it('filters out falsy values', () => {
    const result = cn('class1', false, null, undefined, 'class3');
    expect(result).toBe('class1 class3');
  });

  it('merges tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4');
    expect(result).toBe('py-1 px-4');
  });

  it('handles arrays of classes', () => {
    const result = cn(['class1', 'class2']);
    expect(result).toBe('class1 class2');
  });

  it('handles objects with conditional classes', () => {
    const result = cn({
      'active': true,
      'disabled': false,
      'highlighted': true,
    });
    expect(result).toBe('active highlighted');
  });

  it('handles empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles mixed inputs', () => {
    const result = cn(
      'base',
      ['array-class'],
      { 'object-class': true },
      'conditional'
    );
    expect(result).toBe('base array-class object-class conditional');
  });

  it('resolves tailwind conflicts correctly', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('preserves non-conflicting classes', () => {
    const result = cn('text-sm', 'font-bold', 'text-lg');
    expect(result).toBe('font-bold text-lg');
  });
});
