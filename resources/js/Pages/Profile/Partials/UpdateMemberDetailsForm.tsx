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
import PrimaryButton from '@/Components/PrimaryButton';
import { Transition } from '@headlessui/react';
import { PageProps } from '@/types';
import { useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function UpdateMemberDetailsForm({
    member,
}: {
    member: Parameters<typeof bioDataFrom>[0];
}) {
    const { user } = usePage<PageProps>().props.auth;

    const { data, setData, post, errors, processing, recentlySuccessful } =
        useForm<BioData & { _method: string; photo: File | null }>({
            ...bioDataFrom(member),
            _method: 'patch',
            photo: null,
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
            <ChurchFields form={form} />
            <EmergencyFields form={form} />
            <ExtraFields form={form} />
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
