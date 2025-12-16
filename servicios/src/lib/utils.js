import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases CSS de Tailwind de forma inteligente
 * Resuelve conflictos de clases y combina clases condicionales
 *
 * @param {...(string|string[]|Object)} inputs - Clases CSS a combinar
 * @returns {string} Clases CSS combinadas
 *
 * @example
 * cn("text-red-500", "text-blue-500") // => "text-blue-500"
 * cn("px-4", condition && "py-2") // => "px-4 py-2" (si condition es true)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
