import Link from "next/link";
import { Users } from "lucide-react";
import type { TabletopPublic } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { Badge, Card } from "@/components/ui";

export function TabletopCard({
  tabletop,
  myRole,
}: {
  tabletop: TabletopPublic;
  myRole: string | undefined;
}) {
  const rulebookLabel =
    RULEBOOKS.find((r) => r.value === tabletop.rulebook)?.label ?? tabletop.rulebook;

  return (
    <Link href={`/tabletops/${tabletop.id}`} className="group block">
      <Card className="flex flex-col gap-2.5 transition group-hover:border-border">
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold">{tabletop.name}</span>
          {myRole && <Badge variant={myRole === "dm" ? "accent" : "neutral"}>{myRole}</Badge>}
        </div>
        <span className="text-sm text-text-muted">{rulebookLabel}</span>
        <span className="flex items-center gap-1.5 font-mono text-xs text-text-faint">
          <Users size={13} />
          {tabletop.members.length} {tabletop.members.length === 1 ? "membro" : "membros"}
        </span>
      </Card>
    </Link>
  );
}
