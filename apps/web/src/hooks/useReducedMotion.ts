import { useEffect, useState } from 'react';

const Q = '(prefers-reduced-motion: reduce)';

/** Movimiento reducido del sistema o forzado con ?reduced=1 para probar. */
export function useReducedMotion() {
  const forzado = typeof location !== 'undefined' && new URLSearchParams(location.search).get('reduced') === '1';
  const [reduce, setReduce] = useState(() => forzado || (typeof window !== 'undefined' && matchMedia(Q).matches));
  useEffect(() => {
    if (forzado) return;
    const mq = matchMedia(Q);
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [forzado]);
  return reduce;
}
