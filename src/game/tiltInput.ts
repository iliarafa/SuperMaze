import { useCallback, useEffect, useRef, useState } from 'react';
import { Direction } from './maze';

const CALIBRATE_TILT_EVENT = 'calibrate-tilt';

export function triggerCalibrateTilt() {
  window.dispatchEvent(new CustomEvent(CALIBRATE_TILT_EVENT));
}

const DEADZONE_DEG = 8;
const MIN_ANGLE_DEG = 10;
const MAX_ANGLE_DEG = 50;
const SLOWEST_INTERVAL_MS = 400;
const FASTEST_INTERVAL_MS = 150;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function angleToInterval(angleDeg: number): number {
  const t = clamp(
    (angleDeg - MIN_ANGLE_DEG) / (MAX_ANGLE_DEG - MIN_ANGLE_DEG),
    0,
    1,
  );
  return SLOWEST_INTERVAL_MS - t * (SLOWEST_INTERVAL_MS - FASTEST_INTERVAL_MS);
}

export async function requestTiltPermission(): Promise<'granted' | 'denied'> {
  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as any).requestPermission === 'function'
  ) {
    try {
      const result = await (DeviceOrientationEvent as any).requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  return 'granted';
}

export function useTiltMovement(
  enabled: boolean,
  onDirection: (dir: number) => void,
): { active: boolean; calibrate: () => void } {
  const [active, setActive] = useState(false);
  const onDirectionRef = useRef(onDirection);
  onDirectionRef.current = onDirection;

  const dirRef = useRef<number | null>(null);
  const intervalMsRef = useRef(SLOWEST_INTERVAL_MS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const betaBaselineRef = useRef<number | null>(null);
  const gammaBaselineRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setActive(false);
      betaBaselineRef.current = null;
      gammaBaselineRef.current = null;
      dirRef.current = null;
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    function startTimer(interval: number) {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      // Fire immediately on direction change
      if (dirRef.current !== null) {
        onDirectionRef.current(dirRef.current);
      }
      timerRef.current = setInterval(() => {
        if (dirRef.current !== null) {
          onDirectionRef.current(dirRef.current);
        }
      }, interval);
      intervalMsRef.current = interval;
    }

    function stopTimer() {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      dirRef.current = null;
    }

    function handleOrientation(e: DeviceOrientationEvent) {
      const beta = e.beta;
      const gamma = e.gamma;
      if (beta === null || gamma === null) return;

      setActive(true);

      // Calibrate baseline on first reading
      if (betaBaselineRef.current === null) {
        betaBaselineRef.current = beta;
        gammaBaselineRef.current = gamma;
      }

      const adjustedBeta = beta - betaBaselineRef.current!;
      const adjustedGamma = gamma - gammaBaselineRef.current!;
      const absBeta = Math.abs(adjustedBeta);
      const absGamma = Math.abs(adjustedGamma);

      // Deadzone — stop movement
      if (absBeta < DEADZONE_DEG && absGamma < DEADZONE_DEG) {
        stopTimer();
        return;
      }

      // Dominant axis (prevents diagonal)
      let newDir: number;
      let angle: number;

      if (absGamma >= absBeta) {
        newDir = adjustedGamma > 0 ? Direction.E : Direction.W;
        angle = absGamma;
      } else {
        newDir = adjustedBeta > 0 ? Direction.S : Direction.N;
        angle = absBeta;
      }

      const newInterval = angleToInterval(angle);
      const dirChanged = newDir !== dirRef.current;
      const intervalShifted =
        Math.abs(newInterval - intervalMsRef.current) > 20;

      dirRef.current = newDir;

      if (dirChanged || intervalShifted || timerRef.current === null) {
        startTimer(newInterval);
      }
    }

    function handleCalibrate() {
      betaBaselineRef.current = null;
      gammaBaselineRef.current = null;
    }

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener(CALIBRATE_TILT_EVENT, handleCalibrate);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener(CALIBRATE_TILT_EVENT, handleCalibrate);
      stopTimer();
      betaBaselineRef.current = null;
      gammaBaselineRef.current = null;
    };
  }, [enabled]);

  const calibrate = useCallback(() => {
    betaBaselineRef.current = null;
    gammaBaselineRef.current = null;
  }, []);

  return { active, calibrate };
}
