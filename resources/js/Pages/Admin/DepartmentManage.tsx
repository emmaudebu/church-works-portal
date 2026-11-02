import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import OfficersPanel, { Officer, Person } from '@/Components/OfficersPanel';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { GalleryImage } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
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

function GalleryItem({ image }: { image: GalleryImage }) {
    const [caption, setCaption] = useState(image.caption ?? '');

    return (
        <li className="card overflow-hidden">
            <img
                src={image.url}
                alt={image.caption ?? ''}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
            />
            <div className="space-y-2 p-3">
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
        </li>
    );
}

const PICTURES_PER_UPLOAD = 12;

/** Stays under the server's 32 MB limit for one request. */
const BYTES_PER_UPLOAD = 24 * 1024 * 1024;

function uploadBatches(files: File[]): File[][] {
    const batches: File[][] = [];
    let batch: File[] = [];
    let size = 0;

    for (const file of files) {
        if (
            batch.length > 0 &&
            (batch.length === PICTURES_PER_UPLOAD ||
                size + file.size > BYTES_PER_UPLOAD)
        ) {
            batches.push(batch);
            batch = [];
            size = 0;
        }

        batch.push(file);
        size += file.size;
    }

    return batch.length > 0 ? [...batches, batch] : batches;
}

export default function DepartmentManage({
    department,
    canEditBank,
    units,
    images,
    officeManager,
}: {
    department: { name: string; slug: string } & PageContent & Bank;
    canEditBank: boolean;
    units: Unit[];
    images: GalleryImage[];
    officeManager: {
        officers: Officer[];
        candidates: Person[];
        offices: Record<string, string>;
    } | null;
}) {
    const errors = usePage().props.errors as Record<string, string>;

    const unit = useForm({ name: '' });
    const [pictures, setPictures] = useState<File[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [pickerKey, setPickerKey] = useState(0);

    const addUnit: FormEventHandler = (e) => {
        e.preventDefault();

        unit.post(route('admin.units.store', department.id), {
            preserveScroll: true,
            onSuccess: () => unit.reset(),
        });
    };

    /** Large selections go up a few at a time so no request is too big. */
    const addImages: FormEventHandler = (e) => {
        e.preventDefault();

        const batches = uploadBatches(pictures);

        const send = (index: number) => {
            setUploading(
                batches.length > 1
                    ? `Uploading part ${index + 1} of ${batches.length}...`
                    : 'Uploading...',
            );

            router.post(
                route('admin.gallery.store', department.id),
                { images: batches[index] },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        if (index + 1 < batches.length) {
                            send(index + 1);

                            return;
                        }

                        setPictures([]);
                        setPickerKey((key) => key + 1);
                        setUploading(null);
                    },
                    onError: () => setUploading(null),
                },
            );
        };

        send(0);
    };

    const uploadError = Object.entries(errors).find(([key]) =>
        key.startsWith('images'),
    )?.[1];

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
                        Pictures here appear on the department's public page.
                    </p>

                    <form onSubmit={addImages} className="mt-4 space-y-3">
                        <label className="block text-sm font-medium">
                            Add pictures (choose as many as you like)
                            <input
                                key={pickerKey}
                                type="file"
                                multiple
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) =>
                                    setPictures([...(e.target.files ?? [])])
                                }
                                className="mt-1 block w-full text-sm font-normal"
                            />
                        </label>
                        <InputError message={uploadError} />
                        <div className="flex flex-wrap items-center gap-3">
                            <PrimaryButton
                                disabled={
                                    uploading !== null || pictures.length === 0
                                }
                            >
                                {pictures.length > 1
                                    ? `Upload ${pictures.length} pictures`
                                    : 'Upload'}
                            </PrimaryButton>
                            {uploading && (
                                <span
                                    role="status"
                                    className="text-sm text-neutral-600"
                                >
                                    {uploading}
                                </span>
                            )}
                        </div>
                    </form>

                    {images.length > 0 && (
                        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {images.map((image) => (
                                <GalleryItem key={image.id} image={image} />
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </AdminLayout>
    );
}
