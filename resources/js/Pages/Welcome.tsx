import PublicLayout from '@/Layouts/PublicLayout';
import { Head, Link } from '@inertiajs/react';

export default function Welcome() {
    return (
        <PublicLayout>
            <Head title="Serving with Excellence" />

            <section className="bg-hero px-4 py-20 text-center text-white md:px-8 md:py-28">
                <h1 className="text-4xl font-bold md:text-5xl">
                    Serving with Excellence
                </h1>
                <div className="mx-auto mt-4 h-0.5 w-16 bg-gold-500" />
                <p className="mx-auto mt-4 max-w-xl text-lg text-white">
                    Members, attendance, events and elections in one place
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                        href={route('register')}
                        className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                    >
                        Register
                    </Link>
                    <Link
                        href={route('login')}
                        className="rounded-lg border border-white px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
                    >
                        Login
                    </Link>
                </div>
            </section>
        </PublicLayout>
    );
}
