import { TokenCounter, formatBytes, formatTokens } from '../../packages/core/src/utils';

describe('TokenCounter', () => {
  test('estimates token count for English text', () => {
    const english = 'Hello world, this is a test sentence for token counting.';
    const count = TokenCounter.count(english);
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThan(english.length);
  });

  test('estimates token count for Chinese text', () => {
    const chinese = '这是一个测试句子用于计算中文的token数量';
    const count = TokenCounter.count(chinese);
    expect(count).toBeGreaterThan(0);
  });

  test('estimates token count for mixed text', () => {
    const mixed = '这是mixed text包含English and Chinese的测试';
    const count = TokenCounter.count(mixed);
    expect(count).toBeGreaterThan(0);
    // Chinese chars consume more tokens per char than English
    const pureEnglish = 'This is a pure English sentence for testing purposes';
    const enTokens = TokenCounter.count(pureEnglish);
    const enRatio = enTokens / pureEnglish.length;
    const mixedRatio = count / mixed.length;
    // Mixed should have higher tokens/char ratio
    expect(mixedRatio).toBeGreaterThan(enRatio);
  });

  test('truncates text to max tokens', () => {
    const longText = 'This is a longer text. '.repeat(1000);
    const truncated = TokenCounter.truncate(longText, 100);
    expect(truncated.length).toBeLessThan(longText.length);
    expect(truncated).toContain('truncated');
  });
});

describe('formatBytes', () => {
  test('formats bytes correctly', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(1536000)).toBe('1.5 MB');
  });
});

describe('formatTokens', () => {
  test('formats tokens correctly', () => {
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(1500000)).toBe('1.5M');
  });
});
