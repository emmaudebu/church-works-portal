import Badge from '@/Components/Badge';
import DepartmentIcon from '@/Components/DepartmentIcon';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Department } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler } from 'react';

type Person = { id: number; full_name: string };

function DepartmentRow({
    department,
    candidates,
}: {
    department: Department & { users: Person[] };
    candidates: Person[];
}) {
    const active = department.status === 'active';

    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
    });

    const page = useForm<{
        description: string;
        about: string;
        image: File | null;
    }>({
        description: department.description ?? '',
        about: department.about ?? '',
        image: null,
    });

    const savePage: FormEventHandler = (e) => {
        e.preventDefault();

        page.post(route('admin.departments.page', department.id), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const assign: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('admin.departments.admins.store', department.id), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <section className="card p-4 sm:p-6">
            <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-50 text-primary-700">
                    <DepartmentIcon name={department.icon} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl">{department.name}</h2>
                        {active ? (
                            <Badge variant="success">Active</Badge>
                        ) : (
                            <Badge variant="gold">Coming Soon</Badge>
                        )}
                    </div>
                    <p className="text-sm tabular-nums text-neutral-600">
                        {department.members_count}{' '}
                        {department.members_count === 1 ? 'member' : 'members'}
                    </p>
                </div>
                <SecondaryButton
                    onClick={() =>
                        router.patch(
                            route('admin.departments.update', department.id),
                            { status: active ? 'coming_soon' : 'active' },
                            { preserveScroll: true },
                        )
                    }
                >
                    {active ? 'Set to Coming Soon' : 'Set to Active'}
                </SecondaryButton>
            </div>

            <form
                onSubmit={savePage}
                className="mt-5 space-y-3 border-t border-neutral-200 pt-4"
            >
                <h3 className="font-sans text-sm font-semibold">
                    Public page
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                    <img
                        src={department.image_url}
                        alt=""
                        className="h-16 w-28 rounded-lg object-cover"
                    />
                    <label className="min-w-0 flex-1 basis-48 text-sm font-medium">
                        Change picture
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) =>
                                page.setData(
                                    'image',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                            className="mt-1 block w-full text-sm font-normal"
                        />
                    </label>
                </div>
                <InputError message={page.errors.image} />
                <div>
                    <InputLabel
                        htmlFor={`description-${department.id}`}
                        value="Short description"
                    />
                    <input
                        id={`description-${department.id}`}
                        value={page.data.description}
                        onChange={(e) =>
                            page.setData('description', e.target.value)
                        }
                        className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                    />
                    <InputError
                        message={page.errors.description}
                        className="mt-2"
                    />
                </div>
                <div>
                    <InputLabel
                        htmlFor={`about-${department.id}`}
                        value="About this department"
                    />
                    <textarea
                        id={`about-${department.id}`}
                        rows={4}
                        value={page.data.about}
                        onChange={(e) => page.setData('about', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                    />
                    <InputError message={page.errors.about} className="mt-2" />
                </div>
                <PrimaryButton disabled={page.processing}>
                    Save page
                </PrimaryButton>
            </form>

            <div className="mt-5 border-t border-neutral-200 pt-4">
                <h3 className="font-sans text-sm font-semibold">
                    Department admins
                </h3>

                {department.users.length === 0 ? (
                    <p className="mt-1 text-sm text-neutral-600">
                        No admin assigned yet.
                    </p>
                ) : (
                    <ul className="mt-2 flex flex-wrap gap-2">
                        {department.users.map((admin) => (
                            <li
                                key={admin.id}
                                className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1 text-sm"
                            >
                                {admin.full_name}
                                <button
                                    type="button"
                                    aria-label={`Remove ${admin.full_name} as admin`}
                                    onClick={() =>
                                        router.delete(
                                            route(
                                                'admin.departments.admins.destroy',
                                                [department.id, admin.id],
                                            ),
                                            { preserveScroll: true },
                                        )
                                    }
                                    className="rounded-full p-1 text-neutral-600 hover:text-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                                >
                                    <X size={14} aria-hidden="true" />
                                </button>
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
                            htmlFor={`admin-${department.id}`}
                            value="Assign an admin"
                        />
                        <select
                            id={`admin-${department.id}`}
                            value={data.user_id}
                            onChange={(e) =>
                                setData('user_id', e.target.value)
                            }
                            className="mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700"
                        >
                            <option value="">Choose a member</option>
                            {candidates.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.full_name}
                                </option>
                            ))}
                        </select>
                        <InputError
                            message={errors.user_id}
                            className="mt-2"
                        />
                    </div>
                    <PrimaryButton disabled={processing || !data.user_id}>
                        Assign
                    </PrimaryButton>
                </form>
            </div>
        </section>
    );
}

export default function Departments({
    departments,
    candidates,
}: {
    departments: (Department & { users: Person[] })[];
    candidates: Person[];
}) {
    return (
        <AdminLayout>
            <Head title="Departments" />

            <h1 className="text-3xl">Departments</h1>
            <div className="gold-rule mb-6" />

            <div className="max-w-3xl space-y-6">
                {departments.map((department) => (
                    <DepartmentRow
                        key={department.id}
                        department={department}
                        candidates={candidates}
                    />
                ))}
            </div>
        </AdminLayout>
    );
}
