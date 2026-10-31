<?php

namespace App\Support;

use App\Models\Attendance;
use App\Models\Service;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;

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
     * after the window has closed.
     *
     * @return array<string, mixed>
     */
    public static function manual(Service $service, User $member, User $admin): array
    {
        if ($member->department_id !== $service->department_id) {
            return ['status' => 'invalid'];
        }

        return self::record($service, $member, 'manual', $admin);
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
