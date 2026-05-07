// Five interactive shader wallpapers.
// Each is a self-contained <canvas> React component that compiles a tiny
// fragment shader, threads in mouse + click + time uniforms, and animates
// via requestAnimationFrame. Designed to render inside fixed-size DCArtboards.

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// --------------------------------------------------------------------------
// Generic shader runner. Compiles VERT + the given FRAG, sets up a fullscreen
// quad, and pumps u_time / u_res / u_mouse / u_click each frame.
// --------------------------------------------------------------------------
function ShaderCanvas({ frag, width, height, onClickRipple = true, style }) {
  const canvasRef = React.useRef(null);
  const stateRef = React.useRef({
    mouse: [width / 2, height / 2],
    targetMouse: [width / 2, height / 2],
    click: [width / 2, height / 2, -10.0], // x, y, time-of-click
    start: performance.now(),
  });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    const gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: false });
    if (!gl) return;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s), src);
      }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');
    const uClick = gl.getUniformLocation(prog, 'u_click');
    const uDark = gl.getUniformLocation(prog, 'u_dark');

    gl.viewport(0, 0, canvas.width, canvas.height);

    let raf;
    const draw = () => {
      const s = stateRef.current;
      // ease mouse toward target
      s.mouse[0] += (s.targetMouse[0] - s.mouse[0]) * 0.12;
      s.mouse[1] += (s.targetMouse[1] - s.mouse[1]) * 0.12;
      const t = (performance.now() - s.start) / 1000;
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform2f(uMouse, s.mouse[0] * dpr, (height - s.mouse[1]) * dpr);
      gl.uniform3f(uClick, s.click[0] * dpr, (height - s.click[1]) * dpr, t - s.click[2]);
      if (uDark) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ? 1.0 : 0.0;
        gl.uniform1f(uDark, isDark);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      stateRef.current.targetMouse = [
        ((e.clientX - r.left) / r.width) * width,
        ((e.clientY - r.top) / r.height) * height,
      ];
    };
    const onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * width;
      const y = ((e.clientY - r.top) / r.height) * height;
      const t = (performance.now() - stateRef.current.start) / 1000;
      stateRef.current.click = [x, y, t];
    };
    canvas.addEventListener('mousemove', onMove);
    if (onClickRipple) canvas.addEventListener('click', onClick);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('click', onClick);
    };
  }, [frag, width, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: width + 'px',
        height: height + 'px',
        display: 'block',
        cursor: 'crosshair',
        ...style,
      }}
    />
  );
}

// --------------------------------------------------------------------------
// 01 — METABALLS
// Soft monochrome blobs that orbit the cursor. Click sends a shockwave that
// briefly inflates the field. Calm, pearl-on-ink, very Swiss.
// --------------------------------------------------------------------------
const FRAG_METABALLS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

