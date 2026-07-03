'use strict';

/*
 * Procedural washi paper, ported from the portfolio's FluidBackground display
 * shader (shusingh.github.io). The real paper feel there does not come from
 * the texture photo: on every page an opaque WebGL canvas paints paper as
 * three octaves of value noise over the paper colour, with a deckled-edge
 * vignette. This module renders exactly that paper once (and again on
 * resize); there is no animation and no ink, so it costs one draw call.
 *
 * When WebGL is unavailable the CSS fallback (washi photo overlay) stays on.
 */
(function paperCanvas() {
  const VERT = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  // Paper path of the portfolio's DISPLAY_SHADER with zero ink absorbance.
  const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec3 uPaper;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}

void main() {
  // Procedural washi fibre — three octaves of soft value noise.
  float fibre = noise(vUv * 420.0) * 0.028
              + noise(vUv * 180.0) * 0.022
              + noise(vUv * 60.0) * 0.018;

  vec3 col = uPaper + fibre;

  // Soft darkening toward the edges, like the deckled rim of a sheet.
  vec2 uv2 = vUv * (1.0 - vUv.yx);
  float vign = pow(uv2.x * uv2.y * 15.0, 0.18);
  col *= 0.92 + 0.08 * vign;

  // The portfolio lifts the scene back toward paper; keep it for parity.
  col = mix(col, uPaper, 0.28);

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

  const PAPER_RGB = [0.937, 0.918, 0.878]; // #efeae0

  const canvas = document.createElement('canvas');
  canvas.className = 'paper-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl) return; // CSS washi photo fallback remains active

  function compile(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    return shader;
  }

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  // One full-screen triangle pair.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.uniform3fv(gl.getUniformLocation(program, 'uPaper'), PAPER_RGB);

  function render() {
    // CSS-pixel buffer, matching the portfolio renderer's sizing.
    canvas.width = Math.max(1, window.innerWidth);
    canvas.height = Math.max(1, window.innerHeight);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(render, 200);
  });

  render();
  document.body.prepend(canvas);
  document.body.classList.add('paper-canvas-active');
})();
