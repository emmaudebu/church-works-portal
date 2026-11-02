<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\BestMembers;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class BestMemberController extends Controller
{
    /**
     * Save the criteria, which apply to the next month chosen.
     */
    public function update(Request $request): RedirectResponse
    {
        Settings::set('best_member', $request->validate([
            'enabled' => ['required', 'boolean'],
            'attendance_weight' => ['required', 'integer', 'min:0', 'max:100'],
            'on_time_minutes' => ['required', 'integer', 'min:0', 'max:360'],
            'minimum_attendance' => ['required', 'integer', 'min:0', 'max:100'],
            'minimum_days' => ['required', 'integer', 'min:1', 'max:31'],
            'include_officers' => ['required', 'boolean'],
        ]));

        return back()->with('success', 'Best member criteria saved.');
    }

    /**
     * Choose last month's winners again after the criteria or attendance changed.
     */
    public function recalculate(): RedirectResponse
    {
        BestMembers::recalculate();

        return back()->with('success', "Last month's best members have been recalculated.");
    }
}
