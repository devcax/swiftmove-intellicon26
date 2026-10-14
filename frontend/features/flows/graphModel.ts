import type { ApiFlowDefinition, ApiFlowStep } from "./types";
import { freshStepId, makeStep, MAX_STEPS, renameReferences, stepTargets } from "./model";

export interface FlowPort { id: string; label: string; target?: string }

/** Each editable outlet maps to one exact runtime branch, even when targets are shared. */
export function flowPorts(step: ApiFlowStep): FlowPort[] {
  if (step.type === "END") return [];
  const ports: FlowPort[] = [];
  if (step.type === "IF") ports.push({ id: "then", label: "Yes", target: step.then }, { id: "else", label: "No", target: step.else });
  else if (step.next !== undefined || (!["ASK_CHOICE", "ASK_TEXT"].includes(step.type)) || (step.type === "ASK_TEXT" && !step.onText && !step.classify)) {
    ports.push({ id: "next", label: step.type === "ACTION" ? "Continue / fallback" : "Continue", target: step.next });
  }
  for (const [index, option] of (step.options ?? []).entries()) ports.push({ id: `option:${index}`, label: option.label || option.id, target: option.next });
  if (step.onText) {
    if (step.onText.next !== undefined) ports.push({ id: "textNext", label: "Typed answer", target: step.onText.next });
    for (const [intent, target] of Object.entries(step.onText.intentMap ?? {})) ports.push({ id: `intent:${intent}`, label: intent, target });
    if (step.onText.elseNext !== undefined) ports.push({ id: "textElse", label: "Other typed answer", target: step.onText.elseNext });
  }
  for (const [index, category] of (step.classify?.categories ?? []).entries()) ports.push({ id: `category:${index}`, label: category.id, target: category.next });
  if (step.classify) ports.push({ id: "fallback", label: "Other answer", target: step.classify.fallback });
  return ports;
}

export function setFlowPort(step: ApiFlowStep, port: string, target: string | undefined): ApiFlowStep {
  if (!flowPorts(step).some((item) => item.id === port)) return step;
  if (["next", "then", "else"].includes(port)) return { ...step, [port]: target };
  if (port.startsWith("option:")) return { ...step, options: step.options?.map((option, index) => index === Number(port.slice(7)) ? { ...option, next: target } : option) };
  if (port.startsWith("category:") && step.classify) return { ...step, classify: { ...step.classify, categories: step.classify.categories.map((category, index) => index === Number(port.slice(9)) ? { ...category, next: target ?? "" } : category) } };
  if (port === "fallback" && step.classify) return { ...step, classify: { ...step.classify, fallback: target ?? "" } };
  if (step.onText) {
    if (port === "textNext" || port === "textElse") return { ...step, onText: { ...step.onText, [port === "textNext" ? "next" : "elseNext"]: target } };
    if (port.startsWith("intent:")) return { ...step, onText: { ...step.onText, intentMap: { ...step.onText.intentMap, [port.slice(7)]: target ?? "" } } };
  }
  return step;
}

export function canConnect(definition: ApiFlowDefinition, source: string, port: string, target: string): boolean {
  const from = definition.steps.find((step) => step.id === source);
  if (!from || source === target || !definition.steps.some((step) => step.id === target) || !flowPorts(from).some((item) => item.id === port)) return false;
  const visited = new Set<string>();
  const queue = [target];
  while (queue.length) {
    const id = queue.pop()!;
    if (id === source) return false;
    if (visited.has(id)) continue;
    visited.add(id);
    const step = definition.steps.find((item) => item.id === id);
    if (step) queue.push(...stepTargets(step).map((item) => item.target));
  }
  return true;
}

/** Insert into a branch without dropping its old destination. */
export function insertFlowStep(definition: ApiFlowDefinition, added: ApiFlowStep, source?: string, port?: string): ApiFlowDefinition {
  const original = definition.steps.find((step) => step.id === source);
  const oldTarget = original && port ? flowPorts(original).find((item) => item.id === port)?.target : undefined;
  const destination = source === "__trigger" ? definition.steps[0]?.id : oldTarget;
  let step = added;
  if (destination) {
    const firstPort = flowPorts(step)[0];
    if (firstPort) step = setFlowPort(step, firstPort.id, destination);
  }
  const steps = definition.steps.map((item) => item.id === source && port ? setFlowPort(item, port, step.id) : item);
  return { steps: source === "__trigger" ? [step, ...steps] : [...steps, step] };
}

/** Steps that removing this one would leave without a way forward: a choice is needed when it splits into several paths. */
export function deletionSuccessors(definition: ApiFlowDefinition, id: string): string[] {
  const removed = definition.steps.find((step) => step.id === id);
  return removed ? [...new Set(stepTargets(removed).map((port) => port.target))].filter((target) => target !== id && definition.steps.some((step) => step.id === target)) : [];
}

/** Remove a step and join whatever led into it to whatever came after it, so the path stays connected. */
export function deleteFlowStep(definition: ApiFlowDefinition, id: string, replacementId?: string): ApiFlowDefinition {
  if (!definition.steps.some((step) => step.id === id)) return definition;
  const targets = deletionSuccessors(definition, id);
  if (targets.length > 1 && !replacementId) return definition;
  const successor = replacementId ?? targets[0];
  const steps = definition.steps.filter((step) => step.id !== id);
  if (definition.steps[0]?.id === id) {
    const nextId = successor ?? steps[0]?.id;
    const next = steps.find((step) => step.id === nextId);
    if (next) steps.splice(0, steps.length, next, ...steps.filter((step) => step.id !== nextId));
    if (!steps.length) steps.push(makeStep("END", freshStepId("END", new Set([id]))));
  }
  return pruneUnusedEnds(renameReferences({ steps }, id, successor ?? ""));
}

/** Empty terminal nodes replaced by a connection no longer belong to that branch. */
export function pruneUnusedEnds(definition: ApiFlowDefinition): ApiFlowDefinition {
  const targets = new Set(definition.steps.flatMap((step) => stepTargets(step).map((port) => port.target)));
  return { steps: definition.steps.filter((step, index) => index === 0 || step.type !== "END" || Boolean(step.text?.trim()) || targets.has(step.id)) };
}

/** Fill explicitly selected open branches with real, editable End steps. */
export function finishFlowBranches(definition: ApiFlowDefinition, onlyStepIds?: Set<string>): ApiFlowDefinition {
  const ids = new Set(definition.steps.map((step) => step.id));
  const ends: ApiFlowStep[] = [];
  const steps = definition.steps.map((original) => {
    if (onlyStepIds && !onlyStepIds.has(original.id)) return original;
    let step = original;
    for (const port of flowPorts(original)) if (!port.target && definition.steps.length + ends.length < MAX_STEPS) {
      const end = makeStep("END", freshStepId("END", ids));
      ids.add(end.id); ends.push(end);
      step = setFlowPort(step, port.id, end.id);
    }
    return step;
  });
  return { steps: [...steps, ...ends] };
}
