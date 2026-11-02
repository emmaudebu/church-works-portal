import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import { router, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export type Criteria = {
    enabled: boolean;
    attendance_weight: number;
    on_time_minutes: number;
    minimum_attendance: number;
    minimum_days: number;
    include_officers: boolean;
};

const NUMBERS: {
    field: Exclude<keyof Criteria, 'enabled' | 'include_officers'>;
    label: string;
    hint: string;
    max: number;
}[] = [
    {
        field: 'attendance_weight',
        label: 'Attendance share of the score (%)',
        hint: 'The rest of the score comes from clocking in on time.',
        max: 100,
    },
    {
        field: 'on_time_minutes',
        label: 'On time within (minutes)',
        hint: 'Counted from when check-in opens for the service.',
        max: 360,
    },
    {
        field: 'minimum_attendance',
        label: 'Lowest attendance to qualify (%)',
        hint: 'Members below this can not be nominated.',
        max: 100,
    },
    {
        field: 'minimum_days',
        label: 'Fewest service days to qualify',
        hint: 'Stops one visit in a quiet month from winning.',
        max: 31,
    },
];

export default function BestMemberCriteria({
    criteria,
}: {
    criteria: Criteria;
}) {
    const form = useForm<Criteria>(criteria);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.put(route('admin.best-member.update'), { preserveScroll: true });
    };

    const clockInShare = 100 - Number(form.data.attendance_weight);

    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">Best member criteria</h2>
            <p className="mt-1 text-sm text-neutral-600">
                Each department's best member is chosen after a month ends.
                Changes apply from the next month chosen.
            </p>

            <form onSubmit={submit} className="mt-4 space-y-5">
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={form.data.enabled}
                        onChange={(e) =>
                            form.setData('enabled', e.target.checked)
                        }
                        className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                    />
                    Show the best member each month
                </label>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {NUMBERS.map(({ field, label, hint, max }) => (
                        <div key={field}>
                            <InputLabel htmlFor={field} value={label} />
                            <TextInput
                                id={field}
                                type="number"
                                min={field === 'minimum_days' ? 1 : 0}
                                max={max}
                                required
                                value={form.data[field]}
                                onChange={(e) =>
                                    form.setData(field, Number(e.target.value))
                                }
                                className="mt-1 block w-full tabular-nums"
                            />
                            <p className="mt-1 text-xs text-neutral-600">
                                {hint}
                            </p>
                            <InputError
                                message={form.errors[field]}
                                className="mt-1"
                            />
                        </div>
                    ))}
                </div>

                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        checked={form.data.include_officers}
                        onChange={(e) =>
                            form.setData('include_officers', e.target.checked)
                        }
                        className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                    />
                    Executives can be nominated too
                </label>

                <p className="rounded-lg bg-gold-50 p-3 text-sm">
                    Score = {form.data.attendance_weight}% attendance +{' '}
                    {clockInShare}% clocking in on time. A day marked by hand
                    counts as attendance, but not towards clocking in on time.
                </p>

                <div className="flex flex-wrap gap-3">
                    <PrimaryButton disabled={form.processing}>
                        Save criteria
                    </PrimaryButton>
                    <SecondaryButton
                        onClick={() =>
                            router.post(
                                route('admin.best-member.recalculate'),
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        Recalculate last month
                    </SecondaryButton>
                </div>
            </form>
        </section>
    );
}