float metaball(vec2 p, vec2 c, float r) {
  float d = length(p - c);
  return r / (d + 0.0001);
}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 m = u_mouse;
  float t = u_time;

  float r1 = 110.0;
  float r2 = 80.0;
  float r3 = 60.0;
  float r4 = 50.0;

  // click shockwave: inflates radii briefly
  float ck = exp(-u_click.z * 1.6) * 90.0;
  r1 += ck; r2 += ck * 0.7; r3 += ck * 0.5;

  vec2 a = m;
  vec2 b = m + vec2(cos(t * 0.7) * 180.0, sin(t * 0.9) * 140.0);
  vec2 c = m + vec2(cos(t * 0.5 + 2.0) * 240.0, sin(t * 0.6 + 1.0) * 200.0);
  vec2 d = m + vec2(cos(t * 1.1 + 4.0) * 120.0, sin(t * 0.8 + 3.0) * 100.0);

  float f = metaball(p, a, r1) + metaball(p, b, r2) + metaball(p, c, r3) + metaball(p, d, r4);

  // crisp threshold for that liquid-mercury edge
  float v = smoothstep(0.9, 1.1, f * 0.01);

  vec3 ink = vec3(0.06, 0.07, 0.08);
  vec3 pearl = vec3(0.94, 0.93, 0.90);
  vec3 col = mix(ink, pearl, v);

  // subtle paper grain
  float n = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  col += (n - 0.5) * 0.02;

  gl_FragColor = vec4(col, 1.0);
}
`;

// --------------------------------------------------------------------------
// 02 — GRID FIELD
// Swiss grid of dots that subtly bend toward the cursor (gravity well).
// Click leaves a permanent-ish ripple that decays. Three colors are uniforms
// so the same shader can dress in any palette.
// --------------------------------------------------------------------------
const FRAG_GRID_BASE = (bg, ink, accent) => `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 m = u_mouse;

  // gravity displacement toward mouse
  vec2 d = m - p;
  float dist = length(d);
  vec2 pull = (d / (dist + 1.0)) * (8000.0 / (dist * dist + 800.0));

  // click ripple
  vec2 cd = u_click.xy - p;
  float cdist = length(cd);
  float ripple = sin(cdist * 0.04 - u_click.z * 6.0) * exp(-u_click.z * 1.2) * exp(-cdist * 0.003);
  pull += normalize(cd + 0.0001) * ripple * 30.0;

  vec2 dp = p + pull;

  // grid
  float grid = 28.0;
  vec2 gp = mod(dp, grid) - grid * 0.5;
  float dot_d = length(gp);

  // dot size grows near mouse, shrinks far away
  float prox = 1.0 - smoothstep(0.0, 360.0, dist);
  float r = mix(1.4, 4.2, prox);

  float dot_v = 1.0 - smoothstep(r - 0.6, r + 0.6, dot_d);

  vec3 bg = ${bg};
  vec3 ink = ${ink};
  vec3 accent = ${accent};

  // dots near mouse take accent color
  vec3 dot_col = mix(ink, accent, prox * prox);

  vec3 col = mix(bg, dot_col, dot_v);
  gl_FragColor = vec4(col, 1.0);
}
`;

// Default Grid (bone / ink / tomato) for back-compat with v1.
const FRAG_GRID = FRAG_GRID_BASE('vec3(0.96, 0.96, 0.95)', 'vec3(0.10, 0.12, 0.14)', 'vec3(0.95, 0.30, 0.20)');

// --------------------------------------------------------------------------
// 03 — LIQUID GRADIENT
// Slow flowing gradient field, distorted by mouse like silk under a finger.
// Click drops an ink-bloom that diffuses out. Three colors are uniforms so
// the same shader can dress in many palettes.
// --------------------------------------------------------------------------
const FRAG_LIQUID_BASE = (decl, c1, c2, c3) => `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

// 2d simplex-ish noise (cheap)
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
  float t = u_time * 0.15;

  // mouse warps the noise field
  vec2 toMouse = m - p;
  float md = length(toMouse);
  vec2 warp = toMouse * exp(-md * 1.8) * 0.6;

  // click bloom: pushes field outward, decays
  vec2 cd = (u_click.xy / u_res.y) - p;
  float cdLen = length(cd);
  float bloom = exp(-u_click.z * 0.8) * exp(-cdLen * 1.5);
  warp -= normalize(cd + 0.0001) * bloom * 0.3;

  vec2 q = p * 2.0 + warp;
  float n = fbm(q + vec2(t, t * 0.7));
  float n2 = fbm(q * 1.5 - vec2(t * 0.5, t));

  vec3 cream = ${c1};
  vec3 navy = ${c2};
  vec3 rust = ${c3};

  vec3 col = mix(cream, navy, smoothstep(0.3, 0.7, n));
  col = mix(col, rust, smoothstep(0.55, 0.85, n2) * 0.5);

  // bloom highlight
  col = mix(col, cream * 1.05, bloom * 0.6);

  gl_FragColor = vec4(col, 1.0);
}
`;

// Default Liquid (cream / navy / rust) — used by v1 page.
const FRAG_LIQUID = FRAG_LIQUID_BASE('', 'vec3(0.96, 0.93, 0.86)', 'vec3(0.08, 0.12, 0.28)', 'vec3(0.78, 0.42, 0.28)');

// --------------------------------------------------------------------------
// 04 — VECTOR FIELD / PARTICLES (procedural lines)
// A flow-field rendered as long anisotropic streaks. Mouse becomes an
// attractor. Click swaps the field's chirality (smooth blend). Mono on dark.
// --------------------------------------------------------------------------
const FRAG_FLOW = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 p = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  float t = u_time * 0.4;

  // chirality flips on click and smoothly blends back
  float chir = 1.0 - 2.0 * exp(-u_click.z * 0.8);
  chir = clamp(chir, -1.0, 1.0);

  // flow field angle
  vec2 toM = p - m;
  float ang = atan(toM.y, toM.x) + chir * 1.5708 + sin(length(toM) * 4.0 - t) * 0.4;
  vec2 dir = vec2(cos(ang), sin(ang));

  // sample many points along the streamline
  float val = 0.0;
  vec2 sp = p;
  for (int i = 0; i < 24; i++) {
    sp += dir * 0.012;
    float h = hash(floor(sp * 80.0));
    val += smoothstep(0.985, 1.0, h) * (1.0 - float(i) / 24.0);
    // re-evaluate direction to curve the stream
    vec2 toM2 = sp - m;
    float a2 = atan(toM2.y, toM2.x) + chir * 1.5708 + sin(length(toM2) * 4.0 - t) * 0.4;
    dir = vec2(cos(a2), sin(a2));
  }

  // brighter near mouse
  float prox = exp(-length(p - m) * 2.5);
  val *= 1.0 + prox * 1.5;

  vec3 bg = vec3(0.04, 0.04, 0.06);
  vec3 line = vec3(0.85, 0.88, 0.92);

  vec3 col = mix(bg, line, clamp(val * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`;

