import { useEffect } from 'react';
import styles from './StarfieldEvents.module.css';

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function isReducedMotionPreferred() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
}

export function StarfieldEvents() {
  useEffect(() => {
    if (isReducedMotionPreferred()) return;

    const layer = document.createElement('div');
    layer.className = styles.layer;
    document.body.appendChild(layer);

    let disposed = false;
    let timerId: number | undefined;

    const spawnShootingStar = () => {
      if (disposed) return;

      const star = document.createElement('div');
      star.className = styles.shootingStar;

      const leftToRight = Math.random() < 0.55;
      const startX = leftToRight ? randomBetween(-22, 18) : randomBetween(82, 122);
      const startY = randomBetween(-12, 58);

      const deltaX = leftToRight ? randomBetween(95, 175) : -randomBetween(95, 175);
      const deltaY = randomBetween(35, 115);

      const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

      star.style.setProperty('--x0', `${startX}vw`);
      star.style.setProperty('--y0', `${startY}vh`);
      star.style.setProperty('--dx', `${deltaX}vw`);
      star.style.setProperty('--dy', `${deltaY}vh`);
      star.style.setProperty('--angle', `${angle}deg`);
      star.style.setProperty('--len', `${randomBetween(140, 340)}px`);
      star.style.setProperty('--thick', `${randomBetween(1, 2.2)}px`);
      star.style.setProperty('--dur', `${Math.round(randomBetween(650, 1150))}ms`);
      star.style.setProperty('--alpha', `${randomBetween(0.55, 0.95).toFixed(3)}`);

      layer.appendChild(star);

      const cleanup = () => {
        star.removeEventListener('animationend', cleanup);
        star.remove();
      };
      star.addEventListener('animationend', cleanup);
    };

    const maybeSpawnSecondStar = () => {
      if (Math.random() < 0.18) {
        window.setTimeout(spawnShootingStar, Math.round(randomBetween(120, 420)));
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

      const nextInMs = Math.round(randomBetween(2800, 9500));
      timerId = window.setTimeout(onTimer, nextInMs);
    };

    scheduleNext();

    return () => {
      disposed = true;
      if (timerId) window.clearTimeout(timerId);
      layer.remove();
    };
  }, []);

  return null;
}

