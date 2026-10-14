"use client";

import * as React from "react";
import { Background, Controls, MarkerType, Position, ReactFlow, ReactFlowProvider, useReactFlow, useStore } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Box, Button, Dialog, DialogContent, DialogTitle, Divider, IconButton, Menu, MenuItem, Tooltip, Typography } from "@mui/material";
import { ThemeProvider, useTheme } from "@mui/material/styles";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import UndoRoundedIcon from "@mui/icons-material/UndoRounded";
import RedoRoundedIcon from "@mui/icons-material/RedoRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import FullscreenExitRoundedIcon from "@mui/icons-material/FullscreenExitRounded";
import StopCircleOutlinedIcon from "@mui/icons-material/StopCircleOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import { feedback } from "@/shared/feedback/store";
import type { LoadedFlowEditor } from "../hooks/useFlowEditor";
import type { ApiFlowMeta, ApiFlowStep, ApiFlowStepType } from "../types";
import { freshStepId, makeStep, MAX_STEPS, STEP_TYPE_META } from "../model";
import { canConnect, deleteFlowStep, deletionSuccessors, finishFlowBranches, flowPorts, insertFlowStep, pruneUnusedEnds, setFlowPort } from "../graphModel";
import { arrangeFlow, layoutFlow, placeNodes, ROW, TRIGGER_ID, type LiveDrag, type Positions } from "../flowLayout";
import StepCard from "./StepCard";
import { FlowMetaFields } from "./FlowMetaFields";
import { FlowLinkEdge, type LinkEdge } from "./FlowLinkEdge";
import { FlowStepNode, stepIcons, type StepNode } from "./FlowStepNode";
import { canvasHistoryShortcut } from "../history";

const PANEL_WIDTH = 460;
/** Below this zoom the cards become icon tiles, like a map of the whole conversation. */
const COMPACT_ZOOM = 0.5;
type AddMenu = { at: { top: number; left: number }; source: string; ports: string[] };
const nodeTypes = { flow: FlowStepNode };
const edgeTypes = { link: FlowLinkEdge };

