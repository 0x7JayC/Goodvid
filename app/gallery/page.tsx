import GalleryGrid from '@/components/gallery-grid'

export default function GalleryPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Gallery</h1>
        <p className="text-sm text-zinc-400 mt-1">
          All your generated videos. Hover to preview, click download to save.
        </p>
      </div>

      <GalleryGrid />
    </div>
  )
}
