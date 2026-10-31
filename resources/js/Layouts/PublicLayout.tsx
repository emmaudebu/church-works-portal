import Logo from '@/Components/Logo';
import SitePopup from '@/Components/Site/SitePopup';
import VerseToast from '@/Components/Site/VerseToast';
import { PageProps } from '@/types';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useScrollReveal } from '@/lib/motion';
import { PropsWithChildren, ReactNode, useEffect, useState } from 'react';

const SOLID_HEADER_AFTER = 60;

export default function PublicLayout({
    children,
    topBar,
}: PropsWithChildren<{ topBar?: ReactNode }>) {
    const { props, url } = usePage<PageProps>();
    const { auth, branding, popup, verseToast } = props;
    const { user } = auth;
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useScrollReveal(url);

    useEffect(() => {
        const update = () => setScrolled(window.scrollY > SOLID_HEADER_AFTER);

        update();
        window.addEventListener('scroll', update, { passive: true });

        return () => window.removeEventListener('scroll', update);
    }, []);

    const links = [
        { label: 'Home', href: route('home') },
        { label: 'Departments', href: route('departments') },
        { label: 'News', href: route('news', { type: 'news' }) },
        { label: 'Events', href: route('news', { type: 'event' }) },
        { label: 'Announcements', href: route('news', { type: 'announcement' }) },
    ];

    const account = user
        ? { label: 'Dashboard', href: route('dashboard') }
        : { label: 'Login', href: route('login') };

    return (
        <div className="flex min-h-screen flex-col bg-white">
            <header
                className={`fixed inset-x-0 top-0 z-30 text-white transition duration-300 ${
                    scrolled
                        ? 'bg-charcoal-900/90 shadow-soft backdrop-blur'
                        : 'bg-transparent'
                }`}
            >
                {!scrolled && topBar}
                <nav
                    aria-label="Main"
                    className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8"
                >
                    <Logo variant="dark" wordmarkClassName="text-white" />

                    <div className="hidden items-center gap-6 lg:flex">
                        {links.map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="nav-link rounded-lg text-sm font-medium transition hover:text-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                            >
                                {link.label}
                            </Link>
                        ))}
                        <Link
                            href={account.href}
                            className="nav-link rounded-lg text-sm font-medium transition hover:text-gold-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            {account.label}
                        </Link>
                        {!user && (
                            <Link
                                href={route('register')}
                                className="rounded-full bg-primary-700 px-5 py-2 text-sm font-semibold transition hover:-translate-y-0.5 hover:bg-primary-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                            >
                                Register
                            </Link>
                        )}
                    </div>

                    <button
                        type="button"
                        aria-label="Open menu"
                        onClick={() => setOpen(true)}
                        className="rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 lg:hidden"
                    >
                        <Menu size={24} strokeWidth={1.75} />
                    </button>
                </nav>
            </header>

            <Dialog
                open={open}
                onClose={setOpen}
                aria-label="Menu"
                className="relative z-40 lg:hidden"
            >
                <DialogBackdrop className="fixed inset-0 bg-charcoal-900/60" />
                <DialogPanel className="fixed inset-y-0 right-0 flex w-72 flex-col bg-charcoal-900 p-6 text-white">
                    <button
                        type="button"
                        aria-label="Close menu"
                        onClick={() => setOpen(false)}
                        className="self-end rounded-lg p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                    >
                        <X size={24} strokeWidth={1.75} />
                    </button>
                    <div className="mt-4 flex flex-col gap-1">
                        {[
                            ...links,
                            account,
                            ...(user
                                ? []
                                : [
                                      {
                                          label: 'Register',
                                          href: route('register'),
                                      },
                                  ]),
                        ].map((link) => (
                            <Link
                                key={link.label}
                                href={link.href}
                                className="rounded-lg px-3 py-3 font-medium hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </DialogPanel>
            </Dialog>

            {popup && <SitePopup popup={popup} />}
            {verseToast && <VerseToast toast={verseToast} />}

            <main key={url} className="flex-1 animate-page-in">
                {children}
            </main>

            <footer className="bg-primary-900 text-white">
                <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
                    <div>
                        <Logo variant="dark" wordmarkClassName="text-white" />
                        <p className="mt-3 font-serif italic text-gold-300">
                            Serving with Excellence
                        </p>
                    </div>
                    <div>
                        <h2 className="font-serif text-lg">Explore</h2>
                        <ul className="mt-3 space-y-2 text-sm">
                            {links.map((link) => (
                                <li key={link.label}>
                                    <Link
                                        href={link.href}
                                        className="hover:text-gold-300 focus:outline-none focus-visible:underline"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-serif text-lg">Our church</h2>
                        <p className="mt-3 text-sm">
                            Part of Living Faith Church Worldwide.
                        </p>
                        <a
                            href="https://faithtabernacle.org.ng/"
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block text-sm text-gold-300 underline focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300"
                        >
                            Visit the church website
                        </a>
                    </div>
                </div>
                <p className="border-t border-white/15 px-4 py-4 text-center text-sm">
                    {branding.church_name} · Serving with Excellence
                </p>
            </footer>
        </div>
    );
}
