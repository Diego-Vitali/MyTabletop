import type { ReactNode } from "react";
import { Dices } from "lucide-react";
import { LocalNav } from "@/components/LocalNav";

/** Moldura das páginas de conta (como account.apple.com): local nav
 * "Conta MyTabletop", ícone, título grande e uma coluna estreita centrada. */
export function AccountShell({
  current,
  title,
  subtitle,
  children,
}: {
  current: "login" | "register";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <>
      <LocalNav
        title="Conta MyTabletop"
        links={[
          { href: "/login", label: "Iniciar sessão", current: current === "login" },
          { href: "/register", label: "Criar conta", current: current === "register" },
        ]}
      />
      <section className="flex flex-1 justify-center bg-bg px-6 pt-14 pb-24 md:pt-20">
        <div className="flex w-full max-w-[460px] flex-col items-center text-center">
          <span className="mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-linear-to-br from-accent to-accent-strong text-on-accent shadow-card">
            <Dices size={38} strokeWidth={1.5} />
          </span>
          <h1 className="type-title text-balance">{title}</h1>
          <p className="mt-3 text-[17px] text-text-muted text-balance">{subtitle}</p>
          <div className="mt-10 w-full text-left">{children}</div>
        </div>
      </section>
    </>
  );
}
