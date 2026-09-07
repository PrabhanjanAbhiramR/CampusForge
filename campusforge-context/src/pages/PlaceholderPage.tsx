type PlaceholderPageProps = {
  title: string
  description: string
  message?: string
}

export function PlaceholderPage({ title, description, message = 'Coming next' }: PlaceholderPageProps) {
  return (
    <div className="placeholder-page">
      <header className="page-header">
        <p className="eyebrow">Research intelligence workspace</p>
        <h1>{title}</h1>
        <p className="page-intro">{description}</p>
      </header>
      <section className="placeholder-note" aria-label={`${title} status`}>
        <span>Next module</span>
        <p>{message}</p>
      </section>
    </div>
  )
}
