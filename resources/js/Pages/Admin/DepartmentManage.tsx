import DangerButton from '@/Components/DangerButton';
import GalleryUploadForm, {
    EventOption,
    newChoice,
    OccasionPicker,
    occasionPayload,
    ServiceOption,
} from '@/Components/GalleryUploadForm';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import OfficersPanel, { Officer, Person } from '@/Components/OfficersPanel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { GalleryImage, GalleryOccasion } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { FormEventHandler, useState } from 'react';

type Unit = { id: number; name: string; members: number };

function UnitRow({ unit }: { unit: Unit }) {
    const form = useForm({ name: unit.name });

    const save: FormEventHandler = (e) => {
        e.preventDefault();

        form.patch(route('admin.units.update', unit.id), {
            preserveScroll: true,
        });
    };

    return (
        <li className="py-2">
            <form onSubmit={save} className="flex flex-wrap items-center gap-2">
                <TextInput
                    aria-label={`Name of ${unit.name}`}
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    required
                    className="min-w-0 flex-1 basis-40"
                />
                <span className="text-sm tabular-nums text-neutral-600">
                    {unit.members} {unit.members === 1 ? 'member' : 'members'}
                </span>
                <SecondaryButton type="submit">Rename</SecondaryButton>
                <DangerButton
                    type="button"
                    disabled={unit.members > 0}
                    onClick={() =>
                        router.delete(route('admin.units.destroy', unit.id), {
                            preserveScroll: true,
                        })
                    }
                >
                    Remove
                </DangerButton>
            </form>
            <InputError message={form.errors.name} className="mt-1" />
        </li>
    );
}

type Bank = {
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
};

function BankForm({
    departmentId,
    bank,
    canEdit,
}: {
    departmentId: number;
    bank: Bank;
    canEdit: boolean;
}) {
    const form = useForm({
        bank_name: bank.bank_name ?? '',
        account_number: bank.account_number ?? '',
        account_name: bank.account_name ?? '',
        password: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.patch(route('admin.departments.bank', departmentId), {
            preserveScroll: true,
            onFinish: () => form.reset('password'),
        });
    };

    const fields = [
        ['bank_name', 'Bank'],
        ['account_number', 'Account number'],
        ['account_name', 'Account name'],
    ] as const;

    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">Bank account</h2>
            <p className="mt-1 text-sm text-neutral-600">
                Members transfer dues here. Only the Head of Department or a
                super admin can change it.
            </p>

            {canEdit ? (
                <form onSubmit={submit} className="mt-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                        {fields.map(([name, label]) => (
                            <div key={name}>
                                <InputLabel htmlFor={name} value={label} />
                                <TextInput
                                    id={name}
                                    value={form.data[name]}
                                    onChange={(e) =>
                                        form.setData(name, e.target.value)
                                    }
                                    className="mt-1 block w-full"
                                />
                                <InputError
                                    message={form.errors[name]}
                                    className="mt-2"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="max-w-xs">
                        <InputLabel
                            htmlFor="bank_password"
                            value="Your password, to confirm"
                        />
                        <TextInput
                            id="bank_password"
                            type="password"
                            autoComplete="current-password"
                            value={form.data.password}
                            onChange={(e) =>
                                form.setData('password', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError
                            message={form.errors.password}
                            className="mt-2"
                        />
                    </div>
                    <PrimaryButton disabled={form.processing}>
                        Save bank account
                    </PrimaryButton>
                </form>
            ) : bank.account_number ? (
                <p className="mt-3 text-sm">
                    {bank.bank_name}, {bank.account_number},{' '}
                    {bank.account_name}
                </p>
            ) : (
                <p className="mt-3 text-sm text-neutral-600">
                    Ask a super admin to add this department's account.
                </p>
            )}
        </section>
    );
}

type PageContent = {
    id: number;
    description: string | null;
    about: string | null;
    image_url: string;
};

function PageForm({ department }: { department: PageContent }) {
    const [preview, setPreview] = useState(department.image_url);

    const form = useForm<{
        description: string;
        about: string;
        image: File | null;
    }>({
        description: department.description ?? '',
        about: department.about ?? '',
        image: null,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.departments.page', department.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.setData('image', null),
        });
    };

    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">Public page</h2>
            <p className="mt-1 text-sm text-neutral-600">
                What visitors see on your department's page.
            </p>

            <form onSubmit={submit} className="mt-4 space-y-4">
                <div>
                    <label
                        htmlFor="page-image"
                        className="block text-sm font-medium"
                    >
                        Banner picture
                    </label>
                    <img
                        src={preview}
                        alt=""
                        className="mt-1 h-40 w-full rounded-lg object-cover"
                    />
                    <input
                        id="page-image"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;

                            form.setData('image', file);

                            if (file) {
                                setPreview(URL.createObjectURL(file));
                            }
                        }}
                        className="mt-2 block w-full text-sm"
                    />
                    <InputError message={form.errors.image} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="page-description"
                        value="Short description"
                    />
                    <TextInput
                        id="page-description"
                        value={form.data.description}
                        onChange={(e) =>
                            form.setData('description', e.target.value)
                        }
                        className="mt-1 block w-full"
                    />
                    <InputError
                        message={form.errors.description}
                        className="mt-2"
                    />
                </div>

                <div>
                    <InputLabel
                        htmlFor="page-about"
                        value="About this department"
                    />
                    <textarea
                        id="page-about"
                        rows={6}
                        value={form.data.about}
                        onChange={(e) => form.setData('about', e.target.value)}
                        className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                    />
                    <InputError message={form.errors.about} className="mt-2" />
                </div>

                <PrimaryButton disabled={form.processing}>
                    Save page
                </PrimaryButton>
            </form>
        </section>
    );
}

