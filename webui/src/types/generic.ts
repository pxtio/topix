export type OptionalStringKeys<T> =
  { [K in keyof T]-?: undefined extends T[K]
      ? (Extract<T[K], string> extends never ? never : K)
      : never }[keyof T]