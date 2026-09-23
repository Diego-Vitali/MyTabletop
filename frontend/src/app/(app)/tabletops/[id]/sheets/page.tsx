import { SheetsList } from "@/components/SheetsList";

export default async function SheetsPage(props: PageProps<"/tabletops/[id]/sheets">) {
  const { id } = await props.params;
  return <SheetsList tabletopId={id} />;
}