type ManagedImage = GalleryImage & {
    occasion: GalleryOccasion;
    uploaded_by: string | null;
};

/** Who the Head has given the duty of uploading gallery pictures. */
function UploadersPanel({
    departmentId,
    assigned,
    candidates,
}: {
    departmentId: number;
    assigned: Person[];
    candidates: Person[];
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        user_id: '',
    });

    const assign: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('admin.gallery.uploaders.store', departmentId), {
            preserveScroll: true,
            onSuccess: () => reset(),
        });
    };

    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">Gallery uploaders</h2>
            <p className="mt-1 text-sm text-neutral-600">
                Members given this duty see "Upload service photos" on their
                home page. Officers whose office has the upload permission can
                already upload.
            </p>

            {assigned.length === 0 ? (
                <p className="mt-3 text-sm text-neutral-600">
                    Nobody has been given the duty yet.
                </p>
            ) : (
                <ul className="mt-3 flex flex-wrap gap-2">
                    {assigned.map((person) => (
                        <li
                            key={person.id}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-50 py-1 pl-3 pr-1 text-sm"
                        >
                            <span className="py-1 pr-2">{person.full_name}</span>
                            <button
                                type="button"
                                aria-label={`Take the upload duty from ${person.full_name}`}
                                onClick={() =>
                                    router.delete(
                                        route('admin.gallery.uploaders.destroy', [
                                            departmentId,
                                            person.id,
                                        ]),
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
                        htmlFor="gallery-uploader"
                        value="Give a member the duty"
                    />
                    <select
                        id="gallery-uploader"
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
                <PrimaryButton disabled={processing || !data.user_id}>
                    Assign
                </PrimaryButton>
            </form>
        </section>
    );
}

/** Moves one picture, or a whole group, to another service or event. */
function MoveForm({
    id,
    action,
    label,
    services,
    events,
    onDone,
}: {
    id: string;
    action: string;
    label: string;
    services: ServiceOption[];
    events: EventOption[];
    onDone: () => void;
}) {
    const [value, setValue] = useState(() => newChoice(services));
    const [moving, setMoving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        setMoving(true);

        router.patch(action, occasionPayload(value), {
            preserveScroll: true,
            errorBag: 'move',
            onSuccess: onDone,
            onError: (errors) => setError(Object.values(errors)[0] ?? null),
            onFinish: () => setMoving(false),
        });
    };

    return (
        <form
            onSubmit={submit}
            className="space-y-3 rounded-lg bg-neutral-50 p-3"
        >
            <OccasionPicker
                id={id}
                value={value}
                onChange={setValue}
                services={services}
                events={events}
            />
            <InputError message={error ?? undefined} />
            <div className="flex gap-2">
                <PrimaryButton disabled={moving}>{label}</PrimaryButton>
                <SecondaryButton type="button" onClick={onDone}>
                    Cancel
                </SecondaryButton>
            </div>
        </form>
    );
}

function GalleryItem({
    image,
    services,
    events,
}: {
    image: ManagedImage;
    services: ServiceOption[];
    events: EventOption[];
}) {
    const [caption, setCaption] = useState(image.caption ?? '');
    const [moving, setMoving] = useState(false);

    return (
        <li className="card overflow-hidden">
            <img
                src={image.url}
                alt={image.caption ?? ''}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
            />
            <div className="space-y-2 p-3">
                {image.uploaded_by && (
                    <p className="text-xs text-neutral-600">
                        Uploaded by {image.uploaded_by}
                    </p>
                )}
                <TextInput
                    aria-label="Caption"
                    placeholder="Caption (optional)"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    onBlur={() =>
                        caption !== (image.caption ?? '') &&
                        router.patch(
                            route('admin.gallery.update', image.id),
                            { caption },
                            { preserveScroll: true },
                        )
                    }
                    className="block w-full text-sm"
                />
                {moving ? (
                    <MoveForm
                        id={`move-${image.id}`}
                        action={route('admin.gallery.update', image.id)}
                        label="Move picture"
                        services={services}
                        events={events}
                        onDone={() => setMoving(false)}
                    />
                ) : (
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <button
                            type="button"
                            onClick={() => setMoving(true)}
                            className="text-sm text-primary-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                        >
                            Move
                        </button>
                        <button
                            type="button"
                            onClick={() =>
                                router.delete(
                                    route('admin.gallery.destroy', image.id),
                                    { preserveScroll: true },
                                )
                            }
                            className="text-sm text-danger underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                        >
                            Remove picture
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}

function GalleryGroup({
    images,
    services,
    events,
}: {
    images: ManagedImage[];
    services: ServiceOption[];
    events: EventOption[];
}) {
    const [moving, setMoving] = useState(false);
    const { occasion } = images[0];

    return (
        <div>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-200 pb-2">
                <h3 className="text-lg">
                    {occasion.title}
                    <span className="ml-2 font-sans text-sm font-normal text-neutral-600">
                        {occasion.date_label && `${occasion.date_label} · `}
                        {images.length}{' '}
                        {images.length === 1 ? 'picture' : 'pictures'}
                    </span>
                </h3>
                {!moving && (
                    <button
                        type="button"
                        onClick={() => setMoving(true)}
                        className="text-sm text-primary-700 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        Move all
                    </button>
                )}
            </div>
            {moving && (
                <div className="mt-3">
                    <MoveForm
                        id={`move-group-${images[0].id}`}
                        action={route('admin.gallery.occasion', images[0].id)}
                        label={`Move ${images.length} ${images.length === 1 ? 'picture' : 'pictures'}`}
                        services={services}
                        events={events}
                        onDone={() => setMoving(false)}
                    />
                </div>
            )}
            <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((image) => (
                    <GalleryItem
                        key={image.id}
                        image={image}
                        services={services}
                        events={events}
                    />
                ))}
            </ul>
        </div>
    );
}

export default function DepartmentManage({
    department,
    canEditBank,
    units,
    images,
    services,
    events,
    officeManager,
    uploaders,
}: {
    department: { name: string; slug: string } & PageContent & Bank;
    canEditBank: boolean;
    units: Unit[];
    images: ManagedImage[];
    services: ServiceOption[];
    events: EventOption[];
    officeManager: {
        officers: Officer[];
        candidates: Person[];
        offices: Record<string, string>;
    } | null;
    uploaders: { assigned: Person[]; candidates: Person[] } | null;
}) {
    const errors = usePage().props.errors as Record<string, string>;

    const unit = useForm({ name: '' });
    const groups = images.reduce<ManagedImage[][]>((all, image) => {
        const group = all.find(
            (pictures) => pictures[0].occasion.key === image.occasion.key,
        );

        if (group) {
            group.push(image);
        } else {
            all.push([image]);
        }

        return all;
    }, []);

    const addUnit: FormEventHandler = (e) => {
        e.preventDefault();

        unit.post(route('admin.units.store', department.id), {
            preserveScroll: true,
            onSuccess: () => unit.reset(),
        });
    };

    return (
        <AdminLayout>
            <Head title={department.name} />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">{department.name}</h1>
                    <div className="gold-rule" />
                </div>
                <a
                    href={route('departments.show', department.slug)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary-700 underline"
                >
                    View public page
                </a>
            </div>

            <div className="mt-6 max-w-4xl space-y-6">
                {officeManager && (
                    <section className="card p-4 sm:p-6">
                        <h2 className="text-xl">Department officers</h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            Give a member an office. What each office can do is
                            set in the office permissions.
                        </p>
                        <OfficersPanel
                            departmentId={department.id}
                            officers={officeManager.officers}
                            candidates={officeManager.candidates}
                            offices={officeManager.offices}
                        />
                    </section>
                )}

                {uploaders && (
                    <UploadersPanel
                        departmentId={department.id}
                        assigned={uploaders.assigned}
                        candidates={uploaders.candidates}
                    />
                )}

                <PageForm department={department} />

                <BankForm
                    departmentId={department.id}
                    bank={department}
                    canEdit={canEditBank}
                />

                <section className="card p-4 sm:p-6">
                    <h2 className="text-xl">Units</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        Members choose from these when they register.
                    </p>

                    {units.length > 0 && (
                        <ul className="mt-3 divide-y divide-neutral-200">
                            {units.map((item) => (
                                <UnitRow key={item.id} unit={item} />
                            ))}
                        </ul>
                    )}
                    <InputError message={errors.unit} className="mt-2" />

                    <form
                        onSubmit={addUnit}
                        className="mt-4 flex flex-wrap items-end gap-3"
                    >
                        <div className="min-w-0 flex-1 basis-48">
                            <InputLabel htmlFor="unit-name" value="Add a unit" />
                            <TextInput
                                id="unit-name"
                                value={unit.data.name}
                                onChange={(e) =>
                                    unit.setData('name', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={unit.errors.name}
                                className="mt-2"
                            />
                        </div>
                        <PrimaryButton disabled={unit.processing}>
                            Add unit
                        </PrimaryButton>
                    </form>
                </section>

                <section className="card p-4 sm:p-6">
                    <h2 className="text-xl">Gallery</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        Pictures appear on the department's public gallery,
                        grouped by the service or event they were taken at.
                    </p>

                    <div className="mt-4">
                        <GalleryUploadForm
                            action={route('admin.gallery.store', department.id)}
                            services={services}
                            events={events}
                        />
                    </div>

                    {groups.length > 0 && (
                        <div className="mt-6 space-y-8">
                            {groups.map((pictures) => (
                                <GalleryGroup
                                    key={pictures[0].occasion.key}
                                    images={pictures}
                                    services={services}
                                    events={events}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
