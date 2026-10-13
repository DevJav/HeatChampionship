/**
 * Row highlight for the top three in result and standings tables: a medal-colored
 * edge plus a tint that fades out across the row (background-image, so the table's
 * zebra and hover background colors still apply underneath).
 */
const PODIUM_ROW: Record<1 | 2 | 3, string> = {
  1: "bg-linear-to-r from-gold/45 via-gold/15 to-gold/5 shadow-[inset_6px_0_0_var(--gold)]",
  2: "bg-linear-to-r from-silver/55 via-silver/20 to-silver/5 shadow-[inset_6px_0_0_var(--silver)]",
  3: "bg-linear-to-r from-bronze/45 via-bronze/15 to-bronze/5 shadow-[inset_6px_0_0_var(--bronze)]",
};

export function podiumRowClass(position: number | null | undefined) {
  return position === 1 || position === 2 || position === 3 ? PODIUM_ROW[position] : undefined;
}

/** Small medal-colored chip for a podium finish in a compact cell (e.g. per-round columns). */
const PODIUM_CHIP: Record<1 | 2 | 3, string> = {
  1: "bg-gold text-[#2a1f00]",
  2: "bg-silver text-[#16181b]",
  3: "bg-bronze text-[#1e1206]",
};

export function podiumChipClass(position: number | null | undefined) {
  return position === 1 || position === 2 || position === 3 ? PODIUM_CHIP[position] : undefined;
}
