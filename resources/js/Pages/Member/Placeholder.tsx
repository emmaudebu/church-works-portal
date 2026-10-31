import EmptyState from '@/Components/EmptyState';
import MemberLayout from '@/Layouts/MemberLayout';
import { Head } from '@inertiajs/react';
import { Hammer } from 'lucide-react';

export default function Placeholder({ title }: { title: string }) {
    return (
        <MemberLayout>
            <Head title={title} />

            <h1 className="text-3xl">{title}</h1>
            <div className="gold-rule mb-6" />
            <EmptyState
                icon={Hammer}
                message="This page arrives in a later build step."
            />
        </MemberLayout>
    );
}
