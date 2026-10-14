import { GlobalNav } from "@/components/GlobalNav";
import { SiteFooter } from "@/components/SiteFooter";

/* Cada página controla as próprias seções de largura total (tiles, faixas
   cinza/branco) e usa `page-container` por dentro — o layout só põe a barra
   global no topo e o rodapé embaixo, como no apple.com. */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col">
      <GlobalNav />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
