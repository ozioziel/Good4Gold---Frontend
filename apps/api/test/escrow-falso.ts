// Escrow en memoria con las mismas reglas que contracts/escrow (sus pruebas en Rust cubren el contrato real).
import { randomBytes } from 'node:crypto';
import { type Escrow, ErrorEscrow, type EstadoCadena } from '../src/campanas/escrow';

interface C {
  hitos: bigint[];
  aportado: bigint;
  liberado: bigint;
  reembolsado: bigint;
  remanente: bigint;
  liberados: number;
  estado: EstadoCadena['estado'];
  aportes: Map<string, bigint>;
}

const tx = () => randomBytes(32).toString('hex');
export const DONANTE_DEMO = 'GBZENEERTL66H4DB2U5VMTDFFHX65WA4IHGZTDBIMN3H5LT2RLCUELUK';

export class EscrowFalso implements Escrow {
  readonly configurado = true;
  readonly contratoId = 'CFALSO';
  readonly campanas: C[] = [];
  /** Saldo de USDC de prueba por dirección. */
  readonly saldos = new Map<string, bigint>([[DONANTE_DEMO, 10_000n * 10_000_000n]]);

  direccionVerificador = () => 'GVERIFICADOR';
  direccionOrgDemo = () => 'GORG';
  direccionDonanteDemo = () => DONANTE_DEMO;

  private c(id: number) {
    const c = this.campanas[id];
    if (!c) throw new ErrorEscrow('La campaña no existe en el contrato.');
    return c;
  }

  async crear(_org: string, _ver: string, _ref: string, hitos: bigint[]) {
    this.campanas.push({ hitos, aportado: 0n, liberado: 0n, reembolsado: 0n, remanente: 0n, liberados: 0, estado: 'abierta', aportes: new Map() });
    return { id: this.campanas.length - 1, tx: tx() };
  }
  private aportar(id: number, donante: string, monto: bigint) {
    const c = this.c(id);
    if (c.estado !== 'abierta') throw new ErrorEscrow('La campaña ya no está abierta.');
    const meta = c.hitos.reduce((a, b) => a + b, 0n);
    if (c.aportado + monto > meta) throw new ErrorEscrow('El aporte supera lo que falta para la meta.');
    const saldo = this.saldos.get(donante) ?? 0n;
    if (saldo < monto) throw new ErrorEscrow('La cuenta no tiene saldo suficiente de USDC de prueba.');
    this.saldos.set(donante, saldo - monto);
    c.aportado += monto;
    c.aportes.set(donante, (c.aportes.get(donante) ?? 0n) + monto);
    return { tx: tx() };
  }
  async aportarDemo(id: number, monto: bigint) {
    return this.aportar(id, DONANTE_DEMO, monto);
  }
  readonly preparados = new Map<string, { id: number; donante: string; monto: bigint }>();
  async prepararAporte(id: number, donante: string, monto: bigint) {
    const x = `XDR-${tx()}`;
    this.preparados.set(x, { id, donante, monto });
    return x;
  }
  async enviarAporteFirmado(xdr: string, esperado: { id: number; donante: string; monto: bigint }) {
    const p = this.preparados.get(xdr.replace(/-FIRMADO$/, ''));
    if (!p || !xdr.endsWith('-FIRMADO') || p.id !== esperado.id || p.donante !== esperado.donante || p.monto !== esperado.monto)
      throw new ErrorEscrow('La transacción firmada no corresponde a este aporte.');
    return this.aportar(p.id, p.donante, p.monto);
  }
  async aprobarHito(id: number) {
    const c = this.c(id);
    if (c.estado !== 'abierta') throw new ErrorEscrow('La campaña ya no está abierta.');
    const monto = c.hitos[c.liberados]!;
    if (c.aportado - c.liberado < monto) throw new ErrorEscrow('No hay fondos suficientes en el escrow para liberar este hito.');
    c.liberado += monto;
    const indice = c.liberados++;
    if (c.liberados === c.hitos.length) c.estado = 'completada';
    return { tx: tx(), indice };
  }
  async cancelar(id: number) {
    const c = this.c(id);
    if (c.estado !== 'abierta') throw new ErrorEscrow('La campaña ya no está abierta.');
    c.estado = 'cancelada';
    c.remanente = c.aportado - c.liberado;
    return { tx: tx() };
  }
  async reembolsar(id: number, donante: string) {
    const c = this.c(id);
    if (c.estado !== 'cancelada') throw new ErrorEscrow('La campaña no está cancelada.');
    const a = c.aportes.get(donante) ?? 0n;
    if (a <= 0n) throw new ErrorEscrow('Esa dirección no tiene aportes por reembolsar.');
    const monto = (a * c.remanente) / c.aportado;
    c.aportes.set(donante, 0n);
    c.reembolsado += monto;
    this.saldos.set(donante, (this.saldos.get(donante) ?? 0n) + monto);
    return { tx: tx(), monto };
  }
  async estado(id: number): Promise<EstadoCadena> {
    const c = this.c(id);
    return {
      meta: c.hitos.reduce((a, b) => a + b, 0n),
      aportado: c.aportado,
      liberado: c.liberado,
      reembolsado: c.reembolsado,
      hitosLiberados: c.liberados,
      estado: c.estado,
    };
  }
}
