import GalleryUploadForm, {
    EventOption,
    ServiceOption,
} from '@/Components/GalleryUploadForm';
import AccountLayout from '@/Layouts/AccountLayout';
import { GalleryImage, GalleryOccasion } from '@/types';
import { Head, Link, router } from '@inertiajs/react';

type Upload = GalleryImage & { occasion: GalleryOccasion };

export default function Upload({
    department,
    services,
    events,
    recent,
}: {
    department: { id: number; name: string; slug: string };
    services: ServiceOption[];
    events: EventOption[];
    recent: Upload[];
}) {
    return (
        <AccountLayout>
            <Head title="Upload service photos" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl">Upload service photos</h1>
                    <div className="gold-rule" />
                </div>
                <Link
                    href={route('departments.gallery', department.slug)}
                    className="text-sm font-medium text-primary-700 underline"
                >
                    View the gallery
                </Link>
            </div>

            <section className="card mt-6 max-w-3xl p-4 sm:p-6">
                <p className="text-sm text-neutral-600">
                    Choose the service or event first, then the pictures. They
                    appear in the {department.name} gallery straight away.
                </p>
                <div className="mt-4">
                    <GalleryUploadForm
                        action={route('gallery.upload.store')}
                        services={services}
                        events={events}
                    />
                </div>
            </section>

            {recent.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-xl">Your recent uploads</h2>
                    <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                        {recent.map((image) => (
                            <li key={image.id} className="card overflow-hidden">
                                <img
                                    src={image.url}
                                    alt={image.caption ?? ''}
                                    loading="lazy"
                                    className="aspect-[4/3] w-full object-cover"
                                />
                                <div className="space-y-1 p-3">
                                    <p className="text-sm font-medium leading-snug">
                                        {image.occasion.title}
                                    </p>
                                    {image.occasion.date_label && (
                                        <p className="text-xs text-neutral-600">
                                            {image.occasion.date_label}
                                        </p>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.delete(
                                                route(
                                                    'gallery.upload.destroy',
                                                    image.id,
                                                ),
                                                { preserveScroll: true },
                                            )
                                        }
                                        className="text-sm text-danger underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                                    >
                                        Remove
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </AccountLayout>
    );
}
