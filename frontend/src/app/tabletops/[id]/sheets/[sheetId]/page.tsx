import { SheetDetail } from "@/components/SheetDetail";

export default async function SheetDetailPage(
  props: PageProps<"/tabletops/[id]/sheets/[sheetId]">,
) {
  const { id, sheetId } = await props.params;
  return <SheetDetail tabletopId={id} sheetId={sheetId} />;
}
