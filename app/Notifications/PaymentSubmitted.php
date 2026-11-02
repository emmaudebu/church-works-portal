<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class PaymentSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $member, public string $purpose, public int $amount) {}

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
            ->title('Proof of payment to approve')
            ->body("{$this->member} paid ₦".number_format($this->amount / 100, 2)." for {$this->purpose}.")
            ->icon('/images/icons/icon-192.png')
            ->data(['url' => route('admin.dashboard', absolute: false)]);
    }
}
