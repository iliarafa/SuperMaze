import { describe, it, expect } from 'vitest';
import { detectSwipeDirection, touchToCell } from '../touchInput';
import { Direction } from '../maze';

describe('detectSwipeDirection', () => {
  it('returns E for rightward swipe', () => {
    expect(detectSwipeDirection(0, 0, 50, 5)).toBe(Direction.E);
  });

  it('returns W for leftward swipe', () => {
    expect(detectSwipeDirection(100, 0, 30, 5)).toBe(Direction.W);
  });

  it('returns S for downward swipe', () => {
    expect(detectSwipeDirection(0, 0, 5, 50)).toBe(Direction.S);
  });

  it('returns N for upward swipe', () => {
    expect(detectSwipeDirection(0, 100, 5, 30)).toBe(Direction.N);
  });

  it('returns null for movement below threshold', () => {
    expect(detectSwipeDirection(0, 0, 10, 5)).toBeNull();
  });

  it('returns null for zero movement', () => {
    expect(detectSwipeDirection(50, 50, 50, 50)).toBeNull();
  });
});

describe('touchToCell', () => {
  it('maps touch position to correct cell', () => {
    // cellSize=20, mazeOffsetX=10, mazeOffsetY=10
    // Touch at (30, 50) -> cell (1, 2)
    expect(touchToCell(30, 50, 20, 10, 10, 5, 5)).toEqual([1, 2]);
  });

  it('returns null for touch outside maze bounds', () => {
    expect(touchToCell(5, 5, 20, 10, 10, 5, 5)).toBeNull();
  });

  it('returns null for touch beyond maze right/bottom edge', () => {
    // mazeWidth=5, cellSize=20, offset=10 -> right edge at 10+100=110
    expect(touchToCell(120, 50, 20, 10, 10, 5, 5)).toBeNull();
  });
});
