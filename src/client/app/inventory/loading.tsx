export default function Loading() {
  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="h-8 bg-muted rounded w-48 mb-2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
              <div className="aspect-square bg-muted rounded-lg mb-4"></div>
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-muted rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
