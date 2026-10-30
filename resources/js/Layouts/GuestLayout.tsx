import Logo from '@/Components/Logo';
import { PropsWithChildren } from 'react';

export default function Guest({ children }: PropsWithChildren) {
    return (
        <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
            <aside className="hidden flex-col items-center justify-center bg-charcoal-900 p-12 text-center lg:flex">
                <img
                    src="/images/logo-dark.png"
                    alt="Church logo"
                    className="w-64"
                />
                <div className="mt-10 h-0.5 w-16 bg-gold-500" />
                <blockquote className="mt-6 max-w-sm font-serif text-xl text-white">
                    “Serve the Lord with gladness: come before his presence with
                    singing.”
                    <footer className="mt-3 font-sans text-sm text-silver-300">
                        Psalm 100:2
                    </footer>
                </blockquote>
            </aside>

            <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 lg:px-8">
                <div className="w-full max-w-md">
                    <Logo className="mb-8 lg:hidden" />
                    {children}
                </div>
            </main>
        </div>
    );
}
