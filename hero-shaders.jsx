// Six hero animation candidates. All share the same off-white palette and
// content-friendly contrast. All read u_mouse and u_click for interaction.

// -------------------------------------------------------------------------
// H1 — DUOTONE MESH WAVE
// Smooth animated mesh of warm-grey + off-white that flows like silk under
// the cursor. The cursor warps the entire field; click sends a shockwave
// expansion. Most "AAA" feeling — closest in spirit to Apple/Igloo.
// -------------------------------------------------------------------------
const FRAG_H1_MESH = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  float t = u_time * 0.18;

  // mouse warps the field
  vec2 toM = m - p;
  float md = length(toM);
  vec2 warp = toM * exp(-md * 1.4) * 0.5;

  // click shockwave: outward push that decays
  vec2 cd = (u_click.xy / u_res.y) - p;
  float cdL = length(cd);
  float ck = exp(-u_click.z * 0.7) * exp(-cdL * 1.0);
  warp -= normalize(cd + 0.0001) * ck * 0.35;

  vec2 q = p * 1.6 + warp + vec2(t, t * 0.6);
  float n = fbm(q);
  float n2 = fbm(q * 1.7 - vec2(t * 0.3, t * 0.5));

  // off-white -> warm grey -> a hint of rust at the deepest folds
  vec3 a = vec3(0.953, 0.949, 0.937);  // off-white
  vec3 b = vec3(0.86, 0.85, 0.83);     // warm grey
  vec3 c = vec3(0.74, 0.70, 0.67);     // deeper grey
  vec3 col = mix(a, b, smoothstep(0.35, 0.7, n));
  col = mix(col, c, smoothstep(0.55, 0.85, n2) * 0.5);

  // a faint warm highlight following the mouse
  col += exp(-md * 4.0) * 0.04;

  gl_FragColor = vec4(col, 1.0);
}
`;

// -------------------------------------------------------------------------
// H2 — CHROME RIBBON
// A single liquid-chrome ribbon that snakes across the hero. The ribbon's
// path bends toward the mouse. Click fattens it briefly. Very "industrial
// design" / Igloo-feel. Bold focal element, lots of breathing room.
// -------------------------------------------------------------------------
const FRAG_H2_RIBBON = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  vec2 res_n = u_res / u_res.y;
  float t = u_time * 0.4;

  vec3 bg = vec3(0.953, 0.949, 0.937);

  // ribbon centerline: y = sin curve modulated by mouse pull
  // signed distance from current pixel to the ribbon
  float bend = (m.x > 0.0) ? (m.y - 0.5) : 0.0;
  float yLine = 0.5
    + sin(p.x * 2.4 + t) * 0.10
    + sin(p.x * 5.7 - t * 1.3) * 0.04
    + bend * exp(-pow((p.x - m.x) * 1.8, 2.0)) * 0.6;

  float d = abs(p.y - yLine);
  // ribbon thickness, fattens on click
  float ck = exp(-u_click.z * 0.9);
  float thick = 0.10 + ck * 0.08;
  // soft inner core
  float ribbon = smoothstep(thick, thick * 0.4, d);
  // glossy highlight band
  float gloss = smoothstep(thick * 0.55, thick * 0.15, abs(p.y - yLine - 0.015));
  // shadow band below
  float shadow = smoothstep(thick * 1.1, thick * 0.7, d) * smoothstep(yLine, yLine + thick * 0.9, p.y);

  vec3 chrome = mix(vec3(0.78, 0.78, 0.76), vec3(0.99, 0.99, 0.99), smoothstep(thick, 0.0, d));
  chrome = mix(chrome, vec3(1.0), gloss * 0.7);
  chrome = mix(chrome, vec3(0.55, 0.54, 0.52), shadow * 0.45);

  vec3 col = mix(bg, chrome, ribbon);

  // very soft dropshadow under ribbon
  float ds = smoothstep(thick * 2.4, thick * 1.0, d) * smoothstep(yLine, yLine - thick * 1.5, p.y);
  col *= mix(1.0, 0.94, ds * 0.3);

  gl_FragColor = vec4(col, 1.0);
}
`;

