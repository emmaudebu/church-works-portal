<?php

namespace App\Support;

use GdImage;

/**
 * Draws the payment receipt as a JPEG photo, laid out like the PDF, for
 * members who would rather keep a picture in their gallery or share it on
 * WhatsApp. It needs only the GD extension, so it works on shared hosting.
 */
class ReceiptImage
{
    /** A5 at 150 dots per inch. A receipt for many months grows taller. */
    private const WIDTH = 1240;

    private const HEIGHT = 1754;

    private const FOOTER_SPACE = 200;

    private const PADDING = 78;

    private const WINE = '#7A1210';

    private const GOLD = '#D4AF37';

    private const PALE_GOLD = '#F1DFA4';

    private const INK = '#1A1A1A';

    private const MUTED = '#6B635B';

    private const LABEL = '#8A7F72';

    private GdImage $canvas;

    /**
     * @param  array<string, mixed>  $receipt  As built by PaymentReceipt::details().
     */
    public function __construct(private array $receipt) {}

    /**
     * The finished receipt as JPEG bytes.
     */
    public function toJpeg(): string
    {
        $this->canvas = imagecreatetruecolor(self::WIDTH, self::HEIGHT * 2);
        imagefilledrectangle($this->canvas, 0, 0, self::WIDTH, self::HEIGHT * 2, $this->color('#FFFFFF'));

        $this->watermark();
        $this->header();
        $y = $this->payer(320);
        $y = $this->amount($y + 40);
        $y = $this->items($y + 50);
        $y = $this->details($y + 50);
        $y = $this->signature($y + 40);

        $height = max(self::HEIGHT, $y + self::FOOTER_SPACE);
        $this->footer($height);
        $this->canvas = imagecrop($this->canvas, ['x' => 0, 'y' => 0, 'width' => self::WIDTH, 'height' => $height]);

        ob_start();
        imagejpeg($this->canvas, null, 92);

        return (string) ob_get_clean();
    }

    private function header(): void
    {
        $p = self::PADDING;
        $right = self::WIDTH - $p;

        imagefilledrectangle($this->canvas, 0, 0, self::WIDTH, 230, $this->color(self::WINE));
        imagefilledrectangle($this->canvas, 0, 230, self::WIDTH, 242, $this->color(self::GOLD));
        imagefilledrectangle($this->canvas, 0, 248, self::WIDTH, 250, $this->color(self::PALE_GOLD));

        $this->picture($this->receipt['logo'], $p, 52, 126);

        $nameX = $p + 160;
        $this->text($this->receipt['church'], $nameX, $this->receipt['department'] ? 112 : 128, 30, '#FFFFFF', 'DejaVuSerif-Bold', maxWidth: 560);

        if ($this->receipt['department']) {
            $this->text(mb_strtoupper($this->receipt['department']), $nameX, 156, 15, self::PALE_GOLD, 'DejaVuSans', tracking: 4, maxWidth: 560);
        }

        $this->text('RECEIPT', $right, 112, 40, self::GOLD, 'DejaVuSerif', 'right', 12);
        $this->text('No. '.$this->receipt['number'], $right, 160, 17, '#FFFFFF', 'DejaVuSans', 'right');
    }

    private function payer(int $y): int
    {
        $p = self::PADDING;
        $right = self::WIDTH - $p;
        $member = $this->receipt['member'];

        $this->label('Received from', $p, $y);
        $this->text($member['name'], $p, $y + 54, 28, self::INK, 'DejaVuSerif-Bold', maxWidth: 700);

        $line = collect([
            $member['member_id'] ? "Member ID {$member['member_id']}" : null,
            $member['unit'],
        ])->filter()->implode(' · ');

        if ($line !== '') {
            $this->text($line, $p, $y + 96, 19, self::MUTED);
        }

        $this->label('Date paid', $right, $y, 'right');
        $this->text((string) $this->receipt['paid_at'], $right, $y + 48, 20, self::INK, 'DejaVuSans-Bold', 'right');

        return $y + 110;
    }

