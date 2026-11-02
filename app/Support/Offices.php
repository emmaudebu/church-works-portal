<?php

namespace App\Support;

/**
 * The offices a department can have and what each may do. "dept_admin" is the
 * Head of Department and always has every permission, so nobody gets locked out.
 */
class Offices
{
    public const HEAD = 'dept_admin';

    public const LABELS = [
        self::HEAD => 'Head of Department',
        'vice_head' => 'Vice Head of Department',
        'secretary' => 'Secretary',
        'treasurer' => 'Treasurer',
        'financial_secretary' => 'Financial Secretary',
        'welfare_officer' => 'Welfare Officer',
    ];

    public const PERMISSIONS = [
        'manage_members' => 'Approve, edit and suspend members',
        'take_attendance' => 'Take attendance',
        'manage_services' => 'Manage services',
        'view_reports' => 'View attendance reports',
        'manage_posts' => 'Publish posts',
        'manage_elections' => 'Run elections',
        'view_payments' => 'View payments',
        'manage_payments' => 'Create dues and levies',
        'record_payments' => 'Record cash payments',
        'approve_payments' => 'Approve proofs of payment',
        'manage_department' => 'Manage units and gallery',
    ];

    public const DEFAULTS = [
        'secretary' => ['manage_members', 'take_attendance', 'manage_services', 'view_reports', 'manage_posts'],
        'treasurer' => ['view_payments', 'manage_payments', 'record_payments', 'view_reports'],
        'financial_secretary' => ['view_payments', 'record_payments', 'approve_payments'],
        'welfare_officer' => ['view_reports', 'manage_posts'],
    ];

    /**
     * @return array<int, string>
     */
    public static function roles(): array
    {
        return array_keys(self::LABELS);
    }

    /**
     * @return array<int, string>
     */
    public static function permissions(): array
    {
        return array_keys(self::PERMISSIONS);
    }
}
