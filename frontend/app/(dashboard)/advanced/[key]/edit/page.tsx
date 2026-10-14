import { InstructionEditPage } from "@/features/advanced/components/InstructionEditPage";

export default async function EditInstructionPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  return <InstructionEditPage instructionKey={key} />;
}
