'use strict';

/*
 * Kentō cursor, ported from the portfolio (shusingh.github.io). In woodblock
 * printing, kentō marks are the carved corner registrations that align the
 * paper to the block. The pointer becomes a fine ink dot inside a small
 * breathing frame of corner brackets; hovering an interactive element sends
 * the corners out to register it. Touch and reduced-motion sessions never
 * activate this and keep their native cursors.
 */
(function kentoCursor() {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = window.matchMedia('(pointer: coarse)');
  if (reducedMotion.matches || coarsePointer.matches) return;

  function make(className) {
    const el = document.createElement('div');
    el.className = className;
    el.setAttribute('aria-hidden', 'true');
    document.body.appendChild(el);
    return el;
  }

  const marks = [
    make('kento-corner kento-nw'),
    make('kento-corner kento-ne'),
    make('kento-corner kento-sw'),
    make('kento-corner kento-se'),
  ];
  const dot = make('kento-dot');

  document.documentElement.classList.add('kento-cursor');

  const MARK = 11; // corner bracket size, must match the CSS
  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight * 0.3;
  let target = null;
  let visible = false;
  let cx = pointerX;
  let cy = pointerY;
  let hw = 13;
  let hh = 13;
  let pulse = 0;
  let lastTime = performance.now();

  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    const element = target instanceof Element && target.isConnected ? target : null;
    const interactive = element
      ? element.closest('a, button, input, textarea, select, [role="button"]')
      : null;
    const overProse = !interactive && Boolean(element && element.closest('p, li, blockquote, pre'));

    let tx = pointerX;
    let ty = pointerY;
    // Slow breathing at rest, like paper settling.
    let thw = 13 + Math.sin(now / 900) * 1.2;
    let thh = thw;
    if (interactive) {
      const rect = interactive.getBoundingClientRect();
      tx = rect.left + rect.width / 2;
      ty = rect.top + rect.height / 2;
      thw = rect.width / 2 + 7;
      thh = rect.height / 2 + 7;
    }

    pulse = Math.max(0, pulse - dt * 6);
    const shrink = pulse * 4;
    const ease = 1 - Math.exp(-(interactive ? 14 : 20) * dt);
    cx += (tx - cx) * ease;
    cy += (ty - cy) * ease;
    hw += (thw - shrink - hw) * ease;
    hh += (thh - shrink - hh) * ease;

    marks[0].style.transform = `translate3d(${cx - hw}px, ${cy - hh}px, 0)`;
    marks[1].style.transform = `translate3d(${cx + hw - MARK}px, ${cy - hh}px, 0)`;
    marks[2].style.transform = `translate3d(${cx - hw}px, ${cy + hh - MARK}px, 0)`;
    marks[3].style.transform = `translate3d(${cx + hw - MARK}px, ${cy + hh - MARK}px, 0)`;
    const opacity = !visible ? '0' : overProse ? '0.18' : '1';
    for (const mark of marks) {
      mark.style.opacity = opacity;
      mark.classList.toggle('kento-hot', Boolean(interactive));
    }
    dot.style.transform = `translate3d(${pointerX - 1.75}px, ${pointerY - 1.75}px, 0)`;
    dot.style.opacity = visible ? '1' : '0';

    window.requestAnimationFrame(frame);
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointerX = event.clientX;
    pointerY = event.clientY;
    target = event.target instanceof Element ? event.target : null;
    visible = true;
  }, { passive: true });

  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    pulse = 1;
  }, { passive: true });

  window.addEventListener('pointerleave', () => { visible = false; });
  window.addEventListener('blur', () => { visible = false; });

  window.addEventListener('scroll', () => {
    // The element under the pointer changes as the page scrolls beneath it.
    target = document.elementFromPoint(pointerX, pointerY);
  }, { passive: true });

  window.requestAnimationFrame(frame);
})();
