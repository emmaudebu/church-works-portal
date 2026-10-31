import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link } from '@inertiajs/react';
import { Hourglass } from 'lucide-react';

export default function AwaitingApproval() {
    return (
        <GuestLayout>
            <Head title="Awaiting approval" />

            <div className="text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-50 text-warning">
                    <Hourglass size={24} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h1 className="mt-4 text-3xl">Awaiting admin approval</h1>
                <p className="mt-3 text-neutral-600">
                    Thank you for registering. You can log in once an admin in
                    your department approves your details.
                </p>
                <Link
                    href={route('home')}
                    className="mt-6 inline-block text-sm font-medium text-primary-700 underline"
                >
                    Back to home
                </Link>
            </div>
        </GuestLayout>
    );
}
