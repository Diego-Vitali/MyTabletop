import Link from "next/link";
import type { TabletopPublic } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";

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
    <Link
      href={`/tabletops/${tabletop.id}`}
      className="flex flex-col gap-1 rounded border border-neutral-800 p-4 hover:border-neutral-600"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{tabletop.name}</span>
        {myRole && (
          <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs uppercase text-neutral-300">
            {myRole}
          </span>
        )}
      </div>
      <span className="text-sm text-neutral-400">{rulebookLabel}</span>
      <span className="text-xs text-neutral-500">
        {tabletop.members.length}{" "}
        {tabletop.members.length === 1 ? "membro" : "membros"}
      </span>
    </Link>
  );
}
