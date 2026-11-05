import Badge from '@/Components/Badge';
import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import Pagination, { PageLink } from '@/Components/Pagination';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { PageProps } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Service = {
    id: number;
    type: string;
    title: string;
    is_open: boolean;
    attendance_count: number;
    date: string;
    date_label: string;
    opens_at: string;
    closes_at: string;
    department: string;
    accepting: boolean;
    can_open: boolean;
    can_delete: boolean;
    recurring: boolean;
};

const blank = { title: '', date: '', opens_at: '', closes_at: '' };

export default function Services({
    services,
    canCreate,
}: {
    services: { data: Service[]; links: PageLink[] };
    canCreate: boolean;
}) {
    const canViewLog = usePage<PageProps>().props.auth.user.permissions.includes(
        'view_reports',
    );
    const [editing, setEditing] = useState<Service | 'new' | null>(null);
    const [deleting, setDeleting] = useState<Service | null>(null);
    const form = useForm(blank);

    const openForm = (service: Service | 'new') => {
        form.clearErrors();
        form.setData(service === 'new' ? blank : {
            title: service.title,
            date: service.date,
            opens_at: service.opens_at,
            closes_at: service.closes_at,
        });
        setEditing(service);
    };

    const save: FormEventHandler = (e) => {
        e.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => setEditing(null),
        };

        if (editing === 'new') {
            form.post(route('admin.services.store'), options);
        } else if (editing) {
            form.patch(route('admin.services.update', editing.id), options);
        }
    };

    const post = (name: string, id: number) =>
        router.post(route(name, id), {}, { preserveScroll: true });

    return (
        <AdminLayout>
            <Head title="Services" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Services</h1>
                    <div className="gold-rule" />
                </div>
                {canCreate ? (
                    <PrimaryButton type="button" onClick={() => openForm('new')}>
                        New special service
                    </PrimaryButton>
                ) : (
                    <p className="text-sm text-neutral-600">
                        Choose a department in the top bar to add a service.
                    </p>
                )}
            </div>

            <ul className="mt-6 max-w-4xl space-y-3">
                {services.data.map((service) => (
                    <li
                        key={service.id}
                        className="card flex flex-wrap items-center gap-3 p-4"
                    >
                        <div className="min-w-0 flex-1 basis-56">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-sans text-base font-semibold">
                                    {service.title}
                                </h2>
                                {service.accepting ? (
                                    <Badge variant="success">Open now</Badge>
                                ) : (
                                    !service.is_open && (
                                        <Badge variant="warning">Closed</Badge>
                                    )
                                )}
                            </div>
                            <p className="text-sm text-neutral-600">
                                {service.date_label} · {service.opens_at} to{' '}
                                {service.closes_at} · {service.department}
                            </p>
                            <p className="text-sm tabular-nums text-neutral-600">
                                {service.attendance_count} checked in
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={route('admin.scanner.show', service.id)}
                                className="inline-flex items-center rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                            >
                                Scanner
                            </Link>
                            {canViewLog && service.attendance_count > 0 && (
                                <Link
                                    href={route('admin.attendance-log', {
                                        service: service.id,
                                    })}
                                    className="inline-flex items-center rounded-lg border border-primary-700 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                                >
                                    Attendance log
                                </Link>
                            )}
                            {service.accepting ? (
                                <SecondaryButton
                                    onClick={() =>
                                        post('admin.services.close', service.id)
                                    }
                                >
                                    Close
                                </SecondaryButton>
                            ) : (
                                service.can_open && (
                                    <SecondaryButton
                                        onClick={() =>
                                            post(
                                                'admin.services.open',
                                                service.id,
                                            )
                                        }
                                    >
                                        Open now
                                    </SecondaryButton>
                                )
                            )}
                            <SecondaryButton onClick={() => openForm(service)}>
                                Edit
                            </SecondaryButton>
                            {service.can_delete && (
                                <DangerButton
                                    type="button"
                                    onClick={() => setDeleting(service)}
                                >
                                    Delete
                                </DangerButton>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            <Pagination links={services.links} />

            <Modal
                show={deleting !== null}
                onClose={() => setDeleting(null)}
                maxWidth="md"
            >
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl">Delete this service?</h2>
                    <p className="mt-1 text-sm font-medium">
                        {deleting?.title}, {deleting?.date_label}
                    </p>
                    {!!deleting?.attendance_count && (
                        <p className="mt-3 text-sm text-danger">
                            {deleting.attendance_count}{' '}
                            {deleting.attendance_count === 1
                                ? 'attendance record'
                                : 'attendance records'}{' '}
                            will be permanently removed, and members' attendance
                            rates will change. This can not be undone.
                        </p>
                    )}
                    {deleting?.recurring && (
                        <p className="mt-3 text-sm text-neutral-600">
                            Only this date is deleted. Other weeks of this
                            service are not affected.
                        </p>
                    )}
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setDeleting(null)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton
                            type="button"
                            onClick={() =>
                                deleting &&
                                router.delete(
                                    route(
                                        'admin.services.destroy',
                                        deleting.id,
                                    ),
                                    {
                                        preserveScroll: true,
                                        onSuccess: () => setDeleting(null),
                                    },
                                )
                            }
                        >
                            Delete service
                        </DangerButton>
                    </div>
                </div>
            </Modal>

            <Modal
                show={editing !== null}
                onClose={() => setEditing(null)}
                maxWidth="md"
            >
                <form onSubmit={save} className="space-y-4 p-4 sm:p-6">
                    <h2 className="text-xl">
                        {editing === 'new'
                            ? 'New special service'
                            : 'Edit service'}
                    </h2>
                    <div>
                        <InputLabel htmlFor="title" value="Title" />
                        <TextInput
                            id="title"
                            value={form.data.title}
                            onChange={(e) =>
                                form.setData('title', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError message={form.errors.title} className="mt-2" />
                    </div>
                    <div>
                        <InputLabel htmlFor="date" value="Date" />
                        <TextInput
                            id="date"
                            type="date"
                            value={form.data.date}
                            onChange={(e) =>
                                form.setData('date', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError message={form.errors.date} className="mt-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <InputLabel htmlFor="opens_at" value="Opens" />
                            <TextInput
                                id="opens_at"
                                type="time"
                                value={form.data.opens_at}
                                onChange={(e) =>
                                    form.setData('opens_at', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={form.errors.opens_at}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <InputLabel htmlFor="closes_at" value="Closes" />
                            <TextInput
                                id="closes_at"
                                type="time"
                                value={form.data.closes_at}
                                onChange={(e) =>
                                    form.setData('closes_at', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={form.errors.closes_at}
                                className="mt-2"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setEditing(null)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={form.processing}>
                            Save
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
