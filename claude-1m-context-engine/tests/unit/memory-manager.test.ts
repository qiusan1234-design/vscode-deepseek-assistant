import { MemoryManager } from '../../packages/core/src/memory-manager';

describe('MemoryManager', () => {
  let manager: MemoryManager;

  beforeEach(() => {
    manager = new MemoryManager(50000);
  });

  test('adds a memory slot', () => {
    const slot = manager.add('greeting', 'Hello world', 5);
    expect(slot.label).toBe('greeting');
    expect(slot.content).toBe('Hello world');
    expect(slot.priority).toBe(5);
    expect(slot.tokenCount).toBeGreaterThan(0);
  });

  test('removes a memory slot', () => {
    const slot = manager.add('temp', 'Temporary data');
    expect(manager.remove(slot.id)).toBe(true);
    expect(manager.getStore().slots).toHaveLength(0);
  });

  test('clears all memory', () => {
    manager.add('a', 'data a');
    manager.add('b', 'data b');
    manager.clear();
    expect(manager.getStore().slots).toHaveLength(0);
    expect(manager.getStore().totalTokens).toBe(0);
  });

  test('finds relevant slots by keyword', () => {
    manager.add('project X', 'This is about project X architecture');
    manager.add('project Y', 'This is about project Y deployment');
    manager.add('misc', 'Random thoughts');

    const results = manager.getRelevant('architecture');
    expect(results).toHaveLength(1);
    expect(results[0].label).toBe('project X');
  });

  test('evicts lowest priority when full', () => {
    const smallManager = new MemoryManager(100);
    smallManager.add('high-prio', 'Important stuff here yes', 10);
    smallManager.add('low-prio', 'Not important at all really', 1);
    smallManager.add('medium', 'Medium importance content', 5);

    const store = smallManager.getStore();
    // Lowest priority should be evicted
    const labels = store.slots.map(s => s.label);
    expect(labels).not.toContain('low-prio');
  });

  test('TTL expiration removes expired slots', () => {
    const slot = manager.add('ephemeral', 'Short-lived data', 5, -1); // Expired immediately
    const store = manager.getStore();
    expect(store.slots.find(s => s.id === slot.id)).toBeUndefined();
  });
});
