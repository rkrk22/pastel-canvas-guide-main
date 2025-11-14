export default function AppHome() {
  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="max-w-2xl text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to the Guidebook workspace</h1>
        <p className="text-muted-foreground">
          Use the chapter list on the left to manage content, reorder pages, and jump into the
          instant reader. This dashboard no longer redirects automatically, so you can stay here
          and decide what to open next.
        </p>
      </div>
    </div>
  );
}
