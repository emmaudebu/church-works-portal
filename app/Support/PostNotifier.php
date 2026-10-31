<?php

namespace App\Support;

use App\Models\Post;
use App\Models\User;
use App\Notifications\PostPublished;
use Illuminate\Support\Facades\Notification;

class PostNotifier
{
    /**
     * Tell the people who may read a post, on the devices they switched on.
     */
    public static function send(Post $post): void
    {
        $users = User::where('status', 'active')
            ->whereHas('pushSubscriptions')
            ->when($post->department_id, fn ($query, int $departmentId) => $query->where('department_id', $departmentId))
            ->get();

        Notification::send($users, new PostPublished($post));
    }
}
