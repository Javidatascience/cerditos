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

/** Una fila de una lista sincronizada: su nodo y cómo repintarlo con datos nuevos. */
export interface ListRow<T> {
  el: HTMLElement;
  update(item: T): void;
}

/**
 * Lista que se sincroniza por clave en vez de reconstruirse: las filas existentes se reutilizan
 * (se repintan con `update`) y solo se crean o quitan las que cambian. Importa porque la UI se
 * repinta cada 250 ms: si el botón se recrease, un clic que cae entre el pulsar y el soltar
 * se perdería (había que pulsar varias veces para comprar una mejora).
 */
export function createListSync<T>(parent: HTMLElement, key: (item: T) => string, create: (item: T) => ListRow<T>): (items: T[]) => void {
  const rows = new Map<string, ListRow<T>>();
  return (items) => {
    const seen = new Set<string>();
    let previous: Node | null = null;
    for (const item of items) {
      const k = key(item);
      seen.add(k);
      let row = rows.get(k);
      if (!row) {
        row = create(item);
        rows.set(k, row);
      }
      row.update(item);
      const expected: Node | null = previous ? previous.nextSibling : parent.firstChild;
      if (row.el !== expected) parent.insertBefore(row.el, expected);
      previous = row.el;
    }
    for (const [k, row] of rows) {
      if (seen.has(k)) continue;
      row.el.remove();
      rows.delete(k);
    }
  };
}

/**
 * Botón que se repite mientras se mantiene pulsado: ejecuta la acción al pulsar y, tras una pausa,
 * la repite cada pocos milisegundos hasta soltar. El clic con teclado (detail 0) también funciona.
 */
export function onHold(button: HTMLElement, action: () => void, delay = 400, interval = 80): void {
  let waiting: number | undefined;
  let repeating: number | undefined;
  function stop(): void {
    window.clearTimeout(waiting);
    window.clearInterval(repeating);
    window.removeEventListener('pointerup', stop);
    window.removeEventListener('pointercancel', stop);
  }
  button.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || (button as HTMLButtonElement).disabled) return;
    action();
    waiting = window.setTimeout(() => {
      repeating = window.setInterval(action, interval);
    }, delay);
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
  });
  button.addEventListener('click', (e) => {
    if (e.detail === 0) action();
  });
  button.addEventListener('contextmenu', (e) => e.preventDefault());
}
