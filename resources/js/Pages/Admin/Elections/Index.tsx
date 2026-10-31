import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { ElectionStatus } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Vote } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Row = {
    id: number;
    title: string;
    results_public: boolean;
    status: ElectionStatus;
    department: string;
    window: string;
};

export const STATUS_BADGES = {
    open: { variant: 'success', label: 'Open' },
    upcoming: { variant: 'gold', label: 'Upcoming' },
    closed: { variant: 'warning', label: 'Closed' },
} as const;

export default function Index({
    elections,
    canCreate,
}: {
    elections: Row[];
    canCreate: boolean;
}) {
    const [creating, setCreating] = useState(false);

    const form = useForm({ title: '', starts_at: '', ends_at: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.elections.store'));
    };

    return (
        <AdminLayout>
            <Head title="Elections" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Elections</h1>
                    <div className="gold-rule" />
                </div>
                {canCreate ? (
                    <PrimaryButton
                        type="button"
                        onClick={() => setCreating(true)}
                    >
                        New election
                    </PrimaryButton>
                ) : (
                    <p className="text-sm text-neutral-600">
                        Choose a department in the top bar to add an election.
                    </p>
                )}
            </div>

            <div className="mt-6 max-w-3xl">
                {elections.length === 0 ? (
                    <EmptyState icon={Vote} message="No elections yet." />
                ) : (
                    <ul className="space-y-3">
                        {elections.map((election) => (
                            <li key={election.id}>
                                <Link
                                    href={route(
                                        'admin.elections.show',
                                        election.id,
                                    )}
                                    className="card flex flex-wrap items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    <span className="min-w-0">
                                        <span className="block font-medium">
                                            {election.title}
                                        </span>
                                        <span className="text-sm text-neutral-600">
                                            {election.department} ·{' '}
                                            {election.window}
                                        </span>
                                    </span>
                                    <Badge
                                        variant={
                                            STATUS_BADGES[election.status]
                                                .variant
                                        }
                                    >
                                        {STATUS_BADGES[election.status].label}
                                    </Badge>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <Modal
                show={creating}
                onClose={() => setCreating(false)}
                maxWidth="md"
            >
                <form onSubmit={submit} className="space-y-4 p-4 sm:p-6">
                    <h2 className="text-xl">New election</h2>
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
                        <InputLabel htmlFor="starts_at" value="Voting opens" />
                        <TextInput
                            id="starts_at"
                            type="datetime-local"
                            value={form.data.starts_at}
                            onChange={(e) =>
                                form.setData('starts_at', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError
                            message={form.errors.starts_at}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <InputLabel htmlFor="ends_at" value="Voting closes" />
                        <TextInput
                            id="ends_at"
                            type="datetime-local"
                            value={form.data.ends_at}
                            onChange={(e) =>
                                form.setData('ends_at', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError
                            message={form.errors.ends_at}
                            className="mt-2"
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <SecondaryButton onClick={() => setCreating(false)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton disabled={form.processing}>
                            Create
                        </PrimaryButton>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
