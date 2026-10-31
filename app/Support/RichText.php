<?php

namespace App\Support;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

class RichText
{
    public const MAX_LENGTH = 50000;

    /**
     * Keep only the formatting the editor can produce, so stored HTML is safe to
     * show to every member whatever was submitted.
     */
    public static function sanitize(string $html): string
    {
        $config = (new HtmlSanitizerConfig)
            ->withMaxInputLength(self::MAX_LENGTH)
            ->allowLinkSchemes(['https', 'http', 'mailto'])
            ->forceAttribute('a', 'rel', 'noopener noreferrer')
            ->forceAttribute('a', 'target', '_blank')
            ->allowElement('a', ['href']);

        foreach (['p', 'br', 'h2', 'h3', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote'] as $element) {
            $config = $config->allowElement($element);
        }

        return (new HtmlSanitizer($config))->sanitize($html);
    }
}