    private function amount(int $top): int
    {
        $p = self::PADDING;
        $bottom = $top + 220;

        imagefilledrectangle($this->canvas, $p, $top, self::WIDTH - $p, $bottom, $this->color('#FBF6E9'));
        imagefilledrectangle($this->canvas, $p, $top, $p + 11, $bottom, $this->color(self::GOLD));

        $this->label('Amount paid', $p + 44, $top + 56);
        $this->text($this->receipt['total'], $p + 44, $top + 140, 50, self::WINE, 'DejaVuSans-Bold');
        $this->text($this->receipt['in_words'], $p + 44, $top + 190, 20, '#4A433C', 'DejaVuSans-Oblique', maxWidth: 680);

        $this->stamp(self::WIDTH - $p - 150, $top + 105);

        return $bottom;
    }

    /**
     * A tilted green "PAID" stamp centred on a point.
     */
    private function stamp(int $cx, int $cy): void
    {
        $angle = deg2rad(12);
        $green = $this->color('#1F7A3D');
        $corners = [[-125, -62], [125, -62], [125, 62], [-125, 62]];
        $points = [];

        foreach ($corners as [$dx, $dy]) {
            $points[] = (int) round($cx + $dx * cos($angle) + $dy * sin($angle));
            $points[] = (int) round($cy - $dx * sin($angle) + $dy * cos($angle));
        }

        imagesetthickness($this->canvas, 7);
        imagepolygon($this->canvas, $points, $green);
        imagesetthickness($this->canvas, 1);

        $this->rotatedCentered('PAID', $cx, $cy, -6, 40, 'DejaVuSans-Bold', 12, 12);
        $this->rotatedCentered(mb_strtoupper($this->receipt['method']), $cx, $cy, 36, 14, 'DejaVuSans', 2, 12);
    }

    private function items(int $top): int
    {
        $p = self::PADDING;
        $right = self::WIDTH - $p;
        $columns = ['months' => 720, 'rate' => 920, 'amount' => $right - 24];

        imagefilledrectangle($this->canvas, $p, $top, $right, $top + 62, $this->color(self::INK));
        $this->text('DESCRIPTION', $p + 24, $top + 40, 14, '#FFFFFF', tracking: 3);
        $this->text($this->receipt['months'] ? 'MONTHS' : 'QTY', $columns['months'], $top + 40, 14, '#FFFFFF', align: 'right', tracking: 3);
        $this->text('RATE', $columns['rate'], $top + 40, 14, '#FFFFFF', align: 'right', tracking: 3);
        $this->text('AMOUNT', $columns['amount'], $top + 40, 14, '#FFFFFF', align: 'right', tracking: 3);

        $y = $top + 118;
        $this->text($this->receipt['purpose'], $p + 24, $y, 21, self::INK, 'DejaVuSans-Bold', maxWidth: 560);
        $this->text((string) $this->quantity(), $columns['months'], $y, 21, self::INK, align: 'right');
        $this->text($this->receipt['rate'], $columns['rate'], $y, 21, self::INK, align: 'right');
        $this->text($this->receipt['total'], $columns['amount'], $y, 21, self::INK, align: 'right');

        $y += 44;
        $this->text($this->receipt['covers'], $p + 24, $y, 19, self::MUTED, maxWidth: 600);

        if (count($this->receipt['months']) > 1) {
            $y = $this->chips($p + 24, $y + 22, $right - 24);
        }

        $y += 34;
        imagefilledrectangle($this->canvas, $p, $y, $right, $y + 4, $this->color(self::GOLD));

        $y += 62;
        $this->text('Total paid', $p + 24, $y, 23, self::INK, 'DejaVuSans-Bold');
        $this->text($this->receipt['total'], $columns['amount'], $y, 23, self::WINE, 'DejaVuSans-Bold', 'right');

        return $y + 10;
    }

