export interface User {
    id: number;
    full_name: string;
    phone: string | null;
    email: string | null;
    email_verified_at?: string;
    status: 'pending' | 'active' | 'suspended';
    roles: string[];
    is_admin: boolean;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
