import Badge from '@/Components/Badge';
import DepartmentIcon from '@/Components/DepartmentIcon';
import { Department } from '@/types';
import { Link } from '@inertiajs/react';

export default function DepartmentCard({
    department,
}: {
    department: Department;
}) {
    const active = department.status === 'active';

    const body = (
        <>
            <div className="flex items-start justify-between gap-3">
                <span
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                        active
                            ? 'bg-gold-50 text-primary-700'
                            : 'bg-neutral-200 text-neutral-600'
                    }`}
                >
                    <DepartmentIcon name={department.icon} />
                </span>
                {active ? (
                    <Badge variant="success">Active</Badge>
                ) : (
                    <Badge variant="gold">Coming Soon</Badge>
                )}
            </div>
            <h3 className="mt-4 text-xl">{department.name}</h3>
            {department.description && (
                <p className="mt-1 text-sm text-neutral-600">
                    {department.description}
                </p>
            )}
            {active && (
                <p className="mt-3 text-sm tabular-nums text-neutral-600">
                    {department.members_count}{' '}
                    {department.members_count === 1 ? 'member' : 'members'}
                </p>
            )}
        </>
    );

    if (!active) {
        return <div className="card bg-neutral-50 p-6 shadow-none">{body}</div>;
    }

    return (
        <Link
            href={route('register')}
            className="card block border-t-2 border-gold-500 p-6 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
        >
            {body}
        </Link>
    );
}
