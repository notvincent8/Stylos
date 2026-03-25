"use client"

import { useCallback, useMemo, useState } from "react"
import KeywordResults from "@/app/features/analysis/KeywordResults"
import ImageZone from "@/app/features/image/ImageZone"
import type { Layout } from "@/app/features/sidebar/Sidebar"
import Sidebar from "@/app/features/sidebar/Sidebar"
import { useMagic } from "@/app/hook/useMagic"
import { cn } from "@/app/lib/cn"
import { type ProcessedImage, processImage } from "@/app/lib/imageProcessor"
import type { AnalysisMode, Field } from "@/app/lib/prompt-builder/type"

export default function Home() {
  const [selectedFields, setSelectedFields] = useState<Field[]>([])
  const [maxKeywords, setMaxKeywords] = useState(10)
  const [modes, setModes] = useState<Set<AnalysisMode>>(new Set())
  const [lockedLabels, setLockedLabels] = useState<Set<string>>(new Set())
  const [image, setImage] = useState<ProcessedImage | null>(null)
  const [imageProcessing, setImageProcessing] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [layout, setLayout] = useState<Layout>("columns")
  const [customInstructions, setCustomInstructions] = useState("")

  const { analyse, error, isLoading, data } = useMagic()

  const handleImageFile = useCallback(async (file: File) => {
    setImageError(null)
    setImageProcessing(true)
    try {
      const processed = await processImage(file)
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.previewUrl)
        return processed
      })
    } catch {
      setImageError("Could not process image. Try a different file.")
    } finally {
      setImageProcessing(false)
    }
  }, [])

  const handleImageClear = useCallback(() => {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl)
      return null
    })
    setImageError(null)
    setLockedLabels(new Set())
  }, [])

  const toggleField = useCallback((id: Field) => {
    setSelectedFields((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]))
  }, [])

  const toggleMode = useCallback((mode: AnalysisMode) => {
    setModes((prev) => {
      const next = new Set(prev)
      next.has(mode) ? next.delete(mode) : next.add(mode)
      return next
    })
  }, [])

  const adjustMax = useCallback((delta: number) => {
    setMaxKeywords((prev) => Math.min(20, Math.max(1, prev + delta)))
  }, [])

  const toggleLock = useCallback((label: string) => {
    setLockedLabels((prev) => {
      const next = new Set(prev)
      next.has(label) ? next.delete(label) : next.add(label)
      return next
    })
  }, [])

  const lockedKeywords = useMemo(() => data?.filter((kw) => lockedLabels.has(kw.label)) ?? [], [data, lockedLabels])
  const remainingSlots = Math.max(0, maxKeywords - lockedKeywords.length)
  const canAnalyse = selectedFields.length > 0 && !isLoading && !imageProcessing && image !== null && remainingSlots > 0

  const handleAnalyse = useCallback(() => {
    if (!image) return
    analyse({
      fields: selectedFields,
      maxKeywords,
      modes: Array.from(modes),
      lockedKeywords,
      customInstructions: customInstructions.trim() || undefined,
      imageData: { data: image.data, mediaType: image.mediaType },
    }).catch(() => {})
  }, [analyse, selectedFields, maxKeywords, modes, lockedKeywords, customInstructions, image])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-canvas focus:text-ink focus:border focus:border-edge-strong focus:px-3 focus:py-2 focus:text-[0.72rem] focus:tracking-widest focus:uppercase focus:font-body focus:font-semibold"
      >
        Skip to main content
      </a>
      <main id="main-content" tabIndex={-1} className="h-screen overflow-hidden flex bg-canvas">
        <Sidebar
          selectedFields={selectedFields}
          modes={modes}
          maxKeywords={maxKeywords}
          lockedCount={lockedKeywords.length}
          remainingSlots={remainingSlots}
          isLoading={isLoading}
          canAnalyse={canAnalyse}
          layout={layout}
          customInstructions={customInstructions}
          onToggleField={toggleField}
          onToggleMode={toggleMode}
          onAdjustMax={adjustMax}
          onAnalyse={handleAnalyse}
          onLayoutChange={setLayout}
          onCustomInstructionsChange={setCustomInstructions}
        />
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div
            className={cn("flex-1 min-h-0 overflow-hidden", layout === "columns" ? "flex flex-row" : "flex flex-col")}
          >
            {/* Image zone */}
            <div
              className={cn(
                "shrink-0 border-edge flex flex-col p-8 overflow-hidden",
                layout === "columns" ? "w-110 border-r" : "h-[38vh] border-b",
              )}
            >
              <ImageZone
                image={image}
                processing={imageProcessing}
                error={imageError}
                onFile={handleImageFile}
                onClear={handleImageClear}
              />
            </div>

            {/* Keywords zone */}
            <div className="flex-1 overflow-y-auto p-10 min-w-0 min-h-0">
              <KeywordResults
                data={data}
                isLoading={isLoading}
                error={error}
                lockedLabels={lockedLabels}
                hasImage={image !== null}
                onToggleLock={toggleLock}
              />
            </div>
          </div>

          {/* AI / legal notice — EU AI Act · GDPR Art. 13 */}
          <div className="shrink-0 border-t border-edge px-10 py-[0.6rem] flex items-center gap-6">
            <span className="font-body text-[0.6rem] tracking-[0.15em] uppercase text-ink/35 font-semibold shrink-0">
              AI Notice
            </span>
            <div className="h-3 w-px bg-edge-mid shrink-0" />
            <p className="font-body text-[0.6rem] leading-normal text-ink/42 select-none min-w-0">
              Images are processed by <span className="text-ink/55">Anthropic&apos;s Claude API</span> and not stored by
              this app. Results are AI-generated and may be inaccurate.{" "}
              <span className="text-ink/42">EU AI Act · GDPR Art. 13</span>
            </p>
            <a
              href="https://github.com/notvincent8"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto shrink-0 font-body text-[0.6rem] tracking-[0.15em] uppercase text-ink/25 hover:text-ink/55 transition-colors"
            >
              ↗ gh
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
