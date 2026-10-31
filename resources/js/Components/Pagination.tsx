import { Link } from '@inertiajs/react';

export type PageLink = { url: string | null; label: string; active: boolean };

export default function Pagination({ links }: { links: PageLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav aria-label="Pagination" className="mt-6 flex flex-wrap gap-1">
            {links.map((link) =>
                link.url ? (
                    <Link
                        key={link.label}
                        href={link.url}
                        preserveScroll
                        aria-current={link.active ? 'page' : undefined}
                        className={`rounded-lg px-3 py-1.5 text-sm tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${
                            link.active
                                ? 'bg-primary-700 text-white'
                                : 'text-neutral-600 hover:bg-primary-50'
                        }`}
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ) : (
                    <span
                        key={link.label}
                        className="px-3 py-1.5 text-sm text-neutral-600 opacity-50"
                        dangerouslySetInnerHTML={{ __html: link.label }}
                    />
                ),
            )}
        </nav>
    );
}
