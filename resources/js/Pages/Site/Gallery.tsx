import EmptyState from '@/Components/EmptyState';
import Gallery from '@/Components/Site/Gallery';
import PageHero from '@/Components/Site/PageHero';
import PublicLayout from '@/Layouts/PublicLayout';
import { GalleryImage, GalleryOccasion } from '@/types';
import {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
} from '@headlessui/react';
import { Head, InfiniteScroll, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    ChevronDown,
    Church,
    Images,
} from 'lucide-react';

type Occasion = GalleryOccasion & {
    pictures_count: number;
    pictures: GalleryImage[];
};

/** How many small pictures a closed group previews. */
const PREVIEWS = 4;

function OccasionPanel({
    occasion,
    defaultOpen,
}: {
    occasion: Occasion;
    defaultOpen: boolean;
}) {
    const Icon = occasion.is_service
        ? Church
        : occasion.date_label
          ? CalendarDays
          : Images;

    return (
        <Disclosure as="section" defaultOpen={defaultOpen} className="card">
            {({ open }) => (
                <>
                    <DisclosureButton className="flex w-full items-center gap-4 rounded-2xl p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 sm:p-5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700">
                            <Icon
                                size={20}
                                strokeWidth={1.75}
                                aria-hidden="true"
                            />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-serif text-lg font-semibold leading-snug sm:text-xl">
                                {occasion.title}
                            </span>
                            <span className="block text-sm text-neutral-600">
                                {occasion.date_label &&
                                    `${occasion.date_label} · `}
                                {occasion.pictures_count}{' '}
                                {occasion.pictures_count === 1
                                    ? 'photo'
                                    : 'photos'}
                            </span>
                        </span>
                        {!open && (
                            <span
                                aria-hidden="true"
                                className="hidden shrink-0 -space-x-3 sm:flex"
                            >
                                {occasion.pictures
                                    .slice(0, PREVIEWS)
                                    .map((picture) => (
                                        <img
                                            key={picture.id}
                                            src={picture.url}
                                            alt=""
                                            loading="lazy"
                                            className="h-11 w-11 rounded-full object-cover ring-2 ring-white"
                                        />
                                    ))}
                            </span>
                        )}
                        <ChevronDown
                            size={20}
                            strokeWidth={1.75}
                            aria-hidden="true"
                            className={`shrink-0 text-neutral-600 transition-transform ${open ? 'rotate-180' : ''}`}
                        />
                    </DisclosureButton>
                    <DisclosurePanel className="px-4 pb-4 sm:px-5 sm:pb-5">
                        <Gallery images={occasion.pictures} reveal={false} />
                    </DisclosurePanel>
                </>
            )}
        </Disclosure>
    );
}

export default function GalleryPage({
    department,
    total,
    occasions,
}: {
    department: { name: string; slug: string; image_url: string };
    total: number;
    occasions: { data: Occasion[] };
}) {
    return (
        <PublicLayout>
            <Head title={`Gallery · ${department.name}`} />

            <PageHero
                image={department.image_url}
                eyebrow={department.name}
                title="Gallery"
            >
                <p className="mt-4 max-w-xl text-lg">
                    Moments from our services and events
                    {total > 0 && ` · ${total} photos`}.
                </p>
            </PageHero>

            <section className="mx-auto max-w-7xl px-4 py-12 md:px-8">
                <Link
                    href={route('departments.show', department.slug)}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-primary-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                >
                    <ArrowLeft size={20} strokeWidth={1.75} aria-hidden="true" />
                    Back to {department.name}
                </Link>

                {occasions.data.length === 0 ? (
                    <EmptyState
                        icon={Images}
                        message="No pictures yet. Check back after our next service."
                    />
                ) : (
                    <InfiniteScroll
                        data="occasions"
                        manual
                        onlyNext
                        preserveUrl
                        className="space-y-4"
                        next={({ loading, fetch, hasMore }) =>
                            hasMore && (
                                <div className="pt-4 text-center">
                                    <button
                                        type="button"
                                        onClick={fetch}
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 rounded-full border border-primary-700 px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 disabled:opacity-60"
                                    >
                                        {loading
                                            ? 'Loading...'
                                            : 'Load older services'}
                                    </button>
                                </div>
                            )
                        }
                    >
                        {occasions.data.map((occasion, index) => (
                            <OccasionPanel
                                key={occasion.key}
                                occasion={occasion}
                                defaultOpen={index === 0}
                            />
                        ))}
                    </InfiniteScroll>
                )}
            </section>
        </PublicLayout>
    );
}
