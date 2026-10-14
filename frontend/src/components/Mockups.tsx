import { Brush, CloudFog, Grid3x3, ListOrdered, MousePointer2, StickyNote, Users } from "lucide-react";
import { ATTRIBUTE_DEFS } from "@/lib/types";

/* "Fotos de produto" desenhadas em CSS — o MyTabletop não tem imagens de
   marketing, então os tiles da home mostram a interface real estilizada,
   do jeito que a Apple mostra o produto em cada tile. Tudo decorativo
   (aria-hidden). */

const TOKENS = [
  { left: "31%", top: "44%", tone: "from-accent to-accent-strong", label: "AR" },
  { left: "40%", top: "56%", tone: "from-ok to-ok", label: "JO" },
  { left: "24%", top: "61%", tone: "from-warn to-rare", label: "LI" },
  { left: "66%", top: "34%", tone: "from-danger to-rare", label: "?" },
];

function MapScene({ fog = false, chrome = true }: { fog?: boolean; chrome?: boolean }) {
  return (
    <div className="map-terrain relative h-full w-full overflow-hidden">
      <div className="map-grid absolute inset-0" />
      {/* Paredes de duas salas */}
      <div className="absolute top-[30%] left-[16%] h-[44%] w-[34%] rounded-[2px] border-2 border-warn/70" />
      <div className="absolute top-[22%] left-[56%] h-[30%] w-[26%] rounded-[2px] border-2 border-warn/70" />
      {/* Luz emitida pelo primeiro token */}
      <div className="absolute top-[44%] left-[31%] h-[38%] w-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-warn/15 blur-xl" />
      {TOKENS.map((t) => (
        <span
          key={t.label}
          className={`absolute flex h-[9%] w-auto aspect-square -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-linear-to-br ${t.tone} text-[clamp(6px,1.1vw,12px)] font-semibold text-on-accent shadow-lg ring-2 ring-on-ink/90`}
          style={{ left: t.left, top: t.top }}
        >
          {t.label}
        </span>
      ))}
      {fog && <div className="fog-reveal absolute inset-0" />}
      {chrome && (
        <>
          <div className="panel-float absolute top-[4%] left-[2.5%] flex items-center gap-[2px] rounded-full p-[3px] text-text">
            {[MousePointer2, Users, Grid3x3, Brush, CloudFog, ListOrdered, StickyNote].map((Icon, i) => (
              <span
                key={i}
                className={`flex aspect-square w-[clamp(14px,2.2vw,26px)] items-center justify-center rounded-full ${
                  i === 4 ? "bg-accent text-on-accent" : ""
                }`}
              >
                <Icon className="h-1/2 w-1/2" />
              </span>
            ))}
          </div>
          <div className="panel-float absolute inset-x-[2.5%] bottom-[3%] flex h-[13%] items-center gap-[1.5%] rounded-[clamp(6px,1vw,14px)] px-[1.5%]">
            {["from-accent to-accent-strong", "from-ok to-ok", "from-warn to-rare", "from-danger to-rare", "from-monogram-from to-monogram-to", "from-accent to-ok"].map(
              (tone, i) => (
                <span key={i} className={`aspect-square h-[62%] rounded-[22%] bg-linear-to-br ${tone}`} />
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

/** Notebook mostrando o VTT — o "produto" do tile principal. */
export function LaptopMockup({ fog = false }: { fog?: boolean }) {
  return (
    <div aria-hidden className="mx-auto w-[min(92vw,880px)]">
      <div className="rounded-t-[clamp(10px,2vw,22px)] bg-ink p-[1.4%] pb-[2%] shadow-2xl ring-1 ring-ink-3">
        <div className="aspect-[16/10] overflow-hidden rounded-[clamp(4px,0.6vw,8px)]">
          <MapScene fog={fog} />
        </div>
      </div>
      <div className="relative mx-[-6%] h-[clamp(8px,1.6vw,18px)] rounded-b-[40%_100%] bg-linear-to-b from-surface-3 to-border">
        <div className="absolute top-0 left-1/2 h-[45%] w-[14%] -translate-x-1/2 rounded-b-[10px] bg-border" />
      </div>
    </div>
  );
}

/** Tablet mostrando o VTT com a barra e o dock — para o tile escuro do VTT. */
export function TabletMockup() {
  return (
    <div aria-hidden className="mx-auto w-[min(88vw,760px)] rounded-[clamp(14px,3vw,36px)] bg-ink-3 p-[1.6%] shadow-2xl ring-1 ring-on-ink/10">
      <div className="aspect-[4/3] overflow-hidden rounded-[clamp(8px,2vw,24px)]">
        <MapScene />
      </div>
    </div>
  );
}

/** Mapa em close, com névoa — para tiles escuros. */
export function FogMockup() {
  return (
    <div aria-hidden className="mx-auto aspect-[16/10] w-[min(84vw,560px)] overflow-hidden rounded-md ring-1 ring-ink-3">
      <MapScene fog chrome={false} />
    </div>
  );
}

/** Bloco de atributos de Ordem Paranormal em números grandes. */
export function AttributesMockup() {
  const values = [1, 3, 2, 2, 1];
  return (
    <div aria-hidden className="mx-auto grid w-[min(84vw,520px)] grid-cols-5 gap-2 md:gap-3">
      {ATTRIBUTE_DEFS.ordem_paranormal_classico.map((d, i) => (
        <div key={d.key} className="flex flex-col items-center gap-1 rounded-md bg-surface-2 py-5 shadow-card md:py-7">
          <span className="text-[clamp(28px,6vw,48px)] leading-none font-semibold tabular-nums">{values[i]}</span>
          <span className="text-xs font-semibold text-text-muted">{d.key}</span>
        </div>
      ))}
    </div>
  );
}

/** Lista de iniciativa com o turno atual destacado. */
export function InitiativeMockup() {
  const rows = [
    { v: 21, name: "Agente Rocha", hp: "12/12" },
    { v: 17, name: "Dra. Helena", hp: "9/14", current: true },
    { v: 12, name: "Kaiser", hp: "16/16" },
    { v: 8, name: "Criatura de Sangue", hp: "88/88" },
  ];
  return (
    <div aria-hidden className="mx-auto w-[min(84vw,400px)] rounded-md bg-surface p-2 text-left shadow-card">
      <div className="flex items-center justify-between px-3 pt-2 pb-3">
        <span className="text-[15px] font-semibold">Iniciativa</span>
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-strong">Rodada 3</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className={`flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm ${r.current ? "bg-accent text-on-accent" : ""}`}
        >
          <span className={`w-6 tabular-nums ${r.current ? "" : "text-text-faint"}`}>{r.v}</span>
          <span className="flex-1 truncate">{r.name}</span>
          <span className={`text-xs tabular-nums ${r.current ? "" : "text-text-faint"}`}>{r.hp}</span>
        </div>
      ))}
    </div>
  );
}

/** "Terminal" com o comando de subida — tile self-hosted. */
export function TerminalMockup() {
  return (
    <div aria-hidden className="mx-auto w-[min(84vw,440px)] overflow-hidden rounded-md bg-ink-2 text-left shadow-card ring-1 ring-ink-3">
      <div className="flex gap-1.5 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-danger/80" />
        <span className="h-3 w-3 rounded-full bg-warn/80" />
        <span className="h-3 w-3 rounded-full bg-ok/80" />
      </div>
      <pre className="px-5 pb-6 font-mono text-[13px] leading-relaxed text-on-ink">
        <span className="text-on-ink-muted">$</span> cp .env.example .env{"\n"}
        <span className="text-on-ink-muted">$</span> docker compose up --build{"\n"}
        <span className="text-ok">✓</span> backend   <span className="text-on-ink-muted">:8042</span>{"\n"}
        <span className="text-ok">✓</span> frontend  <span className="text-on-ink-muted">:3000</span>{"\n"}
        <span className="text-ok">✓</span> mongo     <span className="text-on-ink-muted">:27017</span>
      </pre>
    </div>
  );
}

/** Miniatura de mapa (cards de mesa sem cena definida). */
export function MapThumb() {
  return (
    <div aria-hidden className="h-full w-full">
      <MapScene chrome={false} />
    </div>
  );
}
