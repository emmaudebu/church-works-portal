import ElectionResults from '@/Components/ElectionResults';
import MemberLayout from '@/Layouts/MemberLayout';
import { ElectionStatus, PositionResult, Turnout } from '@/types';
import { Head, usePoll } from '@inertiajs/react';

/** How often the counts refresh while voting is open. */
const POLL_MS = 4000;

export default function Results({
    election,
    results,
    turnout,
}: {
    election: { id: number; title: string; status: ElectionStatus };
    results: PositionResult[];
    turnout: Turnout;
}) {
    const live = election.status === 'open';

    usePoll(
        POLL_MS,
        { only: ['results', 'turnout', 'election'] },
        { autoStart: live },
    );

    return (
        <MemberLayout wide>
            <Head title={`Results - ${election.title}`} />

            <ElectionResults
                title={election.title}
                results={results}
                turnout={turnout}
                live={live}
            />
        </MemberLayout>
    );
}
