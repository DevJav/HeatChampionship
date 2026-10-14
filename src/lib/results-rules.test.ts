import { describe, expect, it } from "vitest";
import { validateResults, type ResultRow } from "./results-rules";

const row = (userId: string, position: number, extra: Partial<ResultRow> = {}): ResultRow => ({
  userId,
  position,
  spins: 0,
  startPosition: null,
  carColorId: null,
  upgradeIds: [],
  notes: null,
  ...extra,
});

describe("validateResults", () => {
  it("accepts a complete, consistent sheet", () => {
    const result = validateResults([
      row("a", 1, { startPosition: 3, carColorId: "red" }),
      row("b", 2, { startPosition: 1, carColorId: "blue" }),
      row("c", 3, { startPosition: 2 }),
    ]);
    expect(result).toEqual({ error: undefined, rowErrors: {} });
  });

  it("accepts spin-outs", () => {
    expect(validateResults([row("a", 1, { spins: 2 }), row("b", 2, { spins: 1 })]).error).toBeUndefined();
  });

  it("flags a negative spin count", () => {
    expect(validateResults([row("a", 1, { spins: -1 })]).rowErrors.a?.spins).toBe("Trompos no válidos.");
  });

  it("flags repeated positions", () => {
    const result = validateResults([row("a", 1), row("b", 1)]);
    expect(result.rowErrors.a?.position).toBe("Posición repetida.");
    expect(result.rowErrors.b?.position).toBe("Posición repetida.");
    expect(result.error).toBe("Revisa los campos marcados.");
  });

  it("flags positions past the size of the field", () => {
    const result = validateResults([row("a", 1), row("b", 3)]);
    expect(result.rowErrors.b?.position).toBe("Posición no válida.");
    expect(result.error).toBe("Revisa los campos marcados.");
  });

  it("flags out-of-range and repeated starting positions", () => {
    const result = validateResults([
      row("a", 1, { startPosition: 1 }),
      row("b", 2, { startPosition: 1 }),
      row("c", 3, { startPosition: 9 }),
    ]);
    expect(result.rowErrors.a?.startPosition).toBe("Salida repetida.");
    expect(result.rowErrors.c?.startPosition).toBe("Posición de salida no válida.");
  });

  it("flags two cars with the same color", () => {
    const result = validateResults([row("a", 1, { carColorId: "red" }), row("b", 2, { carColorId: "red" })]);
    expect(result.rowErrors.b?.carColorId).toBe("Color repetido.");
  });

  it("rejects an empty sheet", () => {
    expect(validateResults([]).error).toBeDefined();
  });
});
