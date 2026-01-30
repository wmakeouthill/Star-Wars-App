import { useEffect, useRef } from 'react';
import styles from './StarfieldEvents.module.css';

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function isReducedMotionPreferred() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

type ShootingStarProfile = {
  deltaX: number;
  deltaY: number;
  durationMs: number;
  lengthPx: number;
  thicknessPx: number;
  alpha: number;
};

type ShootingStarSpeed = 'fast' | 'medium' | 'slow';
type ShootingStarVerticalDirection = 'down' | 'up';

function pickShootingStarSpeed(): ShootingStarSpeed {
  const r = Math.random();
  // more "cinematic" (slow) by default
  if (r < 0.1) return 'fast';
  if (r < 0.55) return 'medium';
  return 'slow';
}

function pickDurationMs(speed: ShootingStarSpeed) {
  if (speed === 'fast') return Math.round(randomBetween(850, 1500));
  if (speed === 'medium') return Math.round(randomBetween(1500, 2800));
  return Math.round(randomBetween(2600, 6500));
}

function pickAbsDeltaX(speed: ShootingStarSpeed) {
  if (speed === 'fast') return randomBetween(150, 260);
  if (speed === 'medium') return randomBetween(110, 200);
  return randomBetween(80, 160);
}

function pickDeltaY(speed: ShootingStarSpeed) {
  if (speed === 'fast') return randomBetween(55, 150);
  if (speed === 'medium') return randomBetween(40, 125);
  return randomBetween(30, 110);
}

function pickLengthPx(speed: ShootingStarSpeed) {
  // allow occasional big streaks
  if (speed === 'fast') return randomBetween(240, 520);
  if (speed === 'medium') return randomBetween(180, 420);
  return randomBetween(160, 380);
}

function pickThicknessPx(speed: ShootingStarSpeed) {
  if (speed === 'fast') return randomBetween(1.4, 3.2);
  if (speed === 'medium') return randomBetween(1.1, 2.6);
  return randomBetween(1.0, 2.2);
}

function pickAlpha(speed: ShootingStarSpeed) {
  if (speed === 'fast') return randomBetween(0.7, 1);
  if (speed === 'medium') return randomBetween(0.65, 0.95);
  return randomBetween(0.6, 0.92);
}

function pickVerticalDirection(): ShootingStarVerticalDirection {
  // Make it feel more like "space traffic" (both directions).
  return Math.random() < 0.55 ? 'down' : 'up';
}

function pickStartY(direction: ShootingStarVerticalDirection) {
  // Spawn slightly offscreen so the streak "enters" the viewport.
  if (direction === 'down') return randomBetween(-22, 62);
  return randomBetween(48, 122);
}

function pickDeltaYSigned(speed: ShootingStarSpeed, direction: ShootingStarVerticalDirection) {
  const abs = pickDeltaY(speed);
  return direction === 'down' ? abs : -abs;
}

function pickShootingStarProfile(leftToRight: boolean, direction: ShootingStarVerticalDirection): ShootingStarProfile {
  const speed = pickShootingStarSpeed();

  const absDeltaX = pickAbsDeltaX(speed);
  const deltaX = leftToRight ? absDeltaX : -absDeltaX;

  return {
    deltaX,
    deltaY: pickDeltaYSigned(speed, direction),
    durationMs: pickDurationMs(speed),
    lengthPx: pickLengthPx(speed),
    thicknessPx: pickThicknessPx(speed),
    alpha: pickAlpha(speed),
  };
}

export function StarfieldEvents() {
  const layerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isReducedMotionPreferred()) return;

    const layer = layerRef.current;
    if (!layer) return;

    let disposed = false;
    let timerId: number | undefined;

    const spawnShootingStar = () => {
      if (disposed) return;

      const star = document.createElement('div');
      star.className = styles.shootingStar;

      const leftToRight = Math.random() < 0.55;
      const startX = leftToRight ? randomBetween(-22, 18) : randomBetween(82, 122);
      const verticalDirection = pickVerticalDirection();
      const startY = pickStartY(verticalDirection);

      const profile = pickShootingStarProfile(leftToRight, verticalDirection);

      const angle = Math.atan2(profile.deltaY, profile.deltaX) * (180 / Math.PI);

      star.style.setProperty('--x0', `${startX}vw`);
      star.style.setProperty('--y0', `${startY}vh`);
      star.style.setProperty('--dx', `${profile.deltaX}vw`);
      star.style.setProperty('--dy', `${profile.deltaY}vh`);
      star.style.setProperty('--angle', `${angle}deg`);
      star.style.setProperty('--len', `${profile.lengthPx}px`);
      star.style.setProperty('--thick', `${profile.thicknessPx}px`);
      star.style.setProperty('--dur', `${profile.durationMs}ms`);
      star.style.setProperty('--alpha', `${profile.alpha.toFixed(3)}`);

      layer.appendChild(star);

      const cleanup = () => {
        star.removeEventListener('animationend', cleanup);
        star.remove();
      };
      star.addEventListener('animationend', cleanup);
    };

    const maybeSpawnSecondStar = () => {
      if (Math.random() < 0.42) {
        window.setTimeout(spawnShootingStar, Math.round(randomBetween(120, 650)));
      }
      if (Math.random() < 0.18) {
        window.setTimeout(spawnShootingStar, Math.round(randomBetween(220, 980)));
      }
    };

    const onTimer = () => {
      if (disposed) return;

      spawnShootingStar();
      maybeSpawnSecondStar();
      scheduleNext();
    };

    const scheduleNext = () => {
      if (disposed) return;

      // more frequent events overall
      const nextInMs = Math.round(randomBetween(1200, 4200));
      timerId = window.setTimeout(onTimer, nextInMs);
    };

    scheduleNext();

    return () => {
      disposed = true;
      if (timerId) window.clearTimeout(timerId);
      layer.replaceChildren();
    };
  }, []);

  return <div ref={layerRef} className={styles.layer} aria-hidden="true" />;
}

