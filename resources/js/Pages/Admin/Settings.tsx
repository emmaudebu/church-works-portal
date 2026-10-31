import DangerButton from '@/Components/DangerButton';
import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import SitePopup from '@/Components/Site/SitePopup';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { HomeContent, HomeSlide, PageProps, SitePopupData } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, PropsWithChildren, useState } from 'react';

type RecurringService = {
    key: string | null;
    title: string;
    day: number;
    opens: string;
    closes: string;
};
type Person = { id: number; full_name: string };

const COLOR_LABELS = {
    primary_900: 'Deep red (sidebar, footer)',
    primary_700: 'Main red (buttons, links)',
    primary_500: 'Flame red (hover)',
    gold_500: 'Gold (accents)',
};

const PERMISSIONS: [string, boolean, boolean, boolean][] = [
    ['View own dashboard, QR and attendance; vote', true, true, true],
    ['Manage members, attendance and reports', true, true, false],
    ['Manage posts and elections', true, true, false],
    ['See every department', true, false, false],
    ['Departments and Settings', true, false, false],
];

const DAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
];

const textareaClass =
    'mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

function Panel({
    title,
    description,
    children,
}: PropsWithChildren<{ title: string; description?: string }>) {
    return (
        <section className="card p-4 sm:p-6">
            <h2 className="text-xl">{title}</h2>
            {description && (
                <p className="mt-1 text-sm text-neutral-600">{description}</p>
            )}
            <div className="mt-4">{children}</div>
        </section>
    );
}

function BrandingForm() {
    const { branding } = usePage<PageProps>().props;

    const form = useForm<{
        church_name: string;
        logo_light: File | null;
        logo_dark: File | null;
        reset_logos: boolean;
    }>({
        church_name: branding.church_name,
        logo_light: null,
        logo_dark: null,
        reset_logos: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.settings.branding'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset('logo_light', 'logo_dark', 'reset_logos'),
        });
    };

    return (
        <Panel title="Church details">
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="church_name" value="Church name" />
                    <TextInput
                        id="church_name"
                        value={form.data.church_name}
                        onChange={(e) =>
                            form.setData('church_name', e.target.value)
                        }
                        required
                        className="mt-1 block w-full"
                    />
                    <InputError
                        message={form.errors.church_name}
                        className="mt-2"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label
                            htmlFor="logo_light"
                            className="block text-sm font-medium"
                        >
                            Logo for white backgrounds
                        </label>
                        <div className="mt-2 flex h-24 items-center justify-center rounded-lg border border-neutral-200 bg-white p-2">
                            <img
                                src={branding.logo_light_url}
                                alt=""
                                className="max-h-full"
                            />
                        </div>
                        <input
                            id="logo_light"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) =>
                                form.setData(
                                    'logo_light',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                            className="mt-2 block w-full text-sm"
                        />
                        <InputError
                            message={form.errors.logo_light}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="logo_dark"
                            className="block text-sm font-medium"
                        >
                            Logo for dark backgrounds
                        </label>
                        <div className="mt-2 flex h-24 items-center justify-center rounded-lg bg-charcoal-900 p-2">
                            <img
                                src={branding.logo_dark_url}
                                alt=""
                                className="max-h-full"
                            />
                        </div>
                        <input
                            id="logo_dark"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) =>
                                form.setData(
                                    'logo_dark',
                                    e.target.files?.[0] ?? null,
                                )
                            }
                            className="mt-2 block w-full text-sm"
                        />
                        <InputError
                            message={form.errors.logo_dark}
                            className="mt-2"
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.data.reset_logos}
                        onChange={(e) =>
                            form.setData('reset_logos', e.target.checked)
                        }
                        className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                    />
                    Go back to the original logos
                </label>

                <PrimaryButton disabled={form.processing}>Save</PrimaryButton>
            </form>
        </Panel>
    );
}

