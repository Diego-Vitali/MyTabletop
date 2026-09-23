import { NavBar } from "@/components/NavBar";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-col">
      <NavBar />
      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-10">{children}</main>
    </div>
  );
}
