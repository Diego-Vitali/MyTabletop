"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrickWall, Cloud, Crown, History, Radio, Server } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { buttonClass, ChevronLink, SectionHeading } from "@/components/ui";
import { Shelf, ShelfItem } from "@/components/Shelf";
import {
  AttributesMockup,
  FogMockup,
  InitiativeMockup,
  LaptopMockup,
  TabletMockup,
  TerminalMockup,
} from "@/components/Mockups";

/* Três degraus de grafite para os tiles se distinguirem entre si (o
   equivalente escuro da alternância branco / cinza / preto da Apple). */
const tones = {
  base: "bg-bg",
  raised: "bg-surface",
  deep: "bg-ink-2",
} as const;

/** Tile da home da Apple: título e chamada centralizados no topo, o
 * "produto" embaixo, fundo branco, cinza ou preto. */
function Tile({
  id,
  tone,
  size = "hero",
  title,
  subhead,
  actions,
  children,
}: {
  id?: string;
  tone: keyof typeof tones;
  size?: "hero" | "grid";
  title: string;
  subhead: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`relative flex scroll-mt-4 flex-col items-center overflow-hidden text-center ${tones[tone]} ${
        size === "hero" ? "pt-12 md:min-h-[692px] md:pt-[52px]" : "min-h-[440px] pt-12 md:min-h-[580px] md:pt-[52px]"
      }`}
    >
      <div className="relative z-10 flex flex-col items-center px-6">
        <h2 className={`${size === "hero" ? "type-hero" : "type-title"} animate-rise`}>{title}</h2>
        <p className={`${size === "hero" ? "type-subhead" : "type-eyebrow font-normal"} mt-1.5 max-w-[34ch] animate-rise text-balance [animation-delay:80ms]`}>
          {subhead}
        </p>
        {actions && (
          <div className="mt-[18px] flex animate-rise flex-wrap items-center justify-center gap-x-4 gap-y-3 [animation-delay:160ms]">
            {actions}
          </div>
        )}
      </div>
      <div className="mt-auto flex w-full justify-center px-4 pt-10 pb-0">{children}</div>
    </section>
  );
}

