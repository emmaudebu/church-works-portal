<?php

namespace App\Notifications;

use App\Models\Post;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class PostPublished extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Post $post) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return [WebPushChannel::class];
    }

    public function toWebPush(object $notifiable, mixed $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title($this->post->title)
            ->body($this->post->toCard()['excerpt'])
            ->icon('/images/icons/icon-192.png')
            ->data(['url' => route('posts.show', $this->post, absolute: false)]);
    }
}