    /**
     * Each month paid for as a small rounded tag, wrapping onto new lines.
     */
    private function chips(int $left, int $top, int $right): int
    {
        $x = $left;
        $y = $top;

        foreach ($this->receipt['months'] as $month) {
            $width = $this->width($month, 15, 'DejaVuSans') + 28;

            if ($x + $width > $right) {
                $x = $left;
                $y += 50;
            }

            $this->roundedRectangle($x, $y, $x + $width, $y + 40, 12, '#F4EFE6');
            $this->text($month, $x + 14, $y + 28, 15, '#4A433C');
            $x += $width + 10;
        }

        return $y + 40;
    }

    private function details(int $y): int
    {
        $p = self::PADDING;
        $approver = $this->receipt['approver'];

        $rows = [
            'Payment method' => $this->receipt['method'],
            'Reference' => $this->receipt['reference'],
            $approver ? 'Approved by' : 'Confirmed by' => $approver
                ? $approver['name'].($approver['office'] ? ', '.$approver['office'] : '')
                : 'Paystack, automatically',
        ];

        foreach ($rows as $key => $value) {
            $y += 50;
            $this->text($key, $p, $y, 19, self::MUTED);
            $this->text((string) $value, $p + 400, $y, 19, self::INK, maxWidth: 680);
        }

        return $y;
    }

    private function signature(int $y): int
    {
        $approver = $this->receipt['approver'];

        if (! $approver) {
            return $y;
        }

        $p = self::PADDING;

        $this->text($approver['name'], $p + 6, $y + 40, 24, self::INK, 'DejaVuSerif-Italic');
        imagefilledrectangle($this->canvas, $p, $y + 56, $p + 450, $y + 58, $this->color(self::INK));
        $this->label($approver['office'] ?? 'Approved by', $p, $y + 94);

        return $y + 94;
    }

    private function footer(int $height): void
    {
        $p = self::PADDING;
        $center = intdiv(self::WIDTH, 2);
        $y = $height - 150;

        imagefilledrectangle($this->canvas, $p, $y, self::WIDTH - $p, $y + 2, $this->color(self::GOLD));

        $this->text('"Every man according as he purposeth in his heart, so let him give." 2 Corinthians 9:7', $center, $y + 54, 17, '#4A433C', 'DejaVuSans-Oblique', 'center');
        $this->text("Thank you for your faithfulness. Issued electronically on {$this->receipt['issued_at']}, valid without a signature.", $center, $y + 98, 13, self::LABEL, align: 'center');
    }

    /**
     * The church logo, very faint, behind the receipt.
     */
    private function watermark(): void
    {
        $logo = $this->load($this->receipt['watermark']);

        if (! $logo) {
            return;
        }

        $width = 620;
        $height = (int) round(imagesy($logo) * $width / imagesx($logo));
        $faded = imagecreatetruecolor($width, $height);

        imagealphablending($faded, false);
        imagesavealpha($faded, true);
        imagecopyresampled($faded, $logo, 0, 0, 0, 0, $width, $height, imagesx($logo), imagesy($logo));

        for ($x = 0; $x < $width; $x++) {
            for ($y = 0; $y < $height; $y++) {
                $pixel = imagecolorat($faded, $x, $y);
                $alpha = 127 - (int) round((127 - (($pixel >> 24) & 0x7F)) * 0.04);
                imagesetpixel($faded, $x, $y, ($alpha << 24) | ($pixel & 0xFFFFFF));
            }
        }

        imagealphablending($this->canvas, true);
        imagecopy($this->canvas, $faded, intdiv(self::WIDTH - $width, 2), 640, 0, 0, $width, $height);
    }

    private function picture(string $path, int $x, int $y, int $height): void
    {
        $image = $this->load($path);

        if (! $image) {
            return;
        }

        $width = (int) round(imagesx($image) * $height / imagesy($image));

        imagealphablending($this->canvas, true);
        imagecopyresampled($this->canvas, $image, $x, $y, 0, 0, $width, $height, imagesx($image), imagesy($image));
    }

