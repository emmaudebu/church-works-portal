import Logo from '@/Components/Logo';
import Embers from '@/Components/Site/Embers';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Home } from 'lucide-react';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    const { branding } = usePage<PageProps>().props;

    return (
        <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
            <aside className="relative hidden flex-col items-center justify-center overflow-hidden bg-charcoal-900 p-12 text-center lg:flex">
                <Embers />
                <img
                    src={branding.logo_dark_url}
                    alt="Church logo"
                    className="relative w-64 animate-float"
                />
                <div className="relative mt-10 h-0.5 w-16 bg-gold-500" />
                <blockquote className="relative mt-6 max-w-sm font-serif text-xl text-white">
                    “Serve the Lord with gladness: come before his presence with
                    singing.”
                    <footer className="mt-3 font-sans text-sm text-silver-300">
                        Psalm 100:2
                    </footer>
                </blockquote>
            </aside>

            <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 lg:px-8">
                <div className="w-full max-w-md animate-page-in">
                    <Link
                        href={route('home')}
                        className="mb-6 flex w-fit items-center gap-2 rounded-lg text-sm font-medium text-neutral-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700"
                    >
                        <Home size={20} strokeWidth={1.75} aria-hidden="true" />
                        Back to home
                    </Link>
                    <Logo className="mb-8 lg:hidden" />
                    {children}
                </div>
            </main>
        </div>
    );
}
