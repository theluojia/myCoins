(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const DRAFT_PREFIX = 'coin-annotation-draft:';
  const REVIEW_KEY = 'coin-annotation-reviewed-v1';
  const REVIEW_MIGRATION_KEY = 'coin-annotation-review-git-v1-migrated';
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '']);

  const $ = id => document.getElementById(id);
  const els = {
    app: $('editorApp'),
    localOnlyNotice: $('localOnlyNotice'),
    serverBadge: $('serverBadge'),
    coinSelect: $('coinSelect'),
    prevCoinBtn: $('prevCoinBtn'),
    nextCoinBtn: $('nextCoinBtn'),
    faceTabs: $('faceTabs'),
    dirtyBadge: $('dirtyBadge'),
    undoBtn: $('undoBtn'),
    redoBtn: $('redoBtn'),
    reloadBtn: $('reloadBtn'),
    copyBtn: $('copyBtn'),
    downloadBtn: $('downloadBtn'),
    saveBtn: $('saveBtn'),
    coinTitle: $('coinTitle'),
    coinMeta: $('coinMeta'),
    emptyState: $('emptyState'),
    stageViewport: $('stageViewport'),
    imageStage: $('imageStage'),
    coinImage: $('coinImage'),
    overlay: $('editorOverlay'),
    faceName: $('faceName'),
    faceDescription: $('faceDescription'),
    showAllRegions: $('showAllRegions'),
    overlayOpacity: $('overlayOpacity'),
    itemList: $('itemList'),
    itemEditor: $('itemEditor'),
    regionEditor: $('regionEditor'),
    quoteInput: $('quoteInput'),
    labelInput: $('labelInput'),
    addItemBtn: $('addItemBtn'),
    moveItemUpBtn: $('moveItemUpBtn'),
    moveItemDownBtn: $('moveItemDownBtn'),
    deleteItemBtn: $('deleteItemBtn'),
    regionList: $('regionList'),
    regionCounter: $('regionCounter'),
    addRegionButtons: document.querySelectorAll('[data-add-region]'),
    deleteRegionBtn: $('deleteRegionBtn'),
    reviewBtn: $('reviewBtn'),
    reviewProgress: $('reviewProgress'),
    feedbackText: $('feedbackText'),
    copyFeedbackBtn: $('copyFeedbackBtn'),
    toast: $('toast')
  };

  const state = {
    coins: [],
    coin: null,
    data: null,
    face: 'f',
    itemIndex: 0,
    regionIndex: 0,
    dirty: false,
    source: 'file',
    apiWritable: false,
    history: [],
    future: [],
    drag: null,
    reviewed: new Set(),
    reviewSaving: false,
    descriptionEditing: false,
    descriptionMutationStarted: false,
    descriptionSelection: ''
  };

  function readJsonStorage(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min = 0, max = 1) {
    return Math.min(max, Math.max(min, value));
  }

  function round(value) {
    return Number(Number(value).toFixed(4));
  }

  function toast(message, isError = false) {
    els.toast.textContent = message;
    els.toast.classList.toggle('error', isError);
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function currentFaceData() {
    return state.data?.faces?.[state.face] || null;
  }

  function currentItem() {
    return currentFaceData()?.items?.[state.itemIndex] || null;
  }

  function currentRegion() {
    return currentItem()?.regions?.[state.regionIndex] || null;
  }

  function isNote(coin = state.coin) {
    return Boolean(coin && (coin.name.includes('（钞）') || String(coin.metal).includes('钞')));
  }

  function faceLabel(face = state.face) {
    if (isNote()) return face === 'f' ? 'f · 正面' : 'b · 背面';
    return face === 'f' ? 'f · 主题面（详情反面）' : 'b · 国名面（详情正面）';
  }

  function faceDescription(face = state.face) {
    if (!state.coin) return '';
    return face === 'f' ? (state.coin.description || '') : (state.coin.description2 || '');
  }

  function setFaceDescription(value, face = state.face) {
    if (!state.coin) return;
    state.coin[face === 'f' ? 'description' : 'description2'] = value;
  }

  function filteredCoins() {
    return state.coins;
  }

  function fillCoinSelect(preferredId) {
    const coins = filteredCoins();
    els.coinSelect.innerHTML = '';
    coins.forEach(coin => {
      const option = document.createElement('option');
      option.value = coin.id;
      option.textContent = `${coin.year} · ${coin.id} · ${coin.name}${coin.subtitle ? `－${coin.subtitle}` : ''}`;
      els.coinSelect.appendChild(option);
    });
    const exists = coins.some(coin => coin.id === preferredId);
    if (exists) els.coinSelect.value = preferredId;
    return coins;
  }

  async function checkSaveService() {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      const data = response.ok ? await response.json() : null;
      state.apiWritable = Boolean(data?.annotationEditor);
    } catch (_) {
      state.apiWritable = false;
    }
    els.serverBadge.className = `badge ${state.apiWritable ? 'badge-ok' : 'badge-warn'}`;
    els.serverBadge.textContent = state.apiWritable ? '可直接保存到项目' : '只读服务：可下载 JSON';
  }

  function cacheReviewed() {
    localStorage.setItem(REVIEW_KEY, JSON.stringify([...state.reviewed].sort()));
  }

  async function persistReviewProgress() {
    if (!state.apiWritable) {
      cacheReviewed();
      return;
    }
    const response = await fetch('/api/review-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ version: 1, reviewed: [...state.reviewed].sort() })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    state.reviewed = new Set(result.reviewed || []);
    cacheReviewed();
  }

  async function loadReviewProgress() {
    const legacyReviewed = readJsonStorage(REVIEW_KEY, []);
    if (!state.apiWritable) {
      state.reviewed = new Set(legacyReviewed);
      return;
    }
    const response = await fetch(`/api/review-progress?t=${Date.now()}`, { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
    state.reviewed = new Set(result.reviewed || []);
    if (!localStorage.getItem(REVIEW_MIGRATION_KEY)) {
      legacyReviewed.forEach(entry => state.reviewed.add(entry));
      await persistReviewProgress();
      localStorage.setItem(REVIEW_MIGRATION_KEY, '1');
    } else {
      cacheReviewed();
    }
  }

  async function loadCoin(id, options = {}) {
    const coin = state.coins.find(entry => entry.id === id);
    if (!coin) return;
    state.coin = coin;
    state.data = null;
    state.history = [];
    state.future = [];
    state.dirty = false;
    state.source = 'file';
    state.itemIndex = 0;
    state.regionIndex = 0;
    state.descriptionSelection = '';
    if (!options.keepFace) state.face = 'f';
    els.coinSelect.value = coin.id;
    render();

    try {
      const response = await fetch(`annotations/${encodeURIComponent(coin.id)}.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok && response.status !== 404) throw new Error(`HTTP ${response.status}`);
      const fileData = response.ok ? await response.json() : null;
      const draft = options.ignoreDraft ? null : readJsonStorage(DRAFT_PREFIX + coin.id, null);
      if (draft?.data?.id === coin.id) {
        state.data = draft.data;
        if (draft.descriptions) {
          coin.description = draft.descriptions.description ?? coin.description;
          coin.description2 = draft.descriptions.description2 ?? coin.description2;
        }
        state.dirty = true;
        state.source = 'draft';
      } else if (fileData) {
        state.data = fileData;
      } else {
        const generator = globalThis.CoinAnnotationGenerator;
        if (!generator?.createAnnotation) throw new Error('自动标记生成器未加载');
        state.data = generator.createAnnotation(coin);
        state.dirty = true;
        state.source = 'generated';
        toast(`未找到 ${coin.id}.json，已自动生成标记初稿，请人工审核两面后保存。`);
      }
      if (!state.data.faces[state.face]) state.face = Object.keys(state.data.faces)[0];
      const params = new URLSearchParams(location.search);
      params.set('id', coin.id);
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    } catch (error) {
      state.data = null;
      toast(`加载 ${coin.id} 失败：${error.message}`, true);
    }
    render();
  }

  async function reloadCoinFromFiles() {
    const id = state.coin?.id;
    if (!id) return;
    const response = await fetch(`coin_data.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`coin_data.json HTTP ${response.status}`);
    state.coins = await response.json();
    fillCoinSelect(id);
    await loadCoin(id, { keepFace: true, ignoreDraft: true });
  }

  function render() {
    renderHeader();
    renderCanvas();
    renderInspector();
    renderReview();
    renderFeedback();
  }

  function renderHeader() {
    if (!state.coin) return;
    els.coinTitle.textContent = `${state.coin.id} · ${state.coin.name}${state.coin.subtitle ? `－${state.coin.subtitle}` : ''}`;
    els.coinMeta.textContent = `${state.coin.year}年 · ${state.coin.denomination} · ${state.coin.size}`;
    els.dirtyBadge.className = `badge ${state.dirty ? 'badge-warn' : 'badge-muted'}`;
    els.dirtyBadge.textContent = state.dirty
      ? (state.source === 'draft' ? '浏览器草稿未保存' : state.source === 'generated' ? '新币标记初稿未保存' : '已修改未保存')
      : '与项目文件一致';
    els.undoBtn.disabled = !state.history.length;
    els.redoBtn.disabled = !state.future.length;
    els.copyBtn.disabled = !state.data;
    els.downloadBtn.disabled = !state.data;
    els.saveBtn.disabled = !state.apiWritable || !state.data || !state.dirty;
    els.faceTabs.querySelectorAll('[data-face]').forEach(button => {
      button.classList.toggle('active', button.dataset.face === state.face);
      button.textContent = button.dataset.face === 'f'
        ? (isNote() ? 'f · 正面' : 'f · 主题面')
        : (isNote() ? 'b · 背面' : 'b · 国名面');
      button.disabled = !state.data?.faces?.[button.dataset.face];
    });
  }

  function renderCanvas() {
    const face = currentFaceData();
    els.emptyState.hidden = Boolean(face);
    els.stageViewport.hidden = !face;
    els.faceName.textContent = faceLabel();
    if (!state.descriptionEditing && els.faceDescription.value !== faceDescription()) {
      els.faceDescription.value = faceDescription();
    }
    els.faceDescription.disabled = !face;
    if (!face) {
      els.overlay.replaceChildren();
      return;
    }

    const imagePath = face.image;
    if (els.coinImage.getAttribute('src') !== imagePath) els.coinImage.src = imagePath;
    els.coinImage.alt = `${state.coin.name} ${faceLabel()}`;
    els.overlay.style.background = `rgba(30, 25, 18, ${els.overlayOpacity.value})`;
    els.overlay.replaceChildren();

    face.items.forEach((item, itemIndex) => {
      if (!els.showAllRegions.checked && itemIndex !== state.itemIndex) return;
      item.regions.forEach((region, regionIndex) => {
        const selected = itemIndex === state.itemIndex && regionIndex === state.regionIndex;
        const shape = createSvgShape(region);
        shape.classList.add('region-shape');
        shape.classList.add(selected ? 'selected' : (itemIndex === state.itemIndex ? 'current-item' : 'other'));
        shape.dataset.itemIndex = itemIndex;
        shape.dataset.regionIndex = regionIndex;
        shape.addEventListener('pointerdown', event => startShapeDrag(event, itemIndex, regionIndex));
        els.overlay.appendChild(shape);
        if (selected) renderHandles(region);
      });
    });
  }

  function createSvgShape(region) {
    let shape;
    if (region.type === 'ellipse') {
      shape = document.createElementNS(SVG_NS, 'ellipse');
      shape.setAttribute('cx', region.cx * 1000);
      shape.setAttribute('cy', region.cy * 1000);
      shape.setAttribute('rx', region.rx * 1000);
      shape.setAttribute('ry', region.ry * 1000);
    } else if (region.type === 'polygon') {
      shape = document.createElementNS(SVG_NS, 'polygon');
      shape.setAttribute('points', region.points.map(point => `${point[0] * 1000},${point[1] * 1000}`).join(' '));
    } else {
      shape = document.createElementNS(SVG_NS, 'rect');
      shape.setAttribute('x', region.x * 1000);
      shape.setAttribute('y', region.y * 1000);
      shape.setAttribute('width', region.width * 1000);
      shape.setAttribute('height', region.height * 1000);
    }
    return shape;
  }

  function regionBounds(region) {
    if (region.type === 'rect') return { x: region.x, y: region.y, width: region.width, height: region.height };
    if (region.type === 'ellipse') return { x: region.cx - region.rx, y: region.cy - region.ry, width: region.rx * 2, height: region.ry * 2 };
    const xs = region.points.map(point => point[0]);
    const ys = region.points.map(point => point[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }

  function setRegionBounds(region, bounds) {
    const width = clamp(bounds.width, 0.01, 1);
    const height = clamp(bounds.height, 0.01, 1);
    const x = clamp(bounds.x, 0, 1 - width);
    const y = clamp(bounds.y, 0, 1 - height);
    if (region.type === 'rect') {
      Object.assign(region, { x: round(x), y: round(y), width: round(width), height: round(height) });
    } else if (region.type === 'ellipse') {
      Object.assign(region, {
        cx: round(x + width / 2), cy: round(y + height / 2),
        rx: round(width / 2), ry: round(height / 2)
      });
    }
  }

  function renderHandles(region) {
    const bounds = regionBounds(region);
    const box = document.createElementNS(SVG_NS, 'rect');
    box.setAttribute('x', bounds.x * 1000);
    box.setAttribute('y', bounds.y * 1000);
    box.setAttribute('width', bounds.width * 1000);
    box.setAttribute('height', bounds.height * 1000);
    box.classList.add('selection-box');
    els.overlay.appendChild(box);

    if (region.type === 'polygon') {
      region.points.forEach((point, vertexIndex) => {
        const handle = makeHandle(point[0], point[1], 'vertex-handle');
        handle.addEventListener('pointerdown', event => startHandleDrag(event, 'vertex', vertexIndex));
        els.overlay.appendChild(handle);
      });
      return;
    }

    const corners = [
      ['nw', bounds.x, bounds.y],
      ['ne', bounds.x + bounds.width, bounds.y],
      ['se', bounds.x + bounds.width, bounds.y + bounds.height],
      ['sw', bounds.x, bounds.y + bounds.height]
    ];
    corners.forEach(([corner, x, y]) => {
      const handle = makeHandle(x, y, 'resize-handle');
      handle.addEventListener('pointerdown', event => startHandleDrag(event, 'resize', corner));
      els.overlay.appendChild(handle);
    });
  }

  function makeHandle(x, y, className) {
    const handle = document.createElementNS(SVG_NS, 'circle');
    handle.setAttribute('cx', x * 1000);
    handle.setAttribute('cy', y * 1000);
    handle.setAttribute('r', 10);
    handle.classList.add(className);
    return handle;
  }

  function renderInspector() {
    const face = currentFaceData();
    els.itemList.replaceChildren();
    if (!face) {
      els.itemEditor.hidden = true;
      els.regionEditor.hidden = true;
      return;
    }

    face.items.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `item-row${index === state.itemIndex ? ' active' : ''}`;
      button.innerHTML = `<span class="item-index">${index + 1}</span><span class="item-copy"><strong></strong><span></span></span>`;
      button.querySelector('strong').textContent = item.label;
      button.querySelector('.item-copy span').textContent = item.quote;
      button.addEventListener('click', () => {
        state.itemIndex = index;
        state.regionIndex = 0;
        render();
      });
      els.itemList.appendChild(button);
    });

    const item = currentItem();
    els.itemEditor.hidden = !item;
    els.regionEditor.hidden = !item;
    if (!item) return;
    els.quoteInput.value = item.quote;
    els.labelInput.value = item.label;
    els.moveItemUpBtn.disabled = state.itemIndex === 0;
    els.moveItemDownBtn.disabled = state.itemIndex === face.items.length - 1;
    els.regionList.replaceChildren();
    item.regions.forEach((region, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `region-row${index === state.regionIndex ? ' active' : ''}`;
      button.innerHTML = `<span class="region-index">${index + 1}</span><span>${regionTypeName(region.type)}</span>`;
      button.addEventListener('click', () => { state.regionIndex = index; render(); });
      els.regionList.appendChild(button);
    });
    els.regionCounter.textContent = `${state.regionIndex + 1} / ${item.regions.length}`;
    renderNumericFields();
    els.deleteRegionBtn.disabled = item.regions.length <= 1;
  }

  function regionTypeName(type) {
    return type === 'ellipse' ? '椭圆' : type === 'polygon' ? '多边形' : '矩形';
  }

  function renderNumericFields() {
    const container = document.querySelector('.numeric-grid');
    container.replaceChildren();
    const region = currentRegion();
    if (!region) return;
    const keys = region.type === 'rect'
      ? [['x', '左'], ['y', '上'], ['width', '宽'], ['height', '高']]
      : region.type === 'ellipse'
        ? [['cx', '中心X'], ['cy', '中心Y'], ['rx', '半宽'], ['ry', '半高']]
        : [];
    if (!keys.length) {
      const note = document.createElement('span');
      note.className = 'muted';
      note.textContent = `多边形共 ${region.points.length} 个顶点，请拖动图上的圆点调整。`;
      container.appendChild(note);
      return;
    }
    keys.forEach(([key, label]) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'numeric-field';
      const caption = document.createElement('span');
      caption.textContent = label;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '1';
      input.step = '0.005';
      input.value = region[key];
      input.addEventListener('change', () => {
        beginMutation();
        region[key] = round(clamp(Number(input.value)));
        normalizeRegion(region);
        markChanged();
      });
      wrapper.append(caption, input);
      container.appendChild(wrapper);
    });
  }

  function normalizeRegion(region) {
    if (region.type === 'rect') setRegionBounds(region, regionBounds(region));
    if (region.type === 'ellipse') setRegionBounds(region, regionBounds(region));
    if (region.type === 'polygon') region.points = region.points.map(point => [round(clamp(point[0])), round(clamp(point[1]))]);
  }

  function pointerPosition(event) {
    const rect = els.overlay.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height)
    };
  }

  function startShapeDrag(event, itemIndex, regionIndex) {
    event.preventDefault();
    event.stopPropagation();
    state.itemIndex = itemIndex;
    state.regionIndex = regionIndex;
    beginMutation();
    state.drag = {
      kind: 'move',
      startPoint: pointerPosition(event),
      startRegion: clone(currentRegion())
    };
    render();
  }

  function startHandleDrag(event, kind, handle) {
    event.preventDefault();
    event.stopPropagation();
    beginMutation();
    state.drag = {
      kind,
      handle,
      startPoint: pointerPosition(event),
      startRegion: clone(currentRegion())
    };
  }

  function handlePointerMove(event) {
    if (!state.drag || !currentRegion()) return;
    event.preventDefault();
    const point = pointerPosition(event);
    const dx = point.x - state.drag.startPoint.x;
    const dy = point.y - state.drag.startPoint.y;
    const region = currentRegion();
    Object.keys(region).forEach(key => delete region[key]);
    Object.assign(region, clone(state.drag.startRegion));

    if (state.drag.kind === 'move') {
      moveRegion(region, dx, dy);
    } else if (state.drag.kind === 'vertex') {
      const vertex = region.points[state.drag.handle];
      vertex[0] = round(clamp(vertex[0] + dx));
      vertex[1] = round(clamp(vertex[1] + dy));
    } else if (state.drag.kind === 'resize') {
      resizeFromCorner(region, state.drag.handle, dx, dy);
    }
    render();
  }

  function handlePointerUp() {
    if (!state.drag) return;
    state.drag = null;
    markChanged();
  }

  function moveRegion(region, dx, dy) {
    const bounds = regionBounds(region);
    const safeDx = clamp(dx, -bounds.x, 1 - bounds.x - bounds.width);
    const safeDy = clamp(dy, -bounds.y, 1 - bounds.y - bounds.height);
    if (region.type === 'rect') {
      region.x = round(region.x + safeDx);
      region.y = round(region.y + safeDy);
    } else if (region.type === 'ellipse') {
      region.cx = round(region.cx + safeDx);
      region.cy = round(region.cy + safeDy);
    } else {
      region.points = region.points.map(point => [round(point[0] + safeDx), round(point[1] + safeDy)]);
    }
  }

  function resizeFromCorner(region, corner, dx, dy) {
    const b = regionBounds(region);
    let left = b.x;
    let top = b.y;
    let right = b.x + b.width;
    let bottom = b.y + b.height;
    if (corner.includes('w')) left = clamp(left + dx, 0, right - 0.01);
    if (corner.includes('e')) right = clamp(right + dx, left + 0.01, 1);
    if (corner.includes('n')) top = clamp(top + dy, 0, bottom - 0.01);
    if (corner.includes('s')) bottom = clamp(bottom + dy, top + 0.01, 1);
    setRegionBounds(region, { x: left, y: top, width: right - left, height: bottom - top });
  }

  function scaleRegion(region, scaleX, scaleY = scaleX) {
    const b = regionBounds(region);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    const width = clamp(b.width * scaleX, 0.01, 1);
    const height = clamp(b.height * scaleY, 0.01, 1);
    if (region.type === 'polygon') {
      const target = { x: clamp(cx - width / 2, 0, 1 - width), y: clamp(cy - height / 2, 0, 1 - height), width, height };
      region.points = region.points.map(point => [
        round(target.x + ((point[0] - b.x) / (b.width || 1)) * target.width),
        round(target.y + ((point[1] - b.y) / (b.height || 1)) * target.height)
      ]);
    } else {
      setRegionBounds(region, { x: cx - width / 2, y: cy - height / 2, width, height });
    }
  }

  function beginMutation() {
    if (!state.data) return;
    state.history.push(JSON.stringify(snapshotState()));
    if (state.history.length > 60) state.history.shift();
    state.future = [];
  }

  function snapshotState() {
    return {
      data: state.data,
      descriptions: {
        description: state.coin?.description || '',
        description2: state.coin?.description2 || ''
      }
    };
  }

  function restoreSnapshot(snapshot) {
    state.data = snapshot.data;
    if (state.coin && snapshot.descriptions) {
      state.coin.description = snapshot.descriptions.description;
      state.coin.description2 = snapshot.descriptions.description2;
    }
  }

  function markChanged(shouldRender = true) {
    if (!state.data) return;
    state.dirty = true;
    state.source = 'draft';
    const reviewRemoved = state.reviewed.delete(`${state.coin.id}:${state.face}`);
    if (reviewRemoved) {
      cacheReviewed();
      persistReviewProgress().catch(error => toast(`更新审核进度失败：${error.message}`, true));
    }
    localStorage.setItem(DRAFT_PREFIX + state.coin.id, JSON.stringify({
      updatedAt: Date.now(),
      ...snapshotState()
    }));
    if (shouldRender) render();
  }

  function undo() {
    if (!state.history.length || !state.data) return;
    state.future.push(JSON.stringify(snapshotState()));
    restoreSnapshot(JSON.parse(state.history.pop()));
    normalizeSelection();
    markChanged();
  }

  function redo() {
    if (!state.future.length || !state.data) return;
    state.history.push(JSON.stringify(snapshotState()));
    restoreSnapshot(JSON.parse(state.future.pop()));
    normalizeSelection();
    markChanged();
  }

  function normalizeSelection() {
    const items = currentFaceData()?.items || [];
    if (!items.length) {
      state.itemIndex = 0;
      state.regionIndex = 0;
      return;
    }
    state.itemIndex = Math.max(0, Math.min(state.itemIndex, items.length - 1));
    const regions = items[state.itemIndex].regions || [];
    state.regionIndex = Math.max(0, Math.min(state.regionIndex, Math.max(0, regions.length - 1)));
  }

  function changeSelectedRegion(action) {
    const region = currentRegion();
    if (!region) return;
    beginMutation();
    action(region);
    normalizeRegion(region);
    markChanged();
  }

  function addRegion(type) {
    const item = currentItem();
    if (!item) return;
    beginMutation();
    const region = type === 'ellipse'
      ? { type: 'ellipse', cx: 0.5, cy: 0.5, rx: 0.18, ry: 0.14 }
      : type === 'polygon'
        ? { type: 'polygon', points: [[0.32, 0.35], [0.68, 0.35], [0.68, 0.65], [0.32, 0.65]] }
        : { type: 'rect', x: 0.32, y: 0.35, width: 0.36, height: 0.3 };
    item.regions.push(region);
    state.regionIndex = item.regions.length - 1;
    markChanged();
  }

  function addItem() {
    const face = currentFaceData();
    if (!face) return;
    const description = faceDescription();
    const quote = state.descriptionSelection.trim();
    if (!quote) {
      toast('请先在当前币面描述中选中文字，再点击“新增”。', true);
      return;
    }
    if (!description.includes(quote)) {
      toast('这段原文不在当前面的描述中，请保持完全一致。', true);
      return;
    }
    beginMutation();
    face.items.push({ quote, label: quote, regions: [{ type: 'rect', x: 0.32, y: 0.35, width: 0.36, height: 0.3 }] });
    state.itemIndex = face.items.length - 1;
    state.regionIndex = 0;
    state.descriptionSelection = '';
    markChanged();
    toast(`已新增标记“${quote}”，请调整位置和名称。`);
  }

  function captureDescriptionSelection() {
    if (!state.coin || state.descriptionEditing === false && document.activeElement !== els.faceDescription) return;
    const start = els.faceDescription.selectionStart;
    const end = els.faceDescription.selectionEnd;
    state.descriptionSelection = start !== end
      ? els.faceDescription.value.slice(start, end).trim()
      : '';
  }

  function deleteItem() {
    const face = currentFaceData();
    if (!face || !currentItem()) return;
    if (!confirm(`删除标记“${currentItem().label}”？可以使用撤销恢复。`)) return;
    beginMutation();
    face.items.splice(state.itemIndex, 1);
    state.itemIndex = Math.max(0, Math.min(state.itemIndex, face.items.length - 1));
    state.regionIndex = 0;
    markChanged();
  }

  function moveItem(offset) {
    const face = currentFaceData();
    if (!face || !currentItem()) return;
    const targetIndex = state.itemIndex + offset;
    if (targetIndex < 0 || targetIndex >= face.items.length) return;
    beginMutation();
    const [item] = face.items.splice(state.itemIndex, 1);
    face.items.splice(targetIndex, 0, item);
    state.itemIndex = targetIndex;
    markChanged();
    toast(`已将标记“${item.label}”${offset < 0 ? '上移' : '下移'}一位。`);
  }

  function validateData() {
    if (!state.data || state.data.id !== state.coin.id) return '币种编号不一致';
    for (const faceKey of ['f', 'b']) {
      const face = state.data.faces[faceKey];
      if (!face || !Array.isArray(face.items) || !face.items.length) return `${faceKey} 面没有标记`;
      const description = faceDescription(faceKey);
      for (const item of face.items) {
        if (!description.includes(item.quote)) return `${faceKey} 面描述中找不到原文：${item.quote}`;
        if (!item.label.trim()) return `${faceKey} 面存在空的位置名称`;
        if (!Array.isArray(item.regions) || !item.regions.length) return `${item.label} 没有区域`;
      }
    }
    return '';
  }

  function prettyJson() {
    return `${JSON.stringify(state.data, null, 2)}\n`;
  }

  async function saveProject() {
    const validationError = validateData();
    if (validationError) return toast(validationError, true);
    if (!state.apiWritable) {
      toast('当前服务不能写文件，请下载 JSON，或改用本地编辑服务的 8001 端口。', true);
      return;
    }
    try {
      const response = await fetch(`/api/annotations/${encodeURIComponent(state.coin.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          annotation: state.data,
          descriptions: {
            description: state.coin.description || '',
            description2: state.coin.description2 || ''
          }
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`);
      state.dirty = false;
      state.source = 'file';
      localStorage.removeItem(DRAFT_PREFIX + state.coin.id);
      render();
      toast(`${state.coin.id}.json 与 coin_data.json 已保存`);
    } catch (error) {
      toast(`保存失败：${error.message}`, true);
    }
  }

  async function copyText(text, successMessage) {
    try {
      await navigator.clipboard.writeText(text);
      toast(successMessage);
    } catch (_) {
      const helper = document.createElement('textarea');
      helper.value = text;
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
      toast(successMessage);
    }
  }

  function downloadJson() {
    if (!state.data) return;
    const blob = new Blob([prettyJson()], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${state.coin.id}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function renderReview() {
    const key = state.coin ? `${state.coin.id}:${state.face}` : '';
    const reviewed = state.reviewed.has(key);
    els.reviewBtn.classList.toggle('reviewed', reviewed);
    els.reviewBtn.textContent = reviewed ? '✓ 本面已审核（点击撤销）' : '标记本面已审核';
    els.reviewBtn.disabled = !state.data || state.dirty || state.reviewSaving;
    const visibleCoins = filteredCoins();
    const visibleIds = new Set(visibleCoins.map(coin => coin.id));
    const total = visibleCoins.length * 2;
    const done = [...state.reviewed].filter(entry => {
      const id = entry.split(':')[0];
      return visibleIds.has(id);
    }).length;
    els.reviewProgress.textContent = `审核进度：${done} / ${total} 面`;
  }

  async function toggleReview() {
    if (!state.coin || state.dirty || state.reviewSaving) return;
    const key = `${state.coin.id}:${state.face}`;
    const wasReviewed = state.reviewed.has(key);
    if (wasReviewed) state.reviewed.delete(key);
    else state.reviewed.add(key);
    state.reviewSaving = true;
    cacheReviewed();
    renderReview();
    try {
      await persistReviewProgress();
      toast(wasReviewed ? '已撤销审核，进度已写入项目' : '本面已审核，进度已写入项目');
    } catch (error) {
      if (wasReviewed) state.reviewed.add(key);
      else state.reviewed.delete(key);
      cacheReviewed();
      toast(`保存审核进度失败：${error.message}`, true);
    } finally {
      state.reviewSaving = false;
      renderReview();
    }
  }

  function renderFeedback() {
    const item = currentItem();
    const region = currentRegion();
    if (!state.coin || !item || !region) {
      els.feedbackText.value = '';
      return;
    }
    els.feedbackText.value = `${state.coin.id} / ${faceLabel()} / ${item.label} / 区域${state.regionIndex + 1}\n${JSON.stringify(region)}`;
  }

  function navigateCoin(delta) {
    const coins = filteredCoins();
    const index = coins.findIndex(coin => coin.id === state.coin?.id);
    if (index < 0) return;
    const target = coins[(index + delta + coins.length) % coins.length];
    loadCoin(target.id);
  }

  function attachEvents() {
    els.coinSelect.addEventListener('change', () => loadCoin(els.coinSelect.value));
    els.prevCoinBtn.addEventListener('click', () => navigateCoin(-1));
    els.nextCoinBtn.addEventListener('click', () => navigateCoin(1));
    els.faceTabs.addEventListener('click', event => {
      const button = event.target.closest('[data-face]');
      if (!button || button.disabled) return;
      state.face = button.dataset.face;
      state.itemIndex = 0;
      state.regionIndex = 0;
      state.descriptionSelection = '';
      render();
    });
    els.showAllRegions.addEventListener('change', renderCanvas);
    els.overlayOpacity.addEventListener('input', renderCanvas);
    els.undoBtn.addEventListener('click', undo);
    els.redoBtn.addEventListener('click', redo);
    els.reloadBtn.addEventListener('click', async () => {
      if (state.dirty && !confirm('放弃当前浏览器草稿并从项目文件重新加载？')) return;
      localStorage.removeItem(DRAFT_PREFIX + state.coin.id);
      try {
        await reloadCoinFromFiles();
        toast('标记与币面描述已从项目文件重新加载');
      } catch (error) {
        toast(`重新加载失败：${error.message}`, true);
      }
    });
    els.faceDescription.addEventListener('focus', () => {
      if (!state.data || state.descriptionEditing) return;
      state.descriptionEditing = true;
      state.descriptionMutationStarted = false;
    });
    els.faceDescription.addEventListener('input', () => {
      if (!state.data) return;
      if (!state.descriptionMutationStarted) {
        beginMutation();
        state.descriptionMutationStarted = true;
      }
      setFaceDescription(els.faceDescription.value);
      markChanged(false);
      renderHeader();
      renderReview();
    });
    els.faceDescription.addEventListener('select', captureDescriptionSelection);
    els.faceDescription.addEventListener('keyup', captureDescriptionSelection);
    els.faceDescription.addEventListener('pointerup', captureDescriptionSelection);
    els.faceDescription.addEventListener('blur', () => {
      state.descriptionEditing = false;
      state.descriptionMutationStarted = false;
      if (!faceDescription().trim()) toast('币面描述不能为空；保存前请补充内容。', true);
      render();
    });
    els.quoteInput.addEventListener('change', () => {
      if (!currentItem()) return;
      if (!faceDescription().includes(els.quoteInput.value)) {
        toast('原文必须完整出现在当前面的描述中。', true);
        els.quoteInput.value = currentItem().quote;
        return;
      }
      beginMutation();
      currentItem().quote = els.quoteInput.value;
      markChanged();
    });
    els.labelInput.addEventListener('change', () => {
      if (!currentItem() || !els.labelInput.value.trim()) return;
      beginMutation();
      currentItem().label = els.labelInput.value.trim();
      markChanged();
    });
    els.addItemBtn.addEventListener('pointerdown', captureDescriptionSelection);
    els.addItemBtn.addEventListener('click', addItem);
    els.moveItemUpBtn.addEventListener('click', () => moveItem(-1));
    els.moveItemDownBtn.addEventListener('click', () => moveItem(1));
    els.deleteItemBtn.addEventListener('click', deleteItem);
    els.addRegionButtons.forEach(button => button.addEventListener('click', () => addRegion(button.dataset.addRegion)));
    els.deleteRegionBtn.addEventListener('click', () => {
      const item = currentItem();
      if (!item || item.regions.length <= 1) return;
      beginMutation();
      item.regions.splice(state.regionIndex, 1);
      state.regionIndex = Math.min(state.regionIndex, item.regions.length - 1);
      markChanged();
    });
    els.reviewBtn.addEventListener('click', toggleReview);
    els.copyFeedbackBtn.addEventListener('click', () => copyText(els.feedbackText.value, '区域说明已复制'));
    els.copyBtn.addEventListener('click', () => state.data && copyText(prettyJson(), 'JSON 已复制'));
    els.downloadBtn.addEventListener('click', downloadJson);
    els.saveBtn.addEventListener('click', saveProject);

    document.querySelectorAll('.nudge-grid [data-nudge]').forEach(() => {});
    document.querySelector('.nudge-grid').addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !currentRegion()) return;
      const text = button.textContent;
      if (text === '左移') changeSelectedRegion(region => moveRegion(region, -0.01, 0));
      if (text === '右移') changeSelectedRegion(region => moveRegion(region, 0.01, 0));
      if (text === '上移') changeSelectedRegion(region => moveRegion(region, 0, -0.01));
      if (text === '下移') changeSelectedRegion(region => moveRegion(region, 0, 0.01));
      if (text === '缩小') changeSelectedRegion(region => scaleRegion(region, 0.95));
      if (text === '放大') changeSelectedRegion(region => scaleRegion(region, 1.05));
      if (text === '减高') changeSelectedRegion(region => scaleRegion(region, 1, 0.95));
      if (text === '加高') changeSelectedRegion(region => scaleRegion(region, 1, 1.05));
    });

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('keydown', event => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveProject();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (typing || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || !currentRegion()) return;
      event.preventDefault();
      const step = event.shiftKey ? 0.02 : 0.005;
      if (event.altKey) {
        changeSelectedRegion(region => {
          if (event.key === 'ArrowLeft') scaleRegion(region, 1 - step / Math.max(regionBounds(region).width, 0.01), 1);
          if (event.key === 'ArrowRight') scaleRegion(region, 1 + step / Math.max(regionBounds(region).width, 0.01), 1);
          if (event.key === 'ArrowUp') scaleRegion(region, 1, 1 - step / Math.max(regionBounds(region).height, 0.01));
          if (event.key === 'ArrowDown') scaleRegion(region, 1, 1 + step / Math.max(regionBounds(region).height, 0.01));
        });
      } else {
        changeSelectedRegion(region => moveRegion(
          region,
          event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0,
          event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
        ));
      }
    });
    window.addEventListener('beforeunload', event => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = '';
    });
  }

  async function init() {
    if (!LOCAL_HOSTS.has(location.hostname)) {
      els.app.hidden = true;
      els.localOnlyNotice.hidden = false;
      return;
    }
    attachEvents();
    try {
      const response = await fetch(`coin_data.json?t=${Date.now()}`, { cache: 'no-store' });
      state.coins = await response.json();
      const params = new URLSearchParams(location.search);
      const requested = params.get('id');
      const coins = fillCoinSelect(requested);
      const initial = coins.find(coin => coin.id === requested) || coins[0];
      await checkSaveService();
      await loadReviewProgress();
      if (initial) await loadCoin(initial.id);
    } catch (error) {
      toast(`初始化失败：${error.message}`, true);
    }
  }

  init();
})();
