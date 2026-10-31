import {
    BioData,
    BioFormProps,
    ChurchFields,
    EmergencyFields,
    ExtraFields,
    PersonalFields,
} from '@/Components/Members/Fields';
import PhotoField from '@/Components/Members/PhotoField';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useEffect, useRef, useState } from 'react';

const STEPS = [
    'Personal details',
    'Church details',
    'Emergency contact and extra details',
    'Photo and review',
];

const FIELDS_BY_STEP = [
    ['full_name', 'gender', 'date_of_birth', 'phone', 'email', 'address'],
    [
        'department_id',
        'unit',
        'date_joined',
        'foundation_certificate',
        'wofbi_certificate',
    ],
    ['next_of_kin_name', 'next_of_kin_relationship', 'next_of_kin_phone'],
];

function Review({ rows }: { rows: [string, string][] }) {
    return (
        <dl className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 p-3">
                    <dt className="text-neutral-600">{label}</dt>
                    <dd className="text-right font-medium">{value || '—'}</dd>
                </div>
            ))}
        </dl>
    );
}

export default function Register({
    departments,
}: {
    departments: { id: number; name: string }[];
}) {
    const [step, setStep] = useState(0);
    const heading = useRef<HTMLHeadingElement>(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm<
        BioData & {
            department_id: string;
            photo: File | null;
            password: string;
            password_confirmation: string;
        }
    >({
        full_name: '',
        gender: '',
        date_of_birth: '',
        phone: '+234',
        email: '',
        address: '',
        department_id: departments.length === 1 ? String(departments[0].id) : '',
        unit: '',
        date_joined: '',
        foundation_class_done: false,
        wofbi_done: false,
        foundation_certificate: null,
        wofbi_certificate: null,
        next_of_kin_name: '',
        next_of_kin_relationship: '',
        next_of_kin_phone: '+234',
        occupation: '',
        technical_skills: [],
        marital_status: '',
        photo: null,
        password: '',
        password_confirmation: '',
    });

    const first = useRef(true);

    useEffect(() => {
        if (first.current) {
            first.current = false;

            return;
        }

        window.scrollTo(0, 0);
        heading.current?.focus();
    }, [step]);

    const form: BioFormProps = {
        data,
        set: (field, value) => setData(field, value as never),
        errors,
    };

    const next: FormEventHandler = (e) => {
        e.preventDefault();

        if (step < 3) {
            post(route('register.check', { step: step + 1 }), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    clearErrors();
                    setStep(step + 1);
                },
            });

            return;
        }

        post(route('register'), {
            forceFormData: true,
            onError: (failed) => {
                const earlier = FIELDS_BY_STEP.findIndex((fields) =>
                    fields.some((field) => field in failed),
                );

                if (earlier !== -1) {
                    setStep(earlier);
                }
            },
        });
    };

    const department = departments.find(
        (item) => String(item.id) === data.department_id,
    );

    return (
        <GuestLayout>
            <Head title="Register" />

            <p className="text-sm font-medium text-neutral-600">
                Step {step + 1} of {STEPS.length}
            </p>
            <div
                role="progressbar"
                aria-label="Registration progress"
                aria-valuemin={1}
                aria-valuemax={STEPS.length}
                aria-valuenow={step + 1}
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-200"
            >
                <div
                    className="h-full bg-primary-700 transition-all"
                    style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
                />
            </div>

            <h1
                ref={heading}
                tabIndex={-1}
                className="mt-6 text-2xl focus:outline-none"
            >
                {STEPS[step]}
            </h1>
            <div className="gold-rule mb-6" />

            <form onSubmit={next} className="space-y-4">
                {step === 0 && <PersonalFields form={form} />}

                {step === 1 && (
                    <>
                        <div>
                            <InputLabel
                                htmlFor="department_id"
                                value="Department"
                            />
                            <select
                                id="department_id"
                                value={data.department_id}
                                required
                                onChange={(e) =>
                                    setData('department_id', e.target.value)
                                }
                                className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                            >
                                <option value="">Choose</option>
                                {departments.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.name}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                message={errors.department_id}
                                className="mt-2"
                            />
                        </div>
                        <ChurchFields form={form} />
                    </>
                )}

                {step === 2 && (
                    <>
                        <EmergencyFields form={form} />
                        <ExtraFields form={form} />
                    </>
                )}

                {step === 3 && (
                    <>
                        <PhotoField
                            name={data.full_name}
                            required
                            error={errors.photo}
                            onChange={(file) => setData('photo', file)}
                        />
                        <Review
                            rows={[
                                ['Full name', data.full_name],
                                ['Phone', data.phone],
                                ['Department', department?.name ?? ''],
                                ['Unit', data.unit],
                                ['Next of kin', data.next_of_kin_name],
                            ]}
                        />
                        <div>
                            <InputLabel
                                htmlFor="password"
                                value="Create a password"
                            />
                            <TextInput
                                id="password"
                                type="password"
                                value={data.password}
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData('password', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={errors.password}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <InputLabel
                                htmlFor="password_confirmation"
                                value="Confirm password"
                            />
                            <TextInput
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                onChange={(e) =>
                                    setData(
                                        'password_confirmation',
                                        e.target.value,
                                    )
                                }
                                required
                                className="mt-1 block w-full"
                            />
                        </div>
                    </>
                )}

                <div className="flex items-center justify-between pt-2">
                    {step > 0 ? (
                        <SecondaryButton onClick={() => setStep(step - 1)}>
                            Back
                        </SecondaryButton>
                    ) : (
                        <Link
                            href={route('login')}
                            className="rounded-lg text-sm text-neutral-600 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            Already registered?
                        </Link>
                    )}
                    <PrimaryButton disabled={processing}>
                        {step === 3 ? 'Submit registration' : 'Continue'}
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
