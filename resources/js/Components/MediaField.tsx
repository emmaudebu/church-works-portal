import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import SecondaryButton from '@/Components/SecondaryButton';
import { Check, ImageOff, Images, Search, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type MediaItem = {
    id: number;
    url: string;
    name: string;
    width: number | null;
    height: number | null;
};

/** A new upload or a library pick. The form sends them as `<field>` and `<field>_media`. */
export type MediaChoice = {
    file: File | null;
    mediaId: number | null;
    preview: string | null;
};

type Page = { data: MediaItem[]; current_page: number; last_page: number };

/** Browses the library and hands back the picture chosen. */
export function MediaLibraryDialog({
    show,
    onClose,
    onSelect,
}: {
    show: boolean;
    onClose: () => void;
    onSelect: (item: MediaItem) => void;
}) {
    const [search, setSearch] = useState('');
    const [items, setItems] = useState<MediaItem[]>([]);
    const [page, setPage] = useState<Page | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const [selected, setSelected] = useState<MediaItem | null>(null);

    const load = (pageNumber: number, term: string) => {
        setLoading(true);
        setFailed(false);

        fetch(route('admin.media.picker', { page: pageNumber, search: term }), {
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
            credentials: 'same-origin',
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(String(response.status));
                }

                return response.json() as Promise<Page>;
            })
            .then((result) => {
                setPage(result);
                setItems((current) =>
                    pageNumber === 1 ? result.data : [...current, ...result.data],
                );
            })
            .catch(() => setFailed(true))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!show) {
            return;
        }

        setSelected(null);

        const timer = setTimeout(() => load(1, search), search ? 300 : 0);

        return () => clearTimeout(timer);
    }, [show, search]);

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="flex max-h-[85vh] flex-col">
                <div className="border-b border-neutral-200 p-4">
                    <h2 className="text-xl">Choose from the library</h2>
                    <label className="relative mt-3 block">
                        <span className="sr-only">Search pictures</span>
                        <Search
                            size={20}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600"
                        />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by file name"
                            className="block w-full rounded-lg border-neutral-200 pl-10 text-sm focus:border-primary-700 focus:ring-primary-700"
                        />
                    </label>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {failed ? (
                        <p className="text-sm text-danger">
                            The library could not be loaded. Please try again.
                        </p>
                    ) : items.length === 0 && !loading ? (
                        <p className="py-8 text-center text-sm text-neutral-600">
                            {search
                                ? `No pictures match “${search}”.`
                                : 'The library is empty. Upload a new picture instead.'}
                        </p>
                    ) : (
                        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {items.map((item) => {
                                const isSelected = selected?.id === item.id;

                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelected(item)}
                                            onDoubleClick={() => onSelect(item)}
                                            aria-pressed={isSelected}
                                            aria-label={item.name}
                                            className={`relative block aspect-square w-full overflow-hidden rounded-lg bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${isSelected ? 'ring-4 ring-primary-700' : ''}`}
                                        >
                                            <img
                                                src={item.url}
                                                alt=""
                                                loading="lazy"
                                                className="h-full w-full object-cover"
                                            />
                                            {isSelected && (
                                                <span className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary-700 text-white">
                                                    <Check
                                                        size={14}
                                                        aria-hidden="true"
                                                    />
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    {page && page.current_page < page.last_page && (
                        <div className="mt-4 text-center">
                            <SecondaryButton
                                disabled={loading}
                                onClick={() =>
                                    load(page.current_page + 1, search)
                                }
                            >
                                {loading ? 'Loading...' : 'Load more'}
                            </SecondaryButton>
                        </div>
                    )}
                    {loading && items.length === 0 && (
                        <p role="status" className="text-sm text-neutral-600">
                            Loading...
                        </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 p-4">
                    <p className="min-w-0 truncate text-sm text-neutral-600">
                        {selected
                            ? `${selected.name}${selected.width ? ` · ${selected.width} × ${selected.height}` : ''}`
                            : 'Select a picture'}
                    </p>
                    <div className="flex gap-2">
                        <SecondaryButton onClick={onClose}>
                            Cancel
                        </SecondaryButton>
                        <button
                            type="button"
                            disabled={!selected}
                            onClick={() => selected && onSelect(selected)}
                            className="inline-flex items-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 disabled:opacity-50"
                        >
                            Use this picture
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

/**
 * A picture field that takes a new upload or a picture from the media library.
 */
export default function MediaField({
    id,
    label,
    preview,
    onChange,
    error,
    previewClassName = 'h-28 w-full',
    contain = false,
}: {
    id: string;
    label: string;
    preview: string | null;
    onChange: (choice: MediaChoice) => void;
    error?: string;
    previewClassName?: string;
    /** Shows the whole picture on a dark backdrop, for pictures with transparent edges. */
    contain?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [browsing, setBrowsing] = useState(false);
    const [chosenName, setChosenName] = useState<string | null>(null);

    return (
        <div>
            <p id={`${id}-label`} className="block text-sm font-medium">
                {label}
            </p>
            {preview ? (
                <img
                    src={preview}
                    alt=""
                    className={`mt-1 rounded-lg ${contain ? 'bg-charcoal-900 object-contain p-2' : 'object-cover'} ${previewClassName}`}
                />
            ) : (
                <div
                    className={`mt-1 flex items-center justify-center rounded-lg bg-neutral-50 text-neutral-600 ${previewClassName}`}
                >
                    <ImageOff size={20} strokeWidth={1.75} aria-hidden="true" />
                </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
                <SecondaryButton
                    onClick={() => input.current?.click()}
                    aria-describedby={`${id}-label`}
                >
                    <Upload
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="mr-1.5"
                    />
                    Upload new
                </SecondaryButton>
                <SecondaryButton
                    onClick={() => setBrowsing(true)}
                    aria-describedby={`${id}-label`}
                >
                    <Images
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="mr-1.5"
                    />
                    Choose from library
                </SecondaryButton>
            </div>
            {chosenName && (
                <p className="mt-1 truncate text-xs text-neutral-600">
                    {chosenName}
                </p>
            )}
            <input
                ref={input}
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-labelledby={`${id}-label`}
                onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;

                    if (file) {
                        setChosenName(file.name);
                        onChange({
                            file,
                            mediaId: null,
                            preview: URL.createObjectURL(file),
                        });
                    }
                }}
            />
            <InputError message={error} className="mt-2" />

            <MediaLibraryDialog
                show={browsing}
                onClose={() => setBrowsing(false)}
                onSelect={(item) => {
                    setBrowsing(false);
                    setChosenName(`${item.name} (from the library)`);

                    if (input.current) {
                        input.current.value = '';
                    }

                    onChange({ file: null, mediaId: item.id, preview: item.url });
                }}
            />
        </div>
    );
}
