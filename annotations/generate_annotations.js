'use strict';

const fs = require('fs');
const path = require('path');
const { createAnnotation } = require('./annotation_generator.js');

const ROOT = path.resolve(__dirname, '..');
const COINS = JSON.parse(fs.readFileSync(path.join(ROOT, 'coin_data.json'), 'utf8'));

function validateRegion(region, context) {
  const inRange = value => Number.isFinite(value) && value >= 0 && value <= 1;
  const edgeTolerance = 0.05;
  if (region.type === 'rect') {
    const values = [region.x, region.y, region.width, region.height];
    if (!values.every(inRange) || region.width <= 0 || region.height <= 0 || region.x + region.width > 1 + edgeTolerance || region.y + region.height > 1 + edgeTolerance) {
      throw new Error(`${context} 矩形越界`);
    }
  } else if (region.type === 'ellipse') {
    const values = [region.cx, region.cy, region.rx, region.ry];
    if (!values.every(inRange) || region.rx <= 0 || region.ry <= 0 || region.cx - region.rx < -edgeTolerance || region.cy - region.ry < -edgeTolerance || region.cx + region.rx > 1 + edgeTolerance || region.cy + region.ry > 1 + edgeTolerance) {
      throw new Error(`${context} 椭圆越界`);
    }
  } else if (region.type === 'polygon') {
    if (!Array.isArray(region.points) || region.points.length < 3 || !region.points.every(point => point.length === 2 && point.every(inRange))) {
      throw new Error(`${context} 多边形越界`);
    }
  } else {
    throw new Error(`${context} 未知区域类型`);
  }
}

function validateFile(coin) {
  const file = path.join(__dirname, `${coin.id}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.id !== coin.id || data.version !== 1) throw new Error(`${coin.id} 顶层字段无效`);
  for (const face of ['f', 'b']) {
    const faceData = data.faces?.[face];
    const description = face === 'f' ? coin.description : coin.description2;
    if (!faceData || !Array.isArray(faceData.items) || !faceData.items.length) throw new Error(`${coin.id}_${face} 没有标注项`);
    if (!fs.existsSync(path.join(ROOT, faceData.image))) throw new Error(`${coin.id}_${face} 图片不存在：${faceData.image}`);
    faceData.items.forEach((item, itemIndex) => {
      if (!item.quote || !description.includes(item.quote)) throw new Error(`${coin.id}_${face} 描述中找不到标记词：${item.quote}`);
      if (!item.label?.trim()) throw new Error(`${coin.id}_${face} 标记名称为空`);
      if (!Array.isArray(item.regions) || !item.regions.length) throw new Error(`${coin.id}_${face} 标记没有区域`);
      item.regions.forEach((region, regionIndex) => validateRegion(region, `${coin.id}_${face}_${itemIndex + 1}_${regionIndex + 1}`));
    });
  }
}

const existingIds = new Set(
  fs.readdirSync(__dirname)
    .filter(name => name.endsWith('.json'))
    .map(name => path.basename(name, '.json'))
);

let generatedCount = 0;
let preservedCount = 0;
for (const coin of COINS) {
  if (existingIds.has(coin.id)) {
    preservedCount++;
    continue;
  }
  fs.writeFileSync(
    path.join(__dirname, `${coin.id}.json`),
    `${JSON.stringify(createAnnotation(coin), null, 2)}\n`
  );
  generatedCount++;
}

for (const coin of COINS) validateFile(coin);

console.log(`标注覆盖完成：${COINS.length} 枚；本次生成 ${generatedCount} 份；保留已有 ${preservedCount} 份`);
