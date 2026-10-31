import Avatar from '@/Components/Avatar';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { ChangeEvent, useCallback, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';

const OUTPUT_SIZE = 600;

function cropToFile(source: string, area: Area): Promise<File> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onerror = reject;
        image.onload = () => {
            const canvas = document.createElement('canvas');

            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            canvas
                .getContext('2d')
                ?.drawImage(
                    image,
                    area.x,
                    area.y,
                    area.width,
                    area.height,
                    0,
                    0,
                    OUTPUT_SIZE,
                    OUTPUT_SIZE,
                );
            canvas.toBlob(
                (blob) =>
                    blob
                        ? resolve(
                              new File([blob], 'photo.jpg', {
                                  type: 'image/jpeg',
                              }),
                          )
                        : reject(new Error('Could not read this photo.')),
                'image/jpeg',
                0.9,
            );
        };
        image.src = source;
    });
}

export default function PhotoField({
    name,
    currentUrl = null,
    onChange,
    error,
    required = false,
}: {
    name: string;
    currentUrl?: string | null;
    onChange: (file: File) => void;
    error?: string;
    required?: boolean;
}) {
    const input = useRef<HTMLInputElement>(null);
    const [source, setSource] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [area, setArea] = useState<Area | null>(null);
    const [failed, setFailed] = useState(false);

    const onCropComplete = useCallback(
        (_: Area, pixels: Area) => setArea(pixels),
        [],
    );

    const choose = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        e.target.value = '';

        if (file) {
            setFailed(false);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
            setSource(URL.createObjectURL(file));
        }
    };

    const confirm = async () => {
        if (!source || !area) {
            return;
        }

        try {
            const file = await cropToFile(source, area);

            setPreview(URL.createObjectURL(file));
            onChange(file);
        } catch {
            setFailed(true);
        }

        setSource(null);
    };

    return (
        <div>
            <span className="block text-sm font-medium text-neutral-900">
                Passport photo{required ? '' : ' (optional)'}
            </span>
            <div className="mt-2 flex items-center gap-4">
                <Avatar
                    name={name || '?'}
                    src={preview ?? currentUrl}
                    className="h-20 w-20 text-xl"
                />
                <SecondaryButton onClick={() => input.current?.click()}>
                    {preview || currentUrl ? 'Change photo' : 'Choose photo'}
                </SecondaryButton>
                <input
                    ref={input}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Passport photo"
                    onChange={choose}
                    className="sr-only"
                    tabIndex={-1}
                />
            </div>
            <InputError
                message={
                    failed
                        ? 'That photo could not be read. Please try another.'
                        : error
                }
                className="mt-2"
            />

            <Modal show={source !== null} onClose={() => setSource(null)}>
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl">Crop your photo</h2>
                    <div className="relative mt-4 h-72 overflow-hidden rounded-lg bg-charcoal-900">
                        {source && (
                            <Cropper
                                image={source}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                                onMediaLoaded={() => setFailed(false)}
                            />
                        )}
                    </div>
                    <label className="mt-4 block text-sm font-medium">
                        Zoom
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="mt-1 block w-full accent-primary-700"
                        />
                    </label>
                    <div className="mt-6 flex justify-end gap-3">
                        <SecondaryButton onClick={() => setSource(null)}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton type="button" onClick={confirm}>
                            Use photo
                        </PrimaryButton>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
