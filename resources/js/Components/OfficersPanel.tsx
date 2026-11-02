import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import { router, useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler } from 'react';

export type Person = { id: number; full_name: string };

export type Officer = Person & {
    office: string | null;
    removable?: boolean;
};

export default function OfficersPanel({
    departmentId,
    officers,
    candidates,
    offices,
}: {
    departmentId: number;
    officers: Officer[];
    candidates: Person[];
    offices: Record<string, string>;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
        office: Object.keys(offices)[0],
    });

    const assign: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('admin.departments.admins.store', departmentId), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <>
            {officers.length === 0 ? (
                <p className="mt-1 text-sm text-neutral-600">
                    No officers assigned yet.
                </p>
            ) : (
                <ul className="mt-2 flex flex-wrap gap-2">
                    {officers.map((officer) => (
                        <li
                            key={officer.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1 text-sm"
                        >
                            <span className="py-1 pr-2">
                                {officer.full_name}{' '}
                                <span className="text-xs text-neutral-600">
                                    {officer.office}
                                </span>
                            </span>
                            {officer.removable !== false && (
                                <button
                                    type="button"
                                    aria-label={`Remove ${officer.full_name} from office`}
                                    onClick={() =>
                                        router.delete(
                                            route(
                                                'admin.departments.admins.destroy',
                                                [departmentId, officer.id],
                                            ),
                                            { preserveScroll: true },
                                        )
                                    }
                                    className="rounded-full p-1 text-neutral-600 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    <X size={14} aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <form
                onSubmit={assign}
                className="mt-4 flex flex-wrap items-end gap-3"
            >
                <div className="min-w-0 flex-1 basis-56">
                    <InputLabel
                        htmlFor={`admin-${departmentId}`}
                        value="Assign an officer"
                    />
                    <select
                        id={`admin-${departmentId}`}
                        value={data.user_id}
                        onChange={(e) => setData('user_id', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                    >
                        <option value="">Choose a member</option>
                        {candidates.map((person) => (
                            <option key={person.id} value={person.id}>
                                {person.full_name}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.user_id} className="mt-2" />
                </div>
                <div className="min-w-0 flex-1 basis-44">
                    <InputLabel
                        htmlFor={`office-${departmentId}`}
                        value="Office"
                    />
                    <select
                        id={`office-${departmentId}`}
                        value={data.office}
                        onChange={(e) => setData('office', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                    >
                        {Object.entries(offices).map(([role, label]) => (
                            <option key={role} value={role}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.office} className="mt-2" />
                </div>
                <PrimaryButton disabled={processing || !data.user_id}>
                    Assign
                </PrimaryButton>
            </form>
        </>
    );
}
