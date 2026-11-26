import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';

// Marcador honesto para las pestañas que aún no se construyen (no es una pantalla vacía disfrazada).
export function EnConstruccion({ titulo }: { titulo: string }) {
  const { t } = useTranslation();
  return (
    <section className="en-construccion">
      <p className="overline">{titulo}</p>
      <h1>{t('comun.enConstruccion')}</h1>
      <p>{t('comun.enConstruccionTexto')}</p>
      <Link to="/" className="btn">
        <ArrowLeft aria-hidden="true" />
        {t('comun.volverInicio')}
      </Link>
    </section>
  );
}
