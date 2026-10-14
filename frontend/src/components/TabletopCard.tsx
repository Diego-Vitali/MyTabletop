import Link from "next/link";
import { Plus } from "lucide-react";
import { API_URL } from "@/lib/api";
import type { TabletopPublic } from "@/lib/types";
import { RULEBOOKS } from "@/lib/types";
import { Avatar } from "@/components/ui";
import { MapThumb } from "@/components/Mockups";

/** Card de mesa no formato dos cards da Apple Store: rótulo pequeno,
 * título grande, texto de apoio e a "foto do produto" (a cena ao vivo da
 * mesa, ou um mapa ilustrado quando ainda não há cena). */
export function TabletopCard({
  tabletop,
  myRole,
}: {
  tabletop: TabletopPublic;
  myRole: string | undefined;
}) {
  const rulebookLabel =
    RULEBOOKS.find((r) => r.value === tabletop.rulebook)?.label ?? tabletop.rulebook;
  const count = tabletop.members.length;

  return (
    <Link
      href={`/tabletops/${tabletop.id}`}
      className="group flex h-[460px] flex-col overflow-hidden rounded-md bg-surface shadow-card transition duration-300 ease-out hover:scale-[1.01] hover:shadow-card-hover md:h-[500px]"
    >
      <div className="flex flex-col gap-1.5 p-7 pb-0 md:p-8 md:pb-0">
        <span className={`type-caption ${myRole === "dm" ? "text-rare" : "text-text-muted"}`}>
          {myRole === "dm" ? "Você é o mestre" : "Você joga"}
        </span>
        <h3 className="type-card line-clamp-2 text-balance">{tabletop.name}</h3>
        <p className="text-[15px] text-text-muted">{rulebookLabel}</p>
      </div>

      <div className="mx-7 mt-6 min-h-0 flex-1 overflow-hidden rounded-sm bg-surface-2 md:mx-8">
        {tabletop.background_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_URL}${tabletop.background_image_url}`}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <MapThumb />
        )}
      </div>

      <div className="flex items-center justify-between px-7 py-6 md:px-8">
        <div className="flex -space-x-2">
          {tabletop.members.slice(0, 4).map((m) => (
            <span key={m.user_id} className="rounded-full ring-2 ring-surface">
              <Avatar name={m.username} size={28} />
            </span>
          ))}
        </div>
        <span className="text-xs text-text-muted tabular-nums">
          {count} {count === 1 ? "membro" : "membros"}
        </span>
      </div>
    </Link>
  );
}

/** Último card da prateleira: atalho para criar uma mesa. */
export function NewTabletopCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[460px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-md border-2 border-dashed border-border text-text-muted transition hover:border-accent-strong hover:text-accent-strong md:h-[500px]"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface-3/70">
        <Plus size={28} strokeWidth={1.75} />
      </span>
      <span className="type-eyebrow">Nova mesa</span>
    </button>
  );
}
