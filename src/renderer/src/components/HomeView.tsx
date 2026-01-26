/**
 * HomeView Component
 *
 * Default home view displayed when app loads
 */
export function HomeView() {
  return (
    <div className="rounded-lg border border-border-primary bg-bg-primary p-6">
      <h1 className="text-xl font-semibold text-text-primary">Layout</h1>
      <p className="mt-2 text-text-secondary">
        Outer container (grey) wraps the main content. Main content is inset with padding,
        creating a frame effect on all sides. Sidebar and frame share the same background
        color.
      </p>
    </div>
  )
}
