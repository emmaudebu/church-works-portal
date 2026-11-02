import Avatar from '@/Components/Avatar';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import { ChangeEvent, useCallback, useRef, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';

const OUTPUT_SIZE = 600;
const TALLEST = 800;
const SMALLEST = 200;

/** Width divided by height: wider or narrower than these needs cropping. */
const WIDEST_SHAPE = 1;
const NARROWEST_SHAPE = 0.6;

function loadImage(source: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image();

        image.onerror = reject;
        image.onload = () => resolve(image);
        image.src = source;
    });
}

function drawToFile(
    image: HTMLImageElement,
    area: Area,
    width: number,
    height: number,
): Promise<File> {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');

        canvas.width = width;
        canvas.height = height;
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
                width,
                height,
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
    });
}

/** Shrink a photo that is already passport shaped, so it uploads quickly. */
function resized(image: HTMLImageElement) {
    const { naturalWidth: width, naturalHeight: height } = image;
    const scale = Math.min(1, OUTPUT_SIZE / width, TALLEST / height);

    return drawToFile(
        image,
        { x: 0, y: 0, width, height },
        Math.round(width * scale),
        Math.round(height * scale),
    );
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
    const [problem, setProblem] = useState<string | null>(null);

    const onCropComplete = useCallback(
        (_: Area, pixels: Area) => setArea(pixels),
        [],
    );

    const accept = (file: File) => {
        setPreview(URL.createObjectURL(file));
        onChange(file);
    };

    const choose = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        e.target.value = '';

        if (!file) {
            return;
        }

        const url = URL.createObjectURL(file);

        setProblem(null);

        try {
            const image = await loadImage(url);
            const { naturalWidth: width, naturalHeight: height } = image;
            const shape = width / height;

            if (Math.min(width, height) < SMALLEST) {
                setProblem(
                    'That photo is too small. Please use a clearer picture.',
                );
            } else if (shape > WIDEST_SHAPE || shape < NARROWEST_SHAPE) {
                setZoom(1);
                setCrop({ x: 0, y: 0 });
                setSource(url);
            } else {
                accept(await resized(image));
            }
        } catch {
            setProblem('That photo could not be read. Please try another.');
        }
    };

    const confirm = async () => {
        if (!source || !area) {
            return;
        }

        try {
            accept(
                await drawToFile(
                    await loadImage(source),
                    area,
                    OUTPUT_SIZE,
                    OUTPUT_SIZE,
                ),
            );
        } catch {
            setProblem('That photo could not be read. Please try another.');
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
            <p className="mt-2 text-sm text-neutral-600">
                Use a passport photo showing your face clearly. If it is too
                wide, you will be asked to crop it.
            </p>
            <InputError
                message={problem ?? error}
                className="mt-2"
            />

            <Modal show={source !== null} onClose={() => setSource(null)}>
                <div className="p-4 sm:p-6">
                    <h2 className="text-xl">Crop your photo</h2>
                    <p className="mt-1 text-sm text-neutral-600">
                        This photo is not passport shaped. Drag and zoom until
                        your face fits the frame.
                    </p>
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
