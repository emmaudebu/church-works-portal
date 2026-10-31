import {
    Building2,
    HandHeart,
    LucideProps,
    MonitorSpeaker,
    Music,
} from 'lucide-react';

const icons = {
    'monitor-speaker': MonitorSpeaker,
    music: Music,
    'hand-heart': HandHeart,
};

export default function DepartmentIcon({
    name,
    ...props
}: Omit<LucideProps, 'name'> & { name: string | null }) {
    const Icon = icons[name as keyof typeof icons] ?? Building2;

    return <Icon size={20} strokeWidth={1.75} aria-hidden="true" {...props} />;
}
