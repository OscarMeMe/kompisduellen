// Formen på vågorna mellan startsidans sektioner (Vag.tsx), och gropen som trycks ned i kanten när muspekaren står på
// den (VagSlag). Rena funktioner: vågens kant vid ett x, och kanten med en grop i. Enheterna är vågens egna: x 0–1440
// och y 0–90 (y växer nedåt).

export const WAVE_PATH = 'M0 90V54C160 18 340 4 560 30S930 86 1140 64S1360 20 1440 28V90Z'
// Vågen som går att slå på är en fjärdedel högre (remsan som går ned i sektionen), med samma kant.
export const SQUISH_EXTRA = 0.25
export const SQUISH_HEIGHT = 90 * (1 + SQUISH_EXTRA)
export const SQUISH_PATH = `M0 ${SQUISH_HEIGHT}V54C160 18 340 4 560 30S930 86 1140 64S1360 20 1440 28V${SQUISH_HEIGHT}Z`
// Vågens kant som tre kubiska bågar (samma som WAVE_PATH, med S-punkterna utskrivna), för att räkna ut kanten själv.
const WAVE_CURVES: [number, number][][] = [
  [[0, 54], [160, 18], [340, 4], [560, 30]],
  [[560, 30], [780, 56], [930, 86], [1140, 64]],
  [[1140, 64], [1350, 42], [1360, 20], [1440, 28]],
]
// Kanten i punkter var fjärde enhet (x 0–1440), räknad en gång. Tätt, så att gropen ritas som en mjuk båge utan hack.
const STEP = 4
const WAVE_EDGE: number[] = (() => {
  const samples: [number, number][] = []
  for (const [a, b, c, d] of WAVE_CURVES) {
    for (let i = 0; i <= 200; i++) {
      const t = i / 200
      const u = 1 - t
      const point = (k: 0 | 1) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]
      samples.push([point(0), point(1)])
    }
  }
  const edge: number[] = []
  for (let x = 0, j = 0; x <= 1440; x += STEP) {
    while (j < samples.length - 2 && samples[j + 1][0] < x) j++
    const [x0, y0] = samples[j]
    const [x1, y1] = samples[j + 1]
    edge.push(x1 === x0 ? y0 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0))
  }
  return edge
})()

// Vågens kant (y i vågens enheter) vid x, spegelvänd om vågen är det. Rak mellan punkterna, så att den inte hoppar.
export function waveEdgeAt(x: number, flip: boolean): number {
  const at = Math.max(0, Math.min(1440, flip ? 1440 - x : x)) / STEP
  const i = Math.min(WAVE_EDGE.length - 2, Math.floor(at))
  return WAVE_EDGE[i] + (WAVE_EDGE[i + 1] - WAVE_EDGE[i]) * (at - i)
}

// Hur djupt kanten trycks ned (vågens enheter, vågen är 90 hög) och det djupaste gropen når: nästan ned till remsans
// nederkant, alltså en bit in i sektionen men aldrig ned till rubriken.
export const DENT_DEPTH = 72
export const DENT_FLOOR = SQUISH_HEIGHT - 1.5
// Hur långt ned kanten ligger vid x när gropen är depth djup med mitten i center och bredden sigma (vågens enheter).
// Mjukt tak: gropen saktar in mot DENT_FLOOR i stället för att tvärstanna där, så att den aldrig får hörn.
export function dentedEdge(x: number, flip: boolean, depth: number, center: number, sigma: number): number {
  const edge = waveEdgeAt(x, flip)
  if (depth <= 0) return edge
  const dent = depth * Math.exp(-((x - center) ** 2) / (2 * sigma ** 2))
  const room = DENT_FLOOR - edge
  return edge + room * (1 - Math.exp(-dent / room))
}
