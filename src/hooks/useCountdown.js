import { useEffect, useMemo, useState } from 'react';

function computeSecondsLeft(targetMillis) {
  if (!targetMillis) return null;
  const now = Date.now();
  const diff = Math.max(0, Math.floor((targetMillis - now) / 1000));
  return diff;
}

export default function useCountdown(timerEndsAt) {
  const targetMillis = useMemo(() => {
    if (!timerEndsAt) return null;
    if (typeof timerEndsAt === 'number') return timerEndsAt;
    if (timerEndsAt?.seconds) return timerEndsAt.seconds * 1000 + (timerEndsAt.nanoseconds || 0) / 1e6;
    return null;
  }, [timerEndsAt]);

  const [secondsLeft, setSecondsLeft] = useState(() => computeSecondsLeft(targetMillis));

  useEffect(() => {
    if (!targetMillis) {
      setSecondsLeft(null);
      return () => {};
    }

    setSecondsLeft(computeSecondsLeft(targetMillis));
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = computeSecondsLeft(targetMillis);
        if (next === 0) {
          clearInterval(interval);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetMillis]);

  const formatted = useMemo(() => {
    if (secondsLeft == null) return '--:--';
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [secondsLeft]);

  return { secondsLeft, formatted };
}
