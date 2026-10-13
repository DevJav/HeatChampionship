/**
 * Seeds catalogs, the first season and the admin account. Safe to re-run:
 * existing rows are left alone (no passwords are reset).
 *
 *   npm run db:seed          catalogs + season + admin
 *   npm run db:seed:demo     …plus demo players (local testing only)
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { createUserWithPassword } from "../src/lib/users";

const DEFAULT_POINTS = [9, 6, 4, 3, 2, 1];

const tracks = [
  { slug: "usa", name: "Estados Unidos", countryCode: "US", expansion: "Juego base" },
  { slug: "italia", name: "Italia", countryCode: "IT", expansion: "Juego base" },
  { slug: "francia", name: "Francia", countryCode: "FR", expansion: "Juego base" },
  { slug: "gran-bretana", name: "Gran Bretaña", countryCode: "GB", expansion: "Juego base" },
];

const carColors = [
  { name: "Rojo", hex: "#d10500" },
  { name: "Azul", hex: "#1d4ed8" },
  { name: "Verde", hex: "#15803d" },
  { name: "Amarillo", hex: "#facc15" },
  { name: "Negro", hex: "#1c1917" },
  { name: "Blanco", hex: "#f5f5f4" },
  { name: "Naranja", hex: "#ea580c" },
  { name: "Morado", hex: "#7e22ce" },
];

// Upgrade cards are added from the admin (names depend on your edition).
const upgrades: { name: string; description?: string; expansion?: string }[] = [];

const demoPlayers = [
  { username: "ana", name: "Ana" },
  { username: "marco", name: "Marco" },
  { username: "lucia", name: "Lucía" },
  { username: "pablo", name: "Pablo" },
  { username: "sara", name: "Sara" },
  { username: "diego", name: "Diego" },
  { username: "elena", name: "Elena" },
];
const DEMO_PASSWORD = "carreras";

async function seedCatalogs() {
  await db.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });

  for (const track of tracks) {
    await db.track.upsert({ where: { slug: track.slug }, update: {}, create: track });
  }
  for (const [sortOrder, color] of carColors.entries()) {
    await db.carColor.upsert({
      where: { name: color.name },
      update: {},
      create: { ...color, sortOrder },
    });
  }
  for (const upgrade of upgrades) {
    await db.upgrade.upsert({ where: { name: upgrade.name }, update: {}, create: upgrade });
  }
  console.log(`✓ ${tracks.length} circuitos, ${carColors.length} colores, ${upgrades.length} mejoras`);
}

async function seedSeason() {
  if ((await db.season.count()) > 0) return;
  await db.season.create({
    data: { name: "Temporada 2026/27", year: 2026, status: "ACTIVE", pointsTable: DEFAULT_POINTS },
  });
  console.log("✓ Temporada 2026/27 creada");
}

async function seedAdmin() {
  const username = process.env.ADMIN_USERNAME?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";
  if (!username || !password) {
    console.warn("! ADMIN_USERNAME / ADMIN_PASSWORD not set — skipping admin account");
    return;
  }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    if (existing.role !== "admin") {
      await db.user.update({ where: { id: existing.id }, data: { role: "admin" } });
    }
    console.log(`✓ Admin "${username}" ya existe`);
    return;
  }
  await createUserWithPassword({ username, name, password, role: "admin" });
  console.log(`✓ Admin "${username}" creado`);
}

async function seedDemoPlayers() {
  for (const player of demoPlayers) {
    const exists = await db.user.findUnique({ where: { username: player.username } });
    if (!exists) await createUserWithPassword({ ...player, password: DEMO_PASSWORD });
  }
  console.log(`✓ ${demoPlayers.length} pilotos de prueba (contraseña: ${DEMO_PASSWORD})`);
}

async function main() {
  await seedCatalogs();
  await seedSeason();
  await seedAdmin();
  if (process.argv.includes("--demo")) await seedDemoPlayers();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
