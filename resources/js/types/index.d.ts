export interface User {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    email_verified_at?: string;
    status: 'pending' | 'active' | 'suspended';
    roles: string[];
    is_admin: boolean;
    office: string | null;
    permissions: string[];
    unit: string | null;
    department_id: number | null;
    department: string | null;
    photo_url: string | null;
    must_change_password: boolean;
}

export interface Department {
    id: number;
    name: string;
    slug: string;
    icon: string | null;
    description: string | null;
    status: 'active' | 'coming_soon';
    members_count: number;
    about: string | null;
    about_label: string | null;
    about_title: string | null;
    about_accent: string | null;
    image_url: string;
    about_image_url: string | null;
    about_small_image_url: string | null;
}

export interface DepartmentContext {
    current_id: number | null;
    current_name: string | null;
    options: Pick<Department, 'id' | 'name'>[] | null;
}

export interface HomeSlide {
    id: string;
    image: string;
    label: string;
    title: string;
    accent: string;
    text: string;
}

export interface HomeContent {
    slides: HomeSlide[];
    welcome: {
        eyebrow: string;
        title: string;
        accent: string;
        text: string;
        button_label: string;
        button_link: string;
        image: string;
        small_image: string;
    };
    join: {
        eyebrow: string;
        title: string;
        accent: string;
        text: string;
        steps: JoinStep[];
    };
}

export interface JoinStep {
    image: string;
    title: string;
    text: string;
}

export interface GalleryImage {
    id: number;
    caption: string | null;
    url: string;
}

/** The service or event a group of gallery pictures was taken at. */
export interface GalleryOccasion {
    key: string;
    title: string;
    date_label: string | null;
    is_service: boolean;
}

export interface VerseToastData {
    enabled: boolean;
    position: string;
    first_delay: number;
    interval: number;
    duration: number;
    verses: { reference: string; text: string }[];
}

export interface SitePopupData {
    enabled: boolean;
    image_url: string;
    link: string | null;
    alt: string;
    frequency: 'every_page' | 'every_visit' | 'daily';
    max_views: number | null;
    transition: 'fade' | 'zoom' | 'slide-up' | 'slide-down' | 'bounce' | 'flip';
    delay: number;
    version: number;
}

export interface Branding {
    church_name: string;
    logo_light_url: string;
    logo_dark_url: string;
}

export type MemberStatus = User['status'];

export interface MemberRow {
    id: number;
    member_id: string | null;
    full_name: string;
    phone: string | null;
    unit: string | null;
    status: MemberStatus;
    photo_url: string | null;
    can_manage: boolean;
    attendance_rate: number | null;
}

export interface TrendPoint {
    id: number;
    title: string;
    date: string;
    label: string;
    present: number;
    rate: number;
}

export interface CheckedInMember {
    id: number;
    attendance_id?: number;
    full_name: string;
    unit: string | null;
    member_id: string | null;
    photo_url: string | null;
    checked_in_at?: string;
    service?: string;
}

export interface MemberProfile {
    next_of_kin_name: string | null;
    next_of_kin_relationship: string | null;
    next_of_kin_phone: string | null;
    occupation: string | null;
    technical_skills: string[] | null;
    marital_status: string | null;
    admin_notes?: string | null;
}

export interface MemberRecord {
    id: number;
    department_id: number | null;
    department: string | null;
    member_id: string | null;
    full_name: string;
    gender: string | null;
    date_of_birth: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    unit: string | null;
    date_joined: string | null;
    foundation_class_done: boolean;
    wofbi_done: boolean;
    status: MemberStatus;
    suspension_reason: string | null;
    photo_url: string | null;
    certificate_urls: { foundation: string | null; wofbi: string | null };
    profile: MemberProfile | null;
}

export interface PostCard {
    id: number;
    type: 'news' | 'event' | 'announcement';
    title: string;
    venue: string | null;
    excerpt: string;
    image_url: string;
    day: string;
    month: string;
    date: string;
    date_label: string;
}

export type ElectionStatus = 'upcoming' | 'open' | 'closed';

export interface BallotCandidate {
    id: number;
    full_name: string;
    unit: string | null;
    manifesto: string | null;
    photo_url: string | null;
}

export interface PositionResult {
    id: number;
    title: string;
    total: number;
    candidates: (BallotCandidate & { votes: number })[];
}

export interface Turnout {
    voted: number;
    eligible: number;
    percent: number;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    pendingReceipts: number;
    auth: {
        user: User;
    };
    departmentContext: DepartmentContext | null;
    singleDepartment: { name: string; slug: string } | null;
    branding: Branding;
    popup: SitePopupData | null;
    verseToast: VerseToastData | null;
    whatsappTemplates: { greeting: string; temp_password: string } | null;
    flash: {
        success: string | null;
        temp_password: string | null;
    };
};