// -------------------------------------------------------------------------
// H3 — GRADIENT CONIC SUN
// A slowly rotating conic-gradient with a cursor "sun" that brightens its
// arc. Click rotates the whole field 90deg with a smooth ease. Calm,
// editorial; great background that doesn't fight foreground type.
// -------------------------------------------------------------------------
const FRAG_H3_CONIC = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

void main() {
  vec2 p = (gl_FragCoord.xy - u_res * 0.5) / u_res.y;
  vec2 m = (u_mouse - u_res * 0.5) / u_res.y;
  float t = u_time * 0.05;

  // click adds an extra rotation that decays
  float ck = exp(-u_click.z * 0.6);
  float kick = ck * 1.5708; // 90deg
  float ang = atan(p.y, p.x) + t + kick;

  // conic gradient: 4 soft bands
  float band = sin(ang * 2.0) * 0.5 + 0.5;
  vec3 a = vec3(0.953, 0.949, 0.937);
  vec3 b = vec3(0.92, 0.91, 0.89);
  vec3 c = vec3(0.83, 0.81, 0.78);
  vec3 col = mix(a, b, band);
  col = mix(col, c, smoothstep(0.6, 1.0, band) * 0.45);

  // cursor "sun" that brightens
  float md = length(p - m);
  col += exp(-md * 3.5) * vec3(0.06, 0.05, 0.04);

  // faint vignette
  col *= 1.0 - smoothstep(0.5, 1.1, length(p)) * 0.15;

  gl_FragColor = vec4(col, 1.0);
}
`;

// -------------------------------------------------------------------------
// H4 — TYPE-SAFE GRID (mesh + grid hybrid)
// Soft mesh-gradient base PLUS a faint structural grid that warps subtly
// near the cursor. Grid is light enough to NOT compete with foreground type.
// Click pulses one cell. The "Swiss + technical" answer.
// -------------------------------------------------------------------------
const FRAG_H4_TYPEGRID = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;
uniform float u_dark;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  float t = u_time * 0.12;

  // mesh-gradient base
  vec2 q = p * 1.4 + vec2(t, t * 0.6);
  float n = noise(q) * 0.5 + noise(q * 2.0) * 0.25 + noise(q * 4.0) * 0.125;
  vec3 a = mix(vec3(0.96, 0.955, 0.945), vec3(0.055, 0.055, 0.06), u_dark);
  vec3 b = mix(vec3(0.86, 0.85, 0.83),    vec3(0.13, 0.13, 0.14),  u_dark);
  vec3 col = mix(a, b, smoothstep(0.3, 0.75, n));

  // structural grid that bends near mouse
  vec2 toM = m - p;
  float md = length(toM);
  vec2 warp = toM * exp(-md * 2.0) * 0.04;
  vec2 gp = (p + warp) * 12.0;
  vec2 cell = abs(fract(gp) - 0.5);
  float lineX = smoothstep(0.495, 0.498, cell.x);
  float lineY = smoothstep(0.495, 0.498, cell.y);
  float grid = max(lineX, lineY);

  // grid is FAINT in body, brighter near cursor (highlights the active region)
  float prox = exp(-md * 2.5);
  // in dark mode, brighten lines instead of darkening them
  col = mix(col, mix(col * 0.78, col + vec3(0.10), u_dark), grid * (0.10 + prox * 0.35));

  // click: pumpkin-orange pulse on the clicked cell, fades out fast
  vec2 cgp = (u_click.xy / u_res.y) * 12.0;
  vec2 cellId = floor(cgp);
  vec2 myId = floor(gp);
  float same = step(length(cellId - myId), 0.5);
  // pumpkin orange — fades away quickly via u_click.z (time since click)
  float clickFade = exp(-u_click.z * 4.0);
  vec3 pulse = vec3(1.0, 0.46, 0.12);
  col = mix(col, pulse, same * 0.85 * clickFade);

  gl_FragColor = vec4(col, 1.0);
}
`;

