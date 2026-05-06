import GenerateForm from '@/components/generate-form'

interface GeneratePageProps {
  searchParams: {
    prompt?: string
    duration?: string
    aspectRatio?: string
  }
}

export default function GeneratePage({ searchParams }: GeneratePageProps) {
  const initialPrompt = searchParams.prompt ?? ''
  const initialDuration = searchParams.duration ? Number(searchParams.duration) : 5
  const initialAspectRatio = (searchParams.aspectRatio as '16:9' | '9:16' | '1:1') ?? '16:9'

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">Generate</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {initialPrompt
            ? 'Shot imported from Director. Review the prompt and generate.'
            : 'Create a video from a text prompt or an image. Seedance generates 3–10 second clips.'}
        </p>
      </div>

      <GenerateForm
        initialPrompt={initialPrompt}
        initialDuration={initialDuration}
        initialAspectRatio={initialAspectRatio}
      />
    </div>
  )
}
