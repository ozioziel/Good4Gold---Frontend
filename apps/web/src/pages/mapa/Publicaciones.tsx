import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, CloudOff, CornerDownRight, MessageCircle, QrCode, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Lugar, Publicacion } from '@/data/mapa-lugares';
import { haceCuanto, useMapa } from './estado';
import { Hoja } from '@/components/ui/Hoja';

export function HojaPublicaciones({ lugar, abierta, onCerrar, onQr }: { lugar: Lugar | null; abierta: boolean; onCerrar: () => void; onQr: (p: Publicacion) => void }) {
  const { t } = useTranslation();
  const { publicacionesDe } = useMapa();
  if (!lugar) return null;
  const lista = publicacionesDe(lugar.id);
  return (
    <Hoja abierta={abierta} titulo={lugar.nombre} sub={t('mapa.publicaciones', { count: lista.length })} onCerrar={onCerrar}>
      <ul className="pubs">
        {lista.map((p) => (
          <li key={p.id}>
            <Pub pub={p} onQr={onQr} />
          </li>
        ))}
      </ul>
    </Hoja>
  );
}

function Pub({ pub, onQr }: { pub: Publicacion; onQr: (p: Publicacion) => void }) {
  const { t } = useTranslation();
  const { d, persona } = useMapa();
  const [postura, setPostura] = useState<'coincide' | 'no_coincide' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [verRespuestas, setVerRespuestas] = useState(false);
  const [respuesta, setRespuesta] = useState('');
  const si = pub.respaldos.filter((r) => r.postura === 'coincide').length;
  const no = pub.respaldos.length - si;
  const mio = persona ? pub.respaldos.find((r) => r.persona.nombre === persona.nombre)?.postura : undefined;
  const respaldable = pub.tipo === 'lo_vi' || pub.tipo === 'analisis';

  const enviarPostura = () => {
    if (!persona || !postura) return;
    d({ tipo: 'respaldar', pubId: pub.id, respaldo: { persona, postura, motivo: motivo.trim() || undefined } });
    setPostura(null);
    setMotivo('');
  };

  return (
    <article className={`pub pub--${pub.tipo}${pub.pendiente ? ' pub--pendiente' : ''}`}>
      <header className="pub__cabeza">
        <span className={`pub__avatar rol--${pub.autor.rol}`} aria-hidden="true">
          {pub.autor.nombre.replace(/^Dra?\.\s*/, '').slice(0, 1)}
        </span>
        <p className="pub__autor">
          <strong>{pub.autor.nombre}</strong>
          <span>
            {t(`mapa.roles.${pub.autor.rol}`)} · {haceCuanto(pub.fecha, (k, o) => t(k, o ?? {}))}
          </span>
        </p>
        <span className="pub__tipo">{t(`mapa.tipos.${pub.tipo}`)}</span>
      </header>
      <p className="pub__texto">{pub.texto}</p>
      {(pub.foto || pub.pendiente || pub.demo || pub.viaQr) && (
        <p className="pub__marcas">
          {pub.foto && (
            <span>
              <Camera aria-hidden="true" />
              {t('mapa.foto')}
            </span>
          )}
          {pub.pendiente && (
            <span className="pub__marca--pendiente">
              <CloudOff aria-hidden="true" />
              {t('mapa.pendientes', { count: 1 })}
            </span>
          )}
          {pub.viaQr && <span>QR</span>}
          {pub.demo && <span className="etiqueta-demo">{t('mapa.demo')}</span>}
        </p>
      )}

      <div className="pub__acciones">
        {respaldable && (
          <>
            <button
              type="button"
              className="pub__accion"
              aria-pressed={mio === 'coincide'}
              disabled={!persona}
              onClick={() => setPostura(postura === 'coincide' ? null : 'coincide')}
            >
              <ThumbsUp aria-hidden="true" />
              {t('mapa.coincide')} <span className="num">{si}</span>
            </button>
            <button
              type="button"
              className="pub__accion"
              aria-pressed={mio === 'no_coincide'}
              disabled={!persona}
              onClick={() => setPostura(postura === 'no_coincide' ? null : 'no_coincide')}
            >
              <ThumbsDown aria-hidden="true" />
              {t('mapa.noCoincide')} <span className="num">{no}</span>
            </button>
          </>
        )}
        <button type="button" className="pub__accion" aria-expanded={verRespuestas} onClick={() => setVerRespuestas((v) => !v)}>
          <MessageCircle aria-hidden="true" />
          <span className="num">{pub.respuestas.length}</span>
        </button>
        {pub.pendiente && (
          <button type="button" className="pub__accion" onClick={() => onQr(pub)} aria-label={t('mapa.compartirQr')}>
            <QrCode aria-hidden="true" />
          </button>
        )}
      </div>

      {postura && (
        <form
          className="pub__form"
          onSubmit={(e) => {
            e.preventDefault();
            enviarPostura();
          }}
        >
          <input className="campo-noche" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={t('mapa.porQue')} aria-label={t('mapa.porQue')} maxLength={200} autoFocus />
          <button type="submit" className="boton-redondo boton-redondo--oro" aria-label={t('mapa.enviar')}>
            <Send aria-hidden="true" />
          </button>
        </form>
      )}
      {postura && <p className="pub__nota">{t('mapa.respaldosNota')}</p>}

      {verRespuestas && (
        <div className="pub__respuestas">
          {pub.respaldos.filter((r) => r.motivo).map((r) => (
            <p key={r.persona.nombre} className="pub__respuesta">
              {r.postura === 'coincide' ? <ThumbsUp aria-hidden="true" /> : <ThumbsDown aria-hidden="true" />}
              <span>
                <strong>{r.persona.nombre}</strong> · {t(`mapa.roles.${r.persona.rol}`)} — {r.motivo}
              </span>
            </p>
          ))}
          {pub.respuestas.map((r, i) => (
            <p key={i} className="pub__respuesta">
              <CornerDownRight aria-hidden="true" />
              <span>
                <strong>{r.persona.nombre}</strong> · {t(`mapa.roles.${r.persona.rol}`)} — {r.texto}
              </span>
            </p>
          ))}
          {persona && (
            <form
              className="pub__form"
              onSubmit={(e) => {
                e.preventDefault();
                if (!respuesta.trim()) return;
                d({ tipo: 'responder', pubId: pub.id, persona, texto: respuesta.trim() });
                setRespuesta('');
              }}
            >
              <input className="campo-noche" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} placeholder={t('mapa.respuesta')} aria-label={t('mapa.respuesta')} maxLength={300} />
              <button type="submit" className="boton-redondo boton-redondo--oro" aria-label={t('mapa.responder')} disabled={!respuesta.trim()}>
                <Send aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      )}
    </article>
  );
}
