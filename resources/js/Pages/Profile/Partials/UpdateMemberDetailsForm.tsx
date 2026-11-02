import {
    BioData,
    BioFormProps,
    ChurchFields,
    EmergencyFields,
    ExtraFields,
    PersonalFields,
    bioDataFrom,
} from '@/Components/Members/Fields';
import PhotoField from '@/Components/Members/PhotoField';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { SOCIAL_LABELS, SocialNetwork } from '@/Components/Site/SocialIcon';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { PageProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

const SOCIAL_HINTS: Record<SocialNetwork, string> = {
    whatsapp: '0801 234 5678',
    facebook: 'Username or link',
    instagram: 'Username or link',
    x: 'Username or link',
    tiktok: 'Username or link',
};

const NETWORKS = Object.keys(SOCIAL_HINTS) as SocialNetwork[];

export default function UpdateMemberDetailsForm({
    member,
}: {
    member: Parameters<typeof bioDataFrom>[0] & {
        certificate_urls: { foundation: string | null; wofbi: string | null };
        units: string[];
        show_on_site: boolean;
        socials: Partial<Record<SocialNetwork, string>>;
    };
}) {
    const { user } = usePage<PageProps>().props.auth;

    const { data, setData, post, errors, processing, recentlySuccessful } =
        useForm<
            BioData & {
                _method: string;
                photo: File | null;
                show_on_site: boolean;
                socials: Partial<Record<SocialNetwork, string>>;
            }
        >({
            ...bioDataFrom(member),
            _method: 'patch',
            photo: null,
            show_on_site: member.show_on_site,
            socials: member.socials,
        });

    const form: BioFormProps = {
        data,
        set: (field, value) => setData(field, value as never),
        errors,
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            <h2 className="text-xl">Your details</h2>
            <PhotoField
                name={data.full_name}
                currentUrl={user.photo_url}
                error={errors.photo}
                onChange={(file) => setData('photo', file)}
            />
            <PersonalFields form={form} />
            <ChurchFields
                form={form}
                certificateUrls={member.certificate_urls}
                units={member.units}
            />
            <EmergencyFields form={form} />
            <ExtraFields form={form} />
            <label className="flex items-start gap-2 text-sm">
                <input
                    type="checkbox"
                    checked={data.show_on_site}
                    onChange={(e) => setData('show_on_site', e.target.checked)}
                    className="mt-0.5 rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                />
                <span>
                    <span className="block font-medium">
                        Show me on my department page
                    </span>
                    <span className="text-neutral-600">
                        Your name, unit and photo can appear on the public
                        website. Your phone and email do not, unless you add
                        them below.
                    </span>
                </span>
            </label>
            <fieldset className="space-y-4">
                <legend className="text-lg font-medium">
                    Social links (optional)
                </legend>
                <p className="text-sm text-neutral-600">
                    Anyone who opens your card on the department page can see
                    these. Leave a box empty to keep it private.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                    {NETWORKS.map((network) => (
                        <div key={network}>
                            <InputLabel
                                htmlFor={`social-${network}`}
                                value={SOCIAL_LABELS[network]}
                            />
                            <TextInput
                                id={`social-${network}`}
                                className="mt-1 block w-full"
                                value={data.socials[network] ?? ''}
                                placeholder={SOCIAL_HINTS[network]}
                                onChange={(e) =>
                                    setData('socials', {
                                        ...data.socials,
                                        [network]: e.target.value,
                                    })
                                }
                            />
                            <InputError
                                className="mt-2"
                                message={
                                    (errors as Record<string, string>)[
                                        `socials.${network}`
                                    ]
                                }
                            />
                        </div>
                    ))}
                </div>
            </fieldset>
            <div className="flex items-center gap-4">
                <PrimaryButton disabled={processing}>Save</PrimaryButton>
                <Transition
                    show={recentlySuccessful}
                    enter="transition ease-in-out"
                    enterFrom="opacity-0"
                    leave="transition ease-in-out"
                    leaveTo="opacity-0"
                >
                    <p className="text-sm text-neutral-600">Saved.</p>
                </Transition>
            </div>
        </form>
    );
}
