import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import TextInput from '@/Components/TextInput';
import { ChangeEvent, PropsWithChildren, useState } from 'react';

const MAX_CERTIFICATE_BYTES = 8 * 1024 * 1024;

export type BioData = {
    full_name: string;
    gender: string;
    date_of_birth: string;
    phone: string;
    email: string;
    address: string;
    unit: string;
    date_joined: string;
    foundation_class_done: boolean;
    wofbi_done: boolean;
    foundation_certificate: File | null;
    wofbi_certificate: File | null;
    next_of_kin_name: string;
    next_of_kin_relationship: string;
    next_of_kin_phone: string;
    occupation: string;
    technical_skills: string[];
    marital_status: string;
};

export type BioFormProps = {
    data: BioData;
    set: (field: keyof BioData, value: BioData[keyof BioData]) => void;
    errors: Partial<Record<string, string>>;
};

const selectClass =
    'mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700';

const SKILLS = [
    'Sound mixing',
    'Video editing',
    'Camera',
    'Live streaming',
    'Lighting',
    'Graphics',
    'Presentation software',
];

function Field({
    id,
    label,
    error,
    children,
}: PropsWithChildren<{ id: string; label: string; error?: string }>) {
    return (
        <div>
            <InputLabel htmlFor={id} value={label} />
            {children}
            <InputError message={error} className="mt-2" />
        </div>
    );
}

function Text({
    form,
    name,
    label,
    type = 'text',
    required = false,
    ...props
}: {
    form: BioFormProps;
    name: keyof BioData;
    label: string;
    type?: string;
    required?: boolean;
    autoComplete?: string;
    max?: string;
}) {
    return (
        <Field
            id={name}
            label={required ? label : `${label} (optional)`}
            error={form.errors[name]}
        >
            <TextInput
                {...props}
                id={name}
                type={type}
                value={form.data[name] as string}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    form.set(name, e.target.value)
                }
                required={required}
                className="mt-1 block w-full"
            />
        </Field>
    );
}

function Choice({
    form,
    name,
    label,
    options,
    required = false,
}: {
    form: BioFormProps;
    name: keyof BioData;
    label: string;
    options: string[];
    required?: boolean;
}) {
    return (
        <Field
            id={name}
            label={required ? label : `${label} (optional)`}
            error={form.errors[name]}
        >
            <select
                id={name}
                value={form.data[name] as string}
                required={required}
                onChange={(e) => form.set(name, e.target.value)}
                className={selectClass}
            >
                <option value="">Choose</option>
                {options.map((option) => (
                    <option key={option} value={option.toLowerCase()}>
                        {option}
                    </option>
                ))}
            </select>
        </Field>
    );
}

function YesNo({
    form,
    name,
    certificate,
    certificateUrl,
    label,
}: {
    form: BioFormProps;
    name: 'foundation_class_done' | 'wofbi_done';
    certificate: 'foundation_certificate' | 'wofbi_certificate';
    certificateUrl?: string | null;
    label: string;
}) {
    const id = `${certificate}-input`;
    const [tooLarge, setTooLarge] = useState(false);

    const choose = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        const fits = !file || file.size <= MAX_CERTIFICATE_BYTES;

        setTooLarge(!fits);
        form.set(certificate, fits ? file : null);

        if (!fits) {
            e.target.value = '';
        }
    };

    return (
        <fieldset>
            <legend className="block text-sm font-medium text-neutral-900">
                {label}
            </legend>
            <div className="mt-2 flex gap-6">
                {[true, false].map((value) => (
                    <label
                        key={String(value)}
                        className="flex items-center gap-2 text-sm"
                    >
                        <input
                            type="radio"
                            name={name}
                            checked={form.data[name] === value}
                            onChange={() => form.set(name, value)}
                            className="border-neutral-200 text-primary-700 focus:ring-primary-700"
                        />
                        {value ? 'Yes' : 'No'}
                    </label>
                ))}
            </div>

            {form.data[name] && (
                <div className="mt-3 rounded-lg bg-gold-50 p-3">
                    <label htmlFor={id} className="block text-sm font-medium">
                        Upload your certificate (PDF or photo)
                    </label>
                    {certificateUrl && (
                        <a
                            href={certificateUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-sm text-primary-700 underline"
                        >
                            View the certificate on file
                        </a>
                    )}
                    <input
                        id={id}
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                        onChange={choose}
                        className="mt-1 block w-full text-sm"
                    />
                    {form.data[certificate] && (
                        <p className="mt-1 text-sm text-success">
                            Selected: {form.data[certificate].name}
                        </p>
                    )}
                    <InputError
                        message={
                            tooLarge
                                ? 'That file is too large. Please use one up to 8 MB.'
                                : form.errors[certificate]
                        }
                        className="mt-2"
                    />
                </div>
            )}
        </fieldset>
    );
}

