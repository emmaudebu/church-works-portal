<?php

namespace App\Support;

use App\Models\Attendance;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;

/**
 * Every rule about whether a person can be marked present lives here, so the
 * scanner and the manual fallback can never disagree.
 */
class CheckIn
{
    /**
     * Check someone in from a scanned token. The window applies to scans only.
     *
     * @return array<string, mixed>
     */
    public static function scan(Service $service, string $token, User $admin): array
    {
        $member = User::firstWhere('qr_token', $token);

        if (! $member || $member->department_id !== $service->department_id) {
            return ['status' => 'invalid'];
        }

        if ($member->isActive() && ! $service->acceptsCheckIns()) {
            return ['status' => 'closed'];
        }

        return self::record($service, $member, 'qr', $admin);
    }

    /**
     * Mark someone present by hand, which also lets an admin fix a missed scan
     * after the window has closed. A service that hasn't happened can't be attended.
     *
     * @return array<string, mixed>
     */
    public static function manual(Service $service, User $member, User $admin): array
    {
        if ($member->department_id !== $service->department_id) {
            return ['status' => 'invalid'];
        }

        if ($service->date->isFuture()) {
            return ['status' => 'closed'];
        }

        return self::record($service, $member, 'manual', $admin);
    }

    /**
     * Clock someone out from a scanned token, only once the service has ended
     * and while clock-out is open.
     *
     * @return array<string, mixed>
     */
    public static function scanOut(Service $service, string $token, User $admin): array
    {
        $member = User::firstWhere('qr_token', $token);

        if (! $member || $member->department_id !== $service->department_id) {
            return ['status' => 'invalid'];
        }

        if (! $service->acceptsCheckOuts()) {
            return ['status' => $service->hasEnded() ? 'out_closed' : 'not_ended'];
        }

        return self::recordOut($service, $member, $admin);
    }

    /**
     * Clock someone out by hand, which also lets an admin fill in a missed
     * clock-out after the window has closed, at the time they give.
     *
     * @return array<string, mixed>
     */
    public static function manualOut(Service $service, User $member, User $admin, ?Carbon $at = null): array
    {
        if ($member->department_id !== $service->department_id) {
            return ['status' => 'invalid'];
        }

        if (! $service->hasEnded()) {
            return ['status' => 'not_ended'];
        }

        return self::recordOut($service, $member, $admin, $at);
    }

    /**
     * @return array<string, mixed>
     */
    private static function recordOut(Service $service, User $member, User $admin, ?Carbon $at = null): array
    {
        $attendance = Attendance::where(['service_id' => $service->id, 'user_id' => $member->id])->first();

        if (! $attendance) {
            return ['status' => 'not_checked_in', 'member' => self::present($member)];
        }

        $clockedOut = Attendance::whereKey($attendance->id)
            ->whereNull('checked_out_at')
            ->update(['checked_out_at' => $at ?? now(), 'checked_out_by' => $admin->id]);

        $attendance->refresh();

        return [
            'status' => $clockedOut ? 'out' : 'already_out',
            'member' => self::present($member),
            'checked_in_at' => $attendance->checked_in_at->format('g:i A'),
            'checked_out_at' => $attendance->checked_out_at->format('g:i A'),
            'served' => Attendance::durationLabel($attendance->minutesServed()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function record(Service $service, User $member, string $method, User $admin): array
    {
        if ($member->status === 'suspended') {
            return ['status' => 'suspended', 'member' => self::present($member)];
        }

        if (! $member->isActive()) {
            return ['status' => 'invalid'];
        }

        try {
            $attendance = Attendance::create([
                'service_id' => $service->id,
                'user_id' => $member->id,
                'method' => $method,
                'checked_in_at' => now(),
                'recorded_by' => $admin->id,
            ]);
        } catch (UniqueConstraintViolationException) {
            $attendance = Attendance::where(['service_id' => $service->id, 'user_id' => $member->id])->firstOrFail();

            return [
                'status' => 'duplicate',
                'member' => self::present($member),
                'checked_in_at' => $attendance->checked_in_at->format('g:i A'),
            ];
        }

        return [
            'status' => 'present',
            'member' => self::present($member),
            'checked_in_at' => $attendance->checked_in_at->format('g:i A'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function present(User $member): array
    {
        return [
            ...$member->only(['id', 'full_name', 'unit', 'member_id']),
            'photo_url' => $member->photoUrl(),
        ];
    }
}