    private function load(string $path): ?GdImage
    {
        if (! is_file($path)) {
            return null;
        }

        $image = @imagecreatefromstring((string) file_get_contents($path));

        return $image ?: null;
    }

    private function label(string $text, int $x, int $y, string $align = 'left'): void
    {
        $this->text(mb_strtoupper($text), $x, $y, 13, self::LABEL, align: $align, tracking: 3);
    }

    /**
     * Write a line of text with its baseline at $y. Text wider than
     * $maxWidth is shortened with an ellipsis.
     */
    private function text(
        string $text,
        int $x,
        int $y,
        float $size,
        string $color,
        string $font = 'DejaVuSans',
        string $align = 'left',
        int $tracking = 0,
        ?int $maxWidth = null,
    ): void {
        if ($maxWidth) {
            while (mb_strlen($text) > 1 && $this->width($text, $size, $font, $tracking) > $maxWidth) {
                $text = rtrim(mb_substr($text, 0, -2)).'…';
            }
        }

        $width = $this->width($text, $size, $font, $tracking);
        $x = match ($align) {
            'right' => $x - $width,
            'center' => $x - intdiv($width, 2),
            default => $x,
        };

        if ($tracking === 0) {
            imagettftext($this->canvas, $size, 0, $x, $y, $this->color($color), $this->font($font), $text);

            return;
        }

        foreach (mb_str_split($text) as $character) {
            imagettftext($this->canvas, $size, 0, $x, $y, $this->color($color), $this->font($font), $character);
            $x += $this->width($character, $size, $font) + $tracking;
        }
    }

    /**
     * Write text turned anticlockwise by $degrees, centred on a point and
     * moved $offset pixels along its own vertical axis.
     */
    private function rotatedCentered(string $text, int $cx, int $cy, int $offset, float $size, string $font, int $tracking, float $degrees): void
    {
        $angle = deg2rad($degrees);
        $characters = mb_str_split($text);
        $width = $this->width($text, $size, $font, $tracking);
        $distance = -$width / 2;
        $baseline = $offset + $size / 2;

        foreach ($characters as $character) {
            $x = $cx + $distance * cos($angle) + $baseline * sin($angle);
            $y = $cy - $distance * sin($angle) + $baseline * cos($angle);

            imagettftext($this->canvas, $size, $degrees, (int) round($x), (int) round($y), $this->color('#1F7A3D'), $this->font($font), $character);
            $distance += $this->width($character, $size, $font) + $tracking;
        }
    }

    private function width(string $text, float $size, string $font, int $tracking = 0): int
    {
        $box = imagettfbbox($size, 0, $this->font($font), $text);

        return (int) ($box[2] - $box[0]) + $tracking * max(mb_strlen($text) - 1, 0);
    }

    private function roundedRectangle(int $x1, int $y1, int $x2, int $y2, int $radius, string $color): void
    {
        $fill = $this->color($color);

        imagefilledrectangle($this->canvas, $x1 + $radius, $y1, $x2 - $radius, $y2, $fill);
        imagefilledrectangle($this->canvas, $x1, $y1 + $radius, $x2, $y2 - $radius, $fill);

        foreach ([[$x1 + $radius, $y1 + $radius], [$x2 - $radius, $y1 + $radius], [$x1 + $radius, $y2 - $radius], [$x2 - $radius, $y2 - $radius]] as [$x, $y]) {
            imagefilledellipse($this->canvas, $x, $y, $radius * 2, $radius * 2, $fill);
        }
    }

    private function quantity(): int
    {
        return $this->receipt['quantity'];
    }

    private function color(string $hex): int
    {
        [$red, $green, $blue] = sscanf($hex, '#%02x%02x%02x');

        return imagecolorallocate($this->canvas, $red, $green, $blue);
    }

    private function font(string $name): string
    {
        return base_path("vendor/dompdf/dompdf/lib/fonts/{$name}.ttf");
    }
}
