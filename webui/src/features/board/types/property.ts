/**
 * Interface for the position property.
 */
export interface PositionProperty {
  type: "position"
  id?: string
  position: {
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
  size: {
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
  icon: {
    type: "icon"
    icon: string
  } | {
    type: "emoji"
    emoji: string
  }
}

/**
 * Interface for the boolean property.
 */
export interface BooleanProperty {
  type: "boolean"
  id?: string
  boolean: boolean
}

/**
 * Interface for the number property.
 */
export interface NumberProperty {
  type: "number"
  id?: string
  number: number
}

/**
 * Union type for all properties.
 */
export type Property = PositionProperty | SizeProperty | IconProperty | BooleanProperty
