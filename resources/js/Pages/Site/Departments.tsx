import DepartmentCard from '@/Components/DepartmentCard';
import PageHero from '@/Components/Site/PageHero';
import PublicLayout from '@/Layouts/PublicLayout';
import { Department } from '@/types';
import { Head } from '@inertiajs/react';

export default function Departments({
    departments,
}: {
    departments: Department[];
}) {
    return (
        <PublicLayout>
            <Head title="Departments" />

            <PageHero
                image="/images/site/auditorium.jpg"
                eyebrow="Serve with us"
                title="Our Departments"
            >
                <p className="mt-4 max-w-xl text-lg">
                    Find where your gifts fit and take your place in the work.
                </p>
            </PageHero>

            <section className="mx-auto max-w-7xl px-4 py-16 md:px-8">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {departments.map((department) => (
                        <DepartmentCard
                            key={department.id}
                            department={department}
                        />
                    ))}
                </div>
            </section>
        </PublicLayout>
    );
}
