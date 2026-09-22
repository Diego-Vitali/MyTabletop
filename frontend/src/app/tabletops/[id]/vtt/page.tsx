import { SceneBoard } from "@/components/SceneBoard";

export default async function VttPage(props: PageProps<"/tabletops/[id]/vtt">) {
  const { id } = await props.params;
  return <SceneBoard tabletopId={id} />;
}
