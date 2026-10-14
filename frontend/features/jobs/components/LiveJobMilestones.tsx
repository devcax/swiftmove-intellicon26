import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import { humanize, fmtDateTime } from '@/lib/format';

/** Actual recorded progress; no inferred intermediate stages. */
export function LiveJobMilestones({ previousStatus, currentStatus, changedAt }: {
  previousStatus?: string | null; currentStatus: string; changedAt?: string | null;
}) {
  return <Box sx={{ bgcolor: '#f8fafc', borderRadius: 1, p: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <LocalShippingOutlinedIcon sx={{ color: '#1e3a8a', fontSize: 35, mb: 1.5 }} />
    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 2 }}>Live progress</Typography>
    <Box component="ol" aria-label="Live milestones" sx={{ m: 0, p: 0, listStyle: 'none' }}>
      <Box component="li" sx={{ position: 'relative', pl: 3, pb: 3, '&::before': { content: '""', position: 'absolute', left: 7, top: 18, bottom: 0, borderLeft: '1px solid #cbd5e1' } }}>
        <CheckCircleOutlineRoundedIcon sx={{ position: 'absolute', left: -1, top: 1, color: '#64748b', fontSize: 18 }} />
        <Typography sx={{ fontSize: 10.5, color: '#475569', mb: 0.5 }}>Previous milestone</Typography>
        <Typography sx={{ fontSize: 12.5, lineHeight: 1.6, fontWeight: 500, overflowWrap: 'anywhere' }}>{previousStatus ? humanize(previousStatus) : 'Not recorded'}</Typography>
      </Box>
      <Box component="li" aria-current="step" sx={{ position: 'relative', pl: 3 }}>
        <Box aria-hidden="true" sx={{ position: 'absolute', top: 3, left: 2, width: 12, height: 12, borderRadius: '50%', bgcolor: '#1e3a8a', boxShadow: '0 0 0 3px #e0e7ff' }} />
        <Typography sx={{ fontSize: 10.5, color: '#1e3a8a', mb: 0.5 }}>Current milestone</Typography>
        <Typography sx={{ fontSize: 13, color: '#1e3a8a', fontWeight: 700, lineHeight: 1.6, overflowWrap: 'anywhere' }}>{humanize(currentStatus)}</Typography>
        {changedAt && <Typography sx={{ fontSize: 10.5, color: '#475569', lineHeight: 1.6, mt: 0.75 }}>{fmtDateTime(changedAt)}</Typography>}
      </Box>
    </Box>
  </Box>;
}
