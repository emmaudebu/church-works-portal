import Badge from '@/Components/Badge';
import DangerButton from '@/Components/DangerButton';
import DepartmentIcon from '@/Components/DepartmentIcon';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import Modal from '@/Components/Modal';
import OfficersPanel, { Officer, Person } from '@/Components/OfficersPanel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Department } from '@/types';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

type Row = Department & {
    users: Officer[];
    in_use: boolean;
    people_count: number;
};

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

function DeleteDepartment({
    department,
    show,
    onClose,
}: {
    department: Row;
    show: boolean;
    onClose: () => void;
}) {
    const form = useForm({ confirm_name: '' });

    const close = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.delete(route('admin.departments.destroy', department.id), {
            preserveScroll: true,
            onSuccess: close,
        });
    };

    return (
        <Modal show={show} onClose={close} maxWidth="md">
            <form onSubmit={submit} className="p-4 sm:p-6">
                <h2 className="text-xl">Delete {department.name}?</h2>

                {department.in_use ? (
                    <>
                        <p className="mt-3 text-sm text-danger">
                            This can not be undone. Its services, attendance,
                            elections, dues, posts, units and gallery will be
                            permanently removed.
                        </p>
                        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-600">
                            <li>
                                {department.people_count}{' '}
                                {department.people_count === 1
                                    ? 'person keeps their account'
                                    : 'people keep their accounts'}{' '}
                                but will have no department until you move them.
                            </li>
                            <li>Officers go back to being regular members.</li>
                            <li>Payment records are kept.</li>
                            <li>
                                Proofs of payment still waiting are marked as
                                not accepted, so check them first.
                            </li>
                        </ul>
                        <div className="mt-4">
                            <InputLabel
                                htmlFor={`confirm-${department.id}`}
                                value={`Type "${department.name}" to confirm`}
                            />
                            <TextInput
                                id={`confirm-${department.id}`}
                                value={form.data.confirm_name}
                                onChange={(e) =>
                                    form.setData('confirm_name', e.target.value)
                                }
                                autoComplete="off"
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={form.errors.confirm_name}
                                className="mt-2"
                            />
                        </div>
                    </>
                ) : (
                    <p className="mt-2 text-sm text-neutral-600">
                        This department has no members or attendance. This can
                        not be undone.
                    </p>
                )}

                <div className="mt-6 flex justify-end gap-3">
                    <SecondaryButton onClick={close}>Cancel</SecondaryButton>
                    <DangerButton
                        disabled={
                            form.processing ||
                            (department.in_use &&
                                form.data.confirm_name !== department.name)
                        }
                    >
                        Delete department
                    </DangerButton>
                </div>
            </form>
        </Modal>
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
    const [deleting, setDeleting] = useState(false);

    const page = useForm<{
        name: string;
        icon: string;
        description: string;
        about: string;
        about_label: string;
        about_title: string;
        about_accent: string;
        image: File | null;
        about_image: File | null;
        about_small_image: File | null;
    }>({
        name: department.name,
        icon: department.icon ?? 'building',
        description: department.description ?? '',
        about: department.about ?? '',
        about_label: department.about_label ?? '',
        about_title: department.about_title ?? '',
        about_accent: department.about_accent ?? '',
        image: null,
        about_image: null,
        about_small_image: null,
    });

    const savePage: FormEventHandler = (e) => {
        e.preventDefault();

        page.post(route('admin.departments.page', department.id), {
            forceFormData: true,
            preserveScroll: true,
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
                        Change banner picture
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
                <h3 className="border-t border-neutral-200 pt-3 font-sans text-sm font-semibold">
                    About us section
                </h3>
                <p className="text-sm text-neutral-600">
                    Anything left empty keeps the standard wording, and your
                    newest gallery pictures are used until you choose these.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                    {(
                        [
                            [
                                'about_image',
                                'Main arched picture',
                                department.about_image_url,
                            ],
                            [
                                'about_small_image',
                                'Small round picture',
                                department.about_small_image_url,
                            ],
                        ] as const
                    ).map(([field, label, current]) => (
                        <div key={field}>
                            <label className="block text-sm font-medium">
                                {label}
                                {current && (
                                    <img
                                        src={current}
                                        alt=""
                                        className="mt-1 h-28 w-full rounded-lg object-cover"
                                    />
                                )}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(e) =>
                                        page.setData(
                                            field,
                                            e.target.files?.[0] ?? null,
                                        )
                                    }
                                    className="mt-1 block w-full text-sm font-normal"
                                />
                            </label>
                            <InputError
                                message={page.errors[field]}
                                className="mt-2"
                            />
                        </div>
                    ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    {(
                        [
                            ['about_label', 'Small label', 'About us'],
                            ['about_title', 'Heading', 'What we'],
                            ['about_accent', 'Red italic words', 'do'],
                        ] as const
                    ).map(([field, label, placeholder]) => (
                        <div key={field}>
                            <InputLabel
                                htmlFor={`${field}-${department.id}`}
                                value={label}
                            />
                            <input
                                id={`${field}-${department.id}`}
                                value={page.data[field]}
                                placeholder={placeholder}
                                onChange={(e) =>
                                    page.setData(field, e.target.value)
                                }
                                className={fieldClass}
                            />
                            <InputError
                                message={page.errors[field]}
                                className="mt-2"
                            />
                        </div>
                    ))}
                </div>
                <div>
                    <InputLabel
                        htmlFor={`about-${department.id}`}
                        value="Paragraph"
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

                <OfficersPanel
                    departmentId={department.id}
                    officers={department.users}
                    candidates={candidates}
                    offices={offices}
                />
            </div>

            <div className="mt-5 border-t border-neutral-200 pt-4">
                <DangerButton
                    type="button"
                    onClick={() => setDeleting(true)}
                >
                    Delete department
                </DangerButton>
            </div>

            <DeleteDepartment
                department={department}
                show={deleting}
                onClose={() => setDeleting(false)}
            />
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