function ColorsForm({
    colors,
    defaults,
}: {
    colors: Record<keyof typeof COLOR_LABELS, string>;
    defaults: Record<keyof typeof COLOR_LABELS, string>;
}) {
    const form = useForm(colors);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.put(route('admin.settings.colors'), { preserveScroll: true });
    };

    return (
        <Panel
            title="Colours"
            description="Colours that would make text hard to read are refused."
        >
            <form onSubmit={submit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    {(
                        Object.keys(COLOR_LABELS) as (keyof typeof COLOR_LABELS)[]
                    ).map((name) => (
                        <div key={name}>
                            <InputLabel
                                htmlFor={name}
                                value={COLOR_LABELS[name]}
                            />
                            <div className="mt-1 flex items-center gap-2">
                                <input
                                    id={name}
                                    type="color"
                                    value={form.data[name]}
                                    onChange={(e) =>
                                        form.setData(name, e.target.value)
                                    }
                                    className="h-10 w-14 cursor-pointer rounded-lg border border-neutral-200 bg-white p-1"
                                />
                                <span className="text-sm tabular-nums text-neutral-600">
                                    {form.data[name].toUpperCase()}
                                </span>
                            </div>
                            <InputError
                                message={form.errors[name]}
                                className="mt-2"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-3">
                    <PrimaryButton disabled={form.processing}>
                        Save
                    </PrimaryButton>
                    <SecondaryButton onClick={() => form.setData(defaults)}>
                        Use original colours
                    </SecondaryButton>
                </div>
            </form>
        </Panel>
    );
}

function ServicesForm({ services }: { services: RecurringService[] }) {
    const form = useForm<{ services: RecurringService[] }>({ services });
    const errors = form.errors as Record<string, string>;

    const change = (
        index: number,
        field: keyof RecurringService,
        value: string | number,
    ) =>
        form.setData(
            'services',
            form.data.services.map((service, position) =>
                position === index ? { ...service, [field]: value } : service,
            ),
        );

    const add = () =>
        form.setData('services', [
            ...form.data.services,
            {
                key: null,
                title: '',
                day: 0,
                opens: '09:00',
                closes: '11:00',
            },
        ]);

    const remove = (index: number) =>
        form.setData(
            'services',
            form.data.services.filter((_, position) => position !== index),
        );

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.put(route('admin.settings.services'), { preserveScroll: true });
    };

    return (
        <Panel
            title="Recurring services"
            description="Add as many as you hold each week. Saving also updates upcoming services nobody has checked in to, and removes those for any service you delete here."
        >
            <form onSubmit={submit} className="space-y-4">
                {form.data.services.length === 0 && (
                    <p className="text-sm text-neutral-600">
                        No recurring services.
                    </p>
                )}

                {form.data.services.map((service, index) => (
                    <fieldset
                        key={service.key ?? `new-${index}`}
                        className="grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2"
                    >
                        <legend className="sr-only">
                            Service {index + 1}
                        </legend>
                        <div>
                            <InputLabel
                                htmlFor={`service-${index}-title`}
                                value="Name"
                            />
                            <TextInput
                                id={`service-${index}-title`}
                                value={service.title}
                                placeholder="For example First Service"
                                onChange={(e) =>
                                    change(index, 'title', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={errors[`services.${index}.title`]}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <InputLabel
                                htmlFor={`service-${index}-day`}
                                value="Day"
                            />
                            <select
                                id={`service-${index}-day`}
                                value={service.day}
                                onChange={(e) =>
                                    change(index, 'day', Number(e.target.value))
                                }
                                className={textareaClass}
                            >
                                {DAYS.map((day, number) => (
                                    <option key={day} value={number}>
                                        {day}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <InputLabel
                                htmlFor={`service-${index}-opens`}
                                value="Attendance opens"
                            />
                            <TextInput
                                id={`service-${index}-opens`}
                                type="time"
                                value={service.opens}
                                onChange={(e) =>
                                    change(index, 'opens', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={errors[`services.${index}.opens`]}
                                className="mt-2"
                            />
                        </div>
                        <div>
                            <InputLabel
                                htmlFor={`service-${index}-closes`}
                                value="Attendance closes"
                            />
                            <TextInput
                                id={`service-${index}-closes`}
                                type="time"
                                value={service.closes}
                                onChange={(e) =>
                                    change(index, 'closes', e.target.value)
                                }
                                required
                                className="mt-1 block w-full"
                            />
                            <InputError
                                message={errors[`services.${index}.closes`]}
                                className="mt-2"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <button
                                type="button"
                                onClick={() => remove(index)}
                                className="text-sm text-danger underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                            >
                                Remove this service
                            </button>
                        </div>
                    </fieldset>
                ))}

                <div className="flex flex-wrap gap-3">
                    <SecondaryButton onClick={add}>Add a service</SecondaryButton>
                    <PrimaryButton disabled={form.processing}>
                        Save
                    </PrimaryButton>
                </div>
            </form>
        </Panel>
    );
}

type SlideForm = Omit<HomeSlide, 'id' | 'image'> & {
    id: string | null;
    preview: string | null;
    image: File | null;
};

function ImagePicker({
    id,
    label,
    preview,
    onChange,
    error,
}: {
    id: string;
    label: string;
    preview: string | null;
    onChange: (file: File | null) => void;
    error?: string;
}) {
    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium">
                {label}
            </label>
            {preview && (
                <img
                    src={preview}
                    alt=""
                    className="mt-1 h-28 w-full rounded-lg object-cover"
                />
            )}
            <input
                id={id}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => onChange(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm"
            />
            <InputError message={error} className="mt-2" />
        </div>
    );
}

function HomepageForm({ home }: { home: HomeContent }) {
    const [previews, setPreviews] = useState<Record<string, string>>({});

    const form = useForm<{
        slides: SlideForm[];
        welcome: Omit<HomeContent['welcome'], 'image' | 'small_image'> & {
            image: File | null;
            small_image: File | null;
        };
    }>({
        slides: home.slides.map((slide) => ({
            ...slide,
            preview: slide.image,
            image: null,
        })),
        welcome: { ...home.welcome, image: null, small_image: null },
    });

    const errors = form.errors as Record<string, string>;

    const changeSlide = (
        index: number,
        field: keyof SlideForm,
        value: string | File | null,
    ) =>
        form.setData(
            'slides',
            form.data.slides.map((slide, position) =>
                position === index ? { ...slide, [field]: value } : slide,
            ),
        );

    const pickSlide = (index: number, file: File | null) =>
        form.setData(
            'slides',
            form.data.slides.map((slide, position) =>
                position === index
                    ? {
                          ...slide,
                          image: file,
                          preview: file
                              ? URL.createObjectURL(file)
                              : slide.preview,
                      }
                    : slide,
            ),
        );

    const changeWelcome = (
        field: keyof typeof form.data.welcome,
        value: string | File | null,
    ) => form.setData('welcome', { ...form.data.welcome, [field]: value });

    const pickWelcome = (
        field: 'image' | 'small_image',
        file: File | null,
    ) => {
        changeWelcome(field, file);
        setPreviews({
            ...previews,
            ...(file ? { [field]: URL.createObjectURL(file) } : {}),
        });
    };

    const addSlide = () =>
        form.setData('slides', [
            ...form.data.slides,
            {
                id: null,
                preview: null,
                image: null,
                label: '',
                title: '',
                accent: '',
                text: '',
            },
        ]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.transform((data) => ({
            ...data,
            slides: data.slides.map(({ preview, ...slide }) => {
                void preview;

                return slide;
            }),
        }));

        form.post(route('admin.settings.home'), {
            forceFormData: true,
            preserveScroll: true,
        });
    };

    const text = (
        id: string,
        label: string,
        value: string,
        onChange: (value: string) => void,
        error?: string,
    ) => (
        <div>
            <InputLabel htmlFor={id} value={label} />
            <TextInput
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mt-1 block w-full"
            />
            <InputError message={error} className="mt-2" />
        </div>
    );

    return (
        <Panel
            title="Homepage"
            description="Change the slider and the welcome section. The Next event and Latest news card fills in by itself from your posts."
        >
            <form onSubmit={submit} className="space-y-6">
                <section>
                    <h3 className="font-sans text-sm font-semibold">
                        Hero slider
                    </h3>
                    <div className="mt-2 space-y-4">
                        {form.data.slides.map((slide, index) => (
                            <fieldset
                                key={slide.id ?? `new-${index}`}
                                className="grid gap-3 rounded-lg bg-neutral-50 p-3 sm:grid-cols-2"
                            >
                                <legend className="sr-only">
                                    Slide {index + 1}
                                </legend>
                                <ImagePicker
                                    id={`slide-${index}-image`}
                                    label={`Slide ${index + 1} picture`}
                                    preview={slide.preview}
                                    onChange={(file) => pickSlide(index, file)}
                                    error={errors[`slides.${index}.image`]}
                                />
                                <div className="space-y-3">
                                    {text(
                                        `slide-${index}-label`,
                                        'Small label',
                                        slide.label,
                                        (value) =>
                                            changeSlide(index, 'label', value),
                                        errors[`slides.${index}.label`],
                                    )}
                                    {text(
                                        `slide-${index}-title`,
                                        'Headline',
                                        slide.title,
                                        (value) =>
                                            changeSlide(index, 'title', value),
                                        errors[`slides.${index}.title`],
                                    )}
                                    {text(
                                        `slide-${index}-accent`,
                                        'Gold italic line',
                                        slide.accent,
                                        (value) =>
                                            changeSlide(index, 'accent', value),
                                        errors[`slides.${index}.accent`],
                                    )}
                                </div>
                                <div className="sm:col-span-2">
                                    {text(
                                        `slide-${index}-text`,
                                        'Sentence under the headline',
                                        slide.text,
                                        (value) =>
                                            changeSlide(index, 'text', value),
                                        errors[`slides.${index}.text`],
                                    )}
                                </div>
                                {form.data.slides.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            form.setData(
                                                'slides',
                                                form.data.slides.filter(
                                                    (_, position) =>
                                                        position !== index,
                                                ),
                                            )
                                        }
                                        className="justify-self-start text-sm text-danger underline focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                                    >
                                        Remove this slide
                                    </button>
                                )}
                            </fieldset>
                        ))}
                    </div>
                    {form.data.slides.length < 6 && (
                        <SecondaryButton onClick={addSlide} className="mt-3">
                            Add a slide
                        </SecondaryButton>
                    )}
                </section>

                <section className="space-y-3 border-t border-neutral-200 pt-4">
                    <h3 className="font-sans text-sm font-semibold">
                        Welcome section
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <ImagePicker
                            id="welcome-image"
                            label="Main arched picture"
                            preview={previews.image ?? home.welcome.image}
                            onChange={(file) => pickWelcome('image', file)}
                            error={errors['welcome.image']}
                        />
                        <ImagePicker
                            id="welcome-small-image"
                            label="Small round picture"
                            preview={
                                previews.small_image ??
                                home.welcome.small_image
                            }
                            onChange={(file) =>
                                pickWelcome('small_image', file)
                            }
                            error={errors['welcome.small_image']}
                        />
                    </div>
                    {text(
                        'welcome-eyebrow',
                        'Small label',
                        form.data.welcome.eyebrow,
                        (value) => changeWelcome('eyebrow', value),
                        errors['welcome.eyebrow'],
                    )}
                    {text(
                        'welcome-title',
                        'Heading',
                        form.data.welcome.title,
                        (value) => changeWelcome('title', value),
                        errors['welcome.title'],
                    )}
                    {text(
                        'welcome-accent',
                        'Red italic word',
                        form.data.welcome.accent,
                        (value) => changeWelcome('accent', value),
                        errors['welcome.accent'],
                    )}
                    <div>
                        <InputLabel htmlFor="welcome-text" value="Paragraph" />
                        <textarea
                            id="welcome-text"
                            rows={4}
                            value={form.data.welcome.text}
                            onChange={(e) =>
                                changeWelcome('text', e.target.value)
                            }
                            className={textareaClass}
                        />
                        <InputError
                            message={errors['welcome.text']}
                            className="mt-2"
                        />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {text(
                            'welcome-button-label',
                            'Button text',
                            form.data.welcome.button_label,
                            (value) => changeWelcome('button_label', value),
                            errors['welcome.button_label'],
                        )}
                        {text(
                            'welcome-button-link',
                            'Button link (https://... or /page)',
                            form.data.welcome.button_link,
                            (value) => changeWelcome('button_link', value),
                            errors['welcome.button_link'],
                        )}
                    </div>
                </section>

                <PrimaryButton disabled={form.processing}>Save</PrimaryButton>
            </form>
        </Panel>
    );
}

function PopupForm({ popup }: { popup: SitePopupData }) {
    const form = useForm<{
        enabled: boolean;
        image: File | null;
        link: string;
        alt: string;
        frequency: string;
        max_views: string;
        transition: string;
        delay: string;
        reset_views: boolean;
        reset_image: boolean;
    }>({
        enabled: popup.enabled,
        image: null,
        link: popup.link ?? '',
        alt: popup.alt,
        frequency: popup.frequency,
        max_views: popup.max_views ? String(popup.max_views) : '',
        transition: popup.transition,
        delay: String(popup.delay),
        reset_views: false,
        reset_image: false,
    });

    const [previewing, setPreviewing] = useState(0);
    const [chosen, setChosen] = useState<string | null>(null);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.settings.popup'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset('image', 'reset_views', 'reset_image');
                setChosen(null);
            },
        });
    };

    return (
        <Panel
            title="Visitor pop-up"
            description="Shown over the public website. Visitors can always close it."
        >
            <form onSubmit={submit} className="space-y-4">
                <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                        type="checkbox"
                        role="switch"
                        checked={form.data.enabled}
                        onChange={(e) =>
                            form.setData('enabled', e.target.checked)
                        }
                        className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                    />
                    Show the pop-up
                </label>

                <div>
                    <label
                        htmlFor="popup_image"
                        className="block text-sm font-medium"
                    >
                        Image
                    </label>
                    <div className="mt-2 flex h-44 items-center justify-center rounded-lg bg-charcoal-900 p-2">
                        <img
                            src={chosen ?? popup.image_url}
                            alt=""
                            className="max-h-full"
                        />
                    </div>
                    <input
                        id="popup_image"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;

                            form.setData('image', file);
                            setChosen(file ? URL.createObjectURL(file) : null);
                        }}
                        className="mt-2 block w-full text-sm"
                    />
                    <InputError message={form.errors.image} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="popup_alt"
                        value="Image description (read aloud by screen readers)"
                    />
                    <TextInput
                        id="popup_alt"
                        value={form.data.alt}
                        onChange={(e) => form.setData('alt', e.target.value)}
                        required
                        className="mt-1 block w-full"
                    />
                    <InputError message={form.errors.alt} className="mt-2" />
                </div>

                <div>
                    <InputLabel
                        htmlFor="popup_link"
                        value="Link when clicked (optional)"
                    />
                    <TextInput
                        id="popup_link"
                        value={form.data.link}
                        placeholder="https://example.com or /news"
                        onChange={(e) => form.setData('link', e.target.value)}
                        className="mt-1 block w-full"
                    />
                    <InputError message={form.errors.link} className="mt-2" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <InputLabel htmlFor="popup_frequency" value="Show" />
                        <select
                            id="popup_frequency"
                            value={form.data.frequency}
                            onChange={(e) =>
                                form.setData('frequency', e.target.value)
                            }
                            className={textareaClass}
                        >
                            <option value="every_visit">Once each visit</option>
                            <option value="daily">Once a day</option>
                            <option value="every_page">On every page</option>
                        </select>
                        <InputError
                            message={form.errors.frequency}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <InputLabel
                            htmlFor="popup_max_views"
                            value="Total times per visitor (empty = no limit)"
                        />
                        <TextInput
                            id="popup_max_views"
                            type="number"
                            min={1}
                            value={form.data.max_views}
                            onChange={(e) =>
                                form.setData('max_views', e.target.value)
                            }
                            className="mt-1 block w-full"
                        />
                        <InputError
                            message={form.errors.max_views}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <InputLabel
                            htmlFor="popup_transition"
                            value="Transition"
                        />
                        <select
                            id="popup_transition"
                            value={form.data.transition}
                            onChange={(e) =>
                                form.setData('transition', e.target.value)
                            }
                            className={textareaClass}
                        >
                            <option value="fade">Fade</option>
                            <option value="zoom">Zoom</option>
                            <option value="slide-up">Slide up</option>
                            <option value="slide-down">Slide down</option>
                            <option value="bounce">Bounce</option>
                            <option value="flip">Flip</option>
                        </select>
                        <InputError
                            message={form.errors.transition}
                            className="mt-2"
                        />
                    </div>
                    <div>
                        <InputLabel
                            htmlFor="popup_delay"
                            value="Wait before showing (seconds)"
                        />
                        <TextInput
                            id="popup_delay"
                            type="number"
                            min={0}
                            max={60}
                            value={form.data.delay}
                            onChange={(e) =>
                                form.setData('delay', e.target.value)
                            }
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError
                            message={form.errors.delay}
                            className="mt-2"
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.data.reset_views}
                        onChange={(e) =>
                            form.setData('reset_views', e.target.checked)
                        }
                        className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                    />
                    Show it again to people who have already seen it
                </label>
                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={form.data.reset_image}
                        onChange={(e) =>
                            form.setData('reset_image', e.target.checked)
                        }
                        className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                    />
                    Go back to the original Covenant Greetings image
                </label>

                <div className="flex flex-wrap gap-3">
                    <PrimaryButton disabled={form.processing}>
                        Save
                    </PrimaryButton>
                    <SecondaryButton
                        onClick={() => setPreviewing(previewing + 1)}
                    >
                        Preview
                    </SecondaryButton>
                </div>
            </form>

            {previewing > 0 && (
                <SitePopup
                    key={previewing}
                    preview
                    popup={{
                        ...popup,
                        image_url: chosen ?? popup.image_url,
                        transition: form.data
                            .transition as SitePopupData['transition'],
                    }}
                />
            )}
        </Panel>
    );
}

