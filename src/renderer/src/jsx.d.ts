// JSX type definitions for vanilla JSX (no React)
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any
  }
  
  interface Element extends HTMLElement {}
}
