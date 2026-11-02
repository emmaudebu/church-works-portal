<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\DepartmentImage;
use App\Models\Unit;
use App\Models\User;
use App\Support\Offices;
use App\Support\PostImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentContentController extends Controller
{
    private const MAX_UPLOADS = 12;

    /**
     * Display the units and gallery of a department.
     */
    public function show(Request $request, Department $department): Response
    {
        $this->authorizeFor($request, $department->id);

        $counts = $department->users()->selectRaw('unit, count(*) as total')->groupBy('unit')->pluck('total', 'unit');

        return Inertia::render('Admin/DepartmentManage', [
            'department' => [
                ...$department->only(['id', 'name', 'slug', 'description', 'about', 'bank_name', 'account_number', 'account_name']),
                'image_url' => $department->imageUrl(),
            ],
            'canEditBank' => $request->user()->leadsDepartment($department->id),
            'units' => $department->units->map(fn (Unit $unit) => [
                'id' => $unit->id,
                'name' => $unit->name,
                'members' => (int) $counts->get($unit->name, 0),
            ]),
            'images' => $department->images->map->toCard(),
            'officeManager' => $request->user()->leadsDepartment($department->id) ? $this->officeManager($request, $department) : null,
        ]);
    }

    /**
     * What the Head or a super admin needs to give out offices.
     *
     * @return array<string, mixed>
     */
    private function officeManager(Request $request, Department $department): array
    {
        $isSuperAdmin = $request->user()->hasRole('super_admin');

        $people = $department->users()
            ->where('status', 'active')
            ->with('roles:id,name')
            ->orderBy('full_name')
            ->get();

        $locked = fn (User $user) => $user->hasRole('super_admin') || (! $isSuperAdmin && $user->hasRole(Offices::HEAD));

        return [
            'officers' => $people->filter->isOfficer()->values()->map(fn (User $user) => [
                ...$user->only(['id', 'full_name']),
                'office' => $user->office(),
                'removable' => ! $locked($user),
            ]),
            'candidates' => $people->reject($locked)->values()->map(fn (User $user) => [
                'id' => $user->id,
                'full_name' => $user->office() ? "{$user->full_name} ({$user->office()})" : $user->full_name,
            ]),
            'offices' => $isSuperAdmin ? Offices::LABELS : collect(Offices::LABELS)->except(Offices::HEAD),
        ];
    }

    /**
     * Add a unit.
     */
    public function storeUnit(Request $request, Department $department): RedirectResponse
    {
        $this->authorizeFor($request, $department->id);

        $department->units()->create($this->validateUnit($request, $department->id));

        return back()->with('success', 'Unit added.');
    }

    /**
     * Rename a unit, taking its members along.
     */
    public function updateUnit(Request $request, Unit $unit): RedirectResponse
    {
        $this->authorizeFor($request, $unit->department_id);

        $validated = $this->validateUnit($request, $unit->department_id, $unit->id);

        $unit->department->users()->where('unit', $unit->name)->update(['unit' => $validated['name']]);
        $unit->update($validated);

        return back()->with('success', 'Unit renamed.');
    }

    /**
     * Remove a unit nobody belongs to.
     */
    public function destroyUnit(Request $request, Unit $unit): RedirectResponse
    {
        $this->authorizeFor($request, $unit->department_id);

        if ($unit->department->users()->where('unit', $unit->name)->exists()) {
            throw ValidationException::withMessages(['unit' => 'Move the members out of this unit before removing it.']);
        }

        $unit->delete();

        return back()->with('success', 'Unit removed.');
    }

    /**
     * Add pictures to the gallery.
     */
    public function storeImages(Request $request, Department $department): RedirectResponse
    {
        $this->authorizeFor($request, $department->id);

        $request->validate([
            'images' => ['required', 'array', 'min:1', 'max:'.self::MAX_UPLOADS],
            'images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ], ['images.max' => 'Upload up to '.self::MAX_UPLOADS.' pictures at a time.']);

        foreach ($request->file('images') as $file) {
            $department->images()->create(['image' => PostImage::store($file, directory: 'gallery')]);
        }

        return back()->with('success', 'Pictures added.');
    }

    /**
     * Change a picture's caption.
     */
    public function updateImage(Request $request, DepartmentImage $image): RedirectResponse
    {
        $this->authorizeFor($request, $image->department_id);

        $image->update($request->validate(['caption' => ['nullable', 'string', 'max:255']]));

        return back()->with('success', 'Caption saved.');
    }

    /**
     * Remove a picture and its file.
     */
    public function destroyImage(Request $request, DepartmentImage $image): RedirectResponse
    {
        $this->authorizeFor($request, $image->department_id);

        Storage::disk('public')->delete($image->image);
        $image->delete();

        return back()->with('success', 'Picture removed.');
    }

    private function authorizeFor(Request $request, int $departmentId): void
    {
        abort_unless($request->user()->canAccessDepartment($departmentId), 404);
    }

    /**
     * @return array{name: string}
     */
    private function validateUnit(Request $request, int $departmentId, ?int $ignore = null): array
    {
        return $request->validate([
            'name' => [
                'required', 'string', 'max:100',
                Rule::unique('units')->where('department_id', $departmentId)->ignore($ignore),
            ],
        ], ['name.unique' => 'This department already has a unit with that name.']);
    }
}
