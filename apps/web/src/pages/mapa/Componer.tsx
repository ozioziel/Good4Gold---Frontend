import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Check, Eye, FlaskConical, HelpCircle, Megaphone, Send } from 'lucide-react';
import { idRio, lugarSinDatos, type Lugar, type Publicacion, type Rol, type TipoPublicacion } from '@/data/mapa-lugares';
import { hoy, nuevoId, tiposPermitidos, useMapa } from './estado';
import { Hoja } from '@/components/ui/Hoja';

const ICONO_TIPO = { lo_vi: Eye, pregunta: HelpCircle, analisis: FlaskConical, oficial: Megaphone };

export interface Ubicado {
  lat: number;
  lon: number;
  /** Lugar ya elegido, o el río que estaba bajo la mira. */
  lugar: Lugar | null;
  rio: string | null;
}

/** Escribir la publicación una vez ubicada en el mapa. Pocas palabras, botones grandes. */
export function HojaComponer({ ubicado, onCerrar, onQr }: { ubicado: Ubicado | null; onCerrar: () => void; onQr: (p: Publicacion) => void }) {
  const { t } = useTranslation();
  const { s, d, persona, enLinea, lugares } = useMapa();
  const tipos = tiposPermitidos(s.rol) as readonly TipoPublicacion[];
  const [tipo, setTipo] = useState<TipoPublicacion>('lo_vi');
  const [texto, setTexto] = useState('');
  const [foto, setFoto] = useState(false);
  const actual = tipos.includes(tipo) ? tipo : tipos[0];

  useEffect(() => {
    if (!ubicado) {
      setTexto('');
      setFoto(false);
    }
  }, [ubicado]);

  if (!ubicado) return null;
  const lugar =
    ubicado.lugar ??
    (ubicado.rio
      ? (lugares.find((l) => l.id === idRio(ubicado.rio!)) ?? lugarSinDatos(idRio(ubicado.rio), ubicado.rio, ubicado.lat, ubicado.lon))
      : lugarSinDatos(`punto:${nuevoId()}`, t('mapa.puntoElegido'), ubicado.lat, ubicado.lon, 'punto'));

  const enviar = () => {
    if (!persona || !actual || !texto.trim()) return;
    const pub: Publicacion = {
      id: nuevoId(),
      lugarId: lugar.id,
      tipo: actual,
      autor: persona,
      fecha: hoy(),
      texto: texto.trim(),
      lat: ubicado.lat,
      lon: ubicado.lon,
      foto,
      respaldos: [],
      respuestas: [],
      pendiente: !enLinea,
    };
    d({ tipo: 'publicar', pub, lugar });
    d({ tipo: 'aviso', texto: !enLinea ? t('mapa.guardadoSinConexion') : actual === 'analisis' ? t('mapa.analisisPedido') : t('mapa.publicado') });
    onCerrar();
    if (!enLinea) onQr(pub);
  };

  return (
    <Hoja
      abierta
      titulo={t('mapa.publicar')}
      sub={lugar.nombre}
      onCerrar={onCerrar}
      pie={
        persona ? (
          <button type="button" className="boton-oro boton-oro--ancho" disabled={!texto.trim()} onClick={enviar}>
            <Send aria-hidden="true" />
            {t('mapa.enviar')}
          </button>
        ) : undefined
      }
    >
      {!persona ? (
        <div className="componer__rol">
          <p>{t('mapa.comoParticipar')}</p>
          <div className="chips">
            {(['ciudadano', 'representante', 'investigador', 'autoridad'] as Rol[]).map((r) => (
              <button key={r} type="button" className="chip" onClick={() => d({ tipo: 'rol', rol: r })}>
                {t(`mapa.roles.${r}`)}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="tipos" role="radiogroup" aria-label={t('mapa.publicar')}>
            {tipos.map((tp) => {
              const Icono = ICONO_TIPO[tp];
              return (
                <button key={tp} type="button" role="radio" aria-checked={actual === tp} className="tipo" onClick={() => setTipo(tp)}>
                  <Icono aria-hidden="true" />
                  <span>{t(`mapa.tipos.${tp}`)}</span>
                </button>
              );
            })}
          </div>
          <label className="sr-only" htmlFor="texto-publicacion">
            {t(`mapa.placeholder.${actual}`)}
          </label>
          <textarea
            id="texto-publicacion"
            className="campo-noche campo-noche--area"
            rows={3}
            maxLength={280}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={t(`mapa.placeholder.${actual}`)}
          />
          <div className="componer__fila">
            <label className={'chip chip--foto' + (foto ? ' is-lista' : '')}>
              {foto ? <Check aria-hidden="true" /> : <Camera aria-hidden="true" />}
              {foto ? t('mapa.fotoLista') : t('mapa.foto')}
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setFoto(Boolean(e.target.files?.length))} />
            </label>
            <span className="num componer__cuenta">{texto.length}/280</span>
          </div>
          <p className="componer__nota">{t('mapa.privacidad')}</p>
        </>
      )}
    </Hoja>
  );
}
