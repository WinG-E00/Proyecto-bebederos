export default function Pagination({ query, page, setPage }) {
  if (!query.data || query.data.total <= query.data.limit) return null
  return (
    <div className="flex items-center gap-3">
      <button className="min-h-11 px-3" disabled={page === 1} onClick={() => setPage(page - 1)}>
        Anterior
      </button>
      <span>Página {page}</span>
      <button
        className="min-h-11 px-3"
        disabled={page * query.data.limit >= query.data.total}
        onClick={() => setPage(page + 1)}
      >
        Siguiente
      </button>
    </div>
  )
}
