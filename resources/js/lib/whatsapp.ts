import { PageProps } from '@/types';
import { usePage } from '@inertiajs/react';

function whatsappUrl(phone: string, message: string) {
    const number = phone.replace(/\D/g, '');

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

/** Links that fill in the message templates from Settings. */
export function useWhatsapp() {
    const { branding, whatsappTemplates } = usePage<PageProps>().props;

    const fill = (template: string | undefined, name: string, password = '') =>
        (template ?? '')
            .replaceAll('{name}', name)
            .replaceAll('{church}', branding.church_name)
            .replaceAll('{password}', password);

    return {
        greeting: (phone: string, name: string) =>
            whatsappUrl(phone, fill(whatsappTemplates?.greeting, name)),
        tempPassword: (
            member: { phone: string | null; full_name: string },
            password: string,
        ) =>
            whatsappUrl(
                member.phone ?? '',
                fill(
                    whatsappTemplates?.temp_password,
                    member.full_name,
                    password,
                ),
            ),
    };
}
