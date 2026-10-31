import ElectionResults, { TurnoutBar } from '@/Components/ElectionResults';
import MemberLayout from '@/Layouts/MemberLayout';
import { PositionResult, Turnout } from '@/types';
import { Head } from '@inertiajs/react';

export default function Results({
    election,
    results,
    turnout,
}: {
    election: { id: number; title: string };
    results: PositionResult[];
    turnout: Turnout;
}) {
    return (
        <MemberLayout>
            <Head title={`Results - ${election.title}`} />

            <h1 className="text-3xl">{election.title}</h1>
            <div className="gold-rule mb-6" />

            <section className="card p-4 sm:p-6">
                <TurnoutBar turnout={turnout} />
                <div className="mt-6">
                    <ElectionResults results={results} />
                </div>
            </section>
        </MemberLayout>
    );
}
