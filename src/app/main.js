import { MAX_DIMENSION, isValidDimensions } from '../domain/pattern/PatternRules.js';
import { fillRegion } from '../domain/pattern/Pattern.js';
import { createPattern, resizePattern as resizeDomainPattern } from '../services/pattern.service.js';
import { createWeavingProgress, getStep } from '../services/weaving.service.js';
import { listPatterns, savePattern, removePattern } from '../repositories/pattern.repository.js';
import { readPatternFile } from '../services/import.service.js';
import { downloadPattern } from '../services/export.service.js';
import { renderGrid } from '../components/editor/gridCanvas.js';
import { renderPatternPreview } from '../components/pattern/patternPreview.js';
import { renderPalettePanel } from '../components/palette/palettePanel.js';
import { renderColorPicker } from '../components/palette/colorPicker.js';
import { PRESET_COLORS, hexToHsv, hsvToHex } from '../domain/pattern/ColorCatalog.js';
import { showToast } from '../components/common/toast.js';
import { createAutosave } from '../composables/useAutosave.js';
import { registerServiceWorker } from '../infrastructure/pwa/registerServiceWorker.js';
const app = document.querySelector('#app');
let patterns = [];
let current = null;
let selected = 0;
let paletteGroup = 'basics';
let paletteView = 'grid';
let paletteCollapsed = false;
let colorDraft = { name: 'Color personalizado', hue: 0, saturation: 100, brightness: 100, hex: '#FF0000' };
let tool = 'paint';
let zoom = 1;
let history = [];
let future = [];
let dirty = new Set();
let pointerDown = false;
let lastCell = -1;
let panOrigin = null;
let saveTimer;
let progressId = null;

