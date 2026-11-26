import { createHash } from 'node:crypto';
import { Address, contract, Keypair, Networks, rpc, scValToNative, TransactionBuilder, xdr } from '@stellar/stellar-sdk';

/**
 * Acceso al contrato de escrow por hitos (contracts/escrow) en Stellar TESTNET.
 * El contrato es la fuente de verdad del dinero; la API solo confirma lo que la red confirmó.
 */
export interface EstadoCadena {
  meta: bigint;
  aportado: bigint;
  liberado: bigint;
  reembolsado: bigint;
  hitosLiberados: number;
  estado: 'abierta' | 'completada' | 'cancelada';
}

export interface Escrow {
  readonly configurado: boolean;
  readonly contratoId: string;
  direccionVerificador(): string;
  direccionOrgDemo(): string;
  direccionDonanteDemo(): string;
  crear(org: string, verificador: string, referenciaHex: string, hitos: bigint[]): Promise<{ id: number; tx: string }>;
  aportarDemo(id: number, monto: bigint): Promise<{ tx: string }>;
  /** Transacción sin firmar para la billetera del donante (XDR en base64). */
  prepararAporte(id: number, donante: string, monto: bigint): Promise<string>;
  /** Envía una transacción firmada solo si es exactamente el aporte esperado. */
  enviarAporteFirmado(xdrFirmado: string, esperado: { id: number; donante: string; monto: bigint }): Promise<{ tx: string }>;
  aprobarHito(id: number, evidenciaHex: string): Promise<{ tx: string; indice: number }>;
  cancelar(id: number): Promise<{ tx: string }>;
  reembolsar(id: number, donante: string): Promise<{ tx: string; monto: bigint }>;
  estado(id: number): Promise<EstadoCadena>;
}

export const ESCROW = Symbol('ESCROW');

/** USDC en Stellar usa 7 decimales. «12.5» → 125000000n. */
export function aUnidades(monto: string | number): bigint {
  const [ent, dec = ''] = String(monto).split('.');
  if (!/^\d+$/.test(ent!) || !/^\d{0,7}$/.test(dec)) throw new Error('Monto inválido');
  return BigInt(ent!) * 10_000_000n + BigInt(dec.padEnd(7, '0'));
}
export const deUnidades = (u: bigint) => {
  const s = u.toString().padStart(8, '0');
  return `${s.slice(0, -7)}.${s.slice(-7)}`.replace(/\.?0+$/, '') || '0';
};
export const sha256Hex = (texto: string) => createHash('sha256').update(texto).digest('hex');

/** Errores del contrato (Error en contracts/escrow/src/lib.rs) en palabras. */
const ERRORES: Record<number, string> = {
  1: 'La campaña no existe en el contrato.',
  2: 'Hitos inválidos.',
  3: 'La organización no puede ser su propia verificadora.',
  4: 'Monto inválido.',
  5: 'La campaña ya no está abierta.',
  6: 'El aporte supera lo que falta para la meta.',
  7: 'No hay fondos suficientes en el escrow para liberar este hito.',
  8: 'La campaña no está cancelada.',
  9: 'Esa dirección no tiene aportes por reembolsar.',
  // Códigos del contrato del token (Stellar Asset Contract de USDC).
  10: 'La cuenta no tiene saldo suficiente de USDC de prueba.',
  13: 'La cuenta no tiene trustline de USDC.',
};

export class ErrorEscrow extends Error {
  constructor(
    mensaje: string,
    readonly deRed = false,
  ) {
    super(mensaje);
  }
}

