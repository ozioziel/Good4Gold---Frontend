import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { idRio, lugarSinDatos, type Publicacion } from '@/data/mapa-lugares';
import { codificar, decodificar, type ReporteQR } from '@/lib/qrReporte';
import { useMapa } from './estado';
import { Hoja } from '@/components/ui/Hoja';

const QR_OSCURO = '#151714';
const QR_CLARO = '#f3f0e4';

/** Compartir una publicación por QR: el reporte viaja dentro del código, sin internet. */
export function HojaQr({ pub, onCerrar }: { pub: Publicacion | null; onCerrar: () => void }) {
  const { t } = useTranslation();
  const [svg, setSvg] = useState('');
  useEffect(() => {
    if (!pub) return;
    let vivo = true;
    const codigo = codificar({
      id: pub.id,
      t: pub.tipo === 'lo_vi' ? 'obs' : pub.tipo === 'analisis' ? 'sol' : 'con',
      c: pub.lugarId.replace(/[^a-z0-9-]/g, '-').slice(0, 80),
      d: pub.fecha,
      x: pub.texto,
      a: pub.autor.nombre.slice(0, 60),
    });
    // La librería de QR se descarga solo al compartir.
    // Colores fijos en ambos temas (--qr-oscuro / --qr-claro): un QR invertido no lo leen muchos escáneres.
    import('qrcode').then((QR) =>
      QR.toString(codigo, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: QR_OSCURO, light: QR_CLARO } }).then((s) => vivo && setSvg(s)),
    );
    return () => {
      vivo = false;
    };
  }, [pub]);
  return (
    <Hoja abierta={pub !== null} titulo={t('mapa.qrTitulo')} sub={t('mapa.qrTexto')} onCerrar={onCerrar}>
      <div className="qr" role="img" aria-label={t('mapa.compartirQr')} dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="qr__nota">
        <ShieldCheck aria-hidden="true" />
        {t('mapa.qrNota')}
      </p>
    </Hoja>
  );
}

type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };

/** Importar por QR: revisar y guardar. Mismo UUID = no se duplica. */
export function HojaEscanear({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const { t } = useTranslation();
  const { s, d, persona, lugares } = useMapa();
  const video = useRef<HTMLVideoElement>(null);
  const [camara, setCamara] = useState<boolean | null>(null);
  const [pegado, setPegado] = useState('');
  const [leido, setLeido] = useState<ReporteQR | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!abierta) {
      setLeido(null);
      setPegado('');
      setError(false);
      return;
    }
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!BD || !navigator.mediaDevices?.getUserMedia) {
      setCamara(false);
      return;
    }
    setCamara(true);
    let flujo: MediaStream | null = null;
    let timer = 0;
    const detector = new BD({ formats: ['qr_code'] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((m) => {
        flujo = m;
        if (!video.current) return;
        video.current.srcObject = m;
        void video.current.play();
        const leer = async () => {
          try {
            const v = (await detector.detect(video.current!))[0]?.rawValue;
            if (v) {
              const r = decodificar(v);
              if (r) return setLeido(r);
              setError(true);
            }
          } catch {
            /* cuadro sin código */
          }
          timer = window.setTimeout(leer, 280);
        };
        void leer();
      })
      .catch(() => setCamara(false));
    return () => {
      clearTimeout(timer);
      flujo?.getTracks().forEach((tr) => tr.stop());
    };
  }, [abierta]);

  const importar = () => {
    if (!leido || !persona) return;
    if (s.publicaciones.some((p) => p.id === leido.id)) {
      d({ tipo: 'aviso', texto: t('mapa.yaImportado') });
      return onCerrar();
    }
    const lugar = lugares.find((l) => l.id.replace(/[^a-z0-9-]/g, '-') === leido.c) ?? lugarSinDatos(idRio(leido.c), leido.c, -15, -67.5);
    d({
      tipo: 'importar',
      lugar,
      pub: {
        id: leido.id,
        lugarId: lugar.id,
        tipo: leido.t === 'obs' ? 'lo_vi' : leido.t === 'sol' ? 'analisis' : 'pregunta',
        autor: { nombre: leido.a ?? '—', rol: 'ciudadano' },
        fecha: leido.d,
        texto: leido.x,
        lat: lugar.lat,
        lon: lugar.lon,
        respaldos: [],
        respuestas: [],
        pendiente: true,
        viaQr: true,
      },
    });
    d({ tipo: 'aviso', texto: t('mapa.importado') });
    onCerrar();
  };

  return (
    <Hoja
      abierta={abierta}
      titulo={t('mapa.escanearQr')}
      onCerrar={onCerrar}
      pie={
        leido ? (
          <button type="button" className="boton-oro boton-oro--ancho" onClick={importar} disabled={!persona}>
            {t('mapa.importar')}
          </button>
        ) : undefined
      }
    >
      {leido ? (
        <div className="importar">
          <blockquote>{leido.x}</blockquote>
          <p className="componer__nota">
            {leido.a ?? '—'} · {leido.d}
          </p>
          <p className="qr__nota">
            <ShieldCheck aria-hidden="true" />
            {t('mapa.importarNota')}
          </p>
          {!persona && <p className="componer__nota">{t('mapa.comoParticipar')}</p>}
        </div>
      ) : (
        <>
          {camara && (
            <div className="escaner">
              <video ref={video} playsInline muted />
              <span className="escaner__marco" aria-hidden="true" />
            </div>
          )}
          {camara && <p className="componer__nota">{t('mapa.escanerTexto')}</p>}
          {camara === false && (
            <form
              className="escaner__pegar"
              onSubmit={(e) => {
                e.preventDefault();
                const r = decodificar(pegado);
                setError(!r);
                if (r) setLeido(r);
              }}
            >
              <label className="componer__nota" htmlFor="qr-pegado">
                {t('mapa.escanerSinCamara')}
              </label>
              <textarea id="qr-pegado" className="campo-noche campo-noche--area" rows={3} value={pegado} onChange={(e) => setPegado(e.target.value)} placeholder="G2R1:…" />
              <button type="submit" className="boton-linea" disabled={!pegado.trim()}>
                {t('mapa.leer')}
              </button>
            </form>
          )}
          {error && (
            <p className="qr__error" role="alert">
              {t('mapa.qrInvalido')}
            </p>
          )}
        </>
      )}
    </Hoja>
  );
}
