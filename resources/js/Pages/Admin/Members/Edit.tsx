import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import {
    bioDataFrom,
    BioData,
    BioFormProps,
    ChurchFields,
    EmergencyFields,
    ExtraFields,
    PersonalFields,
} from '@/Components/Members/Fields';
import PhotoField from '@/Components/Members/PhotoField';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { MemberRecord } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function Edit({
    member,
    departments,
    units,
}: {
    member: MemberRecord;
    departments: { id: number; name: string }[] | null;
    units: Record<string, string[]>;
}) {
    const { data, setData, post, processing, errors } = useForm<
        BioData & {
            _method: string;
            member_id: string;
            department_id: string;
            photo: File | null;
        }
    >({
        ...bioDataFrom(member),
        _method: 'patch',
        member_id: member.member_id ?? '',
        department_id: String(member.department_id ?? ''),
        photo: null,
    });

    const form: BioFormProps = {
        data,
        set: (field, value) => setData(field, value as never),
        errors,
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('admin.members.update', member.id), { forceFormData: true });
    };

    return (
        <AdminLayout>
            <Head title={`Edit ${member.full_name}`} />

            <h1 className="text-3xl">Edit {member.full_name}</h1>
            <div className="gold-rule mb-6" />

            <form onSubmit={submit} className="max-w-2xl space-y-6">
                <section className="card space-y-4 p-4 sm:p-6">
                    <PhotoField
                        name={data.full_name}
                        currentUrl={member.photo_url}
                        error={errors.photo}
                        onChange={(file) => setData('photo', file)}
                    />
                    <PersonalFields form={form} emailRequired={false} />
                </section>

                <section className="card space-y-4 p-4 sm:p-6">
                    <div>
                        <InputLabel htmlFor="member_id" value="Member ID" />
                        <TextInput
                            id="member_id"
                            value={data.member_id}
                            onChange={(e) =>
                                setData('member_id', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError
                            message={errors.member_id}
                            className="mt-2"
                        />
                    </div>
                    {departments && (
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
                                {departments.map((department) => (
                                    <option
                                        key={department.id}
                                        value={department.id}
                                    >
                                        {department.name}
                                    </option>
                                ))}
                            </select>
                            <InputError
                                message={errors.department_id}
                                className="mt-2"
                            />
                        </div>
                    )}
                    <ChurchFields
                        form={form}
                        certificateUrls={member.certificate_urls}
                        units={units[data.department_id] ?? []}
                    />
                </section>

                <section className="card space-y-4 p-4 sm:p-6">
                    <EmergencyFields form={form} />
                    <ExtraFields form={form} />
                </section>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>
                        Save changes
                    </PrimaryButton>
                    <Link
                        href={route('admin.members.show', member.id)}
                        className="text-sm text-neutral-600 underline"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