// -------------------------------------------------------------------------
// H5 — PARTICLE FIELD (procedural specks)
// Thousands of soft specks drifting like dust in a sunbeam. Specks near the
// cursor brighten and slightly orient toward it. Click sends an outward
// shockwave. Atmospheric, "studio at night" vibe.
// -------------------------------------------------------------------------
const FRAG_H5_PARTICLES = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  float t = u_time * 0.08;

  vec3 bg = vec3(0.953, 0.949, 0.937);
  vec3 col = bg;

  // mouse "warm light" tint
  float md = length(p - m);
  col -= exp(-md * 2.0) * 0.05;

  // shockwave radial offset to particle positions
  float ck = exp(-u_click.z * 0.8);
  vec2 cd = p - (u_click.xy / u_res.y);
  float cdL = length(cd);
  float push = ck * exp(-cdL * 1.0) * 0.15;

  // sample many cells; each cell holds a single particle
  float density = 60.0;
  vec2 gp = p * density;
  vec2 ip = floor(gp), fp = fract(gp);

  for (int j = -1; j <= 1; j++) {
    for (int k = -1; k <= 1; k++) {
      vec2 g = vec2(float(k), float(j));
      vec2 cellId = ip + g;
      vec2 seed = vec2(hash(cellId), hash(cellId + 17.0));
      // particle drifts slowly
      vec2 off = 0.5 + 0.5 * sin(t * 2.0 + seed * 6.2831);
      // shockwave displaces particles outward
      off += normalize(cd + 0.0001) * push * 6.0;
      vec2 pp = g + off - fp;
      float d = length(pp);
      float r = mix(0.012, 0.045, hash(cellId + 31.0));
      // brighten near mouse
      float prox = exp(-length((cellId / density) - m) * 2.5);
      float a = (1.0 - smoothstep(r * 0.4, r, d)) * (0.25 + prox * 0.9);
      col -= a * 0.18;
    }
  }

  gl_FragColor = vec4(col, 1.0);
}
`;

// -------------------------------------------------------------------------
// H6 — SPOTLIGHT VOID
// Mostly off-white, but the cursor reveals a soft dark gradient + a faint
// halftone grain ONLY where the cursor is. The rest of the canvas is clean.
// Click expands the spotlight and fades it back. Very dramatic — content
// over the spotlight reads inverted.
// -------------------------------------------------------------------------
const FRAG_H6_SPOTLIGHT = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  float t = u_time;

  vec3 bg = vec3(0.953, 0.949, 0.937);
  vec3 col = bg;

  // base spotlight radius, expands on click
  float ck = exp(-u_click.z * 0.6);
  float radius = 0.45 + ck * 0.4;

  float md = length(p - m);
  // dark inner gradient
  float spot = 1.0 - smoothstep(0.0, radius, md);
  vec3 dark = mix(vec3(0.30, 0.29, 0.28), vec3(0.09, 0.09, 0.10), spot * spot);
  // halftone grain inside the spotlight
  vec2 hp = floor(gl_FragCoord.xy / 4.0) * 4.0;
  float dot_n = hash(hp);
  float dotPattern = step(0.5, dot_n);

  vec3 mixed = mix(dark, dark * 1.05, dotPattern);
  col = mix(col, mixed, spot);

  // click ring
  float ring = smoothstep(0.005, 0.0, abs(length(p - (u_click.xy / u_res.y)) - ck * 0.5));
  col -= ring * 0.25;

  gl_FragColor = vec4(col, 1.0);
}
`;

// -------------------------------------------------------------------------
// Hero shader components (all 1280×760 by default to match the wireframe
// hero region, but accept width/height props).
// -------------------------------------------------------------------------
function HeroH1({ width = 1280, height = 760 }) { return <ShaderCanvas frag={FRAG_H1_MESH} width={width} height={height} />; }
function HeroH2({ width = 1280, height = 760 }) { return <ShaderCanvas frag={FRAG_H2_RIBBON} width={width} height={height} />; }
function HeroH3({ width = 1280, height = 760 }) { return <ShaderCanvas frag={FRAG_H3_CONIC} width={width} height={height} />; }
function HeroH4({ width = 1280, height = 760 }) { return <ShaderCanvas frag={FRAG_H4_TYPEGRID} width={width} height={height} />; }
function HeroH5({ width = 1280, height = 760 }) { return <ShaderCanvas frag={FRAG_H5_PARTICLES} width={width} height={height} />; }
function HeroH6({ width = 1280, height = 760 }) { return <ShaderCanvas frag={FRAG_H6_SPOTLIGHT} width={width} height={height} />; }

Object.assign(window, {
  HeroH1, HeroH2, HeroH3, HeroH4, HeroH5, HeroH6,
});
