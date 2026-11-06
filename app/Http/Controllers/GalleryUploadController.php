<?php

namespace App\Http\Controllers;

use App\Models\Department;
use App\Models\DepartmentImage;
use App\Support\CurrentDepartment;
use App\Support\GalleryUploads;
use App\Support\MediaLibrary;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Where members given the gallery duty, and officers, upload service photos.
 */
class GalleryUploadController extends Controller
{
    /**
     * Display the upload form and the pictures this person uploaded lately.
     */
    public function index(Request $request): Response
    {
        $department = $this->department($request);

        return Inertia::render('Gallery/Upload', [
            'department' => $department->only(['id', 'name', 'slug']),
            'services' => GalleryUploads::services($department),
            'events' => GalleryUploads::events($department),
            'recent' => $department->images()
                ->where('uploaded_by', $request->user()->id)
                ->with('service')
                ->limit(24)
                ->get()
                ->map(fn (DepartmentImage $image) => [...$image->toCard(), 'occasion' => $image->occasion()]),
        ]);
    }

    /**
     * Add pictures to the department's gallery.
     */
    public function store(Request $request): RedirectResponse
    {
        GalleryUploads::store($request, $this->department($request));

        return back()->with('success', 'Pictures added to the gallery.');
    }

    /**
     * Remove a picture this person uploaded, for when one went up by mistake.
     */
    public function destroy(Request $request, DepartmentImage $image): RedirectResponse
    {
        abort_unless($image->uploaded_by === $request->user()->id && $image->department_id === $this->department($request)->id, 403);

        $image->delete();

        MediaLibrary::discard($image->image);

        return back()->with('success', 'Picture removed.');
    }

    /**
     * The department the person uploads to: their own, or the one a super
     * admin is working in.
     */
    private function department(Request $request): Department
    {
        $user = $request->user();

        abort_unless($user->canDo(GalleryUploads::PERMISSION), 403);

        $departmentId = $user->hasRole('super_admin') ? CurrentDepartment::forNewRecords($user) : $user->department_id;

        abort_unless($departmentId, 403, 'Choose a department to work in first.');

        return Department::findOrFail($departmentId);
    }
}