function RolesPanel({
    superAdmins,
    candidates,
    currentUserId,
}: {
    superAdmins: (Person & { email: string | null })[];
    candidates: Person[];
    currentUserId: number;
}) {
    const form = useForm({ user_id: '', password: '' });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.post(route('admin.settings.super-admins.store'), {
            preserveScroll: true,
            onSuccess: () => form.reset(),
            onError: () => form.reset('password'),
        });
    };

    return (
        <Panel
            title="Roles and permissions"
            description="Department admins are assigned on the Departments page."
        >
            <table className="w-full text-left text-sm">
                <thead>
                    <tr className="border-b border-neutral-200 text-neutral-600">
                        <th scope="col" className="py-2 pr-2 font-medium">
                            Can
                        </th>
                        <th scope="col" className="p-2 text-center font-medium">
                            Super admin
                        </th>
                        <th scope="col" className="p-2 text-center font-medium">
                            Dept admin
                        </th>
                        <th scope="col" className="p-2 text-center font-medium">
                            Member
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {PERMISSIONS.map(([label, ...roles]) => (
                        <tr key={label} className="border-b border-neutral-200">
                            <td className="py-2 pr-2">{label}</td>
                            {roles.map((allowed, index) => (
                                <td key={index} className="p-2 text-center">
                                    {allowed ? 'Yes' : 'No'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>

            <h3 className="mt-6 font-sans text-sm font-semibold">
                Super admins
            </h3>
            <ul className="mt-2 divide-y divide-neutral-200 text-sm">
                {superAdmins.map((admin) => (
                    <li
                        key={admin.id}
                        className="flex items-center justify-between gap-3 py-2"
                    >
                        <span className="min-w-0 truncate">
                            {admin.full_name}
                        </span>
                        {admin.id === currentUserId ? (
                            <span className="text-neutral-600">You</span>
                        ) : (
                            <DangerButton
                                type="button"
                                onClick={() =>
                                    router.delete(
                                        route(
                                            'admin.settings.super-admins.destroy',
                                            admin.id,
                                        ),
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Remove
                            </DangerButton>
                        )}
                    </li>
                ))}
            </ul>

            <form onSubmit={submit} className="mt-4 space-y-3">
                <div>
                    <InputLabel htmlFor="user_id" value="Add a super admin" />
                    <select
                        id="user_id"
                        value={form.data.user_id}
                        required
                        onChange={(e) =>
                            form.setData('user_id', e.target.value)
                        }
                        className={textareaClass}
                    >
                        <option value="">Choose a member</option>
                        {candidates.map((person) => (
                            <option key={person.id} value={person.id}>
                                {person.full_name}
                            </option>
                        ))}
                    </select>
                    <InputError message={form.errors.user_id} className="mt-2" />
                </div>
                <div>
                    <InputLabel
                        htmlFor="confirm_password"
                        value="Your password, to confirm"
                    />
                    <TextInput
                        id="confirm_password"
                        type="password"
                        autoComplete="current-password"
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData('password', e.target.value)
                        }
                        required
                        className="mt-1 block w-full"
                    />
                    <InputError
                        message={form.errors.password}
                        className="mt-2"
                    />
                </div>
                <PrimaryButton disabled={form.processing}>
                    Add super admin
                </PrimaryButton>
            </form>
        </Panel>
    );
}

function WhatsappForm({
    whatsapp,
}: {
    whatsapp: { greeting: string; temp_password: string };
}) {
    const form = useForm(whatsapp);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        form.put(route('admin.settings.whatsapp'), { preserveScroll: true });
    };

    return (
        <Panel
            title="WhatsApp message templates"
            description="Use {name} for the member, {church} for the church name and {password} for a temporary password."
        >
            <form onSubmit={submit} className="space-y-4">
                <div>
                    <InputLabel htmlFor="greeting" value="Greeting" />
                    <textarea
                        id="greeting"
                        rows={2}
                        value={form.data.greeting}
                        required
                        onChange={(e) =>
                            form.setData('greeting', e.target.value)
                        }
                        className={textareaClass}
                    />
                    <InputError message={form.errors.greeting} className="mt-2" />
                </div>
                <div>
                    <InputLabel
                        htmlFor="temp_password"
                        value="Temporary password"
                    />
                    <textarea
                        id="temp_password"
                        rows={3}
                        value={form.data.temp_password}
                        required
                        onChange={(e) =>
                            form.setData('temp_password', e.target.value)
                        }
                        className={textareaClass}
                    />
                    <InputError
                        message={form.errors.temp_password}
                        className="mt-2"
                    />
                </div>
                <PrimaryButton disabled={form.processing}>Save</PrimaryButton>
            </form>
        </Panel>
    );
}

export default function Settings({
    colors,
    defaultColors,
    services,
    whatsapp,
    popup,
    home,
    superAdmins,
    candidates,
    currentUserId,
}: {
    colors: Record<keyof typeof COLOR_LABELS, string>;
    defaultColors: Record<keyof typeof COLOR_LABELS, string>;
    services: RecurringService[];
    whatsapp: { greeting: string; temp_password: string };
    popup: SitePopupData;
    home: HomeContent;
    superAdmins: (Person & { email: string | null })[];
    candidates: Person[];
    currentUserId: number;
}) {
    return (
        <AdminLayout>
            <Head title="Settings" />

            <h1 className="text-3xl">Settings</h1>
            <div className="gold-rule mb-6" />

            <div className="max-w-3xl space-y-6">
                <BrandingForm />
                <ColorsForm colors={colors} defaults={defaultColors} />
                <HomepageForm home={home} />
                <PopupForm popup={popup} />
                <ServicesForm services={services} />
                <RolesPanel
                    superAdmins={superAdmins}
                    candidates={candidates}
                    currentUserId={currentUserId}
                />
                <WhatsappForm whatsapp={whatsapp} />
                <Panel
                    title="Payment keys"
                    description="Paystack keys arrive with payments in phase 2."
                >
                    <p className="text-sm text-neutral-600">
                        Nothing to set up yet.
                    </p>
                </Panel>
            </div>
        </AdminLayout>
    );
}
