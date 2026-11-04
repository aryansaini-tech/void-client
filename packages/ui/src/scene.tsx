import { useId } from 'react';
import { VoidMark } from './brand';

/**
 * Redesigned voxel environment matching the champagne-gold, warm ivory,
 * and frosted light-blue glass ClickGUI aesthetic of Void Client.
 * Displays the large official Void Client logo with synchronized metallic gold sweep shine.
 */
export function VoidScene({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <div className={`void-scene ${className}`} aria-hidden="true">
      <svg viewBox="0 0 960 840" fill="none" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-face`} x1="280" y1="160" x2="710" y2="690" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFF0C2" />
            <stop offset=".28" stopColor="#F3D58A" />
            <stop offset=".65" stopColor="#C99D43" />
            <stop offset="1" stopColor="#B58A36" />
          </linearGradient>
          <linearGradient id={`${id}-side`} x1="360" y1="340" x2="640" y2="690" gradientUnits="userSpaceOnUse">
            <stop stopColor="#EDE2C8" />
            <stop offset="1" stopColor="#C9B88E" />
          </linearGradient>
          <linearGradient id={`${id}-top`} x1="270" y1="170" x2="650" y2="260" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FFFFFF" />
            <stop offset=".45" stopColor="#FFF8E9" />
            <stop offset="1" stopColor="#F5EEDD" />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop stopColor="#FFE8A6" stopOpacity=".65" />
            <stop offset=".35" stopColor="#F3D58A" stopOpacity=".38" />
            <stop offset=".7" stopColor="#C99D43" stopOpacity=".12" />
            <stop offset="1" stopColor="#C99D43" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${id}-sky-glow`}>
            <stop stopColor="#DCE4F0" stopOpacity=".8" />
            <stop offset="1" stopColor="#DCE4F0" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-fade`} x2="0" y2="1">
            <stop stopColor="var(--scene-left)" />
            <stop offset="1" stopColor="var(--scene-left-shade)" />
          </linearGradient>
        </defs>

        {/* Ambient atmospheric sky & champagne backlight aura */}
        <ellipse cx="510" cy="420" rx="420" ry="420" fill={`url(#${id}-sky-glow)`} opacity="var(--scene-atmosphere)" />
        <ellipse cx="540" cy="430" rx="360" ry="360" fill={`url(#${id}-glow)`} />

        {/* Delicate golden perspective grid lines */}
        <g stroke="#C99D43" strokeOpacity=".32" strokeWidth=".85">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(n => (
            <path key={n} d={`M${-250 + n * 110} 840 640 435 ${1150 + n * 75} 840`} />
          ))}
          {[0, 1, 2, 3, 4, 5].map(n => (
            <path key={n} d={`M0 ${600 + n * n * 8}h960`} />
          ))}
        </g>

        {/* Voxel architectural blocks in warm cream, ivory & metallic gold accents */}
        <g className="scene-blocks">
          {[
            [210, 555, 70, 115], [110, 640, 90, 155], [755, 565, 68, 130], [700, 720, 130, 145],
            [880, 675, 80, 195], [352, 716, 95, 95], [855, 355, 46, 78], [180, 345, 36, 65],
            [430, 800, 85, 140], [72, 460, 48, 60], [680, 325, 34, 54],
          ].map(([x = 0, y = 0, w = 0, h = 0], i) => (
            <g key={i} opacity={i > 7 ? .5 : .92}>
              {/* Top face */}
              <path
                d={`M${x} ${y}l${w} ${-w * .5} ${w} ${w * .5}-${w} ${w * .5}Z`}
                fill="var(--scene-top)"
                stroke="var(--scene-edge)"
                strokeWidth=".8"
              />
              {/* Left face */}
              <path
                d={`M${x} ${y}v${h}l${w} ${w * .5}v-${h}Z`}
                fill={`url(#${id}-fade)`}
                stroke="var(--scene-edge)"
                strokeWidth=".7"
              />
              {/* Right face */}
              <path
                d={`M${x + w} ${y + w * .5}v${h}l${w}-${w * .5}v-${h}Z`}
                fill="var(--scene-right)"
                stroke="var(--scene-edge)"
                strokeWidth=".7"
              />
            </g>
          ))}
        </g>

        {/* Floating emblem ground shadow with warm metallic amber tint */}
        <ellipse cx="545" cy="692" rx="170" ry="20" fill="#8D692B" opacity=".22" />

        {/* Floating golden sparkle motes */}
        <g fill="#C99D43">
          {[[220, 220], [560, 145], [770, 435], [370, 600], [835, 255], [295, 425], [634, 724], [405, 97], [880, 480], [111, 715]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={i % 3 === 0 ? 2 : 1.2} opacity={.45 + (i % 4) * .15} />
          ))}
        </g>

        {/* Technical reticle marks */}
        <path d="M160 510h36m-18-18v36M770 180h20m-10-10v20" stroke="#C99D43" strokeOpacity=".45" />
      </svg>

      {/* Large official Void Client logo in homepage hero with synchronized sweep shine */}
      <div className="scene-brand">
        <div className="scene-float">
          <VoidMark priority decorative animated={animated} />
        </div>
      </div>
    </div>
  );
}
