<?php

return [
    'super_admin' => [
        'email' => env('SUPER_ADMIN_EMAIL', 'admin@covenantworkforce.test'),
        'password' => env('SUPER_ADMIN_PASSWORD'),
    ],

    'services' => [
        'days_ahead' => 14,

        // Attendance windows for the auto-generated services, as church local time.
        'recurring' => [
            'sunday' => ['opens' => env('SUNDAY_OPENS', '07:00'), 'closes' => env('SUNDAY_CLOSES', '13:00')],
            'wednesday' => ['opens' => env('WEDNESDAY_OPENS', '17:00'), 'closes' => env('WEDNESDAY_CLOSES', '20:00')],
        ],
    ],
];
