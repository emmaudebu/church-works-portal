export type InstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: InstallPromptEvent | null = null;

/** The browser fires this once, often before any page has mounted, so catch it at startup. */
export function listenForInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredPrompt = event as InstallPromptEvent;
        window.dispatchEvent(new Event('install-available'));
    });
}

export function takeInstallPrompt() {
    const prompt = deferredPrompt;

    deferredPrompt = null;

    return prompt;
}

export function canInstall() {
    return deferredPrompt !== null;
}

export function isInstalled() {
    return (
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator && navigator.standalone === true)
    );
}

export function isIos() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
