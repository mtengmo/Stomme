import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  PUSH_UP_ELBOW_ANGLE_DEG,
  PUSH_UP_HAND_HALF,
  PUSH_UP_SHOULDER_HALF,
  PushUpHandDiagram,
  pushUpArm,
} from './PushUpHandDiagram';

describe('push-up hand diagram', () => {
  it('places the hands a little wider than the shoulders', () => {
    const { shoulder, hand } = pushUpArm();
    expect(hand[0] - 80).toBe(PUSH_UP_HAND_HALF);
    expect(hand[0] - shoulder[0]).toBeGreaterThan(3);
    expect(hand[0] - shoulder[0]).toBeLessThan(12);
    expect(PUSH_UP_HAND_HALF).toBeGreaterThan(PUSH_UP_SHOULDER_HALF);
  });

  it('points the upper arm 45 degrees back from the trunk with constant arm lengths', () => {
    const { shoulder, elbow, hand } = pushUpArm();
    const angle =
      (Math.atan2(elbow[0] - shoulder[0], elbow[1] - shoulder[1]) * 180) /
      Math.PI;
    expect(angle).toBeCloseTo(PUSH_UP_ELBOW_ANGLE_DEG, 6);
    expect(
      Math.hypot(elbow[0] - shoulder[0], elbow[1] - shoulder[1]),
    ).toBeCloseTo(28, 6);
    expect(Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1])).toBeCloseTo(
      28,
      6,
    );
    // Elbows are behind (further down the page than) the shoulders and hands.
    expect(elbow[1]).toBeGreaterThan(shoulder[1]);
    expect(hand[1]).toBeLessThan(elbow[1]);
  });

  it('renders both arms, both hands and the shoulder line, and stays symmetric', () => {
    const markup = renderToStaticMarkup(<PushUpHandDiagram />);
    expect(markup.match(/data-arm=/g)).toHaveLength(2);
    expect(markup.match(/data-hand=/g)).toHaveLength(2);
    expect(markup).toContain('data-shoulders');
    expect(markup).toContain('något bredare än axlarna');
    expect(markup).toContain('45 grader');
  });
});
