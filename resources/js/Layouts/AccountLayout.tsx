import AdminLayout from '@/Layouts/AdminLayout';
import MemberLayout from '@/Layouts/MemberLayout';
import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

/** Wraps pages shared by members and admins in the layout for the viewer. */
export default function AccountLayout({ children }: PropsWithChildren) {
    const { user } = usePage<PageProps>().props.auth;

    return user.is_admin ? (
        <AdminLayout>{children}</AdminLayout>
    ) : (
        <MemberLayout>{children}</MemberLayout>
    );
}
