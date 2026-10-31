import Badge from '@/Components/Badge';
import EmptyState from '@/Components/EmptyState';
import MemberLayout from '@/Layouts/MemberLayout';
import { ElectionStatus } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Vote } from 'lucide-react';

type Row = {
    id: number;
    title: string;
    results_public: boolean;
    status: ElectionStatus;
    has_voted: boolean;
    window: string;
};

const GROUPS: { status: ElectionStatus; title: string }[] = [
    { status: 'open', title: 'Active' },
    { status: 'upcoming', title: 'Upcoming' },
    { status: 'closed', title: 'Closed' },
];

export default function Index({ elections }: { elections: Row[] }) {
    return (
        <MemberLayout>
            <Head title="Elections" />

            <h1 className="text-3xl">Elections</h1>
            <div className="gold-rule mb-6" />

            {elections.length === 0 && (
                <EmptyState icon={Vote} message="No elections right now." />
            )}

            <div className="space-y-6">
                {GROUPS.map(({ status, title }) => {
                    const rows = elections.filter(
                        (election) => election.status === status,
                    );

                    return (
                        rows.length > 0 && (
                            <section key={status}>
                                <h2 className="text-xl">{title}</h2>
                                <ul className="mt-2 space-y-3">
                                    {rows.map((election) => (
                                        <li
                                            key={election.id}
                                            className="card flex flex-wrap items-center justify-between gap-3 p-4"
                                        >
                                            <span className="min-w-0">
                                                <span className="block font-medium">
                                                    {election.title}
                                                </span>
                                                <span className="text-sm text-neutral-600">
                                                    {election.window}
                                                </span>
                                            </span>
                                            {status === 'open' &&
                                                !election.has_voted && (
                                                    <Link
                                                        href={route(
                                                            'member.elections.show',
                                                            election.id,
                                                        )}
                                                        className="rounded-lg bg-gold-500 px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2"
                                                    >
                                                        Vote now
                                                    </Link>
                                                )}
                                            {election.has_voted &&
                                                !election.results_public && (
                                                    <Badge variant="success">
                                                        Voted
                                                    </Badge>
                                                )}
                                            {election.results_public && (
                                                <Link
                                                    href={route(
                                                        'member.elections.results',
                                                        election.id,
                                                    )}
                                                    className="rounded-lg border border-primary-700 px-4 py-2.5 text-sm font-semibold text-primary-700 hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                                >
                                                    View results
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )
                    );
                })}
            </div>
        </MemberLayout>
    );
}
