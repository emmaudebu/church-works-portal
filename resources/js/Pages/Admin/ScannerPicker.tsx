import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { ScanLine } from 'lucide-react';

export default function ScannerPicker({
    services,
}: {
    services: {
        id: number;
        title: string;
        department: string;
        date_label: string;
        window: string;
        accepting: boolean;
    }[];
}) {
    return (
        <AdminLayout>
            <Head title="Attendance Scanner" />

            <h1 className="text-3xl">Attendance Scanner</h1>
            <div className="gold-rule mb-6" />

            {services.length === 0 ? (
                <EmptyState
                    icon={ScanLine}
                    message="No services this week. Create one under Services."
                />
            ) : (
                <ul className="max-w-2xl space-y-3">
                    {services.map((service) => (
                        <li key={service.id}>
                            <Link
                                href={route('admin.scanner.show', service.id)}
                                className="card flex items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                            >
                                <span>
                                    <span className="block font-medium">
                                        {service.title}
                                    </span>
                                    <span className="text-sm text-neutral-600">
                                        {service.department} ·{' '}
                                        {service.date_label} · {service.window}
                                    </span>
                                </span>
                                {service.accepting && (
                                    <Badge variant="success">Open now</Badge>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </AdminLayout>
    );
}
