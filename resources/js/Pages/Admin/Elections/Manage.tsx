import Avatar from '@/Components/Avatar';
import Badge from '@/Components/Badge';
import DangerButton from '@/Components/DangerButton';
import ElectionResults from '@/Components/ElectionResults';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import {
    BallotCandidate,
    ElectionStatus,
    PositionResult,
    Turnout,
} from '@/types';
import { Head, router, useForm, usePoll } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler, PropsWithChildren, useState } from 'react';
import { STATUS_BADGES } from './Index';

type Election = {
    id: number;
    title: string;
    results_public: boolean;
    status: ElectionStatus;
    starts_at: string;
    ends_at: string;
    locked: boolean;
    has_votes: boolean;
};

type PositionRow = {
    id: number;
    title: string;
    candidates: BallotCandidate[];
};

type Member = { id: number; full_name: string };

const POLL_MS = 4000;

function Panel({ title, children }: PropsWithChildren<{ title: string }>) {
    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">{title}</h2>
            <div className="mt-4">{children}</div>
        </section>
    );
}

function CandidateForm({
    position,
    members,
}: {
    position: PositionRow;
    members: Member[];
}) {
    const form = useForm<{
        user_id: string;
        manifesto: string;
        photo: File | null;
    }>({ user_id: '', manifesto: '', photo: null });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.candidates.store', position.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    return (
        <form
            onSubmit={submit}
            className="mt-3 space-y-3 rounded-lg bg-neutral-50 p-3"
        >
            <div>
                <InputLabel
                    htmlFor={`candidate-${position.id}`}
                    value="Add a candidate"
                />
                <select
                    id={`candidate-${position.id}`}
                    value={form.data.user_id}
                    required
                    onChange={(e) => form.setData('user_id', e.target.value)}
                    className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                >
                    <option value="">Choose a member</option>
                    {members.map((member) => (
                        <option key={member.id} value={member.id}>
                            {member.full_name}
                        </option>
                    ))}
                </select>
                <InputError message={form.errors.user_id} className="mt-2" />
            </div>
            <div>
                <InputLabel
                    htmlFor={`manifesto-${position.id}`}
                    value="Manifesto (optional)"
                />
                <textarea
                    id={`manifesto-${position.id}`}
                    rows={3}
                    value={form.data.manifesto}
                    onChange={(e) => form.setData('manifesto', e.target.value)}
                    className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                />
                <InputError message={form.errors.manifesto} className="mt-2" />
            </div>
            <div>
                <label
                    htmlFor={`photo-${position.id}`}
                    className="block text-sm font-medium"
                >
                    Photo (optional, uses their passport photo if left empty)
                </label>
                <input
                    id={`photo-${position.id}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) =>
                        form.setData('photo', e.target.files?.[0] ?? null)
                    }
                    className="mt-1 block w-full text-sm"
                />
                <InputError message={form.errors.photo} className="mt-2" />
            </div>
            <PrimaryButton disabled={form.processing}>
                Add candidate
            </PrimaryButton>
        </form>
    );
}

export default function Manage({
    election,
    positions,
    members,
    results,
    turnout,
}: {
    election: Election;
    positions: PositionRow[];
    members: Member[];
    results: PositionResult[];
    turnout: Turnout;
}) {
    const [confirming, setConfirming] = useState<'close' | 'delete' | null>(
        null,
    );

    const details = useForm({
        title: election.title,
        starts_at: election.starts_at,
        ends_at: election.ends_at,
    });

    const position = useForm({ title: '' });

    const { start, stop } = usePoll(
        POLL_MS,
        { only: ['results', 'turnout', 'election'] },
        { autoStart: election.status === 'open' },
    );

    const saveDetails: FormEventHandler = (e) => {
        e.preventDefault();

        details.patch(route('admin.elections.update', election.id), {
            preserveScroll: true,
        });
    };

    const addPosition: FormEventHandler = (e) => {
        e.preventDefault();

        position.post(route('admin.positions.store', election.id), {
            preserveScroll: true,
            onSuccess: () => position.reset(),
        });
    };

    const remove = (url: string) =>
        router.delete(url, { preserveScroll: true });

    const closed = election.status === 'closed';

    const closeVoting = () =>
        router.post(
            route('admin.elections.close', election.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    stop();
                    setConfirming(null);
                },
                onError: () => start(),
            },
        );

    return (
        <AdminLayout>
            <Head title={election.title} />

            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl">{election.title}</h1>
                <Badge variant={STATUS_BADGES[election.status].variant}>
                    {STATUS_BADGES[election.status].label}
                </Badge>
            </div>
            <div className="gold-rule mb-6" />

            <div className="mb-6 max-w-5xl">
                <ElectionResults
                    title={election.title}
                    results={results}
                    turnout={turnout}
                    live={election.status === 'open'}
                />
            </div>

            <div className="max-w-3xl space-y-6">

                <Panel title="Publishing">
                    <label className="flex items-start gap-3">
                        <input
                            type="checkbox"
                            role="switch"
                            checked={election.results_public}
                            onChange={(e) =>
                                router.patch(
                                    route('admin.elections.results', election.id),
                                    { results_public: e.target.checked },
                                    { preserveScroll: true },
                                )
                            }
                            className="mt-0.5 rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                        />
                        <span className="text-sm">
                            <span className="block font-medium">
                                Publish results
                            </span>
                            <span className="text-neutral-600">
                                {election.results_public
                                    ? 'All members in this department can see the results.'
                                    : 'Only admins can see the results.'}
                                {election.status === 'open' &&
                                    ' Publishing while voting is open lets members see the count before they vote.'}
                            </span>
                        </span>
                    </label>
                </Panel>

                <Panel title="Details">
                    {closed ? (
                        <p className="text-sm text-neutral-600">
                            This election has closed and can no longer be
                            changed.
                        </p>
                    ) : (
                        <form onSubmit={saveDetails} className="space-y-4">
                            {!election.locked && (
                                <>
                                    <div>
                                        <InputLabel
                                            htmlFor="title"
                                            value="Title"
                                        />
                                        <TextInput
                                            id="title"
                                            value={details.data.title}
                                            onChange={(e) =>
                                                details.setData(
                                                    'title',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="mt-1 block w-full"
                                        />
                                        <InputError
                                            message={details.errors.title}
                                            className="mt-2"
                                        />
                                    </div>
                                    <div>
                                        <InputLabel
                                            htmlFor="starts_at"
                                            value="Voting opens"
                                        />
                                        <TextInput
                                            id="starts_at"
                                            type="datetime-local"
                                            value={details.data.starts_at}
                                            onChange={(e) =>
                                                details.setData(
                                                    'starts_at',
                                                    e.target.value,
                                                )
                                            }
                                            required
                                            className="mt-1 block w-full"
                                        />
                                        <InputError
                                            message={details.errors.starts_at}
                                            className="mt-2"
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <InputLabel
                                    htmlFor="ends_at"
                                    value="Voting closes"
                                />
                                <TextInput
                                    id="ends_at"
                                    type="datetime-local"
                                    value={details.data.ends_at}
                                    onChange={(e) =>
                                        details.setData(
                                            'ends_at',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className="mt-1 block w-full"
                                />
                                <InputError
                                    message={details.errors.ends_at}
                                    className="mt-2"
                                />
                            </div>
                            <PrimaryButton disabled={details.processing}>
                                Save
                            </PrimaryButton>
                        </form>
                    )}
                </Panel>

                <Panel title="Ballot">
                    {election.locked && (
                        <p className="mb-3 rounded-lg bg-gold-50 p-3 text-sm">
                            The ballot is locked because voting has started.
                        </p>
                    )}

                    <div className="space-y-5">
                        {positions.map((row) => (
                            <section
                                key={row.id}
                                className="border-b border-neutral-200 pb-4 last:border-0"
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-lg">{row.title}</h3>
                                    {!election.locked && (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                remove(
                                                    route(
                                                        'admin.positions.destroy',
                                                        row.id,
                                                    ),
                                                )
                                            }
                                            className="text-sm text-danger underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                                        >
                                            Remove position
                                        </button>
                                    )}
                                </div>

                                {row.candidates.length === 0 ? (
                                    <p className="mt-1 text-sm text-neutral-600">
                                        No candidates yet.
                                    </p>
                                ) : (
                                    <ul className="mt-2 space-y-2">
                                        {row.candidates.map((candidate) => (
                                            <li
                                                key={candidate.id}
                                                className="flex items-center gap-3 text-sm"
                                            >
                                                <Avatar
                                                    name={candidate.full_name}
                                                    src={candidate.photo_url}
                                                />
                                                <span className="min-w-0 flex-1 truncate">
                                                    {candidate.full_name}
                                                </span>
                                                {!election.locked && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove ${candidate.full_name}`}
                                                        onClick={() =>
                                                            remove(
                                                                route(
                                                                    'admin.candidates.destroy',
                                                                    candidate.id,
                                                                ),
                                                            )
                                                        }
                                                        className="rounded-lg p-1 text-neutral-600 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                                    >
                                                        <X
                                                            size={20}
                                                            strokeWidth={1.75}
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {!election.locked && (
                                    <CandidateForm
                                        position={row}
                                        members={members}
                                    />
                                )}
                            </section>
                        ))}
                    </div>

                    {!election.locked && (
                        <form
                            onSubmit={addPosition}
                            className="mt-4 flex flex-wrap items-end gap-3"
                        >
                            <div className="min-w-0 flex-1 basis-48">
                                <InputLabel
                                    htmlFor="position-title"
                                    value="Add a position"
                                />
                                <TextInput
                                    id="position-title"
                                    value={position.data.title}
                                    placeholder="For example Unit Head"
                                    onChange={(e) =>
                                        position.setData(
                                            'title',
                                            e.target.value,
                                        )
                                    }
                                    required
                                    className="mt-1 block w-full"
                                />
                                <InputError
                                    message={position.errors.title}
                                    className="mt-2"
                                />
                            </div>
                            <PrimaryButton disabled={position.processing}>
                                Add position
                            </PrimaryButton>
                        </form>
                    )}
                </Panel>

                <div className="flex flex-wrap gap-3">
                    {election.status === 'open' && (
                        <DangerButton
                            type="button"
                            onClick={() => setConfirming('close')}
                        >
                            Close voting now
                        </DangerButton>
                    )}
                    {!election.has_votes && (
                        <DangerButton
                            type="button"
                            onClick={() => setConfirming('delete')}
                        >
                            Delete election
                        </DangerButton>
                    )}
                </div>
            </div>

            <Modal
                show={confirming !== null}
                onClose={() => setConfirming(null)}
                maxWidth="md"
            >
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl">
                        {confirming === 'close'
                            ? 'Close voting now?'
                            : 'Delete this election?'}
                    </h2>
                    <p className="mt-2 text-sm text-neutral-600">
                        {confirming === 'close'
                            ? 'Members will no longer be able to vote. This can not be undone.'
                            : 'The election, its positions and its candidates will be removed.'}
                    </p>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setConfirming(null)}>
                            Cancel
                        </SecondaryButton>
                        <DangerButton
                            type="button"
                            onClick={() =>
                                confirming === 'close'
                                    ? closeVoting()
                                    : router.delete(
                                          route(
                                              'admin.elections.destroy',
                                              election.id,
                                          ),
                                      )
                            }
                        >
                            {confirming === 'close' ? 'Close voting' : 'Delete'}
                        </DangerButton>
                    </div>
                </div>
            </Modal>
        </AdminLayout>
    );
}
