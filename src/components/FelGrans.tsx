import { Component, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'

// Kraschar något på sidan visas ett besked i stället för en tom vit sida. Det kan t.ex. hända när en sida ska laddas
// efter att en ny version publicerats och den gamla filen inte längre finns.
export class FelGrans extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-3 p-4">
        <div className="space-y-3 rounded-lg border bg-card p-8 text-center shadow-soft">
          <h1 className="text-2xl">Något gick fel</h1>
          <p className="text-muted-foreground">Ladda om sidan så brukar det lösa sig. Är du i en lobby kommer du tillbaka dit.</p>
        </div>
        <Button size="lg" onClick={() => location.reload()}>
          Ladda om sidan
        </Button>
        <Button asChild size="lg" variant="outline">
          <a href="/">Till startsidan</a>
        </Button>
      </main>
    )
  }
}
