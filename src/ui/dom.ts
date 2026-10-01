// Helpers mínimos de DOM directo, sin framework (docs/02-arquitectura.md §1 y §8).
// h() crea nodos una vez; setText()/setDisabled() actualizan sin repintar si no cambia nada.

type Attrs = Record<string, string | number | boolean | ((ev: Event) => void) | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value as (ev: Event) => void);
    } else if (key === 'className') {
      el.className = String(value);
    } else if (typeof value === 'boolean') {
      if (value) el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    el.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Cambia el texto del nodo solo si es distinto del actual (evita repintados innecesarios). */
export function setText(node: Text | HTMLElement, text: string): void {
  if (node instanceof Text) {
    if (node.data !== text) node.data = text;
  } else if (node.textContent !== text) {
    node.textContent = text;
  }
}

export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}

export function setClass(el: HTMLElement, className: string, on: boolean): void {
  if (on) el.classList.add(className);
  else el.classList.remove(className);
}

/** Pone una propiedad de `style` inline solo si cambia (p. ej. el ancho de una barra de progreso). */
export function setStyleProp(el: HTMLElement, prop: string, value: string): void {
  if (el.style.getPropertyValue(prop) !== value) el.style.setProperty(prop, value);
}
