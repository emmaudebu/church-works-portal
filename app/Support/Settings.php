<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;

/**
 * Church-wide settings stored in the database, with defaults until they are changed.
 */
class Settings
{
    private const CACHE_KEY = 'settings';

    public const DEFAULT_COLORS = [
        'primary_900' => '#7A1210',
        'primary_700' => '#B81C19',
        'primary_500' => '#E52521',
        'gold_500' => '#D4AF37',
    ];

    public const DEFAULT_WHATSAPP = [
        'greeting' => 'Hello {name}, this is {church}.',
        'temp_password' => 'Hello {name}, your temporary {church} password is {password}. Please change it when you log in.',
    ];

    public const POPUP_FREQUENCIES = ['every_page', 'every_visit', 'daily'];

    public const POPUP_TRANSITIONS = ['fade', 'zoom', 'slide-up', 'slide-down', 'bounce', 'flip'];

    public const DEFAULT_POPUP = [
        'enabled' => true,
        'image' => null,
        'link' => null,
        'alt' => '2026 Covenant Greetings',
        'frequency' => 'every_visit',
        'max_views' => null,
        'transition' => 'zoom',
        'delay' => 2,
        'version' => 1,
    ];

    public const VERSE_POSITIONS = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right', 'random'];

    /**
     * King James Version, which is free to reuse.
     */
    public const DEFAULT_VERSE_TOAST = [
        'enabled' => true,
        'position' => 'bottom-right',
        'first_delay' => 8,
        'interval' => 60,
        'duration' => 10,
        'verses' => [
            ['reference' => 'John 3:16', 'text' => 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.'],
            ['reference' => 'Psalm 23:1', 'text' => 'The LORD is my shepherd; I shall not want.'],
            ['reference' => 'Philippians 4:13', 'text' => 'I can do all things through Christ which strengtheneth me.'],
            ['reference' => 'Proverbs 3:5', 'text' => 'Trust in the LORD with all thine heart; and lean not unto thine own understanding.'],
            ['reference' => 'Isaiah 40:31', 'text' => 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.'],
            ['reference' => 'Romans 8:28', 'text' => 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.'],
            ['reference' => 'Joshua 1:9', 'text' => 'Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.'],
            ['reference' => 'Psalm 100:2', 'text' => 'Serve the LORD with gladness: come before his presence with singing.'],
            ['reference' => 'Colossians 3:23', 'text' => 'And whatsoever ye do, do it heartily, as to the Lord, and not unto men;'],
            ['reference' => 'Galatians 6:9', 'text' => 'And let us not be weary in well doing: for in due season we shall reap, if we faint not.'],
            ['reference' => '1 Corinthians 15:58', 'text' => 'Therefore, my beloved brethren, be ye stedfast, unmoveable, always abounding in the work of the Lord, forasmuch as ye know that your labour is not in vain in the Lord.'],
            ['reference' => 'Hebrews 11:1', 'text' => 'Now faith is the substance of things hoped for, the evidence of things not seen.'],
            ['reference' => 'Matthew 5:16', 'text' => 'Let your light so shine before men, that they may see your good works, and glorify your Father which is in heaven.'],
            ['reference' => 'Psalm 46:1', 'text' => 'God is our refuge and strength, a very present help in trouble.'],
            ['reference' => 'Jeremiah 29:11', 'text' => 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.'],
            ['reference' => 'Romans 12:11', 'text' => 'Not slothful in business; fervent in spirit; serving the Lord;'],
            ['reference' => '1 Peter 4:10', 'text' => 'As every man hath received the gift, even so minister the same one to another, as good stewards of the manifold grace of God.'],
            ['reference' => 'Psalm 37:5', 'text' => 'Commit thy way unto the LORD; trust also in him; and he shall bring it to pass.'],
            ['reference' => 'Philippians 4:19', 'text' => 'But my God shall supply all your need according to his riches in glory by Christ Jesus.'],
            ['reference' => '2 Timothy 1:7', 'text' => 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.'],
            ['reference' => 'Psalm 118:24', 'text' => 'This is the day which the LORD hath made; we will rejoice and be glad in it.'],
        ],
    ];

    public const DEFAULT_HOME = [
        'slides' => [
            [
                'id' => 'welcome',
                'image' => '/images/site/worship.jpg',
                'label' => 'Welcome',
                'title' => 'Serving with',
                'accent' => 'Excellence',
                'text' => 'Members, attendance, events and elections in one place',
            ],
            [
                'id' => 'gather',
                'image' => '/images/site/congregation.jpg',
                'label' => 'Gather',
                'title' => 'Many Gifts,',
                'accent' => 'One Workforce',
                'text' => 'Every department, every unit and every worker, serving together.',
            ],
            [
                'id' => 'serve',
                'image' => '/images/site/stage.jpg',
                'label' => 'Serve',
                'title' => 'Faithful In',
                'accent' => 'Every Service',
                'text' => 'Check in, stay informed and take your place in the work.',
            ],
        ],
        'welcome' => [
            'eyebrow' => 'Welcome home',
            'title' => 'A Workforce That Serves In',
            'accent' => 'Excellence',
            'text' => 'Every service depends on willing hands. From the sound desk to the front door, each department plays its part so that people can worship without distraction.',
            'button_label' => 'Explore departments',
            'button_link' => '/departments',
            'image' => '/images/site/cross.jpg',
            'small_image' => '/images/site/surrender.jpg',
        ],
    ];

    public static function get(string $key, mixed $default = null): mixed
    {
        $stored = Cache::rememberForever(self::CACHE_KEY, fn () => Setting::pluck('value', 'key')->all());

        return $stored[$key] ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        Setting::updateOrCreate(['key' => $key], ['value' => $value]);

        Cache::forget(self::CACHE_KEY);
    }

    public static function churchName(): string
    {
        return self::get('church_name', 'Covenant Workforce');
    }

    /**
     * @return array<string, string>
     */
    public static function colors(): array
    {
        return [...self::DEFAULT_COLORS, ...self::get('colors', [])];
    }

    /**
     * @return array<string, string>
     */
    public static function whatsapp(): array
    {
        return [...self::DEFAULT_WHATSAPP, ...self::get('whatsapp', [])];
    }

    /**
     * The recurring services, as many as the church holds on any days.
     *
     * @return array<int, array{key: string, title: string, day: int, opens: string, closes: string}>
     */
    public static function services(): array
    {
        $recurring = config('covenant.services.recurring');

        return self::get('services', [
            ['key' => 'sunday', 'title' => 'Sunday Service', 'day' => 0, ...$recurring['sunday']],
            ['key' => 'wednesday', 'title' => 'Wednesday Service', 'day' => 3, ...$recurring['wednesday']],
        ]);
    }

    public static function logoUrl(string $variant): string
    {
        $path = self::get("logo_{$variant}");

        return $path ? Storage::disk('public')->url($path) : "/images/logo-{$variant}.png";
    }

    /**
     * What every page needs to show the church's identity.
     *
     * @return array<string, string>
     */
    public static function branding(): array
    {
        return [
            'church_name' => self::churchName(),
            'logo_light_url' => self::logoUrl('light'),
            'logo_dark_url' => self::logoUrl('dark'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function popup(): array
    {
        return [...self::DEFAULT_POPUP, ...self::get('popup', [])];
    }

    /**
     * The pop-up as visitors receive it, or null when it is switched off.
     *
     * @return array<string, mixed>|null
     */
    public static function publicPopup(): ?array
    {
        $popup = self::popup();

        return $popup['enabled'] ? self::presentPopup($popup) : null;
    }

    /**
     * @param  array<string, mixed>  $popup
     * @return array<string, mixed>
     */
    public static function presentPopup(array $popup): array
    {
        return [
            ...collect($popup)->except('image')->all(),
            'image_url' => $popup['image']
                ? Storage::disk('public')->url($popup['image'])
                : '/images/site/covenant-greetings.webp',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function verseToast(): array
    {
        return [...self::DEFAULT_VERSE_TOAST, ...self::get('verse_toast', [])];
    }

    /**
     * The toast as visitors receive it, or null when there is nothing to show.
     *
     * @return array<string, mixed>|null
     */
    public static function publicVerseToast(): ?array
    {
        $toast = self::verseToast();

        return $toast['enabled'] && $toast['verses'] !== [] ? $toast : null;
    }

    /**
     * @return array{slides: array<int, array<string, string>>, welcome: array<string, string>}
     */
    public static function home(): array
    {
        return [...self::DEFAULT_HOME, ...self::get('home', [])];
    }

    /**
     * The homepage content with image paths turned into addresses.
     *
     * @return array<string, mixed>
     */
    public static function presentHome(): array
    {
        $home = self::home();

        return [
            'slides' => array_map(
                fn (array $slide) => [...$slide, 'image' => self::imageUrl($slide['image'])],
                $home['slides'],
            ),
            'welcome' => [
                ...$home['welcome'],
                'image' => self::imageUrl($home['welcome']['image']),
                'small_image' => self::imageUrl($home['welcome']['small_image']),
            ],
        ];
    }

    private static function imageUrl(string $path): string
    {
        return str_starts_with($path, '/') ? $path : Storage::disk('public')->url($path);
    }

    /**
     * The colours as the "r g b" values the Tailwind theme reads at runtime.
     */
    public static function cssVariables(): string
    {
        $variables = [];

        foreach (self::colors() as $name => $hex) {
            $variables[] = '--'.str_replace('_', '-', $name).': '.implode(' ', self::rgb($hex)).';';
        }

        return implode(' ', $variables);
    }

    /**
     * @return array{int, int, int}
     */
    private static function rgb(string $hex): array
    {
        return array_map('hexdec', str_split(ltrim($hex, '#'), 2));
    }

    /**
     * WCAG contrast ratio between two colours.
     */
    public static function contrast(string $first, string $second): float
    {
        $luminance = function (string $hex): float {
            $channels = array_map(function (int $value) {
                $value /= 255;

                return $value <= 0.03928 ? $value / 12.92 : (($value + 0.055) / 1.055) ** 2.4;
            }, self::rgb($hex));

            return 0.2126 * $channels[0] + 0.7152 * $channels[1] + 0.0722 * $channels[2];
        };

        $values = [$luminance($first), $luminance($second)];

        return (max($values) + 0.05) / (min($values) + 0.05);
    }
}