function Canvas({ editor, meta }: { editor: LoadedFlowEditor; meta: ApiFlowMeta }) {
  const { working, selectedStepId, setSelectedStepId, busy } = editor;
  const definition = working.definition;
  const { setCenter, getZoom, flowToScreenPosition, fitView } = useReactFlow();
  const [fullscreen, setFullscreen] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const theme = useTheme();
  const portalTheme = React.useMemo(() => ({ ...theme, components: {
    ...theme.components,
    MuiPopover: { ...theme.components?.MuiPopover, defaultProps: { ...theme.components?.MuiPopover?.defaultProps, container: () => document.fullscreenElement ?? document.body } },
    MuiPopper: { ...theme.components?.MuiPopper, defaultProps: { ...theme.components?.MuiPopper?.defaultProps, container: () => document.fullscreenElement ?? document.body } },
  } }), [theme]);
  React.useEffect(() => {
    const onFullscreen = () => setFullscreen(document.fullscreenElement === canvasRef.current);
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => { document.removeEventListener("fullscreenchange", onFullscreen); };
  }, []);
  const [menu, setMenu] = React.useState<AddMenu | null>(null);
  // The menu opens right under the "+" that was clicked, whatever happens to that button afterwards.
  const openMenu = (anchor: HTMLElement, source: string, ports: string[]) => {
    const box = anchor.getBoundingClientRect();
    setMenu({ at: { top: box.bottom + 6, left: box.left + box.width / 2 }, source, ports });
  };
  const [panel, setPanel] = React.useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = React.useState<{ id: string; source: string; ports: string[] } | null>(null);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const reveal = React.useRef<string | null>(null);
  const compact = useStore((state) => state.transform[2] < COMPACT_ZOOM);
  // The tidy layout is the starting point; cards then stay wherever they were put, so edits never shuffle them.
  const auto = React.useMemo(() => layoutFlow(definition, { compact }), [definition, compact]);
  const placed = React.useMemo(() => placeNodes(auto, editor.positions), [auto, editor.positions]);
  const [dragging, setDragging] = React.useState<Positions>({});
  const [drag, setDrag] = React.useState<LiveDrag | null>(null);
  const layout = React.useMemo(() => arrangeFlow(auto, { ...placed, ...dragging }, { compact, live: drag ?? undefined }), [auto, placed, dragging, compact, drag]);
  const { positions: savedPositions, pinPositions } = editor;
  React.useEffect(() => {
    if (Object.keys(placed).some((id) => !savedPositions[id])) pinPositions(placed);
  }, [placed, savedPositions, pinPositions]);

  const select = (id: string) => { setSelectedStepId(id); setSelectedEdge(null); };
  const openStep = (id: string) => { select(id); setPanel(id); reveal.current = id; };
  const closePanel = () => { setPanel(null); };
  const patch = (id: string, value: Partial<ApiFlowStep>) => {
    const index = definition.steps.findIndex((step) => step.id === id);
    if (index < 0) return;
    if (value.options && value.options.length > (definition.steps[index].options?.length ?? 0)) editor.patchDefinition(finishFlowBranches({ steps: definition.steps.map((step, at) => at === index ? { ...step, ...value } : step) }, new Set([id])));
    else editor.updateStep(index, { ...definition.steps[index], ...value });
  };
  const remove = (id: string, replacementId?: string) => {
    if (busy) return;
    const step = definition.steps.find((item) => item.id === id);
    if (!step || (definition.steps.length === 1 && step.type === "END")) return;
    if (deletionSuccessors(definition, id).length > 1 && !replacementId) { setDeleting(id); return; }
    editor.patchDefinition(deleteFlowStep(definition, id, replacementId));
    if (selectedStepId === id) setSelectedStepId(null);
    setPanel((current) => current === id ? null : current); setDeleting(null); setSelectedEdge(null);
  };
  const connect = (source: string, ports: string[], target: string) => {
    if (busy) return;
    if (!ports.every((port) => canConnect(definition, source, port, target))) { feedback.warning("Choose another step. A conversation cannot connect back to itself or form a loop."); return; }
    editor.patchDefinition(pruneUnusedEnds({ steps: definition.steps.map((step) => step.id === source ? ports.reduce((item, port) => setFlowPort(item, port, target), step) : step) }));
    setSelectedEdge(null);
  };
  const menuDestination = menu?.source === TRIGGER_ID ? definition.steps[0] : definition.steps.find((step) => step.id === flowPorts(definition.steps.find((item) => item.id === menu?.source) ?? { id: "", type: "END" }).find((port) => port.id === menu?.ports[0])?.target);
  const addStep = (type: ApiFlowStepType) => {
    if (busy || definition.steps.length >= MAX_STEPS) return;
    const step = makeStep(type, freshStepId(type, new Set(definition.steps.map((item) => item.id))));
    if (!menu) return;
    const [port, ...shared] = menu.ports;
    const oldDestination = menuDestination?.id;
    if (type === "END" && definition.steps.some((item) => item.id === oldDestination && item.type === "END")) { openStep(oldDestination!); setMenu(null); return; }
    // Answers that shared this connector all move onto the new step.
    const inserted = insertFlowStep(definition, step, menu.source, port);
    const joined = { steps: inserted.steps.map((item) => item.id === menu.source ? shared.reduce((current, other) => setFlowPort(current, other, step.id), item) : item) };
    // The new step takes the old destination's spot and everything after it moves down one row to make room.
    const positions = { ...placed };
    const spot = menuDestination ? placed[menuDestination.id] : undefined;
    if (menuDestination && spot) {
      const after = new Set<string>(), queue = [menuDestination.id];
      while (queue.length) {
        const id = queue.pop()!;
        if (after.has(id)) continue;
        after.add(id);
        queue.push(...flowPorts(definition.steps.find((item) => item.id === id) ?? { id, type: "END" }).flatMap((outlet) => outlet.target ? [outlet.target] : []));
      }
      for (const id of after) if (positions[id] && positions[id].y >= spot.y - 1) positions[id] = { x: positions[id].x, y: positions[id].y + ROW };
      positions[step.id] = spot;
    }
    editor.patchDefinition(finishFlowBranches(joined, new Set([step.id])), undefined, positions);
    openStep(step.id);
    setMenu(null);
  };

  const disconnect = () => {
    if (!selectedEdge || busy) return;
    const source = definition.steps.find((step) => step.id === selectedEdge.source);
    if (source) patch(source.id, selectedEdge.ports.reduce((step, port) => setFlowPort(step, port, ""), source));
    setSelectedEdge(null);
  };
  const tidyUp = () => {
    editor.setPositions(Object.fromEntries(auto.nodes.filter((node) => node.kind !== "open").map((node) => [node.id, { x: node.x, y: node.y }])));
    setTimeout(() => { void fitView({ padding: 0.15, maxZoom: 1, duration: 300 }); }, 50);
  };
  const chooseLink = (id: string) => {
    const link = layout.edges.find((item) => item.id === id);
    if (link && link.source !== TRIGGER_ID && !link.open) setSelectedEdge({ id: link.id, source: link.source, ports: link.ports });
  };
  const triggerText = working.intent && !editor.detail.isSystem ? `${meta.starters.find((starter) => starter.id === working.intent)?.label ?? working.intent}${working.topic ? ` · ${working.topic}` : ""}` : editor.detail.startsWhen;
  const idle = { meta, compact, entry: false, issues: 0, orphan: false, busy: Boolean(busy), canRemove: false, onEdit: () => {}, onRemove: () => {} };
  const nodes: StepNode[] = layout.nodes.map((node): StepNode => {
    // Size and connection points are given up front: React Flow otherwise forgets them whenever it gets a new node
    // object (every render, every drag move) and hides the connectors until it measures the card again.
    const handles = [
      ...(node.kind !== "trigger" ? [{ type: "target" as const, position: Position.Top, x: node.width / 2, y: 0, width: 1, height: 1 }] : []),
      ...(node.kind !== "open" ? [{ type: "source" as const, position: Position.Bottom, x: node.width / 2, y: node.height, width: 1, height: 1 }] : []),
    ];
    const base = { id: node.id, type: "flow" as const, position: { x: node.x, y: node.y }, width: node.width, height: node.height, measured: { width: node.width, height: node.height }, handles, draggable: node.kind !== "open" && !busy, connectable: false };
    if (node.kind === "open") {
      const owner = definition.steps.find((step) => step.id === node.source);
      const label = owner ? flowPorts(owner).find((port) => port.id === node.port)?.label : undefined;
      return { ...base, selectable: false, data: { ...idle, kind: "open", openLabel: label, onAdd: (anchor) => openMenu(anchor, node.source!, [node.port!]) } };
    }
    if (node.kind === "trigger") return { ...base, data: { ...idle, kind: "trigger", startsWhen: triggerText, onEdit: () => { setPanel(TRIGGER_ID); setSelectedEdge(null); }, onAdd: () => {} }, selected: panel === TRIGGER_ID, ariaLabel: "Conversation trigger" };
    const index = definition.steps.findIndex((step) => step.id === node.id);
    const step = definition.steps[index];
    return { ...base, selected: selectedStepId === node.id, ariaLabel: `${STEP_TYPE_META[step.type].label}: ${step.id}`, data: {
      ...idle, kind: "step", step, entry: index === 0, orphan: Boolean(node.orphan), canRemove: definition.steps.length > 1 || step.type !== "END", issues: editor.issueCountByStep.get(step.id) ?? 0,
      onEdit: () => openStep(step.id), onRemove: () => remove(step.id), onAdd: () => {},
    } };
  });
  const edges: LinkEdge[] = layout.edges.map((link) => ({
    id: link.id, source: link.source, target: link.target, type: "link", deletable: false, focusable: false, selected: selectedEdge?.id === link.id,
    markerEnd: { type: MarkerType.ArrowClosed, color: selectedEdge?.id === link.id ? "#1e3a8a" : "#94a3b8", width: 16, height: 16 },
    data: { path: link.path, label: link.label, details: link.details, labelAt: link.labelAt, plusAt: link.plusAt, open: link.open, busy: Boolean(busy), onAdd: (anchor) => openMenu(anchor, link.source, link.ports), onSelect: () => chooseLink(link.id), onDelete: disconnect },
  }));

  // Keep the step being edited visible beside the settings panel, and show a step the moment it is added.
  React.useEffect(() => {
    const id = reveal.current;
    const node = id ? layout.nodes.find((item) => item.id === id) : undefined;
    const area = canvasRef.current?.querySelector(".react-flow")?.getBoundingClientRect();
    if (!id || !node || !area) return;
    reveal.current = null;
    const covered = area.width > 720 ? PANEL_WIDTH : area.width;
    const left = flowToScreenPosition({ x: node.x, y: node.y }), right = flowToScreenPosition({ x: node.x + node.width, y: node.y + node.height });
    const visible = left.x > area.left + 16 && right.x < area.right - covered - 16 && left.y > area.top + 16 && right.y < area.bottom - 16;
    if (visible || area.width <= 720) return;
    const zoom = getZoom();
    void setCenter(node.x + node.width / 2 + covered / 2 / zoom, node.y + node.height / 2, { zoom, duration: 250 });
  }, [layout, panel, flowToScreenPosition, getZoom, setCenter]);

  const panelIndex = definition.steps.findIndex((step) => step.id === panel);
  const panelStep = panelIndex >= 0 ? definition.steps[panelIndex] : undefined;
  const panelOpen = panel === TRIGGER_ID || panelIndex >= 0;
  const hasOpenBranch = definition.steps.some((step) => flowPorts(step).some((port) => !port.target));
  return <ThemeProvider theme={portalTheme}>
    <Box ref={canvasRef} tabIndex={0} aria-label="Conversation flow canvas" onPointerDownCapture={(event) => {
      if (!(event.target as HTMLElement).closest("input, textarea, select, button, [contenteditable=true], [role=dialog]")) canvasRef.current?.focus({ preventScroll: true });
    }} onKeyDown={(event) => {
      const editingText = Boolean((event.target as HTMLElement).closest("input, textarea, select, [contenteditable=true]"));
      if (event.key === "Escape" && panelOpen && !menu && !editingText) { closePanel(); return; }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedEdge && !editingText && !menu) { event.preventDefault(); disconnect(); return; }
      const command = canvasHistoryShortcut(event.key, event.shiftKey, event.ctrlKey || event.metaKey, editingText);
      if (!command || busy || menu) return;
      event.preventDefault(); event.stopPropagation();
      setSelectedEdge(null);
      if (command === "undo") editor.undo(); else editor.redo();
    }} sx={{ border: "1px solid #cbd5e1", borderRadius: 1.5, overflow: "hidden", bgcolor: "#fff", "&:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: 2 }, "&:fullscreen": { display: "flex", flexDirection: "column", height: "100dvh", width: "100vw", border: 0, borderRadius: 0 } }}>
      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, p: 1.5, bgcolor: "#fff", borderBottom: "1px solid #e2e8f0" }}>
        <Button variant="outlined" size="small" startIcon={<AddRoundedIcon />} disabled={Boolean(busy) || definition.steps.length >= MAX_STEPS} onClick={(event) => {
          const selected = definition.steps.find((step) => step.id === selectedStepId);
          const parentOfEnd = selected?.type === "END" ? definition.steps.find((step) => flowPorts(step).some((port) => port.target === selected.id)) : undefined;
          const endIds = new Set(definition.steps.filter((step) => step.type === "END").map((step) => step.id));
          const lastBeforeEnd = [...definition.steps].reverse().find((step) => step.type !== "END" && flowPorts(step).some((port) => port.target && endIds.has(port.target)));
          const source = selected && selected.type !== "END" ? selected : parentOfEnd ?? lastBeforeEnd;
          const port = source ? flowPorts(source).find((outlet) => parentOfEnd ? outlet.target === selected?.id : true) : undefined;
          openMenu(event.currentTarget, source?.id ?? TRIGGER_ID, [port?.id ?? "entry"]);
        }}>Add Step</Button>
        <Tooltip title="Undo (Ctrl+Z / ⌘Z)"><span><IconButton aria-label="Undo" size="small" disabled={Boolean(busy) || !editor.canUndo} onClick={() => { setSelectedEdge(null); editor.undo(); }}><UndoRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="Redo (Ctrl+Y / Ctrl+Shift+Z)"><span><IconButton aria-label="Redo" size="small" disabled={Boolean(busy) || !editor.canRedo} onClick={() => { setSelectedEdge(null); editor.redo(); }}><RedoRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        {hasOpenBranch && <Button size="small" startIcon={<StopCircleOutlinedIcon />} disabled={Boolean(busy) || definition.steps.length >= MAX_STEPS} onClick={() => editor.patchDefinition(finishFlowBranches(definition))}>Finish Open Branches</Button>}
        <Button size="small" startIcon={<AutoAwesomeRoundedIcon />} disabled={Boolean(busy)} onClick={async () => { if (document.fullscreenElement) await document.exitFullscreen(); editor.setAiDraftOpen(true); }}>Create with AI</Button>
        {fullscreen && <Button size="small" variant="outlined" disabled={!editor.dirty || Boolean(busy) || editor.clientIssues.length > 0} onClick={editor.save}>Save draft</Button>}
        <Tooltip title="Arrange every step into a neat tree again"><span><Button size="small" startIcon={<AccountTreeOutlinedIcon />} disabled={Boolean(busy)} onClick={tidyUp}>Tidy up</Button></span></Tooltip>
        {selectedEdge && <Button color="error" size="small" disabled={Boolean(busy)} startIcon={<CloseRoundedIcon />} onClick={disconnect}>Delete this connection</Button>}
        <Typography sx={{ flex: 1, fontSize: 11.5, color: "#475569", textAlign: { xs: "left", sm: "right" } }}>{definition.steps.length}/{MAX_STEPS} steps · drag steps to move them · click a line to delete it</Typography>
        <Tooltip title={fullscreen ? "Exit fullscreen (Esc)" : "Open fullscreen"}><IconButton aria-label={fullscreen ? "Exit fullscreen" : "Open fullscreen"} size="small" onClick={async () => {
          try { if (document.fullscreenElement === canvasRef.current) await document.exitFullscreen(); else await canvasRef.current?.requestFullscreen(); }
          catch { feedback.error("Could not open fullscreen. Try again from the browser window."); }
        }}>{fullscreen ? <FullscreenExitRoundedIcon /> : <FullscreenRoundedIcon />}</IconButton></Tooltip>
      </Box>
      <Box sx={{ position: "relative", height: fullscreen ? "auto" : { xs: 620, lg: "75vh" }, flex: fullscreen ? 1 : undefined, minHeight: fullscreen ? 0 : 560, maxHeight: fullscreen ? "none" : 900, bgcolor: "#f8fafc", "& .react-flow__node:focus-visible": { outline: "2px solid #1e3a8a", outlineOffset: 4, borderRadius: "12px" } }}>
        <ReactFlow<StepNode, LinkEdge> nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.15, maxZoom: 1 }} minZoom={0.2} maxZoom={1.5}
          onNodeClick={(_, node) => { if (node.id === TRIGGER_ID) { setPanel(TRIGGER_ID); setSelectedEdge(null); reveal.current = TRIGGER_ID; } else if (!node.id.startsWith("__open:")) openStep(node.id); }}
          onEdgeClick={(_, edge) => chooseLink(edge.id)}
          onPaneClick={() => { setSelectedStepId(null); setSelectedEdge(null); closePanel(); }}
          onNodeDragStart={(_, __, moving) => setDrag({ base: layout, moving: new Set(moving.map((node) => node.id)) })}
          onNodesChange={(changes) => {
            const moves = changes.flatMap((change) => change.type === "position" && change.position ? [{ id: change.id, at: change.position, active: Boolean(change.dragging) }] : []);
            const active = moves.filter((move) => move.active), done = moves.filter((move) => !move.active);
            if (active.length) setDragging((previous) => ({ ...previous, ...Object.fromEntries(active.map((move) => [move.id, move.at])) }));
            // A drop, or a nudge with the arrow keys, saves the new spot (one undo step).
            if (done.length) {
              editor.setPositions({ ...placed, ...dragging, ...Object.fromEntries(done.map((move) => [move.id, move.at])) });
              setDragging({}); setDrag(null);
            }
          }}
          onNodeDragStop={() => { setDrag(null); }}
          nodesDraggable={!busy} nodesConnectable={false} deleteKeyCode={null} zoomOnDoubleClick={false}
          proOptions={{ hideAttribution: true }} colorMode="light">
          <Background gap={22} size={1} color="#cbd5e1" />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
        {panelOpen && <Box role="complementary" aria-label={panel === TRIGGER_ID ? "Conversation trigger settings" : "Step settings"} sx={{ position: "absolute", top: 0, right: 0, bottom: 0, width: { xs: "100%", md: PANEL_WIDTH }, maxWidth: "100%", zIndex: 5, display: "flex", flexDirection: "column", bgcolor: "#fff", borderLeft: "1px solid #cbd5e1", boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.08)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.75, borderBottom: "1px solid #e2e8f0" }}>
            {panelStep ? <Box sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: `${STEP_TYPE_META[panelStep.type].tone}14`, color: STEP_TYPE_META[panelStep.type].tone }}>{React.createElement(stepIcons[panelStep.type], { sx: { fontSize: 20 } })}</Box> : null}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{panelStep ? STEP_TYPE_META[panelStep.type].label : "What starts this conversation"}</Typography>
              <Typography noWrap sx={{ fontSize: 11.5, color: "#64748b", fontFamily: panelStep ? "monospace" : undefined }}>{panelStep ? panelStep.id : "Name, description and starter"}</Typography>
            </Box>
            <Tooltip title="Close (Esc)"><IconButton aria-label="Close settings" size="small" onClick={closePanel}><CloseRoundedIcon /></IconButton></Tooltip>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2.5, py: 2.5, display: "flex", flexDirection: "column", gap: 3 }}>
            {!panelStep ? <FlowMetaFields editor={editor} meta={meta} />
              : <Box component="fieldset" disabled={Boolean(busy)} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}><StepCard key={panelIndex} definition={definition} step={panelStep} index={panelIndex} meta={meta} issues={editor.issues.filter((issue) => issue.step === panelStep.id).map((issue) => issue.message)} canRemove={definition.steps.length > 1 || panelStep.type !== "END"} onChange={(step) => { editor.updateStep(panelIndex, step); if (step.id !== panel) { setPanel(step.id); if (placed[panelStep.id]) pinPositions({ ...placed, [step.id]: placed[panelStep.id] }); } }} onRemove={() => remove(panelStep.id)} /></Box>}
          </Box>
        </Box>}
      </Box>
    </Box>
    <Menu container={() => document.fullscreenElement ?? document.body} anchorReference="anchorPosition" anchorPosition={menu?.at} transformOrigin={{ vertical: "top", horizontal: "center" }} open={Boolean(menu)} onClose={() => setMenu(null)} slotProps={{ paper: { sx: { maxHeight: 460, width: 330 } } }}>
      <Typography sx={{ px: 2, py: 1.5, fontSize: 14, fontWeight: 700 }}>Add Next Step</Typography>
      {(Object.keys(STEP_TYPE_META) as ApiFlowStepType[]).filter((type) => meta.stepTypes.includes(type)).map((type) => <MenuItem key={type} disabled={Boolean(busy) || definition.steps.length >= MAX_STEPS || (type === "END" && Boolean(menuDestination) && menuDestination?.type !== "END")} onClick={() => addStep(type)} sx={{ whiteSpace: "normal", gap: 1.25, py: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, color: STEP_TYPE_META[type].tone, bgcolor: "#f1f5f9", borderRadius: 1, flexShrink: 0 }}>{React.createElement(stepIcons[type], { sx: { fontSize: 20 } })}</Box>
        <Box><Typography sx={{ fontSize: 13, fontWeight: 600 }}>{STEP_TYPE_META[type].label}</Typography><Typography sx={{ fontSize: 11, color: "#475569" }}>{type === "END" && menuDestination && menuDestination.type !== "END" ? "This branch already continues to another step." : STEP_TYPE_META[type].hint}</Typography></Box>
      </MenuItem>)}
      {menu && menu.source !== TRIGGER_ID && <Divider />}
      {menu && menu.source !== TRIGGER_ID && <Typography sx={{ px: 2, py: 1, fontSize: 12, fontWeight: 700 }}>Or connect an existing step</Typography>}
      {menu && menu.source !== TRIGGER_ID && definition.steps.filter((step) => menu.ports.every((port) => canConnect(definition, menu.source, port, step.id))).map((step) => <MenuItem key={step.id} onClick={() => { connect(menu.source, menu.ports, step.id); setMenu(null); }}><Typography sx={{ fontSize: 12 }}>{STEP_TYPE_META[step.type].label} · {step.id}</Typography></MenuItem>)}
    </Menu>
    <Dialog container={() => document.fullscreenElement ?? document.body} open={Boolean(deleting)} onClose={() => setDeleting(null)} fullWidth maxWidth="sm">
      <DialogTitle>Which path should continue?</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 2 }}>{deleting === definition.steps[0]?.id ? "This step splits into several paths. Choose the step the conversation should start at instead." : "This step splits into several paths. Choose the step that whatever led here should continue to."} The other paths stay on the canvas, marked “Not connected”, so you can reconnect or delete them.</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {(deleting ? deletionSuccessors(definition, deleting) : []).map((id) => <Button key={id} variant="outlined" disabled={Boolean(busy)} onClick={() => remove(deleting!, id)} sx={{ justifyContent: "flex-start" }}>{STEP_TYPE_META[definition.steps.find((step) => step.id === id)!.type].label} · {id}</Button>)}
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
        </Box>
      </DialogContent>
    </Dialog>
  </ThemeProvider>;
}

export function FlowCanvasBuilder(props: { editor: LoadedFlowEditor; meta: ApiFlowMeta }) {
  return <ReactFlowProvider><Canvas key={props.editor.detail.key} {...props} /></ReactFlowProvider>;
}
