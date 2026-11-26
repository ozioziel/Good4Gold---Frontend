/**
 * Donación con la billetera Freighter en Stellar TESTNET. La API prepara la transacción exacta del aporte,
 * Freighter la firma (la clave nunca sale de la billetera) y la API la envía y la confirma con la red.
 * La biblioteca de Freighter se carga solo cuando alguien elige donar con billetera.
 */
import { api } from '@/lib/api';

const RED_TESTNET = 'Test SDF Network ; September 2015';

export type PasoBilletera = 'conectando' | 'preparando' | 'firmando' | 'enviando';

export class ErrorBilletera extends Error {}

export async function donarConFreighter(campanaId: string, monto: string, alPaso: (p: PasoBilletera) => void): Promise<{ tx: string; direccion: string }> {
  alPaso('conectando');
  const f = await import('@stellar/freighter-api');
  const conectada = await f.isConnected();
  if (!conectada.isConnected) throw new ErrorBilletera('sinFreighter');
  const acceso = await f.requestAccess();
  if (acceso.error || !acceso.address) throw new ErrorBilletera('accesoDenegado');
  const red = await f.getNetwork();
  if (red.networkPassphrase !== RED_TESTNET) throw new ErrorBilletera('redIncorrecta');

  alPaso('preparando');
  const { donacionId, xdr } = await api.prepararDonacion(campanaId, acceso.address, monto);

  alPaso('firmando');
  const firmada = await f.signTransaction(xdr, { networkPassphrase: RED_TESTNET, address: acceso.address });
  if (firmada.error || !firmada.signedTxXdr) throw new ErrorBilletera('firmaRechazada');

  alPaso('enviando');
  const r = await api.enviarDonacion(donacionId, firmada.signedTxXdr);
  return { tx: r.tx, direccion: acceso.address };
}
