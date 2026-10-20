import type { SVGProps } from 'react'

const paths = {
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  menu: 'M4 7h16M4 12h10M4 17h16',
  check: 'M5 12.5l4.2 4.2L19 7',
  chevron: 'M8 10l4 4 4-4',
  grip: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  copy: 'M9 9h10v10H9zM5 15V5h10',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  notes: 'M6 4h9l3 3v13H6zM9 11h6M9 15h6',
  link: 'M10 14l4-4M8.5 11.5l-2 2a3 3 0 004.2 4.2l2-2M15.5 12.5l2-2a3 3 0 00-4.2-4.2l-2 2',
  undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  cloud: 'M7 18h10a4 4 0 00.5-8A6 6 0 006 11a3.5 3.5 0 001 7z',
  calendar: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4',
  archive: 'M4 5h16v4H4zM6 9v10h12V9M10 13h4',
  download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  upload: 'M12 20V9M7 14l5-5 5 5M5 4h14',
  sparkle: 'M12 3v5M12 16v5M3 12h5M16 12h5M6 6l3 3M15 15l3 3M18 6l-3 3M9 15l-3 3',
  filter: 'M4 6h16M7 12h10M10 18h4',
  sort: 'M7 4v16M4 17l3 3 3-3M17 20V4M14 7l3-3 3 3',
  phone: 'M8 3h8v18H8zM11 18h2',
  share: 'M12 15V3M8 7l4-4 4 4M6 11v9h12v-9',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 22, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  )
}
