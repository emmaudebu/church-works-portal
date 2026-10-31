import Logo from '@/Components/Logo';
import { PageProps } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function PublicLayout({ children }: PropsWithChildren) {
    const { user } = usePage<PageProps>().props.auth;

    const linkClass =
        'rounded-lg text-sm font-medium text-neutral-600 transition hover:text-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700';

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <header className="border-b border-neutral-200 bg-white">
                <nav
                    aria-label="Main"
                    className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 md:px-8"
                >
                    <Logo />
                    <div className="flex items-center gap-6">
                        <a
                            href="/#departments"
                            className={`hidden sm:inline ${linkClass}`}
                        >
                            Departments
                        </a>
                        <a
                            href="/#news"
                            className={`hidden sm:inline ${linkClass}`}
                        >
                            News &amp; Events
                        </a>
                        <Link
                            href={user ? route('dashboard') : route('login')}
                            className={linkClass}
                        >
                            {user ? 'Dashboard' : 'Login'}
                        </Link>
                    </div>
                </nav>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="bg-primary-900 px-4 py-6 text-center text-sm text-white md:px-8">
                Covenant Workforce ·{' '}
                <span className="text-gold-300">Serving with Excellence</span>
            </footer>
        </div>
    );
}
