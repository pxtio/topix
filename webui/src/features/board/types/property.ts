/**
 * Interface for the position property.
 */
export interface PositionProperty {
  type: "position"
  id?: string
  position?: {
    x: number
    y: number
  }
}


/**
 * Interface for the size property.
 */
export interface SizeProperty {
  type: "size"
  id?: string
  size?: {
    width: number
    height: number
  }
}

/**
 * Interface for the icon property.
 */
export interface IconProperty {
  type: "icon"
  id?: string
  icon?: {
    type: "icon"
    icon: string
  } | {
    type: "emoji"
    emoji: string
  }
}

/**
 * Union type for all properties.
 */
export type Property = PositionProperty | SizeProperty | IconProperty
