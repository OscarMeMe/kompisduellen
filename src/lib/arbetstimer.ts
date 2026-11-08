// Timers i en egen tråd (Web Worker), så att de inte bromsas när fliken ligger i bakgrunden. Chrome låter en dold flik
// köra vanliga timers ungefär en gång i minuten efter några minuter, men inte timers i en worker. Värden använder dem för
// det som måste hända i tid även när värdens flik är dold: bottarnas drag, nedräkningar (t.ex. Nope!-fönstret) och
// skyddet mot bottar som fastnat. Workern skapas från en liten blob första gången. Finns ingen Worker (t.ex. i
// testerna) används vanlig setTimeout.

let worker: Worker | null | undefined
const callbacks = new Map<number, () => void>()
let nextId = 1

const WORKER_CODE =
  "const timers=new Map();onmessage=(e)=>{const d=e.data;if(d.type==='set'){timers.set(d.id,setTimeout(()=>{timers.delete(d.id);postMessage(d.id)},d.ms))}else{clearTimeout(timers.get(d.id));timers.delete(d.id)}}"

function timerWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) return (worker = null)
    const created = new Worker(URL.createObjectURL(new Blob([WORKER_CODE], { type: 'text/javascript' })))
    created.onmessage = (event: MessageEvent<number>) => {
      const callback = callbacks.get(event.data)
      callbacks.delete(event.data)
      callback?.()
    }
    worker = created
  } catch {
    worker = null
  }
  return worker
}

// Som setTimeout, men i workern. Ger tillbaka en funktion som stoppar timern (gör inget om den redan gått).
export function workerTimeout(callback: () => void, ms: number): () => void {
  const target = timerWorker()
  if (!target) {
    const timer = setTimeout(callback, ms)
    return () => clearTimeout(timer)
  }
  const id = nextId++
  callbacks.set(id, callback)
  target.postMessage({ type: 'set', id, ms: Math.max(0, ms) })
  return () => {
    if (callbacks.delete(id)) target.postMessage({ type: 'clear', id })
  }
}
