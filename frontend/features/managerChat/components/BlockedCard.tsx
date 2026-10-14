"use client";

import * as React from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { RequirementFields } from "@/shared/components/RequirementFields";
import type { RequirementField } from "@/shared/api/requirements";
import {
  isCollectable, missingRequirements, newEvidenceRef, recordRequirements, type RequirementErrors, type RequirementValue, type RequirementValues,
} from "@/features/evidence/values";
import { describeError } from "@/shared/api/describeError";
import type { Blocked } from "../schemas";

/** The pieces of a block the manager can supply here, in the shape the forms use. Anything else is left to be explained in words. */
function fieldsOf(blocked: Blocked): RequirementField[] {
  return blocked.missing.flatMap((item) =>
    item.name && item.type ? [{ name: item.name, type: item.type, label: item.label ?? item.name.replace(/_/g, " "), policyKey: item.policyKey ?? "" }] : [],
  );
}

interface BlockedCardProps {
  blocked: Blocked;
  resolved: boolean;
  disabled: boolean;
  /** Tell the assistant what was provided so it can try again. */
  onRetry: (message: string) => Promise<boolean>;
}

/**
 * A rule stopped what the assistant tried. When it asks for something the manager can provide (a document, a confirmation, a note, a
 * location), the same fields the forms use appear here; providing them records the evidence and asks the assistant to try again.
 */
export function BlockedCard({ blocked, resolved, disabled, onRetry }: BlockedCardProps) {
  const fields = React.useMemo(() => fieldsOf(blocked), [blocked]);
  const [values, setValues] = React.useState<RequirementValues>({});
  const [errors, setErrors] = React.useState<RequirementErrors>({});
  const [working, setWorking] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);
  const collectable = fields.filter(isCollectable);

  const change = (name: string, value: RequirementValue) => setValues((current) => ({ ...current, [name]: value }));

  const provide = async () => {
    const found = missingRequirements(fields, values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setWorking(true);
    setFailure(null);
    try {
      const reference = newEvidenceRef();
      await recordRequirements(reference, fields, values);
      const labels = collectable.map((field) => field.label).join(", ");
      await onRetry(`I provided the ${labels}. The evidence reference is ${reference}. Please try again and use evidenceRef ${reference}.`);
    } catch (err) {
      setFailure(describeError(err, "Could not save that. Please try again."));
    } finally {
      setWorking(false);
    }
  };

  return (
    <Alert severity="warning" sx={{ borderRadius: 2, alignItems: "flex-start" }} role="group" aria-label="A rule needs something before this can go ahead">
      <div className="space-y-3">
        <div>{blocked.message}</div>
        {!resolved && collectable.length > 0 && (
          <>
            <RequirementFields fields={collectable} notices={[]} values={values} errors={errors} disabled={working || disabled} onChange={change} />
            {failure && <div role="alert" className="text-red-700">{failure}</div>}
            <Button size="small" variant="contained" onClick={() => void provide()} disabled={working || disabled}>
              {working ? "Saving…" : "Provide and try again"}
            </Button>
          </>
        )}
        {!resolved && collectable.length === 0 && blocked.missing.length > 0 && (
          <div className="text-slate-700">This needs something that has to be done outside the chat.</div>
        )}
      </div>
    </Alert>
  );
}
