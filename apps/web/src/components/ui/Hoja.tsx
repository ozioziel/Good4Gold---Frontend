import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

/**
 * Hoja: sube desde abajo en el celular y aparece como panel lateral en escritorio.
 * Accesible: diálogo modal, foco atrapado, Escape cierra y el foco vuelve a quien la abrió.
 */
export function Hoja({
  abierta,
  titulo,
  sub,
  onCerrar,
  children,
  pie,
}: {
  abierta: boolean;
  titulo: string;
  sub?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement as HTMLElement | null;
    const focos = () =>
      Array.from(ref.current?.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])') ?? []).filter(
        (el) => !el.hasAttribute('disabled') && el.offsetParent !== null,
      );
    requestAnimationFrame(() => (focos()[1] ?? focos()[0])?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCerrar();
      } else if (e.key === 'Tab') {
        const f = focos();
        if (!f.length) return;
        const i = f.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey && i <= 0) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && i === f.length - 1) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previo?.focus?.({ preventScroll: true });
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;
  // Portal al body: la hoja queda por encima de la barra de pestañas y de cualquier capa del mapa.
  return createPortal(
    <div className="hoja-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div ref={ref} className="hoja vidrio" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <span className="hoja__asa" aria-hidden="true" />
        <header className="hoja__cabeza">
          <div>
            <h2 id={idTitulo}>{titulo}</h2>
            {sub && <p className="hoja__sub">{sub}</p>}
          </div>
          <button type="button" className="boton-redondo" onClick={onCerrar} aria-label={t('mapa.cerrar')}>
            <X aria-hidden="true" />
          </button>
        </header>
        <div className="hoja__cuerpo">{children}</div>
        {pie && <footer className="hoja__pie">{pie}</footer>}
      </div>
    </div>,
    document.body,
  );
}
