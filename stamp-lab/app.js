const labels = {
  exact_event: '同一事件',
  exact_anniversary: '同一周年',
  same_person: '同一人物',
  same_species: '同一物种',
  same_place: '同一地点',
  same_zodiac: '同年生肖',
  same_cultural_subject: '同类主题'
};

const response = await fetch('data/stamp-links.json');
if (!response.ok) throw new Error(`数据载入失败：${response.status}`);
const data = await response.json();
if (!Array.isArray(data.coins)) throw new Error('数据缺少 coins 主索引，请重新运行采集脚本');

const stampById = new Map(data.stamps.map((stamp) => [stamp.id, stamp]));
const linksByCoin = new Map(data.coins.map((coin) => [coin.id, []]));
for (const link of data.links) {
  if (!linksByCoin.has(link.coinId)) linksByCoin.set(link.coinId, []);
  linksByCoin.get(link.coinId).push({ ...link, stamp: stampById.get(link.stampId) });
}

const coins = data.coins
  .map((coin, order) => ({ ...coin, order, stamps: linksByCoin.get(coin.id) || [] }))
  .sort((a, b) => b.year - a.year || b.order - a.order);

const query = document.querySelector('#query');
const statusFilter = document.querySelector('#statusFilter');
const typeFilter = document.querySelector('#typeFilter');
const cards = document.querySelector('#cards');
const resultCount = document.querySelector('#resultCount');
const relationCount = document.querySelector('#relationCount');
const coinTemplate = document.querySelector('#coinTemplate');
const stampTemplate = document.querySelector('#stampTemplate');

for (const type of [...new Set(data.links.map((link) => link.matchType))]) {
  const option = document.createElement('option');
  option.value = type;
  option.textContent = labels[type] || type;
  typeFilter.append(option);
}

const matched = coins.filter((coin) => coin.stamps.length > 0).length;
const multiple = coins.filter((coin) => coin.stamps.length > 1).length;
document.querySelector('#stats').innerHTML = `
  <div><strong>${coins.length}</strong><span>纪念币/钞</span></div>
  <div><strong>${matched}</strong><span>已有邮票对应</span></div>
  <div><strong>${coins.length - matched}</strong><span>暂无对应</span></div>
  <div><strong>${multiple}</strong><span>对应多套邮票</span></div>
`;

function matchesStatus(coin, status) {
  if (status === 'matched') return coin.stamps.length > 0;
  if (status === 'multiple') return coin.stamps.length > 1;
  if (status === 'unmatched') return coin.stamps.length === 0;
  return true;
}

function renderStamp(link, container) {
  const stamp = link.stamp;
  const fragment = stampTemplate.content.cloneNode(true);
  const row = fragment.querySelector('.stamp-row');
  const imageLink = fragment.querySelector('.image-link');
  const image = fragment.querySelector('img');
  imageLink.href = stamp.pageUrl;
  if (stamp.preview?.localPath) {
    image.src = stamp.preview.localPath;
    image.alt = `${stamp.title}示意图`;
  } else {
    imageLink.classList.add('missing');
  }
  fragment.querySelector('.catalog').textContent = stamp.catalogNo;
  fragment.querySelector('.date').textContent = stamp.issueDate || '日期待核';
  const stampLink = fragment.querySelector('.stamp-link');
  stampLink.href = stamp.pageUrl;
  stampLink.textContent = stamp.title;
  fragment.querySelector('.badge').textContent = labels[link.matchType] || link.matchType;
  fragment.querySelector('.confidence').textContent = `${Math.round(link.confidence * 100)}%`;
  fragment.querySelector('.reason').textContent = link.reason;
  fragment.querySelector('.source-state').textContent =
    stamp.status === 'ok' ? '详情页与示意图已验证' :
    stamp.status === 'missing_preview' ? '详情页已验证，示意图缺失' :
    `采集异常：${stamp.error || '未知错误'}`;
  row.dataset.status = stamp.status;
  container.append(fragment);
}

function render() {
  const needle = query.value.trim().toLocaleLowerCase('zh-CN');
  const status = statusFilter.value;
  const type = typeFilter.value;
  const filtered = coins.filter((coin) => {
    if (!matchesStatus(coin, status)) return false;
    if (type && !coin.stamps.some((link) => link.matchType === type)) return false;
    if (!needle) return true;
    const haystack = [
      coin.id, coin.name, coin.year,
      ...coin.stamps.flatMap(({ stamp }) => [stamp?.catalogNo, stamp?.title, stamp?.issueDate])
    ].join(' ').toLocaleLowerCase('zh-CN');
    return haystack.includes(needle);
  });

  cards.replaceChildren();
  resultCount.textContent = filtered.length;
  const visibleRelations = filtered.reduce((sum, coin) => sum + coin.stamps.length, 0);
  relationCount.textContent = `· ${visibleRelations} 套邮票映射`;

  for (const coin of filtered) {
    const fragment = coinTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.coin-card');
    fragment.querySelector('.coin-id').textContent = coin.id;
    fragment.querySelector('.coin-year').textContent = coin.year;
    fragment.querySelector('.coin-name').textContent = coin.name;
    const count = fragment.querySelector('.mapping-count');
    const list = fragment.querySelector('.stamp-list');
    if (coin.stamps.length === 0) {
      card.dataset.mapping = 'none';
      count.textContent = '暂无对应邮票';
      list.innerHTML = '<div class="empty-state"><span>0</span><p>目前没有经过验证的邮票映射</p></div>';
    } else {
      card.dataset.mapping = coin.stamps.length > 1 ? 'multiple' : 'single';
      count.textContent = coin.stamps.length === 1 ? '1 套对应邮票' : `${coin.stamps.length} 套对应邮票`;
      for (const link of coin.stamps) renderStamp(link, list);
    }
    cards.append(fragment);
  }
}

query.addEventListener('input', render);
statusFilter.addEventListener('change', render);
typeFilter.addEventListener('change', render);
render();
