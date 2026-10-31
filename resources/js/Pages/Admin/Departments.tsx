import Badge from '@/Components/Badge';
import DangerButton from '@/Components/DangerButton';
import DepartmentIcon from '@/Components/DepartmentIcon';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Department } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler } from 'react';

type Person = { id: number; full_name: string };
type Officer = Person & { office: string | null };
type Row = Department & { users: Officer[]; deletable: boolean };

const fieldClass =
    'mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

function IconSelect({
    id,
    icons,
    value,
    onChange,
}: {
    id: string;
    icons: string[];
    value: string;
    onChange: (icon: string) => void;
}) {
    return (
        <select
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${fieldClass} capitalize`}
        >
            {icons.map((icon) => (
                <option key={icon} value={icon}>
                    {icon.replace('-', ' ')}
                </option>
            ))}
        </select>
    );
}

function DepartmentRow({
    department,
    candidates,
    icons,
    offices,
}: {
    department: Row;
    candidates: Person[];
    icons: string[];
    offices: Record<string, string>;
}) {
    const active = department.status === 'active';

    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
        office: Object.keys(offices)[0],
    });

    const page = useForm<{
        name: string;
        icon: string;
        description: string;
        about: string;
        image: File | null;
    }>({
        name: department.name,
        icon: department.icon ?? 'building',
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
                <Link
                    href={route('admin.departments.manage', department.id)}
                    className="inline-flex items-center rounded-lg border border-primary-700 bg-white px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    Units and gallery
                </Link>
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
                <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <InputLabel
                            htmlFor={`name-${department.id}`}
                            value="Name"
                        />
                        <input
                            id={`name-${department.id}`}
                            value={page.data.name}
                            required
                            onChange={(e) =>
                                page.setData('name', e.target.value)
                            }
                            className={fieldClass}
                        />
                        <InputError
                            message={page.errors.name}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <InputLabel
                            htmlFor={`icon-${department.id}`}
                            value="Icon"
                        />
                        <IconSelect
                            id={`icon-${department.id}`}
                            icons={icons}
                            value={page.data.icon}
                            onChange={(icon) => page.setData('icon', icon)}
                        />
                    </div>
                </div>
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
                    Department officers
                </h3>

                {department.users.length === 0 ? (
                    <p className="mt-1 text-sm text-neutral-600">
                        No officers assigned yet.
                    </p>
                ) : (
                    <ul className="mt-2 flex flex-wrap gap-2">
                        {department.users.map((admin) => (
                            <li
                                key={admin.id}
                                className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1 text-sm"
                            >
                                <span>
                                    {admin.full_name}{' '}
                                    <span className="text-xs text-neutral-600">
                                        {admin.office}
                                    </span>
                                </span>
                                <button
                                    type="button"
                                    aria-label={`Remove ${admin.full_name} from office`}
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
                            value="Assign an officer"
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
                    <div className="min-w-0 flex-1 basis-44">
                        <InputLabel
                            htmlFor={`office-${department.id}`}
                            value="Office"
                        />
                        <select
                            id={`office-${department.id}`}
                            value={data.office}
                            onChange={(e) => setData('office', e.target.value)}
                            className={fieldClass}
                        >
                            {Object.entries(offices).map(([role, label]) => (
                                <option key={role} value={role}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <PrimaryButton disabled={processing || !data.user_id}>
                        Assign
                    </PrimaryButton>
                </form>
            </div>

            {department.deletable && (
                <div className="mt-5 border-t border-neutral-200 pt-4">
                    <DangerButton
                        type="button"
                        onClick={() => {
                            if (window.confirm(`Delete ${department.name}?`)) {
                                router.delete(
                                    route(
                                        'admin.departments.destroy',
                                        department.id,
                                    ),
                                );
                            }
                        }}
                    >
                        Delete department
                    </DangerButton>
                </div>
            )}
        </section>
    );
}

function NewDepartmentForm({ icons }: { icons: string[] }) {
    const form = useForm({
        name: '',
        icon: 'building',
        description: '',
        status: 'active',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.departments.store'));
    };

    return (
        <form onSubmit={submit} className="card space-y-3 p-4 sm:p-6">
            <h2 className="text-xl">New department</h2>
            <div className="grid gap-3 sm:grid-cols-3">
                <div>
                    <InputLabel htmlFor="new-name" value="Name" />
                    <input
                        id="new-name"
                        value={form.data.name}
                        required
                        onChange={(e) => form.setData('name', e.target.value)}
                        className={fieldClass}
                    />
                    <InputError message={form.errors.name} className="mt-2" />
                </div>
                <div>
                    <InputLabel htmlFor="new-icon" value="Icon" />
                    <IconSelect
                        id="new-icon"
                        icons={icons}
                        value={form.data.icon}
                        onChange={(icon) => form.setData('icon', icon)}
                    />
                </div>
                <div>
                    <InputLabel htmlFor="new-status" value="Status" />
                    <select
                        id="new-status"
                        value={form.data.status}
                        onChange={(e) => form.setData('status', e.target.value)}
                        className={fieldClass}
                    >
                        <option value="active">Active</option>
                        <option value="coming_soon">Coming Soon</option>
                    </select>
                </div>
            </div>
            <div>
                <InputLabel
                    htmlFor="new-description"
                    value="Short description (optional)"
                />
                <input
                    id="new-description"
                    value={form.data.description}
                    onChange={(e) =>
                        form.setData('description', e.target.value)
                    }
                    className={fieldClass}
                />
            </div>
            <PrimaryButton disabled={form.processing}>
                Create department
            </PrimaryButton>
        </form>
    );
}

export default function Departments({
    departments,
    candidates,
    icons,
    offices,
}: {
    departments: Row[];
    candidates: Person[];
    icons: string[];
    offices: Record<string, string>;
}) {
    const { errors } = usePage().props;

    return (
        <AdminLayout>
            <Head title="Departments" />

            <h1 className="text-3xl">Departments</h1>
            <div className="gold-rule mb-6" />

            <div className="max-w-3xl space-y-6">
                <InputError message={errors.department} />
                <NewDepartmentForm icons={icons} />
                {departments.map((department) => (
                    <DepartmentRow
                        key={department.id}
                        department={department}
                        candidates={candidates}
                        icons={icons}
                        offices={offices}
                    />
                ))}
            </div>
        </AdminLayout>
    );
}
