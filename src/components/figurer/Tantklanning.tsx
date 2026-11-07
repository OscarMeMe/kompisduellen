// Vinnarklänningen och vinnarkronan, ritade i figurernas koordinater (200 × 200). Kroppen sitter på samma ställe i alla
// blobbar, så de passar alla. Klänningen bärs av den som vann senast i lobbyn (dressId), kronan av vinnaren på
// Exploderande Tanters slutskärm. Bara ritade former, så de är lika lätta som resten av figuren.

// Från skissens koordinater (en kropp med mitten i 75, 78 och 48 bred halva) till figurens (mitten i 100, 113).
const FROM_SKETCH = 'translate(100 113) scale(1.46) translate(-75 -78)'

// Blommig rosa tantklänning med vit spetskrage, pärlhalsband och små blommor.
export function Tantklanning() {
  const scallops = 'L126 130 Q120 137 114 130 Q108 137 102 130 Q96 137 90 130 Q84 137 78 130 Q72 137 66 130 Q60 137 54 130 Q48 137 42 130 Q36 137 24 130 Z'
  return (
    <g transform={FROM_SKETCH} aria-hidden>
      <path d={`M36 102 Q75 114 114 102 ${scallops}`} style={{ fill: 'var(--klanning)', stroke: 'var(--klanning-mork)' }} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Spetskragen */}
      <g style={{ fill: '#fff4e2', stroke: 'var(--klanning-mork)' }} strokeWidth="1.2">
        {[
          [44, 106],
          [53, 109],
          [63, 111],
          [75, 112],
          [87, 111],
          [97, 109],
          [106, 106],
        ].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="4.5" />
        ))}
      </g>
      {/* Pärlhalsbandet */}
      <g fill="#ffffff" style={{ stroke: 'var(--klanning-mork)' }} strokeWidth="0.8">
        {[64, 69.5, 75, 80.5, 86].map((cx, i) => (
          <circle key={cx} cx={cx} cy={[118, 119.5, 120, 119.5, 118][i]} r="2.2" />
        ))}
      </g>
      {/* Små blommor */}
      {[
        [44, 123, 3.2],
        [58, 128, 3.2],
        [92, 128, 3.2],
        [106, 122, 3.2],
        [116, 128, 2.6],
        [32, 128, 2.6],
      ].map(([cx, cy, r]) => (
        <g key={`${cx}-${cy}`}>
          <circle cx={cx} cy={cy} r={r} style={{ fill: 'var(--klanning-blomma)' }} />
          <circle cx={cx} cy={cy} r={r * 0.4} style={{ fill: 'var(--tant-guld)' }} />
        </g>
      ))}
    </g>
  )
}

// Vinnarkronan i guld med tre ädelstenar, ovanpå huvudet.
export function Vinnarkrona() {
  return (
    // Lite lägre än i skissen, så att kronan sitter på huvudet (blobbens överkant är lägre än skissens).
    <g transform={`${FROM_SKETCH} translate(0 12)`} aria-hidden>
      <path
        d="M48 22 L58 4 L68 18 L75 2 L82 18 L92 4 L102 22 Z"
        style={{ fill: 'var(--tant-guld)', stroke: 'var(--tant-ink)' }}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="58" cy="5" r="3.5" className="fill-destructive" style={{ stroke: 'var(--tant-ink)' }} strokeWidth="1.6" />
      <circle cx="75" cy="3" r="3.5" style={{ fill: 'var(--mint)', stroke: 'var(--tant-ink)' }} strokeWidth="1.6" />
      <circle cx="92" cy="5" r="3.5" className="fill-destructive" style={{ stroke: 'var(--tant-ink)' }} strokeWidth="1.6" />
    </g>
  )
}
