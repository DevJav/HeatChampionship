import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui";

type PlayerChipProps = {
  user: { name: string; image?: string | null; favoriteColor?: { hex: string } | null };
  size?: "sm" | "md";
  className?: string;
};

/** Avatar + name, tinted with the player's favorite car color. */
export function PlayerChip({ user, size = "sm", className }: PlayerChipProps) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2 font-semibold", className)}>
      <Avatar name={user.name} src={user.image} color={user.favoriteColor?.hex} size={size} />
      <span className="truncate">{user.name}</span>
    </span>
  );
}
