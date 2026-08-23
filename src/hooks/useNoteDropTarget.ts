import { useCallback, useState, type DragEvent } from 'react'

/** `DataTransfer` type carrying a dragged note's id. */
export const NOTE_DRAG_TYPE = 'application/x-notepad-note'

export interface NoteDropTarget {
  /** True while a note is being dragged over the target (mirror it as `data-drop-active`). */
  dropActive: boolean
  dropProps: {
    onDragOver: (event: DragEvent<HTMLElement>) => void
    onDragLeave: (event: DragEvent<HTMLElement>) => void
    onDrop: (event: DragEvent<HTMLElement>) => void
  }
}

function carriesNote(transfer: DataTransfer | null): boolean {
  return transfer !== null && Array.from(transfer.types).includes(NOTE_DRAG_TYPE)
}

/** Makes an element accept dragged notes (see {@link NOTE_DRAG_TYPE}); `onDropNote` receives the note id. */
export function useNoteDropTarget(onDropNote: (noteId: string) => void): NoteDropTarget {
  const [dropActive, setDropActive] = useState(false)

  const onDragOver = useCallback((event: DragEvent<HTMLElement>) => {
    if (!carriesNote(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropActive(true)
  }, [])

  const onDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    // Ignore moves between the target and its own children.
    if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
    setDropActive(false)
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLElement>) => {
      setDropActive(false)
      if (!carriesNote(event.dataTransfer)) return
      event.preventDefault()
      event.stopPropagation()
      const noteId = event.dataTransfer.getData(NOTE_DRAG_TYPE)
      if (noteId) onDropNote(noteId)
    },
    [onDropNote],
  )

  return { dropActive, dropProps: { onDragOver, onDragLeave, onDrop } }
}
