import { PolicyEditPage } from '@/features/policies/components/PolicyEditPage';

export default async function EditPolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PolicyEditPage key={id} policyId={id} />;
}
