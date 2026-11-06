<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Candidate;
use App\Models\Department;
use App\Models\Due;
use App\Models\Payment;
use App\Models\User;
use App\Support\CurrentDepartment;
use App\Support\MediaLibrary;
use App\Support\Offices;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class DepartmentController extends Controller
{
    /**
     * List departments with their admins.
     */
    public function index(): Response
    {
        return Inertia::render('Admin/Departments', [
            'departments' => Department::forDisplay()
                ->withCount('users as people_count')
                ->with(['users' => fn ($users) => $users->role(Offices::roles())->with('roles:id,name')->orderBy('full_name')])
                ->get()
                ->map(fn (Department $department) => [
                    ...$department->toCard(),
                    'users' => $department->users->map(fn (User $user) => [
                        ...$user->only(['id', 'full_name']),
                        'office' => $user->office(),
                    ]),
                    'in_use' => $department->inUse(),
                    'people_count' => $department->people_count,
                ]),
            'icons' => Department::ICONS,
            'offices' => Offices::LABELS,
            'candidates' => User::where('status', 'active')
                ->withoutRole(['super_admin', ...Offices::roles()])
                ->orderBy('full_name')
                ->get(['id', 'full_name']),
        ]);
    }

    /**
     * Create a department.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:departments,name'],
            'icon' => ['required', Rule::in(Department::ICONS)],
            'description' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(['active', 'coming_soon'])],
        ], ['name.unique' => 'A department with this name already exists.']);

        $slug = $base = Str::slug($validated['name']) ?: 'department';
        $number = 2;

        while (Department::where('slug', $slug)->exists()) {
            $slug = $base.'-'.$number++;
        }

        $department = Department::create([...$validated, 'slug' => $slug]);

        return to_route('admin.departments.manage', $department)->with('success', 'Department created. Now add its units.');
    }

    /**
     * Delete a department and everything that belongs to it. One still in use
     * must be confirmed by typing its name. Members keep their accounts and join
     * no department, payment records are kept as financial history, and its
     * pictures stay in the media library.
     */
    public function destroy(Request $request, Department $department): RedirectResponse
    {
        if ($department->inUse()) {
            $request->validate(
                ['confirm_name' => ['required', Rule::in([$department->name])]],
                ['confirm_name.*' => 'Type the department name exactly to delete it.'],
            );
        }

        $candidatePhotos = Candidate::whereHas('position.election', fn ($elections) => $elections->where('department_id', $department->id))
            ->pluck('photo')
            ->filter();

        DB::transaction(function () use ($department) {
            User::where('department_id', $department->id)
                ->role(Offices::roles())
                ->get()
                ->each->syncRoles(['member']);

            Payment::whereIn('due_id', Due::where('department_id', $department->id)->select('id'))
                ->where('status', 'under_review')
                ->update([
                    'status' => 'rejected',
                    'rejection_reason' => 'Your department was closed before this could be checked. Please speak to the church office.',
                ]);

            $department->delete();
        });

        Storage::disk('local')->delete($candidatePhotos->all());

        return to_route('admin.departments')->with('success', 'Department deleted.');
    }

    /**
     * Save the account members transfer dues to. Limited to the Head and super
     * admins, with their password, because a changed account number would send
     * everyone's money somewhere else.
     */
    public function updateBank(Request $request, Department $department): RedirectResponse
    {
        abort_unless($request->user()->leadsDepartment($department->id), 403);

        $department->update($request->validate([
            'bank_name' => ['nullable', 'required_with:account_number,account_name', 'string', 'max:100'],
            'account_number' => ['nullable', 'required_with:bank_name,account_name', 'digits_between:10,20'],
            'account_name' => ['nullable', 'required_with:bank_name,account_number', 'string', 'max:150'],
            'password' => ['required', 'current_password'],
        ]));

        return back()->with('success', 'Bank account saved.');
    }

    /**
     * Switch a department between active and coming soon.
     */
    public function update(Request $request, Department $department): RedirectResponse
    {
        $department->update($request->validate([
            'status' => ['required', Rule::in(['active', 'coming_soon'])],
        ]));

        return back();
    }

    /**
     * Save the description, About us section and pictures shown on the department's page.
     * Its name and icon appear across the site, so those stay with super admins.
     */
    public function updatePage(Request $request, Department $department): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->canAccessDepartment($department->id), 404);

        $picture = ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'];

        $validated = $request->validate([
            ...($admin->hasRole('super_admin') ? [
                'name' => ['required', 'string', 'max:100', Rule::unique('departments')->ignore($department)],
                'icon' => ['required', Rule::in(Department::ICONS)],
            ] : []),
            'description' => ['nullable', 'string', 'max:255'],
            'about' => ['nullable', 'string', 'max:3000'],
            'about_label' => ['nullable', 'string', 'max:50'],
            'about_title' => ['nullable', 'string', 'max:100'],
            'about_accent' => ['nullable', 'string', 'max:60'],
            'image' => $picture,
            'about_image' => $picture,
            'about_small_image' => $picture,
            ...MediaLibrary::rules('image', 'about_image', 'about_small_image'),
        ]);

        $pictures = collect(['image', 'about_image', 'about_small_image'])
            ->mapWithKeys(fn (string $field) => [
                $field => MediaLibrary::resolve($request, $field, $department->{$field}),
            ]);

        $department->update([
            ...Arr::except($validated, [...$pictures->keys()->all(), 'image_media', 'about_image_media', 'about_small_image_media']),
            ...$pictures,
        ]);

        return back()->with('success', 'Department page saved.');
    }

    /**
     * Give an active user a department office. Each office has one holder. A Head
     * can only appoint their own members, and the Head's office itself is left to
     * a super admin.
     */
    public function assignAdmin(Request $request, Department $department): RedirectResponse
    {
        abort_unless($request->user()->leadsDepartment($department->id), 403);

        $isSuperAdmin = $request->user()->hasRole('super_admin');

        $validated = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')->where('status', 'active')
                ->when(! $isSuperAdmin, fn ($rule) => $rule->where('department_id', $department->id))],
            'office' => [
                $isSuperAdmin ? 'nullable' : 'required',
                Rule::in($isSuperAdmin ? Offices::roles() : array_diff(Offices::roles(), [Offices::HEAD])),
            ],
        ]);

        $office = $validated['office'] ?? Offices::HEAD;
        $user = User::findOrFail($validated['user_id']);

        abort_if($user->hasRole('super_admin'), 422, 'A super admin can not hold a department office.');
        abort_if(! $isSuperAdmin && $user->hasRole(Offices::HEAD), 403);

        $holder = User::role($office)->where('department_id', $department->id)->whereKeyNot($user->id)->first();

        if ($holder) {
            throw ValidationException::withMessages([
                'user_id' => "{$holder->full_name} already holds this office. Remove them first.",
            ]);
        }

        $user->update(['department_id' => $department->id]);
        $user->syncRoles([$office]);

        return back()->with('success', "{$user->full_name} is now ".Offices::LABELS[$office].'.');
    }

    /**
     * Return an officer to being a regular member of the department.
     */
    public function removeAdmin(Request $request, Department $department, User $user): RedirectResponse
    {
        abort_unless($request->user()->leadsDepartment($department->id), 403);
        abort_unless($user->department_id === $department->id && $user->isOfficer(), 404);
        abort_if(! $request->user()->hasRole('super_admin') && $user->hasRole(Offices::HEAD), 403);

        $user->syncRoles(['member']);

        return back()->with('success', "{$user->full_name} is now a member.");
    }

    /**
     * Set the department a super admin is working in.
     */
    public function switch(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        session([CurrentDepartment::SESSION_KEY => $validated['department_id'] ?? null]);

        return back();
    }
}
