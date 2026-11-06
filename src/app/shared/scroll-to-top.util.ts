/** Reset page scroll when switching an in-dashboard screen (view stays scrolled otherwise). */
export function scrollAppToTop(): void {
  const reset = (): void => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      window.scrollTo(0, 0);
    }
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const selectors = [
      '.overview-shell',
      '.fnb-shell',
      '.fo-shell',
      '.hk-shell',
      '.main',
      '.content',
      '.page-content'
    ];
    for (const sel of selectors) {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        if (el.scrollTop) {
          el.scrollTop = 0;
        }
      });
    }
  };

  // After *ngIf swaps the new screen into the DOM
  requestAnimationFrame(() => {
    reset();
    setTimeout(reset, 0);
  });
}
