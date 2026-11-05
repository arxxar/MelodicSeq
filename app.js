(function () {
  'use strict';

  const W = 1000;
  const H = 600;
  const NOTE_R = 32;
  const ROUTE_R = 12;
  const GAP = 6;
  const GRID_STEP = 10;
  const PARALLEL_OFFSET = 7;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  // Ableton convention: MIDI 60 = C3
  const KEY_MAP = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72 };

  const svg = document.getElementById('pattern');
  const layerVectors = document.getElementById('layer-vectors');
  const layerTemp = document.getElementById('layer-temp');
  const layerNodes = document.getElementById('layer-nodes');
  const statusEl = document.getElementById('status');
  const pitchSelect = document.getElementById('pitch');
  const deleteBtn = document.getElementById('btn-delete');
  const startBtn = document.getElementById('btn-start-note');

  const state = { nodes: [], vectors: [], selected: null, startId: null, playingId: null, lastNoteId: null, nextId: 1 };
  let interaction = null;

  function noteName(midi) {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 2);
  }

  function nodeRadius(n) {
    if (n.type !== 'note') return ROUTE_R;
    // Diameter 100% = probability 100%, diameter 50% = probability 0%
    return NOTE_R * (0.5 + 0.5 * prob(n) / 100);
  }

  function prob(n) {
    return n.prob === undefined ? 100 : n.prob;
  }

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  function el(name, attrs, parent) {
    const e = document.createElementNS(SVG_NS, name);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function nodeById(id) {
    return state.nodes.find((n) => n.id === id);
  }

  function overlaps(x, y, r, ignoreId) {
    return state.nodes.some((n) => n.id !== ignoreId && Math.hypot(n.x - x, n.y - y) < r + nodeRadius(n) + GAP);
  }

  function inBounds(x, y, r) {
    const m = r + 4;
    return x >= m && x <= W - m && y >= m && y <= H - m;
  }

  function randomFreePosition(r) {
    const candidates = [];
    const m = r + 4;
    for (let x = m; x <= W - m; x += GRID_STEP) {
      for (let y = m; y <= H - m; y += GRID_STEP) {
        if (!overlaps(x, y, r, null)) candidates.push([x, y]);
      }
    }
    if (!candidates.length) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function addNode(type, midi, at) {
    const r = type === 'note' ? NOTE_R : ROUTE_R;
    let pos = at;
    if (pos && (overlaps(pos[0], pos[1], r, null) || !inBounds(pos[0], pos[1], r))) pos = null;
    if (!pos) pos = randomFreePosition(r);
    if (!pos) {
      setStatus(type === 'note' ? 'The pattern area is full – the note was not added.' : 'No free space for a routing circle.');
      return null;
    }
    const node = { id: state.nextId++, type, x: pos[0], y: pos[1], midi: midi };
    state.nodes.push(node);
    let linked = false;
    if (type === 'note') {
      const isFirst = !state.nodes.some((n) => n.type === 'note' && n !== node);
      if (isFirst) state.startId = node.id;
      // Default vectors to and from the active note (the selected note; falls back to the last added one)
      const sel = state.selected && state.selected.kind === 'node' ? nodeById(state.selected.id) : null;
      const activeId = sel && sel.type === 'note' ? sel.id : state.lastNoteId;
      if (activeId !== null && activeId !== node.id && nodeById(activeId)) {
        state.vectors.push({ id: state.nextId++, from: activeId, to: node.id });
        state.vectors.push({ id: state.nextId++, from: node.id, to: activeId });
        linked = true;
      }
      state.lastNoteId = node.id;
    }
    select({ kind: 'node', id: node.id });
    setStatus(type === 'note'
      ? 'Added note ' + noteName(midi) + (linked ? ' with vectors to and from the active note.' : '.') + (state.startId === node.id ? ' It is the start note.' : '')
      : 'Added routing circle.');
    return node;
  }

  function addVector(from, to) {
    if (from === to) return;
    if (state.vectors.some((v) => v.from === from && v.to === to)) {
      setStatus('That vector already exists.');
      return;
    }
    const v = { id: state.nextId++, from, to };
    state.vectors.push(v);
    select({ kind: 'vector', id: v.id });
    setStatus('Vector created.');
  }

  function select(sel) {
    state.selected = sel;
    render();
  }

  function deleteSelected() {
    const s = state.selected;
    if (!s) return;
    if (s.kind === 'node') {
      state.nodes = state.nodes.filter((n) => n.id !== s.id);
      state.vectors = state.vectors.filter((v) => v.from !== s.id && v.to !== s.id);
      if (state.startId === s.id) state.startId = null;
    } else {
      state.vectors = state.vectors.filter((v) => v.id !== s.id);
    }
    state.selected = null;
    setStatus('Deleted.');
    render();
  }

  function clearAll() {
    stopPlayback(true);
    state.nodes = [];
    state.vectors = [];
    state.selected = null;
    state.startId = null;
    state.lastNoteId = null;
    setStatus('Pattern cleared.');
    render();
  }

  function toggleStart() {
    const s = state.selected;
    const n = s && s.kind === 'node' ? nodeById(s.id) : null;
    if (!n || n.type !== 'note') return;
    if (state.startId === n.id) {
      state.startId = null;
      setStatus('Start note removed.');
    } else {
      state.startId = n.id;
      setStatus(noteName(n.midi) + ' is now the start note.');
    }
    render();
  }

  function vectorLine(v) {
    const a = nodeById(v.from);
    const b = nodeById(v.to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const hasReverse = state.vectors.some((o) => o.from === v.to && o.to === v.from);
    const off = hasReverse ? PARALLEL_OFFSET : 0;
    const nx = -uy * off;
    const ny = ux * off;
    return {
      x1: a.x + nx + ux * nodeRadius(a),
      y1: a.y + ny + uy * nodeRadius(a),
      x2: b.x + nx - ux * (nodeRadius(b) + 2),
      y2: b.y + ny - uy * (nodeRadius(b) + 2),
    };
  }

  function render() {
    layerVectors.replaceChildren();
    layerNodes.replaceChildren();

    for (const v of state.vectors) {
      const l = vectorLine(v);
      const selected = state.selected && state.selected.kind === 'vector' && state.selected.id === v.id;
      const g = el('g', { 'data-vector-id': v.id }, layerVectors);
      el('line', Object.assign({ class: 'vector' + (selected ? ' selected' : '') }, l), g);
      el('line', Object.assign({ class: 'vector-hit' }, l), g);
    }

    for (const n of state.nodes) {
      const r = nodeRadius(n);
      const selected = state.selected && state.selected.kind === 'node' && state.selected.id === n.id;
      const isStart = n.id === state.startId;
      const cls = 'node ' + n.type + (selected ? ' selected' : '') + (isStart ? ' start' : '') + (n.id === state.playingId ? ' playing' : '');
      const g = el('g', { class: cls, 'data-node-id': n.id, transform: 'translate(' + n.x + ' ' + n.y + ')' }, layerNodes);
      if (isStart) el('circle', { class: 'start-halo', r: r + 3 }, g);
      el('circle', { class: 'ring', r: r + 7, 'data-role': 'ring' }, g);
      const fill = n.type === 'note' ? 'hsl(' + (n.midi % 12) * 30 + ' 65% 62%)' : '';
      const body = el('circle', { class: 'body', r: r, 'data-role': 'body' }, g);
      if (fill) body.setAttribute('fill', fill);
      if (n.type === 'note') {
        const t = el('text', { fill: '#111' }, g);
        t.textContent = noteName(n.midi);
      }
      if (isStart) {
        const star = el('text', { class: 'start-star', y: -(r - 11) }, g);
        star.textContent = '★';
      }
    }

    deleteBtn.disabled = !state.selected;
    const sel = state.selected && state.selected.kind === 'node' ? nodeById(state.selected.id) : null;
    const canStart = !!sel && sel.type === 'note';
    startBtn.disabled = !canStart;
    startBtn.textContent = canStart && state.startId === sel.id ? '★ Unset start' : '★ Set as start';
    startBtn.title = canStart ? '' : 'Select a note first';
    probInput.disabled = !canStart;
    if (canStart && document.activeElement !== probInput) probInput.value = prob(sel);
    if (!canStart) probInput.value = '';
  }

  const probInput = document.getElementById('prob');
  probInput.addEventListener('input', () => {
    const sel = state.selected && state.selected.kind === 'node' ? nodeById(state.selected.id) : null;
    if (!sel || sel.type !== 'note' || probInput.value === '') return;
    sel.prob = clamp(Math.round(Number(probInput.value)), 0, 100);
    render();
  });

  function svgPoint(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }

  function nodeFromTarget(target) {
    const g = target.closest && target.closest('[data-node-id]');
    return g ? { node: nodeById(Number(g.dataset.nodeId)), role: target.dataset.role } : null;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const hit = nodeFromTarget(e.target);
    const vec = e.target.closest && e.target.closest('[data-vector-id]');
    if (hit && hit.node) {
      const p = svgPoint(e);
      svg.setPointerCapture(e.pointerId);
      select({ kind: 'node', id: hit.node.id });
      if (hit.role === 'ring') {
        interaction = { type: 'connect', from: hit.node.id, x: p.x, y: p.y };
        drawTemp(hit.node, p);
      } else {
        interaction = { type: 'move', id: hit.node.id, dx: hit.node.x - p.x, dy: hit.node.y - p.y };
        const g = layerNodes.querySelector('[data-node-id="' + hit.node.id + '"]');
        if (g) g.classList.add('dragging');
      }
    } else if (vec) {
      select({ kind: 'vector', id: Number(vec.dataset.vectorId) });
    } else {
      select(null);
    }
  });

  svg.addEventListener('pointermove', (e) => {
    if (!interaction) return;
    const p = svgPoint(e);
    if (interaction.type === 'move') {
      const n = nodeById(interaction.id);
      const r = nodeRadius(n);
      const m = r + 4;
      const tx = clamp(p.x + interaction.dx, m, W - m);
      const ty = clamp(p.y + interaction.dy, m, H - m);
      // Try the full move first, then slide along each axis
      if (!overlaps(tx, ty, r, n.id)) {
        n.x = tx;
        n.y = ty;
      } else if (!overlaps(tx, n.y, r, n.id)) {
        n.x = tx;
      } else if (!overlaps(n.x, ty, r, n.id)) {
        n.y = ty;
      }
      render();
      const g = layerNodes.querySelector('[data-node-id="' + n.id + '"]');
      if (g) g.classList.add('dragging');
    } else if (interaction.type === 'connect') {
      drawTemp(nodeById(interaction.from), p);
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const t = hit && nodeFromTarget(hit);
      layerNodes.querySelectorAll('.connect-target').forEach((g) => g.classList.remove('connect-target'));
      if (t && t.node && t.node.id !== interaction.from) {
        const g = layerNodes.querySelector('[data-node-id="' + t.node.id + '"]');
        if (g) g.classList.add('connect-target');
      }
    }
  });

  function endInteraction(e) {
    if (!interaction) return;
    if (interaction.type === 'connect') {
      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const t = hit && nodeFromTarget(hit);
      layerTemp.replaceChildren();
      if (t && t.node) addVector(interaction.from, t.node.id);
      else setStatus('Vector cancelled – release on another circle.');
    }
    interaction = null;
    render();
  }

  svg.addEventListener('pointerup', endInteraction);
  svg.addEventListener('pointercancel', endInteraction);

  function drawTemp(fromNode, p) {
    layerTemp.replaceChildren();
    el('line', { class: 'temp', x1: fromNode.x, y1: fromNode.y, x2: p.x, y2: p.y }, layerTemp);
  }

  svg.addEventListener('dblclick', (e) => {
    if (nodeFromTarget(e.target) || (e.target.closest && e.target.closest('[data-vector-id]'))) return;
    const p = svgPoint(e);
    addNode('route', null, [p.x, p.y]);
  });

  document.getElementById('btn-add-note').addEventListener('click', () => {
    addNode('note', Number(pitchSelect.value));
  });
  document.getElementById('btn-add-route').addEventListener('click', () => addNode('route', null));
  document.getElementById('btn-clear').addEventListener('click', clearAll);
  deleteBtn.addEventListener('click', deleteSelected);
  startBtn.addEventListener('click', toggleStart);

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      deleteSelected();
      e.preventDefault();
    } else if (!e.repeat && KEY_MAP[e.key.toLowerCase()] !== undefined) {
      addNode('note', KEY_MAP[e.key.toLowerCase()]);
    }
  });

  for (let midi = 36; midi <= 84; midi++) {
    const opt = document.createElement('option');
    opt.value = String(midi);
    opt.textContent = noteName(midi);
    if (midi === 60) opt.selected = true;
    pitchSelect.appendChild(opt);
  }

  // ---- MIDI input (Web MIDI API, MIDI 1.0 messages) ----
  const midiInputSel = document.getElementById('midi-input');
  const midiChannelSel = document.getElementById('midi-channel');
  const midiOutputSel = document.getElementById('midi-output');
  const midiOutChannelSel = document.getElementById('midi-out-channel');
  const midiStatusEl = document.getElementById('midi-status');
  const LS_INPUT = 'melodicseq.midiInput';
  const LS_CHANNEL = 'melodicseq.midiChannel';
  const LS_OUTPUT = 'melodicseq.midiOutput';
  const LS_OUT_CHANNEL = 'melodicseq.midiOutChannel';
  let midiAccess = null;
  let activeInput = null;
  let activeOutput = null;

  function setMidiStatus(text, cls) {
    midiStatusEl.textContent = 'MIDI: ' + text;
    midiStatusEl.className = 'midi-status' + (cls ? ' ' + cls : '');
  }

  function buildChannelOptions(sel, key, withOmni) {
    if (withOmni) {
      const omni = document.createElement('option');
      omni.value = 'omni';
      omni.textContent = 'Omni (all)';
      sel.appendChild(omni);
    }
    for (let c = 1; c <= 16; c++) {
      const o = document.createElement('option');
      o.value = String(c);
      o.textContent = String(c);
      sel.appendChild(o);
    }
    sel.value = localStorage.getItem(key) || (withOmni ? 'omni' : '1');
    if (!sel.value) sel.value = withOmni ? 'omni' : '1';
    sel.addEventListener('change', () => localStorage.setItem(key, sel.value));
  }

  function onMidiMessage(ev) {
    const d = ev.data;
    if (!d || d.length < 3) return;
    const status = d[0] & 0xf0;
    const channel = (d[0] & 0x0f) + 1;
    if (status !== 0x90 || d[2] === 0) return; // note-on with velocity > 0 only
    const sel = midiChannelSel.value;
    if (sel !== 'omni' && Number(sel) !== channel) return;
    addNode('note', d[1]);
  }

  function updateMidiStatus() {
    if (!midiAccess) return;
    const i = activeInput ? 'in ✓' : 'in –';
    const o = activeOutput ? 'out ✓' : 'out –';
    setMidiStatus(i + ' / ' + o, activeInput || activeOutput ? 'ok' : '');
  }

  function selectInput(id) {
    if (activeInput) activeInput.onmidimessage = null;
    activeInput = null;
    const input = midiAccess && id ? midiAccess.inputs.get(id) : null;
    if (input) {
      input.onmidimessage = onMidiMessage;
      activeInput = input;
      localStorage.setItem(LS_INPUT, id);
    }
    updateMidiStatus();
  }

  function selectOutput(id) {
    if (activeOutput && playback.running) pausePlayback();
    activeOutput = midiAccess && id ? midiAccess.outputs.get(id) || null : null;
    if (activeOutput) localStorage.setItem(LS_OUTPUT, id);
    updateMidiStatus();
  }

  function fillDevices(sel, ports, prev, autoSingle) {
    sel.replaceChildren();
    const none = document.createElement('option');
    none.value = '';
    none.textContent = '(none)';
    sel.appendChild(none);
    ports.forEach((p) => {
      const o = document.createElement('option');
      o.value = p.id;
      o.textContent = p.name;
      sel.appendChild(o);
    });
    const known = prev && ports.has(prev);
    // Auto-select the only device if nothing was remembered
    const id = known ? prev : (autoSingle && ports.size === 1 ? ports.values().next().value.id : '');
    sel.value = id;
    return id;
  }

  function refreshDevices() {
    selectInput(fillDevices(midiInputSel, midiAccess.inputs, activeInput ? activeInput.id : localStorage.getItem(LS_INPUT), true));
    selectOutput(fillDevices(midiOutputSel, midiAccess.outputs, activeOutput ? activeOutput.id : localStorage.getItem(LS_OUTPUT), false));
  }

  buildChannelOptions(midiChannelSel, LS_CHANNEL, true);
  buildChannelOptions(midiOutChannelSel, LS_OUT_CHANNEL, false);
  midiInputSel.addEventListener('change', () => selectInput(midiInputSel.value));
  midiOutputSel.addEventListener('change', () => selectOutput(midiOutputSel.value));

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: false }).then((access) => {
      midiAccess = access;
      access.onstatechange = refreshDevices;
      refreshDevices();
    }).catch(() => setMidiStatus('access denied', 'err'));
  } else {
    setMidiStatus('Web MIDI not supported', 'err');
  }

  // ---- Playback ----
  const velocityInput = document.getElementById('velocity');
  const gateInput = document.getElementById('gate');

  function velocity() {
    return Math.min(127, Math.max(1, Math.round(Number(velocityInput.value)) || 127));
  }

  function gate() {
    return Math.min(100, Math.max(10, Number(gateInput.value) || 90)) / 100;
  }
  const TICK_MS = 20;
  const AHEAD_MS = 100;
  const startPlayBtn = document.getElementById('btn-start');
  const pausePlayBtn = document.getElementById('btn-pause');
  const stopPlayBtn = document.getElementById('btn-stop');
  const bpmInput = document.getElementById('bpm');
  const timingSel = document.getElementById('timing');
  const playback = { running: false, current: null, nextTime: 0 };

  function stepMs() {
    const bpm = Math.min(300, Math.max(20, Number(bpmInput.value) || 120));
    const denom = Number(timingSel.value.split('/')[1]);
    return (60000 / bpm) * (4 / denom);
  }

  function outChannel() {
    return Number(midiOutChannelSel.value) - 1;
  }

  const sounding = new Set();

  function sendNote(on, midi) {
    if (on) sounding.add(midi);
    else sounding.delete(midi);
    if (!activeOutput) return;
    activeOutput.send([(on ? 0x90 : 0x80) | outChannel(), midi, on ? velocity() : 0]);
  }

  function silence() {
    for (const m of [...sounding]) sendNote(false, m);
    if (activeOutput) activeOutput.send([0xb0 | outChannel(), 123, 0]); // all notes off
  }

  // Every path from a note along outgoing vectors, through routing circles, to the next note circle
  function findPaths(fromId) {
    const paths = [];
    const visited = new Set([fromId]);
    function walk(id, len) {
      const a = nodeById(id);
      for (const v of state.vectors) {
        if (v.from !== id) continue;
        const b = nodeById(v.to);
        const total = len + Math.hypot(b.x - a.x, b.y - a.y);
        if (b.type === 'note') {
          paths.push({ to: b.id, length: total });
        } else if (!visited.has(b.id)) {
          visited.add(b.id);
          walk(b.id, total);
          visited.delete(b.id);
        }
      }
    }
    walk(fromId, 0);
    return paths;
  }

  // Probability of a path is proportional to 1 / length (shorter = more likely)
  function pickNext(fromId) {
    const paths = findPaths(fromId);
    if (!paths.length) return null;
    const weights = paths.map((p) => 1 / Math.max(p.length, 1));
    let r = Math.random() * weights.reduce((s, w) => s + w, 0);
    for (let i = 0; i < paths.length; i++) {
      r -= weights[i];
      if (r <= 0) return paths[i].to;
    }
    return paths[paths.length - 1].to;
  }

  function updateTransport() {
    const hasPosition = playback.current !== null;
    startPlayBtn.disabled = playback.running;
    pausePlayBtn.disabled = !playback.running;
    stopPlayBtn.disabled = !playback.running && !hasPosition;
  }

  function setPlaying(id) {
    if (state.playingId === id) return;
    state.playingId = id;
    if (!document.hidden) render();
  }

  // Timer in a Web Worker: not throttled when the tab is in the background (setTimeout is, to ~1 s)
  let tickWorker = null;
  function startTicker() {
    if (!tickWorker) {
      const src = 'let t=null;onmessage=e=>{clearInterval(t);if(e.data)t=setInterval(()=>postMessage(0),e.data)}';
      tickWorker = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
      tickWorker.onmessage = tick;
    }
    tickWorker.postMessage(TICK_MS);
  }
  function stopTicker() {
    if (tickWorker) tickWorker.postMessage(0);
  }

  // Events (highlight / end of sequence) that have to happen at a scheduled time
  let events = [];

  function tick() {
    if (!playback.running) return;
    const now = performance.now();
    while (playback.running && playback.nextTime < now + AHEAD_MS) scheduleStep();
    while (events.length && events[0].time <= now) {
      const ev = events.shift();
      if (ev.end) {
        stopPlayback(true);
        setStatus('Sequence ended: ' + ev.end + ' has no outgoing path.');
        return;
      }
      if (!ev.silent) sendNote(ev.on, ev.midi);
      if (ev.on) setPlaying(ev.id);
    }
  }

  // Creates the next events (note on/off, highlight) a little ahead of time
  function scheduleStep() {
    const node = playback.current !== null ? nodeById(playback.current) : null;
    if (!node) {
      stopPlayback(true);
      setStatus('Playback stopped: the current note no longer exists.');
      return;
    }
    const dur = stepMs();
    const t = playback.nextTime;
    // MIDI is sent when due (not with a future timestamp): drivers may ignore timestamps
    // A note that is not drawn by its probability becomes a rest; the walk continues
    const silent = Math.random() * 100 >= prob(node);
    events.push({ time: t, id: node.id, midi: node.midi, on: true, silent });
    events.push({ time: t + dur * gate(), midi: node.midi, on: false, silent });

    const next = pickNext(node.id);
    playback.nextTime += dur;
    if (next === null) {
      events.push({ time: playback.nextTime, end: noteName(node.midi) });
      playback.current = null;
      playback.nextTime = Infinity;
    } else {
      playback.current = next;
    }
    events.sort((a, b) => a.time - b.time);
  }

  function startPlayback() {
    if (playback.running) return;
    if (playback.current === null) {
      if (state.startId === null || !nodeById(state.startId)) {
        setStatus('Select a note and mark it as start before pressing Start.');
        return;
      }
      playback.current = state.startId;
    }
    if (!activeOutput) setStatus('Playing without MIDI output – choose “MIDI out” at the bottom.');
    else setStatus('Playing.');
    playback.running = true;
    playback.nextTime = performance.now() + 30;
    events = [];
    updateTransport();
    startTicker();
    tick();
  }

  function haltPlayback() {
    playback.running = false;
    stopTicker();
    events = [];
    silence();
  }

  function pausePlayback() {
    if (!playback.running) return;
    haltPlayback();
    updateTransport();
    setStatus('Paused.');
  }

  function stopPlayback(quiet) {
    haltPlayback();
    playback.current = null;
    updateTransport();
    if (state.playingId !== null) setPlaying(null);
    if (!quiet) setStatus('Stopped.');
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) render();
  });
  startPlayBtn.addEventListener('click', startPlayback);
  pausePlayBtn.addEventListener('click', pausePlayback);
  stopPlayBtn.addEventListener('click', () => stopPlayback(false));
  window.addEventListener('beforeunload', silence);
  updateTransport();

  render();
})();
