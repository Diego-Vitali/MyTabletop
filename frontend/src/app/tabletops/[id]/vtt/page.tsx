import { VttView } from "@/components/VttView";

export default async function VttPage(props: PageProps<"/tabletops/[id]/vtt">) {
  const { id } = await props.params;
  return <VttView tabletopId={id} />;
}
