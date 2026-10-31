<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MemberStatusController extends Controller
{
    /**
     * Approve one or many pending members. Anyone outside the admin's reach is skipped.
     */
    public function approve(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'max:500'],
            'ids.*' => ['integer'],
        ]);

        $members = User::managedBy($request->user())
            ->whereIn('id', $validated['ids'])
            ->where('status', 'pending')
            ->get()
            ->filter(fn (User $member) => $request->user()->canManage($member));

        $members->each->update(['status' => 'active']);

        return back()->with('success', trans_choice('{1} :count member approved.|[2,*] :count members approved.', $members->count()));
    }

    /**
     * Suspend a member, recording who did it and why.
     */
    public function suspend(Request $request, User $member): RedirectResponse
    {
        abort_unless($request->user()->canManage($member), 404);

        $validated = $request->validate(['reason' => ['required', 'string', 'max:255']]);

        if ($member->status === 'suspended') {
            return back();
        }

        DB::transaction(function () use ($request, $member, $validated) {
            $member->update(['status' => 'suspended', 'suspension_reason' => $validated['reason']]);
            $member->suspensionLogs()->create([
                'action' => 'suspended',
                'reason' => $validated['reason'],
                'by_user_id' => $request->user()->id,
            ]);
        });

        return back()->with('success', "{$member->full_name} has been suspended.");
    }

    /**
     * Reactivate a suspended member.
     */
    public function reactivate(Request $request, User $member): RedirectResponse
    {
        abort_unless($request->user()->canManage($member), 404);

        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        if ($member->status !== 'suspended') {
            return back();
        }

        DB::transaction(function () use ($request, $member, $validated) {
            $member->update(['status' => 'active', 'suspension_reason' => null]);
            $member->suspensionLogs()->create([
                'action' => 'reactivated',
                'reason' => $validated['reason'] ?? null,
                'by_user_id' => $request->user()->id,
            ]);
        });

        return back()->with('success', "{$member->full_name} has been reactivated.");
    }

    /**
     * Give a member a temporary password, shown once, that must be changed at next login.
     */
    public function resetPassword(Request $request, User $member): RedirectResponse
    {
        abort_unless($request->user()->canManage($member), 404);

        $password = Str::password(12, symbols: false);

        $member->forceFill([
            'password' => Hash::make($password),
            'must_change_password' => true,
        ])->save();

        return back()->with('temp_password', $password);
    }
}
