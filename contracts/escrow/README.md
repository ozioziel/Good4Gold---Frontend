# Escrow por hitos (Soroban · Stellar testnet)

Contrato propio de Gold2Life para financiar campañas vinculadas a solicitudes de investigación. **Solo testnet**: los fondos no tienen valor real.

## Reglas
- `crear(org, verificador, referencia, hitos)`: solo la administración. La organización no puede ser su propia verificadora. Admite de 1 a 20 hitos con montos positivos. `referencia` es un hash opaco, nunca datos personales.
- `aportar(id, donante, monto)`: firma quien dona. Nunca se acepta más que lo que falta para la meta.
- `aprobar_hito(id, evidencia)`: firma el verificador. Los hitos se aprueban en orden y solo si hay fondos. Libera el monto a la organización y guarda el hash de la evidencia.
- `cancelar(id)`: solo la administración, tras una disputa documentada fuera de la cadena.
- `reembolsar(id, donante)`: cualquiera puede ejecutarlo; el dinero solo va al donante. Devuelve una parte proporcional de lo no liberado, una sola vez por donante.
- Lectura: `campana`, `aporte_de`, `total`, `token`. Cada acción emite su evento.

## Comandos
```bash
cargo test                                   # 6 pruebas con un token Stellar de prueba
stellar contract build                       # requiere stellar-cli 28 (soroban-sdk 28)
stellar keys generate g2-admin --network testnet --fund
stellar contract deploy --wasm target/wasm32v1-none/release/gold2_escrow.wasm \
  --source g2-admin --network testnet --alias gold2-escrow \
  -- --admin $(stellar keys address g2-admin) --token CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
```

## Despliegue actual (testnet, 2026-11-26)
- **Contrato:** `CBJEQGCIA24NJXIOIQPKIDUR4D3O5OPJGJMSNZJH3C3HP4FMQUZBGJCI`
- **Activo:** USDC de prueba de Circle, contrato `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` (emisor `GBBD47IF…LFLA5`, dominio centre.io).
- **Cuentas de prueba** (las claves están solo en `stellar keys` y en `apps/api/.env`):

| Rol | Dirección |
|---|---|
| Administración | `GAJ7JHFHYAXMZQYK53JFEQMDXHHFXJZTLVP5VZVTL533AD7XNDEEQ4E4` |
| Verificador DEMO | `GAUL4KVUD3ILG7RTDP7KHKQGUNXS7ZUMKHSHRIOWICYFCSI5JOYOXG47` |
| Organización DEMO | `GDNDX557Z64N3ENOFSMVN2IJSZB2QPIDEOK7V6UTXCXGMQAT2SGF3PS6` |
| Donante DEMO | `GBZENEERTL66H4DB2U5VMTDFFHX65WA4IHGZTDBIMN3H5LT2RLCUELUK` |

Para donar con la cuenta DEMO hace falta USDC de prueba. Se obtiene en https://faucet.circle.com (red Stellar testnet), enviándolo a la dirección del donante DEMO; la organización y el donante ya tienen la trustline.

## Límites conocidos (demostración)
- El verificador DEMO firma con una clave que custodia el servidor. En producción, la organización verificadora firmaría con su propia billetera y cada campaña tendría su propia dirección de verificador.
- Si el contrato crea la campaña pero falla la base de datos, la campaña queda solo en la cadena. Habría que conciliarla a mano.
- Al reembolsar, el redondeo hacia abajo puede dejar unidades mínimas sin devolver.
