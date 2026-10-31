import Badge from '@/Components/Badge';
import DepartmentIcon from '@/Components/DepartmentIcon';
import { Department } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

export default function DepartmentCard({
    department,
}: {
    department: Department;
}) {
    const active = department.status === 'active';

    return (
        <Link
            href={route('departments.show', department.slug)}
            className="reveal group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
        >
            <span className="relative block aspect-[16/10] overflow-hidden bg-charcoal-900">
                <img
                    src={department.image_url}
                    alt=""
                    loading="lazy"
                    className={`h-full w-full object-cover transition duration-500 group-hover:scale-105 ${
                        active ? '' : 'opacity-60 grayscale'
                    }`}
                />
                <span className="absolute right-3 top-3">
                    {active ? (
                        <Badge variant="success">Active</Badge>
                    ) : (
                        <Badge variant="gold">Coming Soon</Badge>
                    )}
                </span>
            </span>
            <span className="relative flex flex-1 flex-col p-5 pt-9">
                <span className="absolute -top-6 left-5 flex h-12 w-12 items-center justify-center rounded-full bg-gold-50 text-primary-700 ring-4 ring-white">
                    <DepartmentIcon name={department.icon} />
                </span>
                <span className="font-serif text-xl font-semibold">
                    {department.name}
                </span>
                {department.description && (
                    <span className="mt-1 text-sm text-neutral-600">
                        {department.description}
                    </span>
                )}
                <span className="mt-auto flex items-center justify-between pt-4 text-sm">
                    <span className="tabular-nums text-neutral-600">
                        {active
                            ? `${department.members_count} ${department.members_count === 1 ? 'member' : 'members'}`
                            : 'Opening soon'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-primary-700">
                        View
                        <ArrowRight
                            className="transition group-hover:translate-x-1"
                            size={16}
                            strokeWidth={1.75}
                            aria-hidden="true"
                        />
                    </span>
                </span>
            </span>
        </Link>
    );
}
