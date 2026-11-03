import AsyncState from './AsyncState.jsx'
export default function ResourceLayout({ title, query, children, eyebrow, description, actions, redesigned = false }) {
  return (
    <>
      <main className={redesigned ? 'management-ui management-content' : 'mx-auto max-w-6xl break-words space-y-5 p-4 sm:p-6'}>
        {redesigned ? <header className="establishments-heading">
          <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p>{description}</p>}</div>
          {actions}
        </header> : <h1 className="text-2xl font-bold">{title}</h1>}
        <AsyncState
          loading={query?.isPending}
          error={query?.error}
          onRetry={() => query.refetch()}
        />
        {query?.stale && (
          <p role="status">Sin conexión. Los datos mostrados pueden estar desactualizados.</p>
        )}
        {!query?.denied && children}
      </main>
    </>
  )
}
