import Avatar from '@/Components/Avatar';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import MemberLayout from '@/Layouts/MemberLayout';
import { BallotCandidate } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';

type Position = {
    id: number;
    title: string;
    candidates: BallotCandidate[];
};

export default function Ballot({
    election,
    positions,
}: {
    election: { id: number; title: string };
    positions: Position[];
}) {
    const [step, setStep] = useState(0);

    const form = useForm<{ choices: Record<number, number> }>({ choices: {} });

    const reviewing = step === positions.length;
    const position = positions[step];

    const choose = (positionId: number, candidateId: number) =>
        form.setData('choices', {
            ...form.data.choices,
            [positionId]: candidateId,
        });

    const submit = () =>
        form.post(route('member.elections.vote', election.id));

    const errors = form.errors as Record<string, string>;

    return (
        <MemberLayout>
            <Head title={election.title} />

            <h1 className="text-3xl">{election.title}</h1>
            <div className="gold-rule mb-4" />

            <p className="text-sm text-neutral-600">
                Your vote is anonymous. Once submitted it can not be changed.
            </p>

            {positions.length === 0 ? (
                <p className="card mt-4 p-4 text-sm text-neutral-600">
                    There is nothing to vote on yet.
                </p>
            ) : reviewing ? (
                <section className="mt-4">
                    <h2 className="text-xl">Review your choices</h2>
                    <dl className="card mt-3 divide-y divide-neutral-200">
                        {positions.map((item) => (
                            <div
                                key={item.id}
                                className="flex justify-between gap-4 p-4 text-sm"
                            >
                                <dt className="text-neutral-600">
                                    {item.title}
                                </dt>
                                <dd className="text-right font-medium">
                                    {
                                        item.candidates.find(
                                            (candidate) =>
                                                candidate.id ===
                                                form.data.choices[item.id],
                                        )?.full_name
                                    }
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <InputError message={errors.ballot} className="mt-3" />
                    <div className="mt-4 flex justify-between">
                        <SecondaryButton onClick={() => setStep(step - 1)}>
                            Back
                        </SecondaryButton>
                        <button
                            type="button"
                            disabled={form.processing}
                            onClick={submit}
                            className="rounded-lg bg-gold-500 px-5 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                            Submit my vote
                        </button>
                    </div>
                </section>
            ) : (
                <fieldset className="mt-4">
                    <legend className="w-full">
                        <span className="block text-sm text-neutral-600">
                            Position {step + 1} of {positions.length}
                        </span>
                        <span className="font-serif text-xl font-semibold">
                            {position.title}
                        </span>
                    </legend>

                    <div className="mt-3 space-y-3">
                        {position.candidates.map((candidate) => {
                            const selected =
                                form.data.choices[position.id] === candidate.id;

                            return (
                                <label
                                    key={candidate.id}
                                    className={`card flex cursor-pointer items-start gap-3 p-4 ring-2 transition focus-within:ring-primary-700 ${
                                        selected
                                            ? 'ring-primary-700'
                                            : 'ring-transparent'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`position-${position.id}`}
                                        checked={selected}
                                        onChange={() =>
                                            choose(position.id, candidate.id)
                                        }
                                        className="mt-1 border-neutral-200 text-primary-700 focus:ring-primary-700"
                                    />
                                    <Avatar
                                        name={candidate.full_name}
                                        src={candidate.photo_url}
                                        className="h-14 w-14 shrink-0 text-base"
                                    />
                                    <span className="min-w-0">
                                        <span className="block font-medium">
                                            {candidate.full_name}
                                        </span>
                                        {candidate.unit && (
                                            <span className="block text-sm text-neutral-600">
                                                {candidate.unit}
                                            </span>
                                        )}
                                        {candidate.manifesto && (
                                            <span className="mt-1 block whitespace-pre-line text-sm">
                                                {candidate.manifesto}
                                            </span>
                                        )}
                                    </span>
                                </label>
                            );
                        })}
                    </div>

                    <div className="mt-4 flex justify-between">
                        {step > 0 ? (
                            <SecondaryButton onClick={() => setStep(step - 1)}>
                                Back
                            </SecondaryButton>
                        ) : (
                            <span />
                        )}
                        <PrimaryButton
                            type="button"
                            disabled={!form.data.choices[position.id]}
                            onClick={() => setStep(step + 1)}
                        >
                            {step + 1 === positions.length
                                ? 'Review'
                                : 'Next'}
                        </PrimaryButton>
                    </div>
                </fieldset>
            )}
        </MemberLayout>
    );
}
