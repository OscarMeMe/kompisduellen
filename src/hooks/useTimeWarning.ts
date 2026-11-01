import { useCountdown } from '@/hooks/useCountdown'
import { timeWarning } from '@/lib/tidvarning'

// Tid kvar och hur tydligt det ska varna (se timeWarning). done = jag har låst mitt svar eller är inte med,
// och då är det alltid normal. Utan klocka (deadline null) är det också normal.
export function useTimeWarning(
  deadline: number | null,
  clockOffset: number,
  totalSeconds: number,
  done: boolean,
  warningSeconds?: number,
) {
  const { secondsLeft, progress } = useCountdown(deadline, clockOffset, totalSeconds)
  const warning = deadline === null ? 'normal' : timeWarning(secondsLeft, done, warningSeconds)
  return { warning, secondsLeft, progress }
}
