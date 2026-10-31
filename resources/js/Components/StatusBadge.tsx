import Badge from '@/Components/Badge';
import { MemberStatus } from '@/types';

const statuses = {
    active: { variant: 'success', label: 'Active' },
    pending: { variant: 'warning', label: 'Pending' },
    suspended: { variant: 'danger', label: 'Suspended' },
} as const;

export default function StatusBadge({ status }: { status: MemberStatus }) {
    const { variant, label } = statuses[status];

    return <Badge variant={variant}>{label}</Badge>;
}
