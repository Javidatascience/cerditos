// Evita el zoom accidental en el móvil: Safari de iOS ignora `user-scalable=no`, así que además
// se cancela el gesto de pellizco. (Contrapartida: quien necesite agrandar el
// texto no puede hacerlo con el gesto; los tamaños de letra ya son cómodos.)

export function disableZoom(): void {
  const stop = (e: Event) => e.preventDefault();
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  document.addEventListener('gestureend', stop);
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );
  // El doble toque lo evita `touch-action: manipulation` (styles.css); cancelarlo por JS
  // impediría tocar deprisa los botones (rascar, comprar).
}
