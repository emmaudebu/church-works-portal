<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class PaymentDecided extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $purpose, public bool $approved) {}

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
            ->title($this->approved ? 'Payment approved' : 'Proof of payment not accepted')
            ->body($this->approved
                ? "Your payment for {$this->purpose} has been recorded. Tap to download your receipt."
                : "Please check the reason and upload your proof for {$this->purpose} again.")
            ->icon('/images/icons/icon-192.png')
            ->data(['url' => route('member.payments', absolute: false)]);
    }
}