const WHY = [
  {
    icon: Cloud,
    title: "Gratuito, de verdade.",
    body: "Sem plano pago, sem limite de mesas, sem anúncios. Você só precisa de um computador para hospedar.",
  },
  {
    icon: Radio,
    title: "Tudo ao vivo.",
    body: "Cada token arrastado, cada cena trocada aparece na tela de todos os jogadores no mesmo instante.",
  },
  {
    icon: Crown,
    title: "O mestre no controle.",
    body: "Tokens escondidos, travados ou restritos ao mestre. Jogadores só veem o que devem ver.",
  },
  {
    icon: BrickWall,
    title: "Luz e paredes.",
    body: "Iluminação dinâmica com linha de visão calculada no servidor, a partir das paredes do mapa.",
  },
  {
    icon: History,
    title: "Nenhum mapa se perde.",
    body: "Trocar a cena arquiva o mapa anterior e a posição de cada token num histórico permanente.",
  },
  {
    icon: Server,
    title: "Seus dados, seu servidor.",
    body: "Docker Compose sobe backend, frontend e banco. Nada sai da sua máquina.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();

  const primaryCta = user ? (
    <Link href="/tabletops" className={buttonClass("primary", "lg")}>
      Ver minhas mesas
    </Link>
  ) : (
    <>
      <Link href="/register" className={buttonClass("primary", "lg")}>
        Começar agora
      </Link>
      <Link href="/login" className={buttonClass("secondary", "lg")}>
        Iniciar sessão
      </Link>
    </>
  );

  return (
    <>
      {/* Faixa de aviso (ribbon) */}
      <div className="bg-bg-alt px-6 py-3.5 text-center text-sm text-text">
        Novo no Virtual Tabletop: névoa de guerra e iluminação dinâmica, unificadas numa só camada.{" "}
        <ChevronLink href="/#recursos" className="whitespace-nowrap">
          Saiba mais
        </ChevronLink>
      </div>

      <div className="flex flex-col gap-3 pb-3">
        <Tile
          tone="base"
          title="MyTabletop"
          subhead="Sua mesa. Sua noite. Sem mensalidade."
          actions={loading ? null : primaryCta}
        >
          <LaptopMockup />
        </Tile>

        <Tile
          tone="deep"
          title="Virtual Tabletop."
          subhead="Mapas, tokens e névoa de guerra. Tudo sincronizado ao vivo."
          actions={
            <>
              <Link href={user ? "/tabletops" : "/register"} className={buttonClass("primary", "lg")}>
                Abrir uma mesa
              </Link>
              <ChevronLink href="/#recursos" onInk className="text-[17px]">
                Saiba mais
              </ChevronLink>
            </>
          }
        >
          <div className="translate-y-[6%] md:translate-y-[10%]">
            <TabletMockup />
          </div>
        </Tile>

        <div className="grid gap-3 px-3 md:grid-cols-2">
          <Tile
            tone="raised"
            size="grid"
            title="Fichas."
            subhead="Os atributos de Ordem Paranormal, sempre à mão."
            actions={<ChevronLink href={user ? "/tabletops" : "/register"}>Criar uma ficha</ChevronLink>}
          >
            <div className="pb-14">
              <AttributesMockup />
            </div>
          </Tile>
          <Tile
            tone="base"
            size="grid"
            title="Iniciativa."
            subhead="A ordem de combate, rodada a rodada."
            actions={<ChevronLink href="/#recursos">Saiba mais</ChevronLink>}
          >
            <div className="pb-14">
              <InitiativeMockup />
            </div>
          </Tile>
          <Tile
            tone="deep"
            size="grid"
            title="Névoa de guerra."
            subhead="Revele o mapa no ritmo da história."
            actions={
              <ChevronLink href="/#recursos" onInk>
                Saiba mais
              </ChevronLink>
            }
          >
            <div className="pb-14">
              <FogMockup />
            </div>
          </Tile>
          <Tile
            id="self-hosted"
            tone="raised"
            size="grid"
            title="Self-hosted."
            subhead="Um comando. Sua mesa no ar."
            actions={
              <ChevronLink href="https://github.com/Diego-Vitali/MyTabletop" external>
                Ver o código-fonte
              </ChevronLink>
            }
          >
            <div className="pb-14">
              <TerminalMockup />
            </div>
          </Tile>
        </div>
      </div>

      {/* Prateleira "Por que" */}
      <section id="recursos" className="scroll-mt-4 bg-bg-alt pt-16 pb-8 md:pt-24">
        <div className="page-container mb-8">
          <SectionHeading title="Por que MyTabletop." tagline="Tudo que a sua mesa precisa." />
        </div>
        <Shelf label="Recursos do MyTabletop">
          {WHY.map(({ icon: Icon, title, body }) => (
            <ShelfItem key={title} className="w-[min(78vw,320px)]">
              <article className="flex h-full min-h-[300px] flex-col gap-4 rounded-md bg-surface p-8 shadow-card transition duration-300 hover:scale-[1.01] hover:shadow-card-hover">
                <Icon size={36} strokeWidth={1.5} className="text-accent-strong" />
                <h3 className="type-card text-balance">{title}</h3>
                <p className="text-[17px] text-text-muted">{body}</p>
              </article>
            </ShelfItem>
          ))}
        </Shelf>
      </section>

      {/* Chamada final */}
      <section className="bg-bg py-24 text-center md:py-32">
        <div className="page-container flex flex-col items-center gap-5">
          <h2 className="type-headline text-balance">Pronto para a próxima sessão?</h2>
          <p className="type-subhead max-w-[30ch] text-text-muted text-balance">
            Crie uma mesa, convide seus jogadores e role iniciativa hoje à noite.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-4">
            {loading ? null : primaryCta}
          </div>
        </div>
      </section>
    </>
  );
}
