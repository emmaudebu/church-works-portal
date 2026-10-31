import InstallApp from '@/Components/InstallApp';
import PushSettings from '@/Components/PushSettings';
import AccountLayout from '@/Layouts/AccountLayout';
import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';
import UpdateMemberDetailsForm from './Partials/UpdateMemberDetailsForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({
    auth,
    mustVerifyEmail,
    status,
    member,
    vapidPublicKey,
}: PageProps<{
    vapidPublicKey: string | null;
    mustVerifyEmail: boolean;
    status?: string;
    member: Parameters<typeof UpdateMemberDetailsForm>[0]['member'] | null;
}>) {
    return (
        <AccountLayout>
            <Head title="Profile" />

            <h1 className="text-3xl">Profile</h1>
            <div className="gold-rule mb-6" />

            <div className="max-w-2xl space-y-6">
                {auth.user.must_change_password && (
                    <p className="rounded-lg bg-gold-50 p-4 text-sm">
                        You are using a temporary password. Please choose a new
                        one below to continue.
                    </p>
                )}

                <div className="card p-4 sm:p-8">
                    {member ? (
                        <UpdateMemberDetailsForm member={member} />
                    ) : (
                        <UpdateProfileInformationForm
                            mustVerifyEmail={mustVerifyEmail}
                            status={status}
                        />
                    )}
                </div>

                <div className="card p-4 sm:p-8">
                    <UpdatePasswordForm />
                </div>

                <Link
                    href={route('member.payments')}
                    className="card block p-4 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 sm:p-8"
                >
                    My dues and payments
                </Link>

                <PushSettings vapidPublicKey={vapidPublicKey} />

                <InstallApp />

                <Link
                    href={route('logout')}
                    method="post"
                    as="button"
                    className="rounded-lg text-sm font-medium text-danger underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2"
                >
                    Log out
                </Link>
            </div>
        </AccountLayout>
    );
}