function SkillsInput({ form }: { form: BioFormProps }) {
    const [draft, setDraft] = useState('');
    const skills = form.data.technical_skills;

    const toggle = (skill: string) =>
        form.set(
            'technical_skills',
            skills.includes(skill)
                ? skills.filter((item) => item !== skill)
                : [...skills, skill],
        );

    const addDraft = () => {
        const skill = draft.trim();

        if (skill && !skills.includes(skill)) {
            toggle(skill);
        }

        setDraft('');
    };

    return (
        <div>
            <InputLabel
                htmlFor="skill-draft"
                value="Technical skills (optional)"
            />
            <div className="mt-2 flex flex-wrap gap-2">
                {[...new Set([...SKILLS, ...skills])].map((skill) => (
                    <button
                        key={skill}
                        type="button"
                        aria-pressed={skills.includes(skill)}
                        onClick={() => toggle(skill)}
                        className={`rounded-full border px-3 py-1 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                            skills.includes(skill)
                                ? 'border-primary-700 bg-primary-700 text-white'
                                : 'border-neutral-200 text-neutral-600'
                        }`}
                    >
                        {skill}
                    </button>
                ))}
            </div>
            <TextInput
                id="skill-draft"
                value={draft}
                placeholder="Add another and press Enter"
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setDraft(e.target.value)
                }
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        addDraft();
                    }
                }}
                onBlur={addDraft}
                className="mt-2 block w-full"
            />
            <InputError
                message={form.errors.technical_skills}
                className="mt-2"
            />
        </div>
    );
}

const today = () => new Date().toISOString().slice(0, 10);

export function PersonalFields({
    form,
    emailRequired = true,
}: {
    form: BioFormProps;
    emailRequired?: boolean;
}) {
    return (
        <div className="space-y-4">
            <Text
                form={form}
                name="full_name"
                label="Full name"
                autoComplete="name"
                required
            />
            <Choice
                form={form}
                name="gender"
                label="Gender"
                options={['Male', 'Female']}
                required
            />
            <Text
                form={form}
                name="date_of_birth"
                label="Date of birth"
                type="date"
                max={today()}
                required
            />
            <Text
                form={form}
                name="phone"
                label="Phone number (WhatsApp)"
                type="tel"
                autoComplete="tel"
                required
            />
            <Text
                form={form}
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                required={emailRequired}
            />
            <Text
                form={form}
                name="address"
                label="Home address"
                autoComplete="street-address"
                required
            />
        </div>
    );
}

export function ChurchFields({
    form,
    certificateUrls,
    units = [],
}: {
    form: BioFormProps;
    certificateUrls?: { foundation: string | null; wofbi: string | null };
    units?: string[];
}) {
    return (
        <div className="space-y-4">
            <Field id="unit" label="Unit" error={form.errors.unit}>
                {units.length > 0 ? (
                    <select
                        id="unit"
                        value={form.data.unit}
                        required
                        onChange={(e) => form.set('unit', e.target.value)}
                        className={selectClass}
                    >
                        <option value="">Choose</option>
                        {units.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit}
                            </option>
                        ))}
                    </select>
                ) : (
                    <TextInput
                        id="unit"
                        value={form.data.unit}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            form.set('unit', e.target.value)
                        }
                        required
                        className="mt-1 block w-full"
                    />
                )}
            </Field>
            <Text
                form={form}
                name="date_joined"
                label="Date joined the department"
                type="date"
                max={today()}
            />
            <YesNo
                form={form}
                name="foundation_class_done"
                certificate="foundation_certificate"
                certificateUrl={certificateUrls?.foundation}
                label="Foundation class completed"
            />
            <YesNo
                form={form}
                name="wofbi_done"
                certificate="wofbi_certificate"
                certificateUrl={certificateUrls?.wofbi}
                label="Word of Faith Bible Institute (WOFBI) completed"
            />
        </div>
    );
}

export function EmergencyFields({ form }: { form: BioFormProps }) {
    return (
        <div className="space-y-4">
            <Text
                form={form}
                name="next_of_kin_name"
                label="Next of kin name"
                required
            />
            <Text
                form={form}
                name="next_of_kin_relationship"
                label="Relationship to you"
                required
            />
            <Text
                form={form}
                name="next_of_kin_phone"
                label="Next of kin phone number"
                type="tel"
                required
            />
        </div>
    );
}

export function ExtraFields({ form }: { form: BioFormProps }) {
    return (
        <div className="space-y-4">
            <Text form={form} name="occupation" label="Occupation" />
            <SkillsInput form={form} />
            <Choice
                form={form}
                name="marital_status"
                label="Marital status"
                options={['Single', 'Married', 'Widowed', 'Divorced']}
            />
        </div>
    );
}

/** Starting values for the bio forms from an existing record. */
export function bioDataFrom(member: {
    full_name: string;
    gender: string | null;
    date_of_birth: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    unit: string | null;
    date_joined: string | null;
    foundation_class_done: boolean;
    wofbi_done: boolean;
    profile: {
        next_of_kin_name: string | null;
        next_of_kin_relationship: string | null;
        next_of_kin_phone: string | null;
        occupation: string | null;
        technical_skills: string[] | null;
        marital_status: string | null;
    } | null;
}): BioData {
    return {
        full_name: member.full_name,
        gender: member.gender ?? '',
        date_of_birth: member.date_of_birth ?? '',
        phone: member.phone ?? '+234',
        email: member.email ?? '',
        address: member.address ?? '',
        unit: member.unit ?? '',
        date_joined: member.date_joined ?? '',
        foundation_class_done: member.foundation_class_done,
        wofbi_done: member.wofbi_done,
        foundation_certificate: null,
        wofbi_certificate: null,
        next_of_kin_name: member.profile?.next_of_kin_name ?? '',
        next_of_kin_relationship: member.profile?.next_of_kin_relationship ?? '',
        next_of_kin_phone: member.profile?.next_of_kin_phone ?? '+234',
        occupation: member.profile?.occupation ?? '',
        technical_skills: member.profile?.technical_skills ?? [],
        marital_status: member.profile?.marital_status ?? '',
    };
}
