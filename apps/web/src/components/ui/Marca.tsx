import { MARCA } from '@/config/marca';

// Logotipo provisional: un lingote con una gota de mercurio detrás y el hilo de río debajo.
// El nombre es configurable (VITE_BRAND_NAME); el «2» se resalta en oro solo si existe.
export function Marca({ compacta = false }: { compacta?: boolean }) {
  const nombre = MARCA.nombre;
  const i = nombre.indexOf('2');
  return (
    <span className="marca">
      <svg className="marca__icono" viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false">
        <circle cx="22.5" cy="10" r="4.2" fill="var(--mercurio)" />
        <path d="M5 21 L9.5 13.5 H22.5 L27 21 Z" fill="var(--oro)" />
        <path d="M9.5 13.5 H22.5 L21.2 11.4 H10.8 Z" fill="var(--oro-claro)" />
        <path d="M3 26.5 C 9 24, 13 28.5, 19 26 S 27 24.5, 29 25.5" fill="none" stroke="var(--rio-claro)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      {!compacta && (
        <span className="marca__nombre">
          {i >= 0 ? (
            <>
              {nombre.slice(0, i)}
              <span className="marca__dos">2</span>
              {nombre.slice(i + 1)}
            </>
          ) : (
            nombre
          )}
        </span>
      )}
    </span>
  );
}
