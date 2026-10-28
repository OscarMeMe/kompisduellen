type PageHeaderProps = {
  title: string
  description?: string
}

// Rubrik och en kort förklaring överst på en undersida.
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      {description && <p className="text-lg text-muted-foreground">{description}</p>}
    </div>
  )
}
