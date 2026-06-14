# Mudmee Studio — CLAUDE.md

## Project Overview

**Mudmee Studio** (มัดหมี่ สตูดิโอ) is a Next.js web application for designing Thai Mudmee (ikat) fabric patterns. Users draw motifs, apply crystallographic symmetry groups, assemble body + border sections, preview the fabric in 3D, and save/export designs.

## Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript 5.9
- **Styling**: Tailwind CSS 4, `tw-animate-css`, `clsx`, `class-variance-authority`
- **3D**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **AI**: `@google/genai` (Google Gemini)
- **Animation**: `motion` (Framer Motion)
- **Icons**: `lucide-react`
- **IDs**: `uuid`
- **Lint**: ESLint 9 with `eslint-config-next`

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint check
npm run clean    # Clean Next.js cache
```

Docker:
```bash
docker-compose up --build   # Run with Docker
```

## Architecture

### Directory Structure

```
app/
  page.tsx              # Main app (all modes: design, assemble, preview, gallery)
  layout.tsx            # Root layout
  globals.css           # Global styles
  api/
    gallery/
      route.ts          # GET (list), POST (save) gallery items
      [id]/route.ts     # DELETE gallery item by id

components/
  MotifEditor.tsx       # Canvas-based drawing tool (freehand + pixel)
  SymmetryPreview.tsx   # Repeating pattern preview with symmetry applied
  AssembleView.tsx      # Body + border fabric assembly layout
  ThreePreview.tsx      # 3D ผ้าถุง preview (Three.js)

lib/
  types.ts              # Shared TypeScript types
  symmetry.ts           # Symmetry group transform logic
  utils.ts              # Utility helpers

data/
  gallery.json          # Server-side gallery storage (JSON file)
```

### Core Types (`lib/types.ts`)

- `Point` — `{ x, y }`
- `Path` — a drawn stroke or pixel fill (`id`, `color`, `points`, `type: 'freehand'|'pixel'`, `width?`)
- `SymmetryGroup` — body groups (`p3`, `p31m`, `p3m1`) or border/frieze groups (`p111`, `p112`, `pm11`, `p1m1`, `p11g`, `pmm2`, `pmg2`)
- `Metadata` — `{ name, creator, description, geography }`
- `Project` — full save format with `version`, `metadata`, `colors`, `body`, `border`
- `GalleryItem` — gallery entry with `id`, `type`, `metadata`, `image` (base64 PNG), `date`, `projectData`

### Modes

| Mode | Description |
|------|-------------|
| `design` | Draw motif, choose symmetry group, preview tiling |
| `assemble` | Combine body + border into fabric layout |
| `preview` | 3D ผ้าถุง (wrap-around skirt) view |
| `gallery` | Browse, search, load, delete saved items |

### Symmetry Groups

- **Body** (wallpaper groups): `p3` (120° rotation), `p31m`, `p3m1`
- **Border** (frieze groups): `p111`, `p112`, `pm11`, `p1m1`, `p11g`, `pmm2`, `pmg2`
- Transform logic lives in `lib/symmetry.ts` → `applySymmetry(ctx, group, ...)`

### Gallery API

- `GET /api/gallery` — returns `data/gallery.json` array
- `POST /api/gallery` — prepends a new `GalleryItem` to the file
- `DELETE /api/gallery/[id]` — filters out item by id

### State Management

All state lives in `app/page.tsx` (no external state library). Key state:
- Separate undo/redo history stacks for body and border paths
- `part` toggle (`'body'` | `'border'`) switches which stack is active
- `lang` toggle (`'en'` | `'th'`) switches UI strings inline

### Export

- **PNG export** (`exportPreview`): renders to off-screen canvas at 1920×1080, supports `freehand` or `grid` (8-bit pixelated) mode
- **JSON export/import**: full `Project` object serialized to `.json`

## Environment Variables

```env
NEXT_PUBLIC_BASE_PATH=    # Optional base path prefix for API calls
```

## Notes

- No database — gallery data persists in `data/gallery.json` on the server filesystem
- `data-bk/gallery.json` is a backup copy, not used at runtime
- The app is fully bilingual (EN/TH); all UI strings are in the `t` object in `page.tsx`
- Canvas drawing uses raw HTML5 Canvas API inside React components
- Three.js scene is managed via `@react-three/fiber` declarative components
