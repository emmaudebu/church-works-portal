import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { router, usePage } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export type ServiceOption = { id: number; label: string };

export type EventOption = { name: string; date: string; label: string };

/** A choice from the list, or the name and date of a new event. */
export type OccasionChoice = { choice: string; name: string; date: string };

const selectClass =
    'mt-1 block w-full rounded-lg border-neutral-200 text-sm focus:border-primary-700 focus:ring-primary-700';

function localToday(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());

    return now.toISOString().slice(0, 10);
}

/** Starts on the latest service, or a new event when there is none. */
export function newChoice(services: ServiceOption[]): OccasionChoice {
    return {
        choice: services.length > 0 ? `service:${services[0].id}` : 'new',
        name: '',
        date: localToday(),
    };
}

function eventChoice(event: EventOption): string {
    return `event:${event.date}|${event.name}`;
}

export function occasionPayload(value: OccasionChoice) {
    if (value.choice.startsWith('service:')) {
        return { service_id: Number(value.choice.slice('service:'.length)) };
    }

    if (value.choice.startsWith('event:')) {
        const [date, ...name] = value.choice
            .slice('event:'.length)
            .split('|');

        return { event_name: name.join('|'), event_date: date };
    }

    return { event_name: value.name, event_date: value.date };
}

export function OccasionPicker({
    id,
    value,
    onChange,
    services,
    events,
}: {
    id: string;
    value: OccasionChoice;
    onChange: (value: OccasionChoice) => void;
    services: ServiceOption[];
    events: EventOption[];
}) {
    return (
        <div className="space-y-3">
            <label htmlFor={id} className="block text-sm font-medium">
                Service or event the pictures are from
                <select
                    id={id}
                    value={value.choice}
                    onChange={(e) =>
                        onChange({ ...value, choice: e.target.value })
                    }
                    className={selectClass}
                >
                    {services.length > 0 && (
                        <optgroup label="Services">
                            {services.map((service) => (
                                <option
                                    key={service.id}
                                    value={`service:${service.id}`}
                                >
                                    {service.label}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    {events.length > 0 && (
                        <optgroup label="Events">
                            {events.map((event) => (
                                <option
                                    key={eventChoice(event)}
                                    value={eventChoice(event)}
                                >
                                    {event.label}
                                </option>
                            ))}
                        </optgroup>
                    )}
                    <option value="new">Another event (type its name)</option>
                </select>
            </label>

            {value.choice === 'new' && (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                        <InputLabel htmlFor={`${id}-name`} value="Event name" />
                        <TextInput
                            id={`${id}-name`}
                            value={value.name}
                            onChange={(e) =>
                                onChange({ ...value, name: e.target.value })
                            }
                            placeholder="e.g. Christmas Carol Night"
                            maxLength={100}
                            required
                            className="mt-1 block w-full"
                        />
                    </div>
                    <div>
                        <InputLabel htmlFor={`${id}-date`} value="Date" />
                        <TextInput
                            id={`${id}-date`}
                            type="date"
                            value={value.date}
                            max={localToday()}
                            onChange={(e) =>
                                onChange({ ...value, date: e.target.value })
                            }
                            required
                            className="mt-1 block w-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

const PICTURES_PER_UPLOAD = 12;

/** Stays under the server's 32 MB limit for one request. */
const BYTES_PER_UPLOAD = 24 * 1024 * 1024;

function uploadBatches(files: File[]): File[][] {
    const batches: File[][] = [];
    let batch: File[] = [];
    let size = 0;

    for (const file of files) {
        if (
            batch.length > 0 &&
            (batch.length === PICTURES_PER_UPLOAD ||
                size + file.size > BYTES_PER_UPLOAD)
        ) {
            batches.push(batch);
            batch = [];
            size = 0;
        }

        batch.push(file);
        size += file.size;
    }

    return batch.length > 0 ? [...batches, batch] : batches;
}

/**
 * Picks the service or event, then the pictures. Large selections go up a few
 * at a time so no request is too big.
 */
export default function GalleryUploadForm({
    action,
    services,
    events,
}: {
    action: string;
    services: ServiceOption[];
    events: EventOption[];
}) {
    const errors = usePage().props.errors as Record<string, string>;

    const [pictures, setPictures] = useState<File[]>([]);
    const [uploading, setUploading] = useState<string | null>(null);
    const [pickerKey, setPickerKey] = useState(0);
    const [occasion, setOccasion] = useState(() => newChoice(services));

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        const batches = uploadBatches(pictures);

        const send = (index: number) => {
            setUploading(
                batches.length > 1
                    ? `Uploading part ${index + 1} of ${batches.length}...`
                    : 'Uploading...',
            );

            router.post(
                action,
                {
                    images: batches[index],
                    ...occasionPayload(occasion),
                },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    preserveState: true,
                    onSuccess: () => {
                        if (index + 1 < batches.length) {
                            send(index + 1);

                            return;
                        }

                        setPictures([]);
                        setPickerKey((key) => key + 1);
                        setUploading(null);
                    },
                    onError: () => setUploading(null),
                },
            );
        };

        send(0);
    };

    const uploadError = Object.entries(errors).find(([key]) =>
        ['images', 'service_id', 'event_name', 'event_date'].some((field) =>
            key.startsWith(field),
        ),
    )?.[1];

    return (
        <form onSubmit={submit} className="space-y-3">
            <OccasionPicker
                id="gallery-occasion"
                value={occasion}
                onChange={setOccasion}
                services={services}
                events={events}
            />
            <label className="block text-sm font-medium">
                Add pictures (choose as many as you like)
                <input
                    key={pickerKey}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPictures([...(e.target.files ?? [])])}
                    className="mt-1 block w-full text-sm font-normal"
                />
            </label>
            <InputError message={uploadError} />
            <div className="flex flex-wrap items-center gap-3">
                <PrimaryButton
                    disabled={uploading !== null || pictures.length === 0}
                >
                    {pictures.length > 1
                        ? `Upload ${pictures.length} pictures`
                        : 'Upload'}
                </PrimaryButton>
                {uploading && (
                    <span role="status" className="text-sm text-neutral-600">
                        {uploading}
                    </span>
                )}
            </div>
        </form>
    );
}
