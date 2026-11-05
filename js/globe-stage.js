// Globe stage: the landing hero's spinning, projection-mapped dome (after the 2026 Ye Live tour stage).
// GlobeStageCore holds the pure scene logic (unit tested); the renderer below only boots when #globe-stage exists.
(function (root) {
    const TIMELINE = [
        { type: 'earth', dur: 9 },
        { type: 'wash', dur: 14 },
        { type: 'moon', dur: 8 }
    ];
    const XFADE = 1.4;
    const WASH_STEP = 3.5;

    // Album washes: [shadow, mid, highlight] ramps mapped over the Earth's luminance; ids match album-colors.js
    const WASHES = [
        { id: 'grad', name: 'Graduation', stops: ['#1c0640', '#9c27b0', '#ff7ab6'], beams: ['#e91e63', '#9c27b0'] },
        { id: 'mbdtf', name: 'MBDTF', stops: ['#2a0006', '#dc143c', '#ffd700'], beams: ['#dc143c', '#ffd700'] },
        { id: 'yeezus', name: 'Yeezus', stops: ['#050505', '#b00000', '#ff5a3c'], beams: ['#ff0000', '#ff4500'] },
        { id: 'ye', name: 'Ye', stops: ['#06204f', '#2196f3', '#29e753'], beams: ['#2196f3', '#29e753'] },
        { id: 'cd', name: 'College Dropout', stops: ['#1f0f06', '#8b4513', '#f2d27a'], beams: ['#d4af37', '#8b4513'] },
        { id: 'bully', name: 'Bully', stops: ['#030303', '#6e6e6e', '#f4f4f4'], beams: ['#d0d0d0', '#909090'] }
    ];
    const EARTH_BEAMS = ['#c6f25a', '#7fd6ff'];
    const MOON_BEAMS = ['#dfe8ff', '#a9b8d6'];

    const hexToRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const ease = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const wrap = (i, n) => ((i % n) + n) % n;

    // Fills a 256-entry RGB ramp through three color stops
    function buildLut(stops, out) {
        const s = stops.map(hexToRgb);
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            const c = t < 0.5 ? mix(s[0], s[1], t * 2) : mix(s[1], s[2], (t - 0.5) * 2);
            out[i * 3] = c[0];
            out[i * 3 + 1] = c[1];
            out[i * 3 + 2] = c[2];
        }
        return out;
    }

    // Wash look at a given wash clock: holds each album, then blends into the next over the last ~22% of its step
    function washLook(washClock) {
        const k = Math.floor(washClock / WASH_STEP);
        const f = (washClock - k * WASH_STEP) / WASH_STEP;
        const w1 = WASHES[wrap(k, WASHES.length)];
        const w2 = WASHES[wrap(k + 1, WASHES.length)];
        const m = f > 0.78 ? ease((f - 0.78) / 0.22) : 0;
        return { look: { type: 'wash', w1, w2, m }, label: (m > 0.5 ? w2 : w1).name };
    }

    const plainLabel = type => (type === 'earth' ? 'Earth' : 'Moon');

    // Resolves what the dome shows at time t (seconds): look a, optional look b, and the blend m between them
    function sceneAt(t, mode = 'auto') {
        if (mode === 'wash') {
            const w = washLook(t);
            return { a: w.look, b: null, m: 0, label: w.label };
        }
        if (mode === 'earth' || mode === 'moon') {
            return { a: { type: mode }, b: null, m: 0, label: plainLabel(mode) };
        }

        const total = TIMELINE.reduce((s, x) => s + x.dur, 0);
        const cycle = Math.floor(t / total);
        let local = t - cycle * total;
        let i = 0;
        while (local >= TIMELINE[i].dur) {
            local -= TIMELINE[i].dur;
            i++;
        }
        const washesPerCycle = Math.round(TIMELINE.find(s => s.type === 'wash').dur / WASH_STEP);
        // Each pass through the wash segment continues the album sequence where the last one stopped
        const lookFor = (seg, segLocal, cyc) => {
            if (seg.type === 'wash') return washLook(cyc * washesPerCycle * WASH_STEP + segLocal);
            return { look: { type: seg.type }, label: plainLabel(seg.type) };
        };

        const cur = TIMELINE[i];
        const A = lookFor(cur, local, cycle);
        const left = cur.dur - local;
        if (left < XFADE) {
            const nextIndex = (i + 1) % TIMELINE.length;
            const B = lookFor(TIMELINE[nextIndex], 0, nextIndex === 0 ? cycle + 1 : cycle);
            const m = ease(1 - left / XFADE);
            return { a: A.look, b: B.look, m, label: m > 0.5 ? B.label : A.label };
        }
        return { a: A.look, b: null, m: 0, label: A.label };
    }

    function beamColorsFor(look) {
        if (look.type === 'earth') return EARTH_BEAMS.map(hexToRgb);
        if (look.type === 'moon') return MOON_BEAMS.map(hexToRgb);
        const a = look.w1.beams.map(hexToRgb);
        const b = look.w2.beams.map(hexToRgb);
        return [mix(a[0], b[0], look.m), mix(a[1], b[1], look.m)];
    }

    const Core = { TIMELINE, XFADE, WASH_STEP, WASHES, hexToRgb, buildLut, sceneAt, beamColorsFor };
    root.GlobeStageCore = Core;
    if (typeof module !== 'undefined' && module.exports) module.exports = Core;
    if (typeof document === 'undefined') return;

    // ---- Renderer ----

    const TW = 1024;
    const TH = 512;
    const CAM_TILT = 22 * Math.PI / 180;   // camera looks down at the dome
    const AXIS_TILT = 24 * Math.PI / 180;  // globe axis leans back so the front shows Africa and Europe
    const cosT = Math.cos(CAM_TILT);
    const sinT = Math.sin(CAM_TILT);
    const TEXTURES = { earth: 'assets/stage/earth.jpg', moon: 'assets/stage/moon.jpg' };

    function boot() {
        const stage = document.getElementById('globe-stage');
        if (!stage) return;
        const dome = document.getElementById('globe-dome');
        const fx = document.getElementById('globe-fx');
        const performer = document.getElementById('stage-performer');
        const startBtn = document.getElementById('start-ranking');
        const fallback = stage.querySelector('.globe-fallback');
        const sceneEl = document.getElementById('globe-scene');
        const callout = document.getElementById('globe-callout');
        const landing = document.getElementById('landing-screen');
        const beams = [...stage.querySelectorAll('.globe-beam')];
        const domeCtx = dome && dome.getContext('2d');
        if (!domeCtx || !fx || !performer || !startBtn) return;

        const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fxCtx = fx.getContext('2d');
        const off = document.createElement('canvas');
        const offCtx = off.getContext('2d');
        const lutX = new Float32Array(768);
        const lutY = new Float32Array(768);
        const lutA = new Float32Array(768);
        const lutB = new Float32Array(768);

        let tex = null;
        let geo = null;
        let img = null;
        let out32 = null;
        let particles = [];
        let lights = [];
        let beamGeo = [];
        let qualityCap = 1.6;
        let perfSamples = [];

        let rot = 0;
        let speed = 1;
        let slowUntil = 0;
        let hovering = false;
        let clock0 = performance.now();
        let last = clock0;
        let running = false;
        let ready = false;
        let inView = true;
        let lastLabel = '';
        let lastWidth = 0;

        const norm = v => {
            const l = Math.hypot(v[0], v[1], v[2]);
            return [v[0] / l, v[1] / l, v[2] / l];
        };

        // Lays out the stage and precomputes per-pixel sphere mapping, shading and edge alpha
        function build() {
            const bw = stage.clientWidth;
            if (!bw) return;
            lastWidth = bw;
            const narrow = bw < 600;
            const R = Math.round(clamp(bw * (narrow ? 0.37 : 0.3), 130, 290));
            const ring = 1.18;
            const topPad = Math.round(R * 0.08);
            const cw = Math.round(2 * ring * R + 24);
            const y0 = topPad + R * cosT;
            const ch = Math.round(y0 + ring * R * sinT + R * 0.12);

            const btnH = startBtn.offsetHeight || 64;
            const canvasTop = Math.round(btnH + (narrow ? 64 : 84));
            const stageH = canvasTop + ch + 44;
            stage.style.height = stageH + 'px';

            const scale = Math.min(window.devicePixelRatio || 1, qualityCap, 900 / cw);
            const W = Math.round(cw * scale);
            const H = Math.round(ch * scale);
            dome.width = W;
            dome.height = H;
            off.width = W;
            off.height = H;
            dome.style.width = cw + 'px';
            dome.style.height = ch + 'px';
            dome.style.top = canvasTop + 'px';

            const domeTopY = canvasTop + topPad;
            performer.style.top = (domeTopY - btnH + 4) + 'px';
            if (fallback) {
                fallback.style.width = 2 * R + 'px';
                fallback.style.height = Math.round(R * cosT + R * sinT) + 'px';
                fallback.style.top = domeTopY + 'px';
            }

            const Rpx = R * scale;
            const cx = W / 2;
            const cy = y0 * scale;
            const cosA = Math.cos(AXIS_TILT);
            const sinA = Math.sin(AXIS_TILT);
            const L = norm([0.35, 0.85, 0.45]);
            const V = [0, sinT, cosT];
            const Hh = norm([L[0] + V[0], L[1] + V[1], L[2] + V[2]]);

            const pix = [], lon = [], row = [], shade = [], add = [], alpha = [];
            const jMax = Math.min(H, Math.ceil(cy + Rpx * sinT + 2));
            for (let j = 0; j < jMax; j++) {
                const sy = (cy - (j + 0.5)) / Rpx;
                for (let i = 0; i < W; i++) {
                    const sx = (i + 0.5 - cx) / Rpx;
                    const rho2 = sx * sx + sy * sy;
                    if (rho2 >= 1) continue;
                    // Front-facing point on the unit sphere under this pixel (orthographic camera)
                    const h = Math.sqrt(1 - rho2);
                    const px = sx;
                    const py = sy * cosT + h * sinT;
                    const pz = -sy * sinT + h * cosT;
                    if (py < 0) continue;
                    const a = clamp((1 - Math.sqrt(rho2)) * Rpx * 1.2, 0, 1) * clamp(py * Rpx * 1.1, 0, 1);
                    if (a <= 0) continue;
                    const qy = py * cosA - pz * sinA;
                    const qz = py * sinA + pz * cosA;
                    const lat = Math.asin(clamp(qy, -1, 1));
                    const lo = Math.atan2(px, qz);
                    const v = clamp(Math.floor((0.5 - lat / Math.PI) * TH), 0, TH - 1);
                    const diff = Math.max(0, px * L[0] + py * L[1] + pz * L[2]);
                    const rim = 1 - h;
                    const spec = Math.pow(Math.max(0, px * Hh[0] + py * Hh[1] + pz * Hh[2]), 40) * 0.35;
                    const uplight = 0.65 * Math.exp(-py * 10);
                    pix.push(j * W + i);
                    lon.push((lo / (2 * Math.PI) + 0.5) * TW);
                    row.push(v * TW);
                    shade.push((0.7 + 0.6 * diff) * (1 - 0.5 * rim * rim * rim));
                    add.push((spec + uplight) * 255);
                    alpha.push(Math.round(a * 255));
                }
            }
            geo = {
                W, H, R, Rpx, cx, cy, ring, domeTopY, stageH,
                n: pix.length,
                pix: Int32Array.from(pix),
                lon: Float32Array.from(lon),
                row: Int32Array.from(row),
                shade: Float32Array.from(shade),
                add: Float32Array.from(add),
                alpha: Uint8Array.from(alpha)
            };
            img = offCtx.createImageData(W, H);
            out32 = new Uint32Array(img.data.buffer);

            // Confetti specks in the air and phone lights in the crowd
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            fx.width = Math.round(bw * dpr);
            fx.height = Math.round(stageH * dpr);
            fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            particles = Array.from({ length: narrow ? 34 : 70 }, () => ({
                x: Math.random() * bw,
                y: Math.random() * stageH,
                vy: 6 + Math.random() * 14,
                vx: -4 + Math.random() * 8,
                s: 1 + Math.random() * 2.2,
                ph: Math.random() * 6.28
            }));
            lights = Array.from({ length: narrow ? 40 : 110 }, () => ({
                x: Math.random() * bw,
                y: stageH - 4 - Math.random() * 40,
                ph: Math.random() * 6.28,
                f: 0.4 + Math.random() * 1.5
            }));

            // Beams aim from the rig at the top of the stage toward the dome's crown
            const tx = bw / 2;
            const ty = domeTopY + R * 0.25;
            beamGeo = [bw * 0.12, bw * 0.88, bw * 0.5].map(sx => {
                const dx = tx - sx;
                const dy = ty + 40;
                return { sx, len: Math.hypot(dx, dy) * 1.15, ang: Math.atan2(-dx, dy) * 180 / Math.PI };
            });
            beams.forEach((el, k) => {
                el.style.left = beamGeo[k].sx + 'px';
                el.style.height = beamGeo[k].len + 'px';
            });
            if (tex) drawFrame(performance.now());
        }

        function lutFor(look, out) {
            buildLut(look.w1.stops, lutA);
            if (look.m > 0) {
                buildLut(look.w2.stops, lutB);
                for (let i = 0; i < 768; i++) out[i] = lutA[i] + (lutB[i] - lutA[i]) * look.m;
            } else {
                out.set(lutA);
            }
            return out;
        }

        // Writes dome pixels for the current rotation and scene blend
        function renderDome(sc) {
            const { n, pix, lon, row, shade, add, alpha } = geo;
            const A = sc.a;
            const B = sc.b;
            const m = sc.m;
            const mi = 1 - m;
            const texA = A.type === 'moon' ? tex.moon : tex.earth;
            const texB = B ? (B.type === 'moon' ? tex.moon : tex.earth) : null;
            const la = A.type === 'wash' ? lutFor(A, lutX) : null;
            const lb = B && B.type === 'wash' ? lutFor(B, lutY) : null;
            const rotA = A.type === 'moon' ? rot * 0.6 : rot;
            const rotB = B && B.type === 'moon' ? rot * 0.6 : rot;
            for (let k = 0; k < n; k++) {
                let t = texA[row[k] + (((lon[k] - rotA) | 0) & (TW - 1))];
                let r = t & 255, g = (t >>> 8) & 255, b = (t >>> 16) & 255;
                if (la) {
                    const l = ((r * 77 + g * 150 + b * 29) >> 8) * 3;
                    r = la[l]; g = la[l + 1]; b = la[l + 2];
                }
                if (B) {
                    t = texB[row[k] + (((lon[k] - rotB) | 0) & (TW - 1))];
                    let r2 = t & 255, g2 = (t >>> 8) & 255, b2 = (t >>> 16) & 255;
                    if (lb) {
                        const l = ((r2 * 77 + g2 * 150 + b2 * 29) >> 8) * 3;
                        r2 = lb[l]; g2 = lb[l + 1]; b2 = lb[l + 2];
                    }
                    r = r * mi + r2 * m; g = g * mi + g2 * m; b = b * mi + b2 * m;
                }
                const s = shade[k];
                const ad = add[k];
                r = r * s + ad; g = g * s + ad; b = b * s + ad;
                if (r > 255) r = 255;
                if (g > 255) g = 255;
                if (b > 255) b = 255;
                out32[pix[k]] = (alpha[k] << 24) | (b << 16) | (g << 8) | r;
            }
            offCtx.putImageData(img, 0, 0);
        }

        function ellipseArc(ctx, rx, ry, a0, a1, color, strokes) {
            for (const [w, al] of strokes) {
                ctx.beginPath();
                ctx.ellipse(geo.cx, geo.cy, rx, ry, 0, a0, a1);
                ctx.strokeStyle = color;
                ctx.globalAlpha = al;
                ctx.lineWidth = w;
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        // Floor glow, base lip and light ring, with their back halves behind the dome
        function composite(pulse) {
            const ctx = domeCtx;
            const { W, H, Rpx, cx, cy, ring } = geo;
            ctx.clearRect(0, 0, W, H);
            const rx = Rpx;
            const ry = Rpx * sinT;

            const floor = ctx.createRadialGradient(cx, cy, rx * 0.4, cx, cy, rx * ring * 1.05);
            floor.addColorStop(0, 'rgba(255,255,255,0.10)');
            floor.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(1, sinT);
            ctx.translate(-cx, -cy);
            ctx.fillStyle = floor;
            ctx.beginPath();
            ctx.arc(cx, cy, rx * ring * 1.05, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            const u = Rpx / 100;
            const ringA = 0.55 + 0.35 * pulse;
            const glow = [[9 * u, 0.06 * ringA], [4 * u, 0.16 * ringA], [1.4 * u, 0.85 * ringA]];
            const lip = [[7 * u, 0.12], [3 * u, 0.35], [1.6 * u, 1]];
            ellipseArc(ctx, rx * ring, ry * ring, Math.PI, Math.PI * 2, '#fff6e0', glow);
            ellipseArc(ctx, rx * 1.03, ry * 1.03, Math.PI, Math.PI * 2, '#ffffff', lip);
            ctx.drawImage(off, 0, 0);
            ellipseArc(ctx, rx * 1.03, ry * 1.03, 0, Math.PI, '#ffffff', lip);
            ellipseArc(ctx, rx * ring, ry * ring, 0, Math.PI, '#fff6e0', glow);
        }

        function drawFx(t, dt) {
            const w = stage.clientWidth;
            const h = geo.stageH;
            fxCtx.clearRect(0, 0, w, h);
            fxCtx.fillStyle = '#ffffff';
            for (const p of particles) {
                if (!reduceMotion) {
                    p.y += p.vy * dt;
                    p.x += p.vx * dt + Math.sin(t * 0.8 + p.ph) * 0.15;
                    if (p.y > h) {
                        p.y = -5;
                        p.x = Math.random() * w;
                    }
                }
                fxCtx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 2 + p.ph));
                fxCtx.fillRect(p.x, p.y, p.s * 0.6, p.s * 1.8);
            }
            for (const l of lights) {
                fxCtx.globalAlpha = 0.25 + 0.6 * Math.max(0, Math.sin(t * l.f + l.ph));
                fxCtx.fillRect(l.x, l.y, 1.6, 1.6);
            }
            fxCtx.globalAlpha = 1;
        }

        function setBeams(cols, t) {
            const css = c => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
            const colors = [cols[0], cols[1], mix(cols[0], [255, 255, 255], 0.65)];
            const amps = [4, 4, 1.2];
            beams.forEach((el, k) => {
                const sway = reduceMotion ? 0 : Math.sin(t * 0.35 + k * 2) * amps[k];
                el.style.transform = `rotate(${beamGeo[k].ang + sway}deg)`;
                el.style.setProperty('--beam-color', css(colors[k]));
            });
        }

        function drawFrame(now) {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const t = (now - clock0) / 1000;

            const target = now < slowUntil ? 0.3 : hovering ? 2.5 : 1;
            speed += (target - speed) * Math.min(1, dt * 2.5);
            rot = (rot + dt * speed * (TW / 60)) % (TW * 1000);   // one turn per minute at rest

            const beat = (t * 90 / 60) % 1;   // 90 BPM pulse on the light ring
            const pulse = reduceMotion ? 0.5 : Math.exp(-beat * 5);

            const sc = sceneAt(t);
            const t0 = performance.now();
            renderDome(sc);
            trackPerf(performance.now() - t0);
            composite(pulse);
            drawFx(t, dt);
            const ca = beamColorsFor(sc.a);
            const cb = sc.b ? beamColorsFor(sc.b) : null;
            setBeams(cb ? [mix(ca[0], cb[0], sc.m), mix(ca[1], cb[1], sc.m)] : ca, t);
            if (sc.label !== lastLabel) {
                lastLabel = sc.label;
                if (sceneEl) sceneEl.textContent = sc.label;
            }
            if (!ready) {
                ready = true;
                stage.classList.add('is-ready');
            }
        }

        // Drops render resolution on devices that can't hold the frame budget
        function trackPerf(ms) {
            if (qualityCap <= 0.75) return;
            perfSamples.push(ms);
            if (perfSamples.length < 40) return;
            const avg = perfSamples.reduce((a, b) => a + b, 0) / perfSamples.length;
            perfSamples = [];
            if (avg > 12) {
                qualityCap = Math.max(0.75, Math.min(qualityCap, window.devicePixelRatio || 1) * 0.75);
                build();
            }
        }

        function shouldRun() {
            return !!tex && !reduceMotion && inView && !document.hidden && landing.classList.contains('active');
        }

        function loop(now) {
            if (!shouldRun()) {
                running = false;
                return;
            }
            drawFrame(now);
            requestAnimationFrame(loop);
        }

        function syncLoop() {
            if (running || !shouldRun()) return;
            running = true;
            last = performance.now();
            requestAnimationFrame(loop);
        }

        function loadTexture(src) {
            return new Promise((resolve, reject) => {
                const im = new Image();
                im.onload = () => {
                    const c = document.createElement('canvas');
                    c.width = TW;
                    c.height = TH;
                    const x = c.getContext('2d', { willReadFrequently: true });
                    x.drawImage(im, 0, 0, TW, TH);
                    resolve(new Uint32Array(x.getImageData(0, 0, TW, TH).data.buffer));
                };
                im.onerror = reject;
                im.src = src;
            });
        }

        let calloutTimer = 0;
        dome.addEventListener('click', () => {
            slowUntil = performance.now() + 6000;
            callout.innerHTML = '“Make the earth move slower.”<small>Ye to his lighting crew · SoFi Stadium, April 1, 2026</small>';
            callout.classList.add('show');
            clearTimeout(calloutTimer);
            calloutTimer = setTimeout(() => callout.classList.remove('show'), 3800);
            if (window.analytics) window.analytics.track('globe_tapped', { scene: lastLabel || 'Earth' });
        });
        startBtn.addEventListener('pointerenter', () => { hovering = true; });
        startBtn.addEventListener('pointerleave', () => { hovering = false; });
        startBtn.addEventListener('pointerdown', () => { hovering = true; });

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(entries => {
                inView = entries[entries.length - 1].isIntersecting;
                syncLoop();
            }).observe(stage);
        }
        document.addEventListener('visibilitychange', syncLoop);
        new MutationObserver(() => {
            hovering = false;
            syncLoop();
        }).observe(landing, { attributes: true, attributeFilter: ['class', 'style'] });

        let resizeTimer = 0;
        const onResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (stage.clientWidth && Math.abs(stage.clientWidth - lastWidth) > 2) build();
            }, 120);
        };
        if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(stage);
        else window.addEventListener('resize', onResize);

        build();

        // Textures load after the page so the dome never competes with first paint
        const start = () => {
            build();
            Promise.all([loadTexture(TEXTURES.earth), loadTexture(TEXTURES.moon)])
                .then(([earth, moon]) => {
                    tex = { earth, moon };
                    clock0 = performance.now();
                    drawFrame(clock0);
                    syncLoop();
                })
                .catch(err => console.warn('Globe stage textures failed to load', err));
        };
        if (document.readyState === 'complete') start();
        else window.addEventListener('load', start, { once: true });

        root.globeStage = {
            isReady: () => ready,
            isRunning: () => running,
            currentScene: () => lastLabel,
            domeTop: () => (geo ? stage.getBoundingClientRect().top + geo.domeTopY : null)
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
})(typeof window !== 'undefined' ? window : globalThis);
