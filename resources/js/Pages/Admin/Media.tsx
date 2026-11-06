import DangerButton from '@/Components/DangerButton';
import EmptyState from '@/Components/EmptyState';
import { uploadBatches } from '@/Components/GalleryUploadForm';
import InputError from '@/Components/InputError';
import { MediaItem } from '@/Components/MediaField';
import Modal from '@/Components/Modal';
import Pagination, { PageLink } from '@/Components/Pagination';
import SecondaryButton from '@/Components/SecondaryButton';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { Check, Copy, Images, Search, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type LibraryItem = MediaItem & {
    size: number;
    uploaded_by: string | null;
    uploaded_on: string;
};

function fileSize(bytes: number): string {
    return bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function Details({
    item,
    onClose,
}: {
    item: LibraryItem;
    onClose: () => void;
}) {
    const [usages, setUsages] = useState<string[] | null>(null);
    const [copied, setCopied] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const errors = usePage().props.errors as Record<string, string>;

    useEffect(() => {
        fetch(route('admin.media.show', item.id), {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        })
            .then((response) => response.json())
            .then((result: { usages: string[] }) => setUsages(result.usages))
            .catch(() => setUsages([]));
    }, [item.id]);

    const link = new URL(item.url, window.location.origin).href;

    const copy = () =>
        navigator.clipboard?.writeText(link).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });

    const remove = () => {
        setDeleting(true);

        router.delete(route('admin.media.destroy', item.id), {
            preserveScroll: true,
            onSuccess: onClose,
            onFinish: () => setDeleting(false),
        });
    };

    return (
        <div className="grid max-h-[85vh] overflow-y-auto sm:grid-cols-[3fr_2fr]">
            <div className="flex items-center justify-center bg-charcoal-900 p-3">
                <img
                    src={item.url}
                    alt=""
                    className="max-h-[60vh] rounded object-contain"
                />
            </div>
            <div className="space-y-4 p-4">
                <div>
                    <h2 className="break-all text-lg">{item.name}</h2>
                    <dl className="mt-2 space-y-1 text-sm text-neutral-600">
                        {item.width && (
                            <div>
                                <dt className="sr-only">Size in pixels</dt>
                                <dd className="tabular-nums">
                                    {item.width} × {item.height} pixels
                                </dd>
                            </div>
                        )}
                        <div>
                            <dt className="sr-only">File size</dt>
                            <dd className="tabular-nums">
                                {fileSize(item.size)}
                            </dd>
                        </div>
                        <div>
                            <dt className="sr-only">Uploaded</dt>
                            <dd>
                                Uploaded {item.uploaded_on}
                                {item.uploaded_by && ` by ${item.uploaded_by}`}
                            </dd>
                        </div>
                    </dl>
                </div>

                <div>
                    <h3 className="font-sans text-sm font-semibold">Used in</h3>
                    {usages === null ? (
                        <p role="status" className="text-sm text-neutral-600">
                            Checking...
                        </p>
                    ) : usages.length === 0 ? (
                        <p className="text-sm text-neutral-600">
                            Not used anywhere yet.
                        </p>
                    ) : (
                        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
                            {usages.map((place) => (
                                <li key={place}>{place}</li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    <SecondaryButton onClick={copy}>
                        {copied ? (
                            <Check
                                size={16}
                                aria-hidden="true"
                                className="mr-1.5"
                            />
                        ) : (
                            <Copy
                                size={16}
                                aria-hidden="true"
                                className="mr-1.5"
                            />
                        )}
                        {copied ? 'Link copied' : 'Copy link'}
                    </SecondaryButton>
                    <DangerButton
                        type="button"
                        onClick={remove}
                        disabled={deleting || usages === null || usages.length > 0}
                    >
                        Delete
                    </DangerButton>
                </div>
                {usages && usages.length > 0 && (
                    <p className="text-xs text-neutral-600">
                        A picture in use can not be deleted. Change those
                        places to another picture first.
                    </p>
                )}
                <InputError message={errors.media} />

                <SecondaryButton onClick={onClose}>Close</SecondaryButton>
            </div>
        </div>
    );
}

export default function Media({
    search,
    media,
}: {
    search: string;
    media: { data: LibraryItem[]; links: PageLink[]; total: number };
}) {
    const errors = usePage().props.errors as Record<string, string>;
    const input = useRef<HTMLInputElement>(null);
    const [term, setTerm] = useState(search);
    const [uploading, setUploading] = useState<string | null>(null);
    const [open, setOpen] = useState<LibraryItem | null>(null);

    useEffect(() => {
        if (term === search) {
            return;
        }

        const timer = setTimeout(
            () =>
                router.get(
                    route('admin.media'),
                    term ? { search: term } : {},
                    { preserveState: true, replace: true },
                ),
            300,
        );

        return () => clearTimeout(timer);
    }, [term, search]);

    const upload = (files: File[]) => {
        const batches = uploadBatches(files);

        const send = (index: number) => {
            setUploading(
                batches.length > 1
                    ? `Uploading part ${index + 1} of ${batches.length}...`
                    : 'Uploading...',
            );

            router.post(
                route('admin.media.store'),
                { images: batches[index] },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () =>
                        index + 1 < batches.length
                            ? send(index + 1)
                            : setUploading(null),
                    onError: () => setUploading(null),
                },
            );
        };

        if (batches.length > 0) {
            send(0);
        }
    };

    const uploadError = Object.entries(errors).find(([key]) =>
        key.startsWith('images'),
    )?.[1];

    return (
        <AdminLayout>
            <Head title="Media Library" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Media Library</h1>
                    <div className="gold-rule" />
                </div>
                <div className="flex items-center gap-3">
                    {uploading && (
                        <span
                            role="status"
                            className="text-sm text-neutral-600"
                        >
                            {uploading}
                        </span>
                    )}
                    <button
                        type="button"
                        disabled={uploading !== null}
                        onClick={() => input.current?.click()}
                        className="inline-flex items-center gap-2 rounded-lg bg-primary-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                        <Upload size={20} strokeWidth={1.75} aria-hidden="true" />
                        Upload pictures
                    </button>
                    <input
                        ref={input}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="Upload pictures"
                        tabIndex={-1}
                        className="sr-only"
                        onChange={(e) => {
                            upload([...(e.target.files ?? [])]);
                            e.target.value = '';
                        }}
                    />
                </div>
            </div>

            <p className="mt-4 max-w-2xl text-sm text-neutral-600">
                Every picture uploaded for the website is kept here. When a
                form asks for a picture, choose "Choose from library" to use one
                of these instead of uploading it again.
            </p>
            <InputError message={uploadError} className="mt-2" />

            <label className="relative mt-6 block max-w-md">
                <span className="sr-only">Search pictures</span>
                <Search
                    size={20}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                />
                <input
                    type="search"
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="Search by file name"
                    className="block w-full rounded-lg border-neutral-200 pl-10 text-sm focus:border-primary-700 focus:ring-primary-700"
                />
            </label>

            <p className="mt-3 text-sm tabular-nums text-neutral-600">
                {media.total} {media.total === 1 ? 'picture' : 'pictures'}
            </p>

            {media.data.length === 0 ? (
                <div className="mt-4">
                    <EmptyState
                        icon={Images}
                        message={
                            search
                                ? `No pictures match “${search}”.`
                                : 'No pictures yet. Upload some to get started.'
                        }
                    />
                </div>
            ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                    {media.data.map((item) => (
                        <li key={item.id}>
                            <button
                                type="button"
                                onClick={() => setOpen(item)}
                                className="group block w-full overflow-hidden rounded-lg bg-white text-left shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                            >
                                <span className="block aspect-square overflow-hidden bg-neutral-50">
                                    <img
                                        src={item.url}
                                        alt=""
                                        loading="lazy"
                                        className="h-full w-full object-cover transition group-hover:scale-105"
                                    />
                                </span>
                                <span className="block truncate px-2 py-1.5 text-xs text-neutral-600">
                                    {item.name}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <Pagination links={media.links} />

            <Modal
                show={open !== null}
                onClose={() => setOpen(null)}
                maxWidth="2xl"
            >
                {open && <Details item={open} onClose={() => setOpen(null)} />}
            </Modal>
        </AdminLayout>
    );
}
