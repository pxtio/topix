import React from "react"

export interface MdEditorProps {
  markdown: string
  onSave: (markdown: string) => void
}

/** Lazy piece that loads Milkdown + Crepe + CSS only when rendered */
const LazyMd = React.lazy(async () => {
  const [
    reactMod,
    { Crepe },
  ] = await Promise.all([
    import("@milkdown/react"),
    import("@milkdown/crepe"),
    import("@milkdown/crepe/theme/common/style.css"),
    import("@milkdown/crepe/theme/frame.css"),
    import("./milkdown-theme.css"),
  ])

  const { Milkdown, useEditor } = reactMod

  const Inner: React.FC<MdEditorProps> = ({ markdown, onSave }) => {
    // keep onSave stable inside the hook without re-creating editor
    const onSaveRef = React.useRef(onSave)
    React.useEffect(() => { onSaveRef.current = onSave }, [onSave])

    useEditor((root) => {
      const crepe = new Crepe({
        root,
        defaultValue: markdown,
      })
      crepe.on((listener) => {
        listener.markdownUpdated((_, md) => {
          onSaveRef.current(md)
        })
      })
      return crepe.editor
    }, []) // initialize once; defaultValue applied on first mount only

    return <Milkdown />
  }

  return { default: Inner }
})

/** Public component: same API, internally lazy */
export const MdEditor: React.FC<MdEditorProps> = ({ markdown, onSave }) => {
  return (
    <React.Suspense fallback={<div></div>}>
      <LazyMd markdown={markdown} onSave={onSave} />
    </React.Suspense>
  )
}