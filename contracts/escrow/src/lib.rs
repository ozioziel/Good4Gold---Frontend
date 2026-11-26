//! Escrow por hitos de Gold2Life (Soroban, Stellar). Pensado para testnet.
//!
//! Una campaña nace de una solicitud aceptada fuera de la cadena. Aquí solo viven el dinero y las reglas:
//!  · cualquiera aporta el token de la campaña (USDC de prueba) hasta la meta, nunca más;
//!  · el verificador independiente aprueba cada hito en orden, con el hash de su evidencia, y
//!    el contrato libera ese monto a la organización responsable;
//!  · la administración puede cancelar (tras una disputa documentada fuera de la cadena) y entonces
//!    cada donante recupera su parte proporcional de lo que no se liberó;
//!  · la organización no puede ser su propio verificador.
//! En la cadena no hay datos personales: la campaña solo guarda una referencia opaca (hash) y
//! direcciones. La cadena aporta trazabilidad del dinero; no valida la ciencia.
#![no_std]

use soroban_sdk::{contract, contracterror, contractevent, contractimpl, contracttype, panic_with_error, token, Address, BytesN, Env, Vec};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    NoExiste = 1,
    HitosInvalidos = 2,
    MismoVerificador = 3,
    MontoInvalido = 4,
    NoAbierta = 5,
    ExcedeMeta = 6,
    FondosInsuficientes = 7,
    NoCancelada = 8,
    SinAporte = 9,
}

#[contracttype]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Estado {
    Abierta,
    Completada,
    Cancelada,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Campana {
    pub org: Address,
    pub verificador: Address,
    /// Referencia opaca a la campaña en la plataforma (p. ej. sha256 de su id). Nunca datos personales.
    pub referencia: BytesN<32>,
    /// Monto de cada hito, en unidades mínimas del token (USDC: 7 decimales en Stellar).
    pub hitos: Vec<i128>,
    /// Hash de la evidencia de cada hito aprobado, en orden.
    pub evidencias: Vec<BytesN<32>>,
    pub meta: i128,
    pub aportado: i128,
    pub liberado: i128,
    pub reembolsado: i128,
    /// Lo que quedaba sin liberar al cancelar: base de los reembolsos proporcionales.
    pub remanente: i128,
    pub estado: Estado,
}

#[contracttype]
enum Clave {
    Admin,
    Token,
    Siguiente,
    Campana(u32),
    Aporte(u32, Address),
}

#[contractevent]
pub struct CampanaCreada {
    #[topic]
    pub id: u32,
    pub org: Address,
    pub verificador: Address,
    pub meta: i128,
}

#[contractevent]
pub struct Aporte {
    #[topic]
    pub id: u32,
    pub donante: Address,
    pub monto: i128,
}

#[contractevent]
pub struct HitoLiberado {
    #[topic]
    pub id: u32,
    pub indice: u32,
    pub monto: i128,
    pub evidencia: BytesN<32>,
}

#[contractevent]
pub struct CampanaCancelada {
    #[topic]
    pub id: u32,
    pub remanente: i128,
}

#[contractevent]
pub struct Reembolso {
    #[topic]
    pub id: u32,
    pub donante: Address,
    pub monto: i128,
}

// Las campañas viven unos meses: se extiende su vida en cada uso (~30 días hasta ~60).
const UMBRAL_TTL: u32 = 518_400;
const EXTENSION_TTL: u32 = 1_036_800;

#[contract]
pub struct Escrow;

fn leer(env: &Env, id: u32) -> Campana {
    let clave = Clave::Campana(id);
    let c: Campana = env.storage().persistent().get(&clave).unwrap_or_else(|| panic_with_error!(env, Error::NoExiste));
    env.storage().persistent().extend_ttl(&clave, UMBRAL_TTL, EXTENSION_TTL);
    c
}

fn guardar(env: &Env, id: u32, c: &Campana) {
    let clave = Clave::Campana(id);
    env.storage().persistent().set(&clave, c);
    env.storage().persistent().extend_ttl(&clave, UMBRAL_TTL, EXTENSION_TTL);
}

fn admin(env: &Env) -> Address {
    env.storage().instance().get(&Clave::Admin).unwrap()
}

fn token_cliente(env: &Env) -> token::Client<'_> {
    let t: Address = env.storage().instance().get(&Clave::Token).unwrap();
    token::Client::new(env, &t)
}

#[contractimpl]
impl Escrow {
    pub fn __constructor(env: Env, admin: Address, token: Address) {
        env.storage().instance().set(&Clave::Admin, &admin);
        env.storage().instance().set(&Clave::Token, &token);
        env.storage().instance().set(&Clave::Siguiente, &0u32);
    }

