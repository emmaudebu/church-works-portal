export function whatsappUrl(phone: string, message: string) {
    const number = phone.replace(/\D/g, '');

    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function greetingUrl(phone: string, name: string) {
    return whatsappUrl(phone, `Hello ${name}, this is Covenant Workforce.`);
}
