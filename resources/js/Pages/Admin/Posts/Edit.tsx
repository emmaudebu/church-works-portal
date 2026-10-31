import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import RichTextEditor from '@/Components/RichTextEditor';
import SecondaryButton from '@/Components/SecondaryButton';
import TextInput from '@/Components/TextInput';
import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { ChangeEvent, FormEventHandler, useRef, useState } from 'react';

type EditablePost = {
    id: number;
    type: string;
    title: string;
    body: string;
    venue: string | null;
    event_date: string | null;
    image_url: string | null;
    published: boolean;
};

export default function Edit({
    post,
    audience,
}: {
    post: EditablePost | null;
    audience: string;
}) {
    const fileInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState(post?.image_url ?? null);

    const { data, setData, post: send, processing, errors } = useForm<{
        _method: string;
        type: string;
        title: string;
        body: string;
        venue: string;
        event_date: string;
        image: File | null;
        publish: boolean;
        notify: boolean;
    }>({
        _method: post ? 'patch' : 'post',
        type: post?.type ?? 'news',
        title: post?.title ?? '',
        body: post?.body ?? '',
        venue: post?.venue ?? '',
        event_date: post?.event_date ?? '',
        image: null,
        publish: post?.published ?? true,
        notify: true,
    });

    const chooseImage = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (file) {
            setData('image', file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        send(
            post
                ? route('admin.posts.update', post.id)
                : route('admin.posts.store'),
            { forceFormData: true },
        );
    };

    return (
        <AdminLayout>
            <Head title={post ? 'Edit post' : 'New post'} />

            <h1 className="text-3xl">{post ? 'Edit post' : 'New post'}</h1>
            <div className="gold-rule mb-6" />

            <form onSubmit={submit} className="max-w-3xl space-y-6">
                <section className="card space-y-4 p-4 sm:p-6">
                    <p className="text-sm text-neutral-600">
                        Visible to: <strong>{audience}</strong>
                    </p>

                    <div>
                        <InputLabel htmlFor="type" value="Type" />
                        <select
                            id="type"
                            value={data.type}
                            onChange={(e) => setData('type', e.target.value)}
                            className="mt-1 block w-full rounded-lg border-neutral-200 focus:border-primary-700 focus:ring-primary-700"
                        >
                            <option value="news">News</option>
                            <option value="event">Event</option>
                            <option value="announcement">
                                Announcement (members only)
                            </option>
                        </select>
                        <InputError message={errors.type} className="mt-2" />
                    </div>

                    <div>
                        <InputLabel htmlFor="title" value="Title" />
                        <TextInput
                            id="title"
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            required
                            className="mt-1 block w-full"
                        />
                        <InputError message={errors.title} className="mt-2" />
                    </div>

                    {data.type === 'event' && (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <InputLabel
                                    htmlFor="event_date"
                                    value="Date and time"
                                />
                                <TextInput
                                    id="event_date"
                                    type="datetime-local"
                                    value={data.event_date}
                                    onChange={(e) =>
                                        setData('event_date', e.target.value)
                                    }
                                    required
                                    className="mt-1 block w-full"
                                />
                                <InputError
                                    message={errors.event_date}
                                    className="mt-2"
                                />
                            </div>
                            <div>
                                <InputLabel
                                    htmlFor="venue"
                                    value="Venue (optional)"
                                />
                                <TextInput
                                    id="venue"
                                    value={data.venue}
                                    onChange={(e) =>
                                        setData('venue', e.target.value)
                                    }
                                    className="mt-1 block w-full"
                                />
                                <InputError
                                    message={errors.venue}
                                    className="mt-2"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <span
                            id="body-label"
                            className="block text-sm font-medium text-neutral-900"
                        >
                            Body
                        </span>
                        <RichTextEditor
                            id="body"
                            value={data.body}
                            onChange={(html) => setData('body', html)}
                        />
                        <InputError message={errors.body} className="mt-2" />
                    </div>

                    <div>
                        <span className="block text-sm font-medium text-neutral-900">
                            Cover image (optional)
                        </span>
                        {preview && (
                            <img
                                src={preview}
                                alt=""
                                className="mt-2 max-h-48 rounded-lg"
                            />
                        )}
                        <SecondaryButton
                            onClick={() => fileInput.current?.click()}
                            className="mt-2"
                        >
                            {preview ? 'Change image' : 'Choose image'}
                        </SecondaryButton>
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            aria-label="Cover image"
                            tabIndex={-1}
                            onChange={chooseImage}
                            className="sr-only"
                        />
                        <InputError message={errors.image} className="mt-2" />
                    </div>
                </section>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={data.publish}
                            onChange={(e) =>
                                setData('publish', e.target.checked)
                            }
                            className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700"
                        />
                        Publish
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                        <input
                            type="checkbox"
                            checked={data.notify}
                            disabled={!data.publish || post?.published}
                            onChange={(e) =>
                                setData('notify', e.target.checked)
                            }
                            className="rounded border-neutral-200 text-primary-700 focus:ring-primary-700 disabled:opacity-50"
                        />
                        Send push notification
                    </label>
                </div>

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>
                        {data.publish ? 'Save and publish' : 'Save draft'}
                    </PrimaryButton>
                    <Link
                        href={route('admin.posts')}
                        className="text-sm text-neutral-600 underline"
                    >
                        Cancel
                    </Link>
                </div>
            </form>
        </AdminLayout>
    );
}
