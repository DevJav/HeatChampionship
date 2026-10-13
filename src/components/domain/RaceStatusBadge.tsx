import type { RaceStatus } from "@/generated/prisma/client";
import { Badge } from "@/components/ui";
import { RACE_STATUS } from "@/lib/races";

export function RaceStatusBadge({ status }: { status: RaceStatus }) {
  const { label, tone } = RACE_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}
