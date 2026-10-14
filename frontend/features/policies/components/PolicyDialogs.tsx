"use client";

import { useRouter } from "next/navigation";
import PolicyDetailDialog from "@/features/policies/components/PolicyDetailDialog";
import type { PoliciesState } from "@/features/policies/hooks/usePolicies";

/** Version history stays in a dialog; editing opens a dedicated page. */
export function PolicyDialogs({ policies }: { policies: PoliciesState }) {
  const router = useRouter();
  const {
    data, flows, busy, opened, setOpenedKey, setTab, setSimPreset, load,
    askPublish, askToggle, askArchive, askDelete,
  } = policies;
  const capabilities = data?.capabilities ?? [];
  const actions = data?.actions ?? [];

  return (
    <>
      {opened && (
        <PolicyDetailDialog
          group={opened}
          capabilities={capabilities}
          actions={actions}
          flows={flows}
          busy={busy}
          onClose={() => setOpenedKey(null)}
          onChanged={() => void load()}
          onPublish={(policy) => askPublish(policy, opened)}
          onToggle={(policy, enabled) => askToggle(policy, enabled)}
          onRevise={(policy) => {
            setOpenedKey(null);
            router.push(`/policies/${policy.id}/edit`);
          }}
          onArchive={(policy) => askArchive(policy)}
          onDelete={(policy) => askDelete(policy)}
          onTest={(policy) => {
            setOpenedKey(null);
            setSimPreset(policy.id);
            setTab(1);
          }}
        />
      )}
    </>
  );
}
