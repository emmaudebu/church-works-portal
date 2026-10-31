import { prefersReducedMotion } from '@/lib/motion';
import { useEffect, useRef } from 'react';

type Ember = {
    x: number;
    y: number;
    size: number;
    speed: number;
    drift: number;
    phase: number;
    glow: number;
};

const AREA_PER_EMBER = 22000;
const MAX_EMBERS = 70;
const SPRITE_SIZE = 32;
const GLOW_SCALE = 5;

/**
 * Gold embers rising through a banner, echoing the flame in the church logo.
 * It stops drawing whenever it is off screen or the tab is hidden.
 */
export default function Embers({ density = 1 }: { density?: number }) {
    const canvas = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const element = canvas.current;
        const context = element?.getContext('2d');

        if (!element || !context || prefersReducedMotion()) {
            return;
        }

        const color = getComputedStyle(document.documentElement)
            .getPropertyValue('--gold-500')
            .trim();

        // One soft dot drawn once and stamped per ember, which is far cheaper
        // on phones than calculating a blur for each ember every frame.
        const sprite = document.createElement('canvas');
        const spriteContext = sprite.getContext('2d');

        sprite.width = SPRITE_SIZE;
        sprite.height = SPRITE_SIZE;

        if (spriteContext) {
            const radius = SPRITE_SIZE / 2;
            const glow = spriteContext.createRadialGradient(radius, radius, 0, radius, radius, radius);

            glow.addColorStop(0, `rgb(${color})`);
            glow.addColorStop(0.3, `rgb(${color} / 0.8)`);
            glow.addColorStop(1, `rgb(${color} / 0)`);
            spriteContext.fillStyle = glow;
            spriteContext.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
        }

        let width = 0;
        let height = 0;
        let embers: Ember[] = [];
        let frame = 0;
        let onScreen = true;

        const spawn = (anywhere: boolean): Ember => ({
            x: Math.random() * width,
            y: anywhere ? Math.random() * height : height + 8,
            size: 0.8 + Math.random() * 2.2,
            speed: 0.2 + Math.random() * 0.6,
            drift: 0.3 + Math.random() * 0.7,
            phase: Math.random() * Math.PI * 2,
            glow: 0.35 + Math.random() * 0.55,
        });

        const resize = () => {
            const ratio = Math.min(window.devicePixelRatio || 1, 2);

            width = element.clientWidth;
            height = element.clientHeight;
            element.width = width * ratio;
            element.height = height * ratio;
            context.setTransform(ratio, 0, 0, ratio, 0, 0);

            const count = Math.min(
                MAX_EMBERS,
                Math.round(((width * height) / AREA_PER_EMBER) * density),
            );

            embers = Array.from({ length: count }, () => spawn(true));
        };

        const draw = (time: number) => {
            context.clearRect(0, 0, width, height);

            embers.forEach((ember, index) => {
                ember.y -= ember.speed;
                ember.x +=
                    Math.sin(time / 1400 + ember.phase) * ember.drift * 0.4;

                if (ember.y < -8) {
                    embers[index] = spawn(false);

                    return;
                }

                const fade = Math.min(1, ember.y / (height * 0.35));
                const twinkle = 0.7 + 0.3 * Math.sin(time / 300 + ember.phase);

                const size = ember.size * GLOW_SCALE;

                context.globalAlpha = ember.glow * fade * twinkle;
                context.drawImage(sprite, ember.x - size / 2, ember.y - size / 2, size, size);
            });

            frame = requestAnimationFrame(draw);
        };

        const update = () => {
            cancelAnimationFrame(frame);

            if (onScreen && !document.hidden) {
                frame = requestAnimationFrame(draw);
            }
        };

        const observer = new IntersectionObserver(([entry]) => {
            onScreen = entry.isIntersecting;
            update();
        });

        const resizer = new ResizeObserver(resize);

        resize();
        resizer.observe(element);
        observer.observe(element);
        document.addEventListener('visibilitychange', update);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            resizer.disconnect();
            document.removeEventListener('visibilitychange', update);
        };
    }, [density]);

    return (
        <canvas
            ref={canvas}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
        />
    );
}
