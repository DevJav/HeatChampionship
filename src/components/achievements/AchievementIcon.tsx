import {
  Award,
  CalendarCheck,
  CircleDot,
  Crown,
  Eye,
  Flag,
  Flame,
  Globe,
  Hourglass,
  Medal,
  Repeat,
  Rocket,
  Sparkles,
  RotateCcw,
  Star,
  Target,
  Timer,
  TrendingUp,
  Trophy,
  Waypoints,
  Wind,
  Zap,
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
  "wire-to-wire": Waypoints,
  "last-gasp": Zap,
  "spun-podium": CircleDot,
  "slipstream-king": Wind,
  "driver-of-the-day": Sparkles,
  "perfect-call": Target,
  oracle: Eye,
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
