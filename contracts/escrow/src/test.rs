extern crate std;

use super::*;
use soroban_sdk::{testutils::Address as _, token::StellarAssetClient, vec, BytesN, Env};

/// Los errores del contrato llegan al cliente de prueba como errores de contrato del host.
fn err(e: Error) -> soroban_sdk::Error {
    soroban_sdk::Error::from_contract_error(e as u32)
}

struct Escena<'a> {
    env: Env,
    escrow: EscrowClient<'a>,
    token: token::Client<'a>,
    org: Address,
    verificador: Address,
}

fn escena<'a>() -> Escena<'a> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let emisor = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(emisor);
    let id = env.register(Escrow, (&admin, &sac.address()));
    Escena {
        escrow: EscrowClient::new(&env, &id),
        token: token::Client::new(&env, &sac.address()),
        org: Address::generate(&env),
        verificador: Address::generate(&env),
        env,
    }
}

fn donante(e: &Escena, saldo: i128) -> Address {
    let d = Address::generate(&e.env);
    StellarAssetClient::new(&e.env, &e.token.address).mint(&d, &saldo);
    d
}

fn hash(e: &Escena, n: u8) -> BytesN<32> {
    BytesN::from_array(&e.env, &[n; 32])
}

#[test]
fn flujo_completo_libera_por_hitos() {
    let e = escena();
    let id = e.escrow.crear(&e.org, &e.verificador, &hash(&e, 9), &vec![&e.env, 600, 1200, 200]);
    let a = donante(&e, 1500);
    let b = donante(&e, 1000);
    e.escrow.aportar(&id, &a, &1500);
    e.escrow.aportar(&id, &b, &300);
    assert_eq!(e.token.balance(&e.escrow.address), 1800);

    assert_eq!(e.escrow.aprobar_hito(&id, &hash(&e, 1)), 0);
    assert_eq!(e.token.balance(&e.org), 600);
    e.escrow.aprobar_hito(&id, &hash(&e, 2));
    assert_eq!(e.token.balance(&e.org), 1800);

    // Falta dinero para el último hito: no se libera.
    assert_eq!(e.escrow.try_aprobar_hito(&id, &hash(&e, 3)), Err(Ok(err(Error::FondosInsuficientes))));
    e.escrow.aportar(&id, &b, &200);
    e.escrow.aprobar_hito(&id, &hash(&e, 3));
    let c = e.escrow.campana(&id);
    assert_eq!(c.estado, Estado::Completada);
    assert_eq!(c.liberado, 2000);
    assert_eq!(c.evidencias.len(), 3);
    assert_eq!(e.token.balance(&e.escrow.address), 0);
}

#[test]
fn no_acepta_mas_que_la_meta_ni_montos_invalidos() {
    let e = escena();
    let id = e.escrow.crear(&e.org, &e.verificador, &hash(&e, 9), &vec![&e.env, 100]);
    let a = donante(&e, 500);
    assert_eq!(e.escrow.try_aportar(&id, &a, &101), Err(Ok(err(Error::ExcedeMeta))));
    assert_eq!(e.escrow.try_aportar(&id, &a, &0), Err(Ok(err(Error::MontoInvalido))));
    e.escrow.aportar(&id, &a, &100);
    assert_eq!(e.escrow.try_aportar(&id, &a, &1), Err(Ok(err(Error::ExcedeMeta))));
}

#[test]
fn la_organizacion_no_se_verifica_a_si_misma_y_los_hitos_son_validos() {
    let e = escena();
    assert_eq!(e.escrow.try_crear(&e.org, &e.org, &hash(&e, 9), &vec![&e.env, 100]), Err(Ok(err(Error::MismoVerificador))));
    assert_eq!(e.escrow.try_crear(&e.org, &e.verificador, &hash(&e, 9), &vec![&e.env]), Err(Ok(err(Error::HitosInvalidos))));
    assert_eq!(e.escrow.try_crear(&e.org, &e.verificador, &hash(&e, 9), &vec![&e.env, 100, -5]), Err(Ok(err(Error::HitosInvalidos))));
}

#[test]
fn cancelar_reembolsa_lo_no_liberado_en_proporcion() {
    let e = escena();
    let id = e.escrow.crear(&e.org, &e.verificador, &hash(&e, 9), &vec![&e.env, 400, 600]);
    let a = donante(&e, 750);
    let b = donante(&e, 250);
    e.escrow.aportar(&id, &a, &750);
    e.escrow.aportar(&id, &b, &250);
    e.escrow.aprobar_hito(&id, &hash(&e, 1)); // 400 a la organización

    assert_eq!(e.escrow.try_reembolsar(&id, &a), Err(Ok(err(Error::NoCancelada))));
    e.escrow.cancelar(&id);
    assert_eq!(e.escrow.try_aprobar_hito(&id, &hash(&e, 2)), Err(Ok(err(Error::NoAbierta))));
    assert_eq!(e.escrow.try_aportar(&id, &a, &1), Err(Ok(err(Error::NoAbierta))));

    // Quedan 600: a recupera 75 % y b 25 %.
    assert_eq!(e.escrow.reembolsar(&id, &a), 450);
    assert_eq!(e.escrow.reembolsar(&id, &b), 150);
    assert_eq!(e.token.balance(&a), 450);
    assert_eq!(e.token.balance(&b), 150);
    // Una sola vez.
    assert_eq!(e.escrow.try_reembolsar(&id, &a), Err(Ok(err(Error::SinAporte))));
    assert_eq!(e.escrow.campana(&id).reembolsado, 600);
}

#[test]
fn solo_el_verificador_aprueba_hitos() {
    let e = escena();
    let id = e.escrow.crear(&e.org, &e.verificador, &hash(&e, 9), &vec![&e.env, 100]);
    let a = donante(&e, 100);
    e.escrow.aportar(&id, &a, &100);
    e.escrow.aprobar_hito(&id, &hash(&e, 1));
    let auths = e.env.auths();
    assert_eq!(auths.len(), 1);
    assert_eq!(auths[0].0, e.verificador);
}

#[test]
fn campana_inexistente() {
    let e = escena();
    assert_eq!(e.escrow.try_campana(&7), Err(Ok(err(Error::NoExiste))));
}
