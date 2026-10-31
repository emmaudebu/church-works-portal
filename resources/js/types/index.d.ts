export interface User {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    email_verified_at?: string;
    status: 'pending' | 'active' | 'suspended';
    roles: string[];
    is_admin: boolean;
    unit: string | null;
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
}

export interface DepartmentContext {
    current_id: number | null;
    current_name: string | null;
    options: Pick<Department, 'id' | 'name'>[] | null;
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
    profile: MemberProfile | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    departmentContext: DepartmentContext | null;
    flash: {
        success: string | null;
        temp_password: string | null;
    };
};
