import AppNavigation from './AppNavigation.jsx'
import FarmSelector from './FarmSelector.jsx'
import AsyncState from './AsyncState.jsx'
export default function ResourceLayout({ title, scope, query, children }) {
  return (
    <>
      <AppNavigation scope={scope} />
      <main className="mx-auto max-w-6xl break-words space-y-5 p-4 sm:p-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        {scope && <FarmSelector scope={scope} />}
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