// --------------------------------------------------------------------------
// 05 — VORONOI / CRYSTAL
// Cellular tiling that ripples in response to the cursor and shatters on
// click. Greyscale with a single saturated cell (the "live" one near cursor).
// --------------------------------------------------------------------------
const FRAG_VORONOI = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.y;
  vec2 m = u_mouse / u_res.y;
  float t = u_time * 0.3;

  // shatter: scales the cells smaller right after click, settles back
  float shatter = 1.0 + exp(-u_click.z * 1.0) * 1.2;
  vec2 p = uv * 6.0 * shatter;

  vec2 ip = floor(p);
  vec2 fp = fract(p);

  float md = 1e9;        // dist to nearest site
  float md2 = 1e9;       // dist to 2nd nearest
  vec2 mSite = vec2(0.0);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(ip + g);
      o = 0.5 + 0.5 * sin(t + 6.2831 * o);
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < md) { md2 = md; md = d; mSite = ip + g; }
      else if (d < md2) { md2 = d; }
    }
  }

  // edge factor (close to where md == md2 → cell border)
  float edge = sqrt(md2) - sqrt(md);
  float line = 1.0 - smoothstep(0.0, 0.06, edge);

  // is this cell the one nearest the mouse?
  vec2 mp = m * 6.0 * shatter;
  vec2 mip = floor(mp);
  // a cell is "live" if its hashed center is the nearest to the mouse cursor
  // approximate: cell containing mouse lights up
  float live = step(length(mSite - mip), 0.5);

  // base shade = cell id hash → grey
  float shade = 0.25 + 0.55 * hash2(mSite).x;

  vec3 col = vec3(shade);
  // live cell glows accent
  vec3 accent = vec3(0.20, 0.55, 0.95);
  col = mix(col, accent, live * 0.85);

  // dark edges
  col = mix(col, vec3(0.06), line);

  gl_FragColor = vec4(col, 1.0);
}
`;

// --------------------------------------------------------------------------
// Wallpaper components
// --------------------------------------------------------------------------
const W = 720, H = 450;

function Wallpaper01({ width = W, height = H }) {
  return <ShaderCanvas frag={FRAG_METABALLS} width={width} height={height} />;
}
// --------------------------------------------------------------------------
// 06 — ORBS / LIQUID CHROME
// Soft white spheres floating on off-white. Each orb has a radial-gradient
// shading that simulates a glossy 3D ball; orbs drift slowly, are attracted
// gently toward the cursor, and a click sends a shockwave that pushes them
// outward. Inspired by lab.® / Nathan Bolger refs — a clean studio backdrop
// where content can sit comfortably on top.
// --------------------------------------------------------------------------
const FRAG_ORBS = `
precision highp float;
uniform float u_time;
uniform vec2 u_res;
uniform vec2 u_mouse;
uniform vec3 u_click;

// 9 orbs — much bigger, overlapping for mesh-gradient feel
vec3 orb(int i) {
  if (i == 0) return vec3(0.15, 0.25, 360.0);
  if (i == 1) return vec3(0.78, 0.15, 280.0);
  if (i == 2) return vec3(0.88, 0.62, 320.0);
  if (i == 3) return vec3(0.35, 0.85, 300.0);
  if (i == 4) return vec3(0.05, 0.78, 240.0);
  if (i == 5) return vec3(0.55, 0.45, 200.0);
  if (i == 6) return vec3(0.95, 0.92, 260.0);
  if (i == 7) return vec3(0.28, 0.12, 220.0);
  return vec3(0.62, 0.95, 180.0);
}

