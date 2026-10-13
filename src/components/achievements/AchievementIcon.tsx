import {
  Award,
  CalendarCheck,
  Crown,
  Flag,
  Flame,
  Globe,
  Hourglass,
  Medal,
  Repeat,
  Rocket,
  RotateCcw,
  Star,
  Timer,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { AchievementId } from "@/lib/achievements";

const ICONS: Record<AchievementId, LucideIcon> = {
  champion: Trophy,
  "runner-up": Medal,
  third: Medal,
  "first-race": Flag,
  "first-podium": Award,
  "first-win": Star,
  "from-the-back": Rocket,
  comeback: TrendingUp,
  "pole-to-win": Timer,
  "hat-trick": Flame,
  "podium-streak": Repeat,
  globetrotter: Globe,
  ironman: CalendarCheck,
  veteran: Hourglass,
  legend: Crown,
  spin: RotateCcw,
};

export function AchievementIcon({ id, className }: { id: AchievementId; className?: string }) {
  const Icon = ICONS[id];
  return <Icon aria-hidden className={className} />;
}
