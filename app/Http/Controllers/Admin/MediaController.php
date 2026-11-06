<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Media;
use App\Support\MediaLibrary;
use App\Support\PostImage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The media library: every picture uploaded for the public site, ready to be
 * picked again for any section.
 */
class MediaController extends Controller
{
    private const MAX_UPLOADS = 12;

    /**
     * Display the library.
     */
    public function index(Request $request): Response
    {
        $this->authorizeLibrary($request);

        return Inertia::render('Admin/Media', [
            'search' => $request->string('search')->toString(),
            'media' => $this->library($request, 40)->through(fn (Media $media) => [
                ...$media->toCard(),
                'size' => $media->size,
                'uploaded_by' => $media->uploader?->full_name,
                'uploaded_on' => $media->created_at->format('j M Y'),
            ]),
        ]);
    }

    /**
     * Pictures for the "choose from library" window in other forms.
     */
    public function picker(Request $request): JsonResponse
    {
        $this->authorizeLibrary($request);

        return response()->json($this->library($request, 30)->through(fn (Media $media) => $media->toCard()));
    }

    /**
     * Where a picture is used, shown before it can be deleted.
     */
    public function show(Request $request, Media $media): JsonResponse
    {
        $this->authorizeLibrary($request);

        return response()->json(['usages' => MediaLibrary::usages($media->path)]);
    }

    /**
     * Add pictures to the library.
     */
    public function store(Request $request): RedirectResponse
    {
        $this->authorizeLibrary($request);

        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:'.self::MAX_UPLOADS],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ], ['images.max' => 'Upload up to '.self::MAX_UPLOADS.' pictures at a time.']);

        foreach ($request->file('images') as $file) {
            PostImage::store($file);
        }

        return back()->with('success', 'Pictures added to the library.');
    }

    /**
     * Delete a picture nothing on the site uses any more.
     */
    public function destroy(Request $request, Media $media): RedirectResponse
    {
        $this->authorizeLibrary($request);

        $usages = MediaLibrary::usages($media->path);

        if ($usages !== []) {
            throw ValidationException::withMessages([
                'media' => 'This picture is still used in: '.implode(', ', $usages).'. Change those first.',
            ]);
        }

        Storage::disk('public')->delete($media->path);
        $media->delete();

        return back()->with('success', 'Picture deleted.');
    }

    /**
     * @return LengthAwarePaginator<int, Media>
     */
    private function library(Request $request, int $perPage): LengthAwarePaginator
    {
        $search = trim($request->string('search')->toString());

        return Media::with('uploader:id,full_name')
            ->when($search !== '', fn (Builder $media) => $media->where('name', 'like', '%'.addcslashes($search, '%_\\').'%'))
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();
    }

    private function authorizeLibrary(Request $request): void
    {
        abort_unless(MediaLibrary::canUse($request->user()), 403);
    }
}
