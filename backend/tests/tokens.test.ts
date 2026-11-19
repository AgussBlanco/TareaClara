import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { crearToken, verificarToken } from "../src/servicios/tokens";

const SECRETO = "secreto-solo-para-tests-0123456789abcdef";
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("tokens JWT", () => {
  it("RN-04: un token recién creado devuelve el id del usuario", () => {
    expect(verificarToken(crearToken(ID, SECRETO), SECRETO)).toBe(ID);
  });

  it("RN-04: el token vence a los 7 días", () => {
    const { exp, iat } = jwt.decode(crearToken(ID, SECRETO)) as { exp: number; iat: number };
    expect(exp - iat).toBe(7 * 24 * 60 * 60);
  });

  it("RN-05: un token vencido no sirve", () => {
    const vencido = jwt.sign({}, SECRETO, { subject: ID, expiresIn: -10 });
    expect(verificarToken(vencido, SECRETO)).toBeNull();
  });

  it("RN-05: un token firmado con otra clave no sirve", () => {
    expect(verificarToken(crearToken(ID, "otra-clave-completamente-distinta-0123456789"), SECRETO)).toBeNull();
  });

  it("RN-05: un token sin firma (algoritmo none) o con basura no sirve", () => {
    const sinFirma = `${Buffer.from('{"alg":"none","typ":"JWT"}').toString("base64url")}.${Buffer.from(`{"sub":"${ID}"}`).toString("base64url")}.`;
    expect(verificarToken(sinFirma, SECRETO)).toBeNull();
    expect(verificarToken("esto-no-es-un-token", SECRETO)).toBeNull();
    expect(verificarToken("", SECRETO)).toBeNull();
  });
});
