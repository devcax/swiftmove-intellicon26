"use client";

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { FeedbackDialog } from '@/shared/components/FeedbackDialog';
import { dashboardPageWidth } from '@/shared/styles/pageLayout';
import { feedback } from '@/shared/feedback/store';
import { publishPolicy } from '../api';
import type { ApiPolicy } from '../types';
import { usePolicyCreation } from '../hooks/usePolicyCreation';
import PolicyBuilderDialog from './PolicyBuilderDialog';
import PolicySections from './PolicySections';

/** Revise on a dedicated page, then explicitly choose whether the saved draft should go live. */
export function PolicyEditPage({ policyId }: { policyId: string }) {
  const router = useRouter();
  const { data, flows, error, retry, saved, onSaved } = usePolicyCreation();
  const [published, setPublished] = React.useState<ApiPolicy | null>(null);
  const [showPublish, setShowPublish] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [publishError, setPublishError] = React.useState<string | null>(null);
  const running = React.useRef(false);
  const base = data?.policies.find(policy => policy.id === policyId);
  const live = base && data?.policies.find(policy => policy.key === base.key && policy.status === 'PUBLISHED');
  const current = published ?? saved?.policy;
  const publish = async () => {
    if (!saved || running.current) return;
    running.current = true;
    setPublishing(true);
    setPublishError(null);
    try {
      const policy = await publishPolicy(saved.policy.id);
      setPublished(policy);
      setShowPublish(false);
      feedback.success(`Version ${policy.version} of “${policy.name}” is now live.`);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Could not publish. Your draft is still saved.');
    } finally {
      running.current = false;
      setPublishing(false);
    }
  };

  return <Box sx={{ ...dashboardPageWidth, py: { xs: 1.5, sm: 2.5 } }}>
    <Button component={Link} href="/policies" variant="outlined" startIcon={<ArrowBackRoundedIcon />} sx={{ mb: 2.5 }}>All operational rules</Button>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={retry}>Retry</Button>} sx={{ mb: 2 }}>{error}</Alert>}
    {!data && !error && <Skeleton variant="rounded" height={400} aria-label="Loading policy editor" />}
    {data && !base && <Alert severity="warning">This policy version could not be found. Return to operational rules and select a version to edit.</Alert>}
    {data && base && !current && <>
      <Alert severity="info" sx={{ mb: 2.5 }}>
        Editing version {base.version} of “{base.name}”. Saving creates a new draft. {live ? `Live version ${live.version} stays active until you publish the draft.` : 'Publish the saved draft when you are ready to activate this rule.'}
      </Alert>
      {data.store.source === 'fallback' && <Alert severity="warning" sx={{ mb: 2 }}>Policy storage is unavailable. Apply the database migrations before saving.</Alert>}
      <PolicyBuilderDialog embedded mode="revise" base={base} capabilities={data.capabilities} actions={data.actions} flows={flows}
        onClose={() => router.push('/policies')}
        onSaved={(policy, verb) => { onSaved(policy, verb); setShowPublish(true); window.scrollTo({ top: 0, behavior: 'auto' }); }} />
    </>}
    {data && current && <Paper sx={{ border: 0, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ px: { xs: 2, sm: 3 }, py: 2.5, borderBottom: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Typography component="h2" sx={{ fontSize: 20, fontWeight: 700 }}>{published ? 'Policy published' : 'Draft saved — ready to publish?'}</Typography>
          <Chip size="small" label={`Version ${current.version} · ${published ? 'Live' : 'Draft'}`} color={published ? 'success' : 'default'} />
        </Box>
        <Typography sx={{ fontSize: 13, color: '#475569' }}>{published
          ? 'This version is now active for the bot, dashboard, and timers.'
          : 'Review the saved version below. Publish it to activate the changes, or keep it as a draft for later.'}</Typography>
      </Box>
      <Box sx={{ p: { xs: 2, sm: 3 } }}><PolicySections policy={current} capabilities={data.capabilities} actions={data.actions} flows={flows} /></Box>
      <Box sx={{ borderTop: '1px solid #e2e8f0', p: { xs: 2, sm: 3 }, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1.5 }}>
        <Button component={Link} href="/policies" variant="outlined">{published ? 'Back to operational rules' : 'Keep as draft'}</Button>
        {!published && <Button variant="contained" onClick={() => setShowPublish(true)}>Publish this version</Button>}
      </Box>
    </Paper>}
    <FeedbackDialog open={showPublish && Boolean(saved)} title="Draft saved. Publish this version now?"
      message={`Version ${saved?.policy.version} of “${saved?.policy.name}” will go live immediately.${live ? ` It will replace live version ${live.version}.` : ''}`}
      severity="info" confirmation confirmLabel="Publish this version" cancelLabel="Keep as draft" pending={publishing} error={publishError}
      onClose={() => { setShowPublish(false); setPublishError(null); }} onConfirm={() => void publish()} />
  </Box>;
}
