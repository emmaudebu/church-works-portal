<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\User;
use App\Support\CurrentDepartment;
use App\Support\Offices;
use App\Support\PostImage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
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
                ->with(['users' => fn ($users) => $users->role(Offices::roles())->with('roles:id,name')->orderBy('full_name')])
                ->get()
                ->map(fn (Department $department) => [
                    ...$department->toCard(),
                    'users' => $department->users->map(fn (User $user) => [
                        ...$user->only(['id', 'full_name']),
                        'office' => $user->office(),
                    ]),
                    'deletable' => $department->members_count === 0 && $department->users->isEmpty(),
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
     * Delete a department that has no members or attendance history.
     */
    public function destroy(Department $department): RedirectResponse
    {
        if ($department->users()->exists() || Attendance::whereHas('service', fn ($services) => $services->where('department_id', $department->id))->exists()) {
            throw ValidationException::withMessages(['department' => 'Only a department with no members and no attendance can be deleted.']);
        }

        $paths = $department->images()->pluck('image')->push($department->image)->filter();

        Storage::disk('public')->delete($paths->all());

        $department->delete();

        return to_route('admin.departments')->with('success', 'Department deleted.');
    }

    /**
     * Save the account members transfer dues to. Limited to super admins because
     * a changed account number would send everyone's money somewhere else.
     */
    public function updateBank(Request $request, Department $department): RedirectResponse
    {
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
     * Save the description, story and picture shown on the department's page.
     * Its name and icon appear across the site, so those stay with super admins.
     */
    public function updatePage(Request $request, Department $department): RedirectResponse
    {
        $admin = $request->user();

        abort_unless($admin->canAccessDepartment($department->id), 404);

        $validated = $request->validate([
            ...($admin->hasRole('super_admin') ? [
                'name' => ['required', 'string', 'max:100', Rule::unique('departments')->ignore($department)],
                'icon' => ['required', Rule::in(Department::ICONS)],
            ] : []),
            'description' => ['nullable', 'string', 'max:255'],
            'about' => ['nullable', 'string', 'max:3000'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
        ]);

        $department->update([
            ...Arr::except($validated, 'image'),
            'image' => $request->hasFile('image')
                ? PostImage::store($request->file('image'), $department->image)
                : $department->image,
        ]);

        return back()->with('success', 'Department page saved.');
    }

    /**
     * Give an active user a department office. Each office has one holder.
     */
    public function assignAdmin(Request $request, Department $department): RedirectResponse
    {
        $validated = $request->validate([
            'user_id' => ['required', Rule::exists('users', 'id')->where('status', 'active')],
            'office' => ['nullable', Rule::in(Offices::roles())],
        ]);

        $office = $validated['office'] ?? Offices::HEAD;
        $user = User::findOrFail($validated['user_id']);

        abort_if($user->hasRole('super_admin'), 422, 'A super admin can not hold a department office.');

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
    public function removeAdmin(Department $department, User $user): RedirectResponse
    {
        abort_unless($user->department_id === $department->id && $user->isOfficer(), 404);

        $user->syncRoles(['member']);

        return back();
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
