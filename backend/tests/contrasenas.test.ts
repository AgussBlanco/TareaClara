import { describe, expect, it } from "vitest";
import { hashearContrasena, verificarContrasena } from "../src/servicios/contrasenas";

describe("contraseñas (scrypt)", () => {
  it("RN-03: el hash no contiene la contraseña y usa scrypt", async () => {
    const hash = await hashearContrasena("mi-contraseña-secreta");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("mi-contraseña-secreta");
  });

  it("RN-03: la misma contraseña da hashes distintos (cada uno tiene su sal)", async () => {
    expect(await hashearContrasena("igual-igual")).not.toBe(await hashearContrasena("igual-igual"));
  });

  it("RN-04: acepta la contraseña correcta y rechaza una incorrecta", async () => {
    const hash = await hashearContrasena("correcta-123");
    expect(await verificarContrasena("correcta-123", hash)).toBe(true);
    expect(await verificarContrasena("correcta-124", hash)).toBe(false);
    expect(await verificarContrasena("", hash)).toBe(false);
  });

  it("RN-03: un hash guardado con formato roto se rechaza sin lanzar error", async () => {
    for (const roto of ["", "!", "scrypt$1$2", "bcrypt$a$b$c$d$e", "scrypt$16384$8$1$$"]) {
      expect(await verificarContrasena("x", roto)).toBe(false);
    }
  });

  it("RN-03: un hash con un costo desmedido se rechaza al instante, sin intentar calcularlo", async () => {
    const inicio = Date.now();
    expect(await verificarContrasena("x", "scrypt$1073741824$8$1$AAAA$AAAA")).toBe(false);
    expect(Date.now() - inicio).toBeLessThan(500);
  });
});
