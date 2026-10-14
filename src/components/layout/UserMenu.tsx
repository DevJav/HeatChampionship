import Link from "next/link";
import { LogIn, LogOut, Shield, UserRound } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar, Button, ButtonLink, Skeleton } from "@/components/ui";
import { getFavoriteColorHex } from "@/lib/data/players";
import { getCurrentUser, isAdmin } from "@/lib/session";
import { cn } from "@/lib/cn";
import { navItemClass } from "./navStyles";

/** Login button, or the current user with admin/logout shortcuts. Reads cookies: render inside <Suspense>. */
export async function UserMenu() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <ButtonLink href="/entrar" size="sm" aria-label="Entrar">
        <LogIn />
        {/* Icon only on very narrow phones so the header fits */}
        <span className="max-[379px]:hidden">Entrar</span>
      </ButtonLink>
    );
  }

  const color = await getFavoriteColorHex(user.id);

  // On phones the admin link and logout live in the mobile menu (MobileUserLinks)
  return (
    <div className="flex items-center gap-1">
      {isAdmin(user) && (
        <ButtonLink
          href="/admin"
          variant="inverse"
          size="icon"
          aria-label="Administración"
          title="Administración"
          className="max-sm:hidden"
        >
          <Shield />
        </ButtonLink>
      )}
      <Link
        href={`/pilotos/${user.username}`}
        title="Mi perfil"
        className="flex items-center gap-2 px-2 text-bar-fg hover:text-bar-fg/80"
      >
        <Avatar name={user.name} src={user.image} color={color} size="sm" />
        <span className="hidden font-display font-bold uppercase italic tracking-wide xl:inline">
          {user.name}
        </span>
      </Link>
      <form action={signOut} className="max-sm:hidden">
        <Button type="submit" variant="inverse" size="icon" aria-label="Salir" title="Salir">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

/** Account actions inside the mobile menu panel. Reads cookies: render inside <Suspense>. */
export async function MobileUserLinks() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex flex-col gap-1">
      <Link href="/perfil" className={navItemClass()}>
        <UserRound /> Mi perfil
      </Link>
      {isAdmin(user) && (
        <Link href="/admin" className={navItemClass()}>
          <Shield /> Administración
        </Link>
      )}
      <form action={signOut}>
        <button type="submit" className={cn(navItemClass(), "w-full")}>
          <LogOut /> Salir
        </button>
      </form>
    </div>
  );
}

export function UserMenuSkeleton() {
  return <Skeleton className="h-8 w-24 bg-white/10" />;
}
