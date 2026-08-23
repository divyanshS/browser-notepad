import type { ReactElement, SVGProps } from 'react'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>

function Icon({ children, ...props }: SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Pencil-in-square "compose" glyph (new note). */
export function ComposeIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M7 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V9" />
      <path d="M12.3 2.2a1.4 1.4 0 0 1 2 2L8.5 10l-2.7.7.7-2.7z" />
    </Icon>
  )
}

/** Folder glyph. */
export function FolderIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
    </Icon>
  )
}

/** Folder with a plus sign (new folder). */
export function NewFolderIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
      <path d="M8 7.2v3.6M6.2 9h3.6" />
    </Icon>
  )
}

/** Stack-of-notes glyph (All Notes). */
export function NotesIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3" y="2.5" width="10" height="11" rx="1.5" />
      <path d="M5.5 6h5M5.5 8.5h5M5.5 11h3" />
    </Icon>
  )
}

/** Trash can glyph (delete). */
export function TrashIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.1a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8.1" />
    </Icon>
  )
}

/** Right-pointing chevron; rotate via CSS when expanded. */
export function ChevronIcon(props: IconProps): ReactElement {
  return (
    <Icon width="12" height="12" {...props}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </Icon>
  )
}

/** Horizontal ellipsis (more actions). */
export function EllipsisIcon(props: IconProps): ReactElement {
  return (
    <Icon fill="currentColor" stroke="none" {...props}>
      <circle cx="3.5" cy="8" r="1.3" />
      <circle cx="8" cy="8" r="1.3" />
      <circle cx="12.5" cy="8" r="1.3" />
    </Icon>
  )
}

/** Arrow-out-of-tray glyph (export). */
export function ExportIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M8 10V2.5M5 5.5 8 2.5l3 3" />
      <path d="M3 9.5v2A1.5 1.5 0 0 0 4.5 13h7a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </Icon>
  )
}

/** Folder with an arrow (move to folder). */
export function MoveIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5z" />
      <path d="M6 9h4M8.5 7.5 10 9l-1.5 1.5" />
    </Icon>
  )
}

/** Check mark. */
export function CheckIcon(props: IconProps): ReactElement {
  return (
    <Icon width="12" height="12" strokeWidth="2" {...props}>
      <path d="M3 8.5 6.5 12 13 4.5" />
    </Icon>
  )
}

/** Panel-with-sidebar glyph (show/hide the folder pane). */
export function SidebarIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="2" y="3" width="12" height="10" rx="2" />
      <line x1="6" y1="3" x2="6" y2="13" />
    </Icon>
  )
}
