export type StatusVariant = 'running' | 'completed' | 'failed' | 'pending' | 'cancelled'

const LABELS: Record<StatusVariant, string> = {
  running: 'Running',
  completed: 'Complete',
  failed: 'Failed',
  pending: 'Pending',
  cancelled: 'Cancelled',
}

const CLASSES: Record<StatusVariant, string> = {
  running: 'badge-amber',
  completed: 'badge-green',
  failed: 'badge-red',
  pending: 'badge-gray',
  cancelled: 'badge-gray',
}

export function statusBadge(status: StatusVariant) {
  return <span className={`badge ${CLASSES[status]}`}>{LABELS[status]}</span>
}
