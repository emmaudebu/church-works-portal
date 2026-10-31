import {
    Baby,
    BookOpen,
    Building2,
    Camera,
    Car,
    Flower2,
    HandHeart,
    HeartHandshake,
    LucideProps,
    Mic,
    MonitorSpeaker,
    Music,
    Shield,
    Sparkles,
    Utensils,
} from 'lucide-react';

const icons = {
    'monitor-speaker': MonitorSpeaker,
    music: Music,
    'hand-heart': HandHeart,
    baby: Baby,
    'book-open': BookOpen,
    building: Building2,
    camera: Camera,
    car: Car,
    flower: Flower2,
    'heart-handshake': HeartHandshake,
    mic: Mic,
    shield: Shield,
    sparkles: Sparkles,
    utensils: Utensils,
};

export default function DepartmentIcon({
    name,
    ...props
}: Omit<LucideProps, 'name'> & { name: string | null }) {
    const Icon = icons[name as keyof typeof icons] ?? Building2;

    return <Icon size={20} strokeWidth={1.75} aria-hidden="true" {...props} />;
}
