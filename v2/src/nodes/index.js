import { OPS } from '../opencv/ops'
import { OpNode } from './OpNode'
import { ImageSourceNode } from './ImageSourceNode'

// Map every registered op type to a React Flow node component. The Image Source
// gets a bespoke component (image picker); everything else uses the generic
// OpNode that renders params + live preview straight from the OPS registry.
//
// To ADD A NODE: add an entry to OPS in src/opencv/ops.js. It shows up in the
// palette and renders with OpNode automatically — no change needed here unless
// it needs custom UI (like a new input source).
export const nodeTypes = Object.fromEntries(
  Object.keys(OPS).map((type) => [type, type === 'image_source' ? ImageSourceNode : OpNode])
)

// Palette entries (everything the user can drag onto the canvas), grouped by category.
export const PALETTE = Object.entries(OPS).map(([type, spec]) => ({
  type,
  label: spec.label,
  icon: spec.icon,
  category: spec.category,
}))
