<?php

namespace App\Support;

class Socials
{
    /**
     * The sites a member can link to, with the address a bare username goes on.
     */
    public const NETWORKS = [
        'facebook' => 'https://facebook.com/',
        'instagram' => 'https://instagram.com/',
        'x' => 'https://x.com/',
        'tiktok' => 'https://tiktok.com/@',
    ];

    /**
     * Each site's own domains, so a public profile can only link to that site.
     */
    private const HOSTS = [
        'facebook' => '(www\.|m\.|web\.)?(facebook|fb)\.com',
        'instagram' => '(www\.)?instagram\.com',
        'x' => '(www\.)?(x|twitter)\.com',
        'tiktok' => '(www\.|vm\.)?tiktok\.com',
    ];

    /**
     * The format a saved link must have.
     */
    public static function linkFormat(string $network): string
    {
        return '#^https://'.self::HOSTS[$network].'/[^\s<>"\']+$#i';
    }

    /**
     * Tidy what a member typed: a phone number, a link or a username.
     *
     * @param  array<string, mixed>  $socials
     * @return array<string, string>
     */
    public static function normalize(array $socials): array
    {
        $tidy = [];

        foreach (['whatsapp', ...array_keys(self::NETWORKS)] as $network) {
            $value = trim((string) ($socials[$network] ?? ''));

            if ($value !== '') {
                $tidy[$network] = $network === 'whatsapp'
                    ? (Phone::normalize($value) ?: $value)
                    : self::link($network, $value);
            }
        }

        return $tidy;
    }

    /**
     * The links to show on a public profile.
     *
     * @param  array<string, string>|null  $socials
     * @return list<array{network: string, url: string}>
     */
    public static function links(?array $socials): array
    {
        $links = [];

        foreach (['whatsapp', ...array_keys(self::NETWORKS)] as $network) {
            if ($value = $socials[$network] ?? null) {
                $links[] = [
                    'network' => $network,
                    'url' => $network === 'whatsapp' ? 'https://wa.me/'.Phone::digits($value) : $value,
                ];
            }
        }

        return $links;
    }

    private static function link(string $network, string $value): string
    {
        $link = preg_replace('#^(https?://)?#i', 'https://', $value);

        if (preg_match(self::linkFormat($network), $link)) {
            return $link;
        }

        $username = ltrim($value, '@');

        return preg_match('/^[\w.-]+$/', $username)
            ? self::NETWORKS[$network].$username
            : $value;
    }
}
