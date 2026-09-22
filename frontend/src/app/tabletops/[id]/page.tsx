import { TabletopDetail } from "@/components/TabletopDetail";

export default async function TabletopDetailPage(
  props: PageProps<"/tabletops/[id]">,
) {
  const { id } = await props.params;
  return <TabletopDetail tabletopId={id} />;
}