    /// Crea una campaña. Solo la administración de la plataforma, después de verificar la organización
    /// y el caso fuera de la cadena.
    pub fn crear(env: Env, org: Address, verificador: Address, referencia: BytesN<32>, hitos: Vec<i128>) -> u32 {
        admin(&env).require_auth();
        if org == verificador {
            panic_with_error!(&env, Error::MismoVerificador);
        }
        if hitos.is_empty() || hitos.len() > 20 {
            panic_with_error!(&env, Error::HitosInvalidos);
        }
        let mut meta: i128 = 0;
        for m in hitos.iter() {
            if m <= 0 {
                panic_with_error!(&env, Error::HitosInvalidos);
            }
            meta = meta.checked_add(m).unwrap_or_else(|| panic_with_error!(&env, Error::HitosInvalidos));
        }
        let id: u32 = env.storage().instance().get(&Clave::Siguiente).unwrap();
        env.storage().instance().set(&Clave::Siguiente, &(id + 1));
        env.storage().instance().extend_ttl(UMBRAL_TTL, EXTENSION_TTL);
        let c = Campana {
            org: org.clone(),
            verificador: verificador.clone(),
            referencia,
            hitos,
            evidencias: Vec::new(&env),
            meta,
            aportado: 0,
            liberado: 0,
            reembolsado: 0,
            remanente: 0,
            estado: Estado::Abierta,
        };
        guardar(&env, id, &c);
        CampanaCreada { id, org, verificador, meta }.publish(&env);
        id
    }

    /// Aporta a una campaña abierta. Nunca se acepta más que lo que falta para la meta.
    pub fn aportar(env: Env, id: u32, donante: Address, monto: i128) {
        donante.require_auth();
        if monto <= 0 {
            panic_with_error!(&env, Error::MontoInvalido);
        }
        let mut c = leer(&env, id);
        if c.estado != Estado::Abierta {
            panic_with_error!(&env, Error::NoAbierta);
        }
        if c.aportado + monto > c.meta {
            panic_with_error!(&env, Error::ExcedeMeta);
        }
        token_cliente(&env).transfer(&donante, &env.current_contract_address(), &monto);
        c.aportado += monto;
        guardar(&env, id, &c);
        let clave = Clave::Aporte(id, donante.clone());
        let previo: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        env.storage().persistent().set(&clave, &(previo + monto));
        env.storage().persistent().extend_ttl(&clave, UMBRAL_TTL, EXTENSION_TTL);
        Aporte { id, donante, monto }.publish(&env);
    }

    /// El verificador aprueba el siguiente hito con el hash de su evidencia; el contrato libera su monto
    /// a la organización. Los hitos van en orden y solo se liberan si hay fondos suficientes.
    pub fn aprobar_hito(env: Env, id: u32, evidencia: BytesN<32>) -> u32 {
        let mut c = leer(&env, id);
        c.verificador.require_auth();
        if c.estado != Estado::Abierta {
            panic_with_error!(&env, Error::NoAbierta);
        }
        let indice = c.evidencias.len();
        let monto = c.hitos.get(indice).unwrap();
        if c.aportado - c.liberado < monto {
            panic_with_error!(&env, Error::FondosInsuficientes);
        }
        token_cliente(&env).transfer(&env.current_contract_address(), &c.org, &monto);
        c.liberado += monto;
        c.evidencias.push_back(evidencia.clone());
        if c.evidencias.len() == c.hitos.len() {
            c.estado = Estado::Completada;
        }
        guardar(&env, id, &c);
        HitoLiberado { id, indice, monto, evidencia }.publish(&env);
        indice
    }

    /// Cancela una campaña abierta (decisión documentada fuera de la cadena). Lo no liberado queda
    /// disponible para reembolso proporcional.
    pub fn cancelar(env: Env, id: u32) {
        admin(&env).require_auth();
        let mut c = leer(&env, id);
        if c.estado != Estado::Abierta {
            panic_with_error!(&env, Error::NoAbierta);
        }
        c.estado = Estado::Cancelada;
        c.remanente = c.aportado - c.liberado;
        guardar(&env, id, &c);
        CampanaCancelada { id, remanente: c.remanente }.publish(&env);
    }

    /// Devuelve al donante su parte proporcional de lo no liberado. Cualquiera puede ejecutarlo: el
    /// dinero solo va al donante. Una sola vez por donante.
    pub fn reembolsar(env: Env, id: u32, donante: Address) -> i128 {
        let mut c = leer(&env, id);
        if c.estado != Estado::Cancelada {
            panic_with_error!(&env, Error::NoCancelada);
        }
        let clave = Clave::Aporte(id, donante.clone());
        let aporte: i128 = env.storage().persistent().get(&clave).unwrap_or(0);
        if aporte <= 0 {
            panic_with_error!(&env, Error::SinAporte);
        }
        // Proporcional y redondeado hacia abajo: nunca se devuelve más de lo que hay.
        let monto = aporte * c.remanente / c.aportado;
        env.storage().persistent().set(&clave, &0i128);
        if monto > 0 {
            token_cliente(&env).transfer(&env.current_contract_address(), &donante, &monto);
        }
        c.reembolsado += monto;
        guardar(&env, id, &c);
        Reembolso { id, donante, monto }.publish(&env);
        monto
    }

    pub fn campana(env: Env, id: u32) -> Campana {
        leer(&env, id)
    }

    pub fn aporte_de(env: Env, id: u32, donante: Address) -> i128 {
        env.storage().persistent().get(&Clave::Aporte(id, donante)).unwrap_or(0)
    }

    pub fn total(env: Env) -> u32 {
        env.storage().instance().get(&Clave::Siguiente).unwrap()
    }

    pub fn token(env: Env) -> Address {
        env.storage().instance().get(&Clave::Token).unwrap()
    }
}

#[cfg(test)]
mod test;