const uid = () => crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const timestamp = () => new Date().toISOString();
function esc(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function clone(value) { return structuredClone(value); }
function makePattern(name, width, height) { return createPattern(name, width, height, uid(), timestamp()); }
function notify(message) { showToast(message); }
function status(text = 'Guardado local') { const node = document.querySelector('[data-status]'); if (node) node.textContent = text; }
const autosave = createAutosave(async pattern => { pattern.updatedAt = timestamp(); await savePattern(pattern); }, { onSaving: () => status('Guardando...'), onSaved: () => status(navigator.onLine ? 'Guardado local' : 'Sin conexion - guardado local'), onError: () => { status('No se pudo guardar'); notify('No se pudo guardar en este dispositivo. Exporta una copia.'); } });
function scheduleSave() { if (current) autosave.schedule(current); }
async function refreshList() { patterns = (await listPatterns()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); renderHome(); }
function renderHome() {
  app.innerHTML = `<main class="shell"><header class="topbar"><a class="brand" href="#" aria-label="Mostacillas, inicio"><span class="brand-mark">✳</span><span>mostacillas<small>un diseño a la vez</small></span></a><span class="connection"><i></i>${navigator.onLine ? 'En línea' : 'Sin conexión'}</span></header>
  <section class="welcome"><div><p class="eyebrow">TU TALLER CREATIVO</p><h1>Mis diseños</h1><p class="muted">Tus ideas, guardadas en este dispositivo.</p></div><button class="button primary" data-action="new">＋ Nueva manilla</button></section>
  <section class="home-actions"><button class="button secondary" data-action="import">↑ Importar diseño</button><input id="import-file" type="file" accept="application/json,.json" hidden /></section>
  ${patterns.length ? `<section class="design-grid">${patterns.map(p => { const prog = p.progress?.[0]; const pct = prog ? Math.round(prog.currentStep / Math.max(1, prog.totalSteps) * 100) : 0; return `<article class="design-card"><button class="preview" data-action="open" data-id="${p.id}" aria-label="Abrir ${esc(p.name)}"><canvas data-preview="${p.id}"></canvas></button><div class="card-info"><div><h2>${esc(p.name)}</h2><p>${p.width} × ${p.height} mostacillas</p></div><button class="icon-button" data-action="menu" data-id="${p.id}" aria-label="Acciones para ${esc(p.name)}">•••</button></div>${prog ? `<div class="card-progress"><span>Tejido · ${pct}%</span><div><i style="width:${pct}%"></i></div></div>` : `<p class="card-date">Modificado ${new Date(p.updatedAt).toLocaleDateString('es-CO')}</p>`}<div class="card-actions"><button data-action="open" data-id="${p.id}">Abrir diseño</button><button data-action="weave" data-id="${p.id}">${prog ? 'Continuar tejido' : 'Tejer'}</button></div></article>` }).join('')}</section>` : `<section class="empty-state"><div class="empty-art">✳</div><h2>Tu primera manilla empieza aquí</h2><p>Crea un diseño, elige tus colores y pinta cada mostacilla.</p><button class="button primary" data-action="new">Crear mi primera manilla</button></section>`}
  <footer>Los diseños se guardan automáticamente en tu navegador. <span data-status>Guardado local</span></footer></main><div class="toast" role="status"></div>`;
  patterns.forEach(pattern => renderPatternPreview(pattern, app));
}
function newDialog() { app.insertAdjacentHTML('beforeend', `<div class="modal-backdrop"><form class="modal" id="new-form"><button type="button" class="modal-close" data-action="close" aria-label="Cerrar">×</button><p class="eyebrow">NUEVO DISEÑO</p><h2>¿Cómo será tu manilla?</h2><label>Nombre<input name="name" value="Mi manilla" maxlength="60" required /></label><div class="dimension-fields"><label>Ancho<input name="width" type="number" value="15" min="1" max="${MAX_DIMENSION}" required /></label><label>Largo<input name="height" type="number" value="40" min="1" max="${MAX_DIMENSION}" required /></label></div><p class="hint">Hasta ${MAX_DIMENSION} × ${MAX_DIMENSION} mostacillas.</p><button class="button primary full">Crear diseño</button></form></div>`); document.querySelector('[name=name]').focus(); }
function renderEditor() {
  if (!current) return renderHome();
  app.innerHTML = `<main class="editor-shell"><header class="editor-header"><button class="back-button" data-action="home" aria-label="Volver a diseños">←</button><div class="title-block"><input class="design-title" aria-label="Nombre del diseño" value="${esc(current.name)}" maxlength="60"/><span data-status>Guardado local</span></div><div class="header-actions"><button class="button secondary compact" data-action="export">↓ Exportar</button><button class="button primary compact" data-action="weave">✳ Tejer</button></div></header>
  <div class="editor-layout"><aside class="tools-panel"><p class="panel-label">HERRAMIENTAS</p><button class="tool-button active" data-tool="paint"><span>✎</span>Pintar</button><button class="tool-button" data-tool="erase"><span>⌫</span>Borrar</button><button class="tool-button" data-tool="fill"><span>▧</span>Rellenar</button><button class="tool-button" data-tool="pan"><span>✋</span>Mover</button><div class="tool-divider"></div><button class="tool-button" data-action="undo" ${history.length ? '' : 'disabled'}><span>↶</span>Deshacer</button><button class="tool-button" data-action="redo" ${future.length ? '' : 'disabled'}><span>↷</span>Rehacer</button><div class="tool-divider"></div><div class="zoom-tools"><button data-action="zoom-out" aria-label="Alejar">−</button><span>${Math.round(zoom * 100)}%</span><button data-action="zoom-in" aria-label="Acercar">＋</button></div><button class="tool-button" data-action="fit"><span>▣</span>Ajustar</button></aside>
  <section class="canvas-area"><div class="canvas-heading"><div><p class="eyebrow">VISTA DEL PATRÓN</p><strong>${current.width} × ${current.height}</strong></div><span>Selecciona un color y toca las celdas</span><div class="mobile-zoom"><button data-action="zoom-out" aria-label="Alejar">−</button><span>${Math.round(zoom * 100)}%</span><button data-action="zoom-in" aria-label="Acercar">＋</button></div></div><div class="canvas-viewport"><canvas id="pattern-canvas" aria-label="Cuadrícula del patrón"></canvas></div><div class="canvas-foot"><span>${current.cells.filter(Boolean).length} mostacillas pintadas</span><span>${navigator.onLine ? '● En línea' : '● Sin conexión'}</span></div></section>
  ${renderPalettePanel(current, selected, paletteGroup, paletteView, MAX_DIMENSION, esc, paletteCollapsed)}</div><footer class="editor-footer">Cambios guardados automáticamente <span>·</span> funciona sin conexión</footer></main><div class="toast" role="status"></div>`;
  const activeTool = document.querySelector(`[data-tool="${tool}"]`); if (activeTool) activeTool.classList.add('active');
  setupCanvas();
}
let cellSize = 22;
function drawGrid() { renderGrid(document.querySelector('#pattern-canvas'), current, cellSize); }
function cellAt(event) { const rect = event.currentTarget.getBoundingClientRect(); const col = Math.floor((event.clientX - rect.left) * (event.currentTarget.width / rect.width) / cellSize); const row = Math.floor((event.clientY - rect.top) * (event.currentTarget.height / rect.height) / cellSize); return row >= 0 && row < current.height && col >= 0 && col < current.width ? row * current.width + col : -1; }
function applyCell(i, color) { if (i < 0 || i >= current.cells.length || current.cells[i] === color) return; history.push({ i, from: current.cells[i], to: color }); if (history.length > 5000) history.shift(); future = []; current.cells[i] = color; dirty.add(i); drawGrid(); scheduleSave(); }
function paintAt(event) { const i = cellAt(event); if (i < 0 || i === lastCell) return; lastCell = i; const color = tool === 'erase' ? 0 : current.palette[selected]?.id; if (tool === 'fill') { floodFill(i, color); pointerDown = false; return; } applyCell(i, color); }
function floodFill(start, color) { const changes = fillRegion(current.cells, current.width, current.height, start, color); if (!changes.length) return; history.push({ batch: changes }); future = []; changes.forEach(change => current.cells[change.i] = change.to); drawGrid(); scheduleSave(); renderEditor(); }
function bindCanvas() { const canvas = document.querySelector('#pattern-canvas'); if (!canvas) return; const viewport = canvas.parentElement; canvas.onpointerdown = e => { pointerDown = true; lastCell = -1; canvas.setPointerCapture(e.pointerId); if (tool === 'pan') { panOrigin = { x: e.clientX, y: e.clientY, left: viewport.scrollLeft, top: viewport.scrollTop }; return; } paintAt(e); }; canvas.onpointermove = e => { if (!pointerDown) return; if (tool === 'pan' && panOrigin) { viewport.scrollLeft = panOrigin.left - (e.clientX - panOrigin.x); viewport.scrollTop = panOrigin.top - (e.clientY - panOrigin.y); return; } paintAt(e); }; canvas.onpointerup = canvas.onpointercancel = () => { pointerDown = false; lastCell = -1; panOrigin = null; }; canvas.onwheel = e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); zoom = Math.max(.3, Math.min(2.5, zoom + (e.deltaY < 0 ? .08 : -.08))); setupCanvas(); }; }
function setupCanvas() { const canvas = document.querySelector('#pattern-canvas'); if (!canvas) return; const viewport = canvas.parentElement; const available = Math.max(260, viewport.clientWidth - 48); cellSize = Math.max(5, Math.min(34, available / current.width)) * zoom; canvas.width = Math.ceil(current.width * cellSize); canvas.height = Math.ceil(current.height * cellSize); canvas.style.width = `${canvas.width}px`; canvas.style.height = `${canvas.height}px`; drawGrid(); bindCanvas(); }
function resizePattern(width, height) { if (!isValidDimensions(width, height)) return notify('Usa dimensiones entre 1 y 500 y un maximo de 100.000 celdas.'); const removed = current.cells.some((v, i) => v && (i % current.width >= width || Math.floor(i / current.width) >= height)); if (removed && !confirm('Reducir el patron eliminara mostacillas fuera del area nueva. Continuar?')) return; current = resizeDomainPattern(current, width, height); history = []; future = []; renderEditor(); scheduleSave(); }
function undoRedo(redo = false) { const from = redo ? future : history, to = redo ? history : future; const action = from.pop(); if (!action) return; const changes = action.batch || [action]; for (const c of changes) current.cells[c.i] = redo ? c.to : c.from; to.push(action); drawGrid(); scheduleSave(); renderEditor(); }
function renderWeaving() { if (!current) return; const prog = progressId ? current.progress.find(p => p.id === progressId) : current.progress[0]; if (!prog) return setupWeaving(); const n = Math.max(0, Math.min(prog.currentStep, prog.totalSteps - 1)); const coord = weavingCoordinate(n, prog); const index = coord.row * current.width + coord.col; const bead = current.palette.find(c => c.id === current.cells[index]); const pct = Math.round(prog.currentStep / Math.max(1, prog.totalSteps) * 100); const rowStart = Math.floor(n / (prog.axis === 'row' ? current.width : current.height)) * (prog.axis === 'row' ? current.width : current.height); const rowCount = prog.axis === 'row' ? current.width : current.height; const preview = Array.from({ length: rowCount }, (_, i) => { const pos = rowStart + i; const xy = weavingCoordinate(pos, prog); const color = current.palette.find(c => c.id === current.cells[xy.row * current.width + xy.col]); return `<i style="--swatch:${color?.hex || '#f1ece8'}" class="${pos === n ? 'current-bead' : ''}"></i>`; }).join('');
  app.innerHTML = `<main class="weave-shell"><header class="weave-header"><button class="back-button" data-action="editor">←</button><span>${esc(current.name)}</span><button class="text-button" data-action="new-progress">＋ Nuevo progreso</button></header><section class="weave-content"><p class="eyebrow">MODO TEJIDO</p><h1>${prog.currentStep >= prog.totalSteps ? '¡Manilla terminada!' : `Mostacilla #${n + 1}`}</h1><p class="weave-step">${coord.row + 1} fila · ${coord.col + 1} columna</p><div class="bead-large" style="--swatch:${bead?.hex || '#f3e8d5'}">${bead ? esc(bead.name) : 'Sin color'}</div><div class="progress-label"><span>${prog.currentStep} / ${prog.totalSteps}</span><b>${pct}%</b></div><div class="progress-track"><i style="width:${pct}%"></i></div><div class="weave-strip">${preview}</div><p class="weave-hint">${prog.axis === 'row' ? 'Fila' : 'Columna'} ${Math.floor(n / rowCount) + 1} de ${prog.axis === 'row' ? current.height : current.width}</p><div class="weave-controls"><button class="button secondary" data-action="step-back" ${prog.currentStep <= 0 ? 'disabled' : ''}>← Anterior</button><button class="button primary" data-action="step-next" ${prog.currentStep >= prog.totalSteps ? 'disabled' : ''}>${prog.currentStep >= prog.totalSteps ? 'Completado ✓' : 'Colocada ✓'}</button></div><label class="jump-label">Ir al paso<input type="number" id="jump-step" min="1" max="${prog.totalSteps}" value="${Math.min(prog.currentStep + 1, prog.totalSteps)}"/><button class="button secondary" data-action="jump">Ir</button></label></section></main><div class="toast" role="status"></div>`; }
function weavingCoordinate(step, prog) { return getStep(current, prog, step); }
function setupWeaving() { app.innerHTML = `<main class="setup-shell"><header class="weave-header"><button class="back-button" data-action="editor">←</button><span>Configurar tejido</span></header><form id="weave-form" class="setup-card"><p class="eyebrow">ANTES DE EMPEZAR</p><h1>¿Cómo vas a tejer?</h1><label>Avance por<select name="axis"><option value="row">Filas (de lado a lado)</option><option value="column">Columnas (de arriba abajo)</option></select></label><label>Comenzar desde<select name="start"><option value="top">Arriba / izquierda</option><option value="bottom">Abajo</option><option value="right">Derecha</option></select></label><label class="check-label"><input type="checkbox" name="serpentine" checked/> Alternar el sentido en cada fila o columna</label><div class="setup-buttons"><button type="button" class="button secondary" data-action="editor">Volver</button><button class="button primary">Empezar tejido</button></div></form></main>`; }
function renderColors() { app.insertAdjacentHTML('beforeend', `<div class="modal-backdrop"><form id="colors-form" class="modal"><button type="button" class="modal-close" data-action="close">×</button><p class="eyebrow">PALETA</p><h2>Administrar colores</h2><div class="manage-colors">${current.palette.map((c, i) => `<div class="manage-color"><input type="color" value="${c.hex}" data-hex="${i}" aria-label="Color ${esc(c.name)}"/><input value="${esc(c.name)}" maxlength="30" data-name="${i}" aria-label="Nombre del color"/><button type="button" data-delete-color="${i}" aria-label="Eliminar ${esc(c.name)}">×</button></div>`).join('')}</div><button class="button primary full" data-action="close">Listo</button></form></div>`); }
function openColorPicker(hex = '#E84568', name = 'Color personalizado') {
  colorDraft = { name, ...hexToHsv(hex), hex: hex.toUpperCase() };
  app.insertAdjacentHTML('beforeend', renderColorPicker(colorDraft, esc));
  bindColorPicker();
  syncPickerControls();
}
function rgbToHex(r, g, b) { return `#${[r, g, b].map(value => Math.max(0, Math.min(255, Number(value) || 0)).toString(16).padStart(2, '0')).join('')}`.toUpperCase(); }
function setDraftHex(hex) {
  if (!/^#[\da-f]{6}$/i.test(hex)) return;
  colorDraft.hex = hex.toUpperCase();
  Object.assign(colorDraft, hexToHsv(colorDraft.hex));
  syncPickerControls();
}
function syncPickerControls() {
  const hexInput = document.querySelector('#color-hex');
  if (!hexInput) return;
  hexInput.value = colorDraft.hex;
  document.querySelector('#color-hue').value = Math.round(colorDraft.hue);
  document.querySelector('#color-saturation').value = Math.round(colorDraft.saturation);
  document.querySelector('#color-brightness').value = Math.round(colorDraft.brightness);
  document.querySelector('#color-saturation-value').value = `${Math.round(colorDraft.saturation)}%`;
  document.querySelector('#color-brightness-value').value = `${Math.round(colorDraft.brightness)}%`;
  document.querySelector('#color-spectrum').style.setProperty('--picker-hue', `${colorDraft.hue}deg`);
  document.querySelector('#spectrum-cursor').style.cssText = `left:${colorDraft.saturation}%;top:${100 - colorDraft.brightness}%`;
  document.querySelector('#color-preview-large').style.setProperty('--preview-color', colorDraft.hex);
  const [r, g, b] = colorDraft.hex.slice(1).match(/../g).map(value => parseInt(value, 16));
  document.querySelector('#color-red').value = r;
  document.querySelector('#color-green').value = g;
  document.querySelector('#color-blue').value = b;
}
function setSpectrumFromPointer(event) {
  const box = event.currentTarget.getBoundingClientRect();
  colorDraft.saturation = Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100));
  colorDraft.brightness = Math.max(0, Math.min(100, (1 - (event.clientY - box.top) / box.height) * 100));
  colorDraft.hex = hsvToHex(colorDraft.hue, colorDraft.saturation, colorDraft.brightness);
  syncPickerControls();
}
function bindColorPicker() {
  const spectrum = document.querySelector('#color-spectrum');
  spectrum.onpointerdown = event => { spectrum.setPointerCapture(event.pointerId); setSpectrumFromPointer(event); };
  spectrum.onpointermove = event => { if (event.buttons) setSpectrumFromPointer(event); };
  spectrum.onkeydown = event => { const step = event.shiftKey ? 10 : 2; if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return; event.preventDefault(); if (event.key === 'ArrowLeft') colorDraft.saturation = Math.max(0, colorDraft.saturation - step); if (event.key === 'ArrowRight') colorDraft.saturation = Math.min(100, colorDraft.saturation + step); if (event.key === 'ArrowDown') colorDraft.brightness = Math.max(0, colorDraft.brightness - step); if (event.key === 'ArrowUp') colorDraft.brightness = Math.min(100, colorDraft.brightness + step); colorDraft.hex = hsvToHex(colorDraft.hue, colorDraft.saturation, colorDraft.brightness); syncPickerControls(); };
  document.querySelector('#color-hue').oninput = event => { colorDraft.hue = Number(event.target.value); colorDraft.hex = hsvToHex(colorDraft.hue, colorDraft.saturation, colorDraft.brightness); syncPickerControls(); };
  document.querySelector('#color-saturation').oninput = event => { colorDraft.saturation = Number(event.target.value); colorDraft.hex = hsvToHex(colorDraft.hue, colorDraft.saturation, colorDraft.brightness); syncPickerControls(); };
  document.querySelector('#color-brightness').oninput = event => { colorDraft.brightness = Number(event.target.value); colorDraft.hex = hsvToHex(colorDraft.hue, colorDraft.saturation, colorDraft.brightness); syncPickerControls(); };
  document.querySelector('#color-hex').onchange = event => setDraftHex(event.target.value);
  for (const channel of ['red', 'green', 'blue']) document.querySelector(`#color-${channel}`).onchange = () => setDraftHex(rgbToHex(document.querySelector('#color-red').value, document.querySelector('#color-green').value, document.querySelector('#color-blue').value));
  document.querySelector('#custom-color-name').oninput = event => { colorDraft.name = event.target.value; };
  document.querySelector('#sampled-image').onpointerdown = event => {
    const canvas = event.currentTarget, rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * canvas.width / rect.width)));
    const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * canvas.height / rect.height)));
    const [r, g, b] = canvas.getContext('2d').getImageData(x, y, 1, 1).data;
    setDraftHex(rgbToHex(r, g, b));
  };
}
async function useScreenEyedropper() {
  const note = document.querySelector('#eyedropper-note');
  if (!window.EyeDropper) { note.textContent = 'Este navegador no ofrece el cuentagotas de pantalla. Usa “Tomar de imagen” para muestrear una imagen.'; return; }
  try { const result = await new EyeDropper().open(); setDraftHex(result.sRGBHex); note.textContent = `Color de pantalla seleccionado: ${result.sRGBHex}`; }
  catch (error) { if (error.name !== 'AbortError') note.textContent = 'No se pudo abrir el cuentagotas en este contexto.'; }
}
function loadImageForSampling(file) {
  if (!file?.type.startsWith('image/')) return notify('Selecciona un archivo de imagen.');
  const url = URL.createObjectURL(file), image = new Image();
  image.onload = () => {
    const canvas = document.querySelector('#sampled-image'), maxWidth = 640, maxHeight = 260;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    document.querySelector('#sampled-image-wrap').hidden = false;
    URL.revokeObjectURL(url);
  };
  image.onerror = () => { URL.revokeObjectURL(url); notify('No se pudo cargar la imagen.'); };
  image.src = url;
}
function filterPalette() {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const query = normalize(document.querySelector('#palette-search')?.value.trim() || '');
  const category = document.querySelector('#palette-category')?.value || 'Todos';
  document.querySelectorAll('.color-swatch').forEach(swatch => {
    const searchable = normalize(swatch.dataset.search || `${swatch.dataset.name} ${swatch.dataset.category}`);
    const matchesCategory = category === 'Todos' || normalize(swatch.dataset.category) === normalize(category);
    swatch.hidden = !searchable.includes(query) || !matchesCategory;
  });
}
function exportPattern(p = current) { downloadPattern(p); }
async function importFile(file) { try { const p = await readPatternFile(file); const imported = { ...clone(p), id: uid(), name: `${p.name || 'Diseño'} (importado)`, version: 1, createdAt: timestamp(), updatedAt: timestamp(), progress: [] }; await savePattern(imported); await refreshList(); notify('Diseño importado.'); } catch (error) { notify(error.message || 'No se pudo importar el archivo.'); } }
function bindEvents() {
  app.onclick = async event => { const target = event.target.closest('[data-action], [data-tool], [data-color], [data-preset], [data-delete-color]'); if (!target) return; const action = target.dataset.action; if (target.dataset.preset) { let index = current.palette.findIndex(color => color.id === target.dataset.preset); if (index < 0) { const preset = PRESET_COLORS.find(color => color.id === target.dataset.preset); if (!preset) return; current.palette.push({ ...preset }); index = current.palette.length - 1; scheduleSave(); } selected = index; renderEditor(); return; } if (target.dataset.tool) { tool = target.dataset.tool; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b === target)); return; } if (target.dataset.color != null) { selected = Number(target.dataset.color); document.querySelectorAll('[data-color]').forEach(b => b.classList.toggle('selected', b === target)); return; } if (target.dataset.deleteColor != null) { const idx = Number(target.dataset.deleteColor), color = current.palette[idx]; if (current.cells.includes(color.id) && !confirm(`Hay mostacillas ${color.name}. Al eliminar el color quedarán vacías. ¿Continuar?`)) return; current.cells = current.cells.map(v => v === color.id ? 0 : v); current.palette.splice(idx, 1); selected = 0; renderColors(); scheduleSave(); return; }
    if (action === 'new') newDialog(); else if (action === 'close') { target.closest('.modal-backdrop')?.remove(); } else if (action === 'home') { current = null; history = []; future = []; refreshList(); } else if (action === 'open') openPattern(target.dataset.id); else if (action === 'menu') { const p = patterns.find(x => x.id === target.dataset.id); const choice = prompt(`Acciones para ${p.name}: escribe duplicar, renombrar, exportar o eliminar`); if (choice === 'duplicar') { const copy = clone(p); copy.id = uid(); copy.name += ' (copia)'; copy.createdAt = copy.updatedAt = timestamp(); copy.progress = []; await savePattern(copy); await refreshList(); } else if (choice === 'renombrar') { const name = prompt('Nuevo nombre', p.name); if (name?.trim()) { p.name = name.trim(); p.updatedAt = timestamp(); await savePattern(p); await refreshList(); } } else if (choice === 'exportar') exportPattern(p); else if (choice === 'eliminar' && confirm(`¿Eliminar “${p.name}” y sus progresos?`)) { await removePattern(p.id); await refreshList(); } }
    else if (action === 'import') document.querySelector('#import-file').click(); else if (action === 'export') exportPattern(); else if (action === 'undo') undoRedo(); else if (action === 'redo') undoRedo(true); else if (action === 'zoom-in' || action === 'zoom-out') { zoom = Math.max(.3, Math.min(2.5, zoom + (action === 'zoom-in' ? .15 : -.15))); setupCanvas(); } else if (action === 'fit') { zoom = 1; setupCanvas(); } else if (action === 'resize') resizePattern(Number(document.querySelector('#resize-width').value), Number(document.querySelector('#resize-height').value)); else if (action === 'select-color') openColorPicker(); else if (action === 'eyedropper') useScreenEyedropper(); else if (action === 'sample-image') document.querySelector('#sample-image-file').click(); else if (action === 'palette-group') { paletteGroup = target.dataset.group; renderEditor(); } else if (action === 'palette-collapse') { paletteCollapsed = !paletteCollapsed; const panel = document.querySelector('.palette-panel'); panel?.classList.toggle('is-collapsed', paletteCollapsed); target.setAttribute('aria-expanded', String(!paletteCollapsed)); target.setAttribute('aria-label', `${paletteCollapsed ? 'Expandir' : 'Contraer'} paleta`); target.title = `${paletteCollapsed ? 'Expandir' : 'Contraer'} paleta`; target.textContent = paletteCollapsed ? '⌃' : '⌄'; } else if (action === 'palette-view') { paletteView = target.dataset.view; document.querySelector('.palette-swatches').className = `palette-swatches ${paletteView}`; document.querySelectorAll('[data-action="palette-view"]').forEach(button => button.classList.toggle('active', button.dataset.view === paletteView)); } else if (action === 'add-color') openColorPicker(); else if (action === 'edit-colors') renderColors(); else if (action === 'weave') { progressId = current.progress?.[0]?.id || null; progressId ? renderWeaving() : setupWeaving(); } else if (action === 'editor') renderEditor(); else if (action === 'step-next') { const p = findProgress(); p.currentStep = Math.min(p.totalSteps, p.currentStep + 1); scheduleSave(); renderWeaving(); } else if (action === 'step-back') { const p = findProgress(); p.currentStep = Math.max(0, p.currentStep - 1); scheduleSave(); renderWeaving(); } else if (action === 'jump') { const p = findProgress(); p.currentStep = Math.max(0, Math.min(p.totalSteps, Number(document.querySelector('#jump-step').value) - 1)); scheduleSave(); renderWeaving(); } else if (action === 'new-progress') setupWeaving();
  };
  app.oninput = event => { if (event.target.id === 'palette-search') filterPalette(); if (event.target.matches('.design-title')) { current.name = event.target.value || 'Mi manilla'; scheduleSave(); } if (event.target.dataset.name != null) { const c = current.palette[Number(event.target.dataset.name)]; c.name = event.target.value; scheduleSave(); } if (event.target.dataset.hex != null) { current.palette[Number(event.target.dataset.hex)].hex = event.target.value; drawGrid(); scheduleSave(); } };
  app.onchange = event => { if (event.target.id === 'palette-category') filterPalette(); if (event.target.id === 'sample-image-file' && event.target.files[0]) loadImageForSampling(event.target.files[0]); if (event.target.id === 'import-file' && event.target.files[0]) importFile(event.target.files[0]); if (event.target.matches('[data-name], [data-hex]')) renderEditor(); };
  app.onsubmit = async event => { if (event.target.id === 'color-form') { event.preventDefault(); const name = colorDraft.name.trim() || 'Color personalizado'; current.palette.push({ id: uid(), name, hex: colorDraft.hex, source: 'custom' }); selected = current.palette.length - 1; paletteGroup = 'custom'; renderEditor(); scheduleSave(); } if (event.target.id === 'new-form') { event.preventDefault(); const fd = new FormData(event.target), w = Number(fd.get('width')), h = Number(fd.get('height')); if (w * h > 100000) return notify('El tamaño máximo del patrón es 100.000 celdas.'); current = makePattern(fd.get('name'), w, h); await savePattern(current); history = []; future = []; selected = 0; tool = 'paint'; zoom = 1; renderEditor(); } if (event.target.id === 'weave-form') { event.preventDefault(); const fd = new FormData(event.target); const axis = fd.get('axis'); const p = createWeavingProgress(current, { axis, start: fd.get('start'), serpentine: fd.has('serpentine') }, uid(), timestamp()); current.progress ||= []; current.progress.push(p); progressId = p.id; scheduleSave(); renderWeaving(); } if (event.target.id === 'colors-form') event.preventDefault(); };
}
function findProgress() { return current.progress.find(p => p.id === progressId) || current.progress[0]; }
function addColor() { const name = prompt('Nombre del color', 'Nuevo color'); if (!name?.trim()) return; const hex = prompt('Color hexadecimal', '#d9a7b0'); if (!/^#[\da-f]{6}$/i.test(hex || '')) return notify('Usa un color hexadecimal como #d9a7b0.'); current.palette.push({ id: uid(), name: name.trim(), hex }); selected = current.palette.length - 1; renderEditor(); scheduleSave(); }
function openPattern(id) { current = patterns.find(p => p.id === id); if (!current) return; history = []; future = []; selected = 0; tool = 'paint'; zoom = 1; renderEditor(); }
function installShortcuts() { document.addEventListener('keydown', e => { if (!current || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return; if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undoRedo(e.shiftKey); } else if (e.key.toLowerCase() === 'p') { tool = 'paint'; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool)); } else if (e.key.toLowerCase() === 'e') { tool = 'erase'; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool)); } else if (e.key.toLowerCase() === 'f') { tool = 'fill'; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool)); } else if (e.key.toLowerCase() === 'h') { tool = 'pan'; document.querySelectorAll('[data-tool]').forEach(b => b.classList.toggle('active', b.dataset.tool === tool)); } else if (e.key === '+' || e.key === '=') { zoom = Math.min(2.5, zoom + .15); setupCanvas(); } else if (e.key === '-') { zoom = Math.max(.3, zoom - .15); setupCanvas(); } }); }
window.addEventListener('online', () => { const n = document.querySelector('.connection'); if (n) n.innerHTML = '<i></i>En línea'; }); window.addEventListener('offline', () => { const n = document.querySelector('.connection'); if (n) n.innerHTML = '<i></i>Sin conexión'; }); window.addEventListener('resize', () => { if (current && document.querySelector('#pattern-canvas')) setupCanvas(); });
if ('storage' in navigator && navigator.storage.persist) navigator.storage.persist().catch(() => {});
registerServiceWorker();
bindEvents(); installShortcuts(); listPatterns().then(list => { patterns = list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)); renderHome(); }).catch(() => { app.innerHTML = '<main class="empty-state"><h1>No se pudo abrir el almacenamiento local</h1><p>Abre esta aplicación desde un servidor local o un navegador compatible con IndexedDB.</p></main>'; });

