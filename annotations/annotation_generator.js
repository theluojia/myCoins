(function exposeAnnotationGenerator(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.CoinAnnotationGenerator = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createGeneratorApi() {
  'use strict';

  const rect = (x, y, width, height) => ({ type: 'rect', x, y, width, height });
  const ellipse = (cx, cy, rx, ry) => ({ type: 'ellipse', cx, cy, rx, ry });

  function isNote(coin) {
    return String(coin.name || '').includes('（钞）') || String(coin.metal || '').includes('钞');
  }

  function splitDescription(description) {
    const seen = new Set();
    const parts = String(description || '')
      .replace(/\s+/g, ' ')
      .replaceAll('蒙、藏、维、壮', '蒙§藏§维§壮')
      .split(/[，,。；;、]/)
      .map(part => part.replaceAll('§', '、'))
      .map(part => part.trim())
      .filter(Boolean)
      .filter(part => !/^(寓意|表达了|象征)/.test(part));
    return parts.filter(part => {
      if (seen.has(part)) return false;
      seen.add(part);
      return true;
    });
  }

  function makeLabel(quote) {
    const cleaned = quote
      .replace(/^(票面)?(左上角|右上角|左下角|右下角|左上方|右上方|左下方|右下方|左侧|右侧|上方|下方|内缘[^为刊]*)(自上而下分别)?为?/, '')
      .replace(/^(并刊|并有|刊|辅以|衬以|背景为|主景图案为|图案为)/, '')
      .replace(/^(其上方|其下方|其中)为?/, '')
      .trim();
    return cleaned || quote;
  }

  function explicitPosition(quote) {
    if (/左上角|左上方/.test(quote)) return rect(0.04, 0.06, 0.32, 0.23);
    if (/右上角|右上方/.test(quote)) return rect(0.64, 0.06, 0.32, 0.23);
    if (/左下角|左下方/.test(quote)) return rect(0.04, 0.69, 0.34, 0.23);
    if (/右下角|右下方/.test(quote)) return rect(0.62, 0.69, 0.34, 0.23);
    if (/左侧/.test(quote)) return rect(0.04, 0.24, 0.34, 0.52);
    if (/右侧/.test(quote)) return rect(0.62, 0.24, 0.34, 0.52);
    if (/上方/.test(quote)) return rect(0.2, 0.06, 0.6, 0.23);
    if (/下方/.test(quote)) return rect(0.2, 0.72, 0.6, 0.2);
    return null;
  }

  function regionFor(quote, index, coin, face, positionHint = '') {
    const positioned = explicitPosition(`${positionHint}${quote}`);
    if (positioned) return positioned;

    const note = isNote(coin);
    if (/国名|行名|中国人民银行.*汉语/.test(quote)) return rect(0.12, 0.06, 0.76, 0.2);
    if (/国徽/.test(quote)) return ellipse(0.5, 0.4, 0.22, 0.24);
    if (/年号|19\d{2}|20\d{2}/.test(quote) && quote.length < 38) return rect(0.36, 0.81, 0.28, 0.11);
    if (/面额|面值|壹圆|拾圆|贰拾圆|壹佰圆|YIYUAN|SHIYUAN|YUAN/.test(quote)) {
      return rect(note ? 0.7 : 0.34, note ? 0.7 : 0.73, note ? 0.25 : 0.32, note ? 0.2 : 0.16);
    }
    if (/字样|纪念|周年|第\d+届/.test(quote) && quote.length < 42) {
      return rect(0.12, face === 'f' ? 0.08 : 0.76, 0.76, 0.14);
    }

    const roundSubject = /头像|人物|儿童|男孩|女孩|运动员|福娃|猴|鸡|狗|猪|鼠|牛|兔|虎|蛇|马|羊|龙|熊猫|羚羊|长臂猿|东北豹|孔雀雉|和平鸽|花|太阳|地球|国徽|党徽|会徽/.test(quote);
    const noteSlots = [
      rect(0.25, 0.18, 0.5, 0.58), rect(0.05, 0.25, 0.38, 0.48),
      rect(0.57, 0.25, 0.38, 0.48), rect(0.2, 0.48, 0.6, 0.32),
      rect(0.2, 0.08, 0.6, 0.28)
    ];
    const coinSlots = [
      rect(0.16, 0.2, 0.68, 0.5), rect(0.08, 0.25, 0.42, 0.42),
      rect(0.5, 0.25, 0.42, 0.42), rect(0.18, 0.48, 0.64, 0.3),
      rect(0.22, 0.14, 0.56, 0.3)
    ];
    const slot = (note ? noteSlots : coinSlots)[index % 5];
    if (!roundSubject) return slot;
    return ellipse(slot.x + slot.width / 2, slot.y + slot.height / 2, slot.width / 2, slot.height / 2);
  }

  function makeFace(coin, face) {
    const description = face === 'f' ? coin.description : coin.description2;
    const quotes = splitDescription(description);
    if (!quotes.length) throw new Error(`${coin.id}_${face} 描述无法生成标记`);
    let searchFrom = 0;
    return {
      image: `coins/img/${coin.id}_${face}.webp`,
      items: quotes.map((quote, index) => {
        const quoteIndex = description.indexOf(quote, searchFrom);
        if (quoteIndex >= 0) searchFrom = quoteIndex + quote.length;
        const clauseStart = Math.max(
          description.lastIndexOf('。', quoteIndex),
          description.lastIndexOf('；', quoteIndex),
          description.lastIndexOf(';', quoteIndex)
        );
        const prefix = description.slice(clauseStart + 1, Math.max(clauseStart + 1, quoteIndex));
        const hints = prefix.match(/左上角|右上角|左下角|右下角|左上方|右上方|左下方|右下方|左侧|右侧|上方|下方/g);
        return {
          quote,
          label: makeLabel(quote),
          regions: [regionFor(quote, index, coin, face, hints?.at(-1) || '')]
        };
      })
    };
  }

  function createAnnotation(coin) {
    if (!coin || !coin.id) throw new Error('缺少币种编号');
    return {
      id: coin.id,
      version: 1,
      faces: {
        f: makeFace(coin, 'f'),
        b: makeFace(coin, 'b')
      }
    };
  }

  return { createAnnotation };
});