/** Traduce un error del SDK: código del contrato, saldo insuficiente o fallo de red. */
export function traducirError(e: unknown): ErrorEscrow {
  const texto = e instanceof Error ? e.message : String(e);
  const codigo = /Error\(Contract, #(\d+)\)/.exec(texto)?.[1];
  if (codigo && ERRORES[Number(codigo)]) return new ErrorEscrow(ERRORES[Number(codigo)]!);
  if (/balance is not sufficient|insufficient|trustline entry is missing|resulting balance is not within the allowed range/i.test(texto))
    return new ErrorEscrow('La cuenta no tiene saldo suficiente de USDC de prueba (o no tiene trustline).');
  if (/fetch|ECONN|ETIMEDOUT|network|socket/i.test(texto)) return new ErrorEscrow('No se pudo contactar la red de Stellar testnet.', true);
  return new ErrorEscrow(`La red rechazó la operación: ${texto.slice(0, 200)}`);
}

interface ConfigStellar {
  rpcUrl: string;
  contratoId: string;
  adminSecret: string;
  verificadorSecret: string;
  orgDemoPublic: string;
  donanteDemoSecret: string;
}

export function leerConfigStellar(env: NodeJS.ProcessEnv = process.env): ConfigStellar | null {
  const c = {
    rpcUrl: env.STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org',
    contratoId: env.ESCROW_CONTRACT_ID ?? '',
    adminSecret: env.STELLAR_ADMIN_SECRET ?? '',
    verificadorSecret: env.STELLAR_VERIFICADOR_SECRET ?? '',
    orgDemoPublic: env.STELLAR_ORG_DEMO_PUBLIC ?? '',
    donanteDemoSecret: env.STELLAR_DONANTE_DEMO_SECRET ?? '',
  };
  if ((env.STELLAR_RED ?? 'testnet') !== 'testnet') throw new Error('Solo se permite STELLAR_RED=testnet.');
  return c.contratoId && c.adminSecret && c.verificadorSecret ? c : null;
}

type Args = Record<string, unknown>;
type Llamable = Record<string, (a: Args) => Promise<contract.AssembledTransaction<unknown>>>;

export class EscrowStellar implements Escrow {
  readonly configurado = true;
  readonly contratoId: string;
  private readonly servidor: rpc.Server;
  private readonly admin: Keypair;
  private readonly verificador: Keypair;
  private readonly donanteDemo: Keypair | null;
  private readonly clientes = new Map<string, Promise<contract.Client>>();

  constructor(private readonly c: ConfigStellar) {
    this.contratoId = c.contratoId;
    this.servidor = new rpc.Server(c.rpcUrl);
    this.admin = Keypair.fromSecret(c.adminSecret);
    this.verificador = Keypair.fromSecret(c.verificadorSecret);
    this.donanteDemo = c.donanteDemoSecret ? Keypair.fromSecret(c.donanteDemoSecret) : null;
  }

  direccionVerificador() {
    return this.verificador.publicKey();
  }
  direccionOrgDemo() {
    return this.c.orgDemoPublic || this.admin.publicKey();
  }
  direccionDonanteDemo() {
    if (!this.donanteDemo) throw new ErrorEscrow('No hay donante DEMO configurado.');
    return this.donanteDemo.publicKey();
  }

  /** Cliente del contrato que firma como `kp` (o sin firma, para preparar y leer). */
  private cliente(publicKey: string, kp?: Keypair): Promise<contract.Client> {
    const clave = publicKey + (kp ? ':firma' : '');
    let c = this.clientes.get(clave);
    if (!c) {
      c = contract.Client.from({
        contractId: this.contratoId,
        networkPassphrase: Networks.TESTNET,
        rpcUrl: this.c.rpcUrl,
        publicKey,
        ...(kp ? contract.basicNodeSigner(kp, Networks.TESTNET) : {}),
      });
      this.clientes.set(clave, c);
      c.catch(() => this.clientes.delete(clave));
    }
    return c;
  }

  private async invocar<T>(kp: Keypair, metodo: string, args: Args): Promise<{ tx: string; resultado: T }> {
    try {
      const cl = (await this.cliente(kp.publicKey(), kp)) as unknown as Llamable;
      const asm = await cl[metodo]!(args);
      const enviado = await asm.signAndSend();
      return { tx: enviado.sendTransactionResponse?.hash ?? '', resultado: enviado.result as T };
    } catch (e) {
      throw traducirError(e);
    }
  }

  async crear(org: string, verificador: string, referenciaHex: string, hitos: bigint[]) {
    const r = await this.invocar<number>(this.admin, 'crear', { org, verificador, referencia: Buffer.from(referenciaHex, 'hex'), hitos });
    return { id: Number(r.resultado), tx: r.tx };
  }

  async aportarDemo(id: number, monto: bigint) {
    const d = this.donanteDemo;
    if (!d) throw new ErrorEscrow('No hay donante DEMO configurado.');
    return { tx: (await this.invocar(d, 'aportar', { id, donante: d.publicKey(), monto })).tx };
  }

  async prepararAporte(id: number, donante: string, monto: bigint) {
    try {
      const cl = (await this.cliente(donante)) as unknown as Llamable;
      const asm = await cl['aportar']!({ id, donante, monto });
      // Si la simulación ya falla (saldo, meta, campaña cerrada), no se entrega nada para firmar.
      if (asm.simulation && rpc.Api.isSimulationError(asm.simulation)) throw new Error(asm.simulation.error);
      return asm.toXDR();
    } catch (e) {
      throw traducirError(e);
    }
  }

  async enviarAporteFirmado(xdrFirmado: string, esperado: { id: number; donante: string; monto: bigint }) {
    let tx;
    try {
      tx = TransactionBuilder.fromXDR(xdrFirmado, Networks.TESTNET);
    } catch {
      throw new ErrorEscrow('La transacción firmada no es válida.');
    }
    // Solo se envía si es exactamente el aporte preparado: este contrato, «aportar», misma campaña, donante y monto.
    const op = 'operations' in tx ? tx.operations[0] : undefined;
    const fn = op?.type === 'invokeHostFunction' ? (op.func as unknown as xdr.HostFunction) : undefined;
    const inv = fn?.type === 'hostFunctionTypeInvokeContract' ? fn.invokeContract : undefined;
    const args: unknown[] = inv?.args.map((a) => scValToNative(a)) ?? [];
    if (
      !inv ||
      Address.fromScAddress(inv.contractAddress).toString() !== this.contratoId ||
      inv.functionName.toString() !== 'aportar' ||
      Number(args[0]) !== esperado.id ||
      args[1] !== esperado.donante ||
      BigInt(args[2] as bigint) !== esperado.monto
    )
      throw new ErrorEscrow('La transacción firmada no corresponde a este aporte.');
    try {
      const enviada = await this.servidor.sendTransaction(tx);
      if (enviada.status === 'ERROR') throw new Error(JSON.stringify(enviada.errorResult ?? enviada));
      const final = await this.servidor.pollTransaction(enviada.hash, { attempts: 30 });
      if (final.status !== 'SUCCESS') throw new Error(`Transacción ${final.status}`);
      return { tx: enviada.hash };
    } catch (e) {
      throw traducirError(e);
    }
  }

  async aprobarHito(id: number, evidenciaHex: string) {
    const r = await this.invocar<number>(this.verificador, 'aprobar_hito', { id, evidencia: Buffer.from(evidenciaHex, 'hex') });
    return { tx: r.tx, indice: Number(r.resultado) };
  }

  async cancelar(id: number) {
    return { tx: (await this.invocar(this.admin, 'cancelar', { id })).tx };
  }

  async reembolsar(id: number, donante: string) {
    // Cualquiera puede ejecutarlo; el dinero solo va al donante. Paga la comisión la administración.
    const r = await this.invocar<bigint>(this.admin, 'reembolsar', { id, donante });
    return { tx: r.tx, monto: BigInt(r.resultado) };
  }

  async estado(id: number): Promise<EstadoCadena> {
    try {
      const cl = (await this.cliente(this.admin.publicKey())) as unknown as Llamable;
      const c = (await cl['campana']!({ id })).result as {
        meta: bigint;
        aportado: bigint;
        liberado: bigint;
        reembolsado: bigint;
        evidencias: unknown[];
        estado: { tag: string };
      };
      return {
        meta: BigInt(c.meta),
        aportado: BigInt(c.aportado),
        liberado: BigInt(c.liberado),
        reembolsado: BigInt(c.reembolsado),
        hitosLiberados: c.evidencias.length,
        estado: c.estado.tag === 'Completada' ? 'completada' : c.estado.tag === 'Cancelada' ? 'cancelada' : 'abierta',
      };
    } catch (e) {
      throw traducirError(e);
    }
  }
}

/** Sin configuración de Stellar: las rutas de campañas responden que el escrow no está disponible. */
export class EscrowNoConfigurado implements Escrow {
  readonly configurado = false;
  readonly contratoId = '';
  private falla(): never {
    throw new ErrorEscrow('El escrow de Stellar testnet no está configurado en este servidor.');
  }
  direccionVerificador = () => this.falla();
  direccionOrgDemo = () => this.falla();
  direccionDonanteDemo = () => this.falla();
  crear = async () => this.falla();
  aportarDemo = async () => this.falla();
  prepararAporte = async () => this.falla();
  enviarAporteFirmado = async () => this.falla();
  aprobarHito = async () => this.falla();
  cancelar = async () => this.falla();
  reembolsar = async () => this.falla();
  estado = async () => this.falla();
}