vec3 drawOrb(vec3 base, vec2 p, vec2 c, float r) {
  vec2 d = p - c;
  float dist = length(d);
  // softer falloff = mesh gradient
  float alpha = 1.0 - smoothstep(r * 0.3, r * 1.05, dist);
  vec2 ld = normalize(vec2(-0.55, 0.75));
  float shade = clamp(dot(normalize(d + 0.0001), ld), -1.0, 1.0);
  float highlight = smoothstep(0.45, 0.95, -shade) * smoothstep(r * 1.0, r * 0.4, dist);
  float rim = smoothstep(0.35, 1.0, shade) * smoothstep(r * 0.5, r * 1.0, dist) * 0.22;
  vec3 sphere = mix(vec3(0.91, 0.91, 0.90), vec3(0.995, 0.995, 0.99), 1.0 - shade * 0.5 - 0.5);
  sphere = mix(sphere, vec3(0.74, 0.74, 0.72), rim);
  sphere = mix(sphere, vec3(1.0, 1.0, 1.0), highlight * 0.95);
  return mix(base, sphere, alpha);
}

void main() {
  vec2 p = gl_FragCoord.xy;
  vec2 res = u_res;
  vec2 m = u_mouse;
  float t = u_time;

  vec3 col = vec3(0.953, 0.949, 0.937);

  float ck = exp(-u_click.z * 0.6);

  for (int i = 0; i < 9; i++) {
    vec3 o = orb(i);
    float ph = float(i) * 1.7;
    vec2 c = vec2(o.x * res.x, o.y * res.y);
    // bigger, faster orbits
    c += vec2(cos(t * 0.45 + ph) * 110.0, sin(t * 0.55 + ph * 1.3) * 90.0);
    c += vec2(sin(t * 0.22 + ph * 2.1) * 55.0, cos(t * 0.28 + ph * 1.7) * 45.0);

    // STRONG cursor attraction — orbs visibly chase mouse
    vec2 toM = m - c;
    float md = length(toM);
    c += toM * exp(-md * 0.0018) * 75.0;

    // click shockwave
    vec2 fromCk = c - u_click.xy;
    float ckd = length(fromCk);
    c += normalize(fromCk + 0.0001) * ck * exp(-ckd * 0.0025) * 180.0;

    col = drawOrb(col, p, c, o.z);
  }

  float vig = 1.0 - smoothstep(0.4, 1.0, length((p / res) - 0.5));
  col *= mix(0.97, 1.0, vig);
  float grain = fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  col += (grain - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

function WallpaperOrbs({ width = W, height = H }) {
  return <ShaderCanvas frag={FRAG_ORBS} width={width} height={height} />;
}
function Wallpaper02({ width = W, height = H }) {
  return <ShaderCanvas frag={FRAG_GRID} width={width} height={height} />;
}
// Grid Field in arbitrary palette (3 GLSL vec3 strings)
function Wallpaper02Palette({ width = W, height = H, bg, ink, accent }) {
  const frag = React.useMemo(() => FRAG_GRID_BASE(bg, ink, accent), [bg, ink, accent]);
  return <ShaderCanvas frag={frag} width={width} height={height} />;
}
function Wallpaper03({ width = W, height = H }) {
  return <ShaderCanvas frag={FRAG_LIQUID} width={width} height={height} />;
}
// Liquid in arbitrary palette (3 colors as glsl vec3 strings)
function Wallpaper03Palette({ width = W, height = H, c1, c2, c3 }) {
  const frag = React.useMemo(() => FRAG_LIQUID_BASE('', c1, c2, c3), [c1, c2, c3]);
  return <ShaderCanvas frag={frag} width={width} height={height} />;
}
function Wallpaper04({ width = W, height = H }) {
  return <ShaderCanvas frag={FRAG_FLOW} width={width} height={height} />;
}
function Wallpaper05({ width = W, height = H }) {
  return <ShaderCanvas frag={FRAG_VORONOI} width={width} height={height} />;
}

// expose
Object.assign(window, {
  ShaderCanvas,
  Wallpaper01, Wallpaper02, Wallpaper02Palette, Wallpaper03, Wallpaper03Palette, Wallpaper04, Wallpaper05,
  WallpaperOrbs,
  WALLPAPER_W: W, WALLPAPER_H: H,
});
