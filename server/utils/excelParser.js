import * as XLSXModule from 'xlsx';
import { calculateQuote } from './quoteCalc.js';

const XLSX = XLSXModule.read ? XLSXModule : XLSXModule.default;

function formatMm(val) {
  const n = Number(String(val ?? '').replace(/[^\d.]/g, ''));
  return n > 0 ? Math.round(n).toLocaleString('ko-KR') : '';
}

function parsePanesFromShape(shape = '') {
  const s = String(shape).toUpperCase();
  if (s.includes('4W') || s.includes('4짝')) return 3;
  if (s.includes('3W') || s.includes('3짝')) return 3;
  if (s.includes('2W') || s.includes('2짝')) return 2;
  return 1;
}

function normalizeMesh(raw = '') {
  const s = String(raw || '').trim();
  if (!s || s === 'X' || s === '-') return '미포함';
  if (s === 'AL') return '알루미늄 방충망';
  if (s.toUpperCase().includes('STS') || s.includes('스텐')) return '블랙 STS 방충망';
  return s;
}

/**
 * Parse Official KCC Glass Window Estimate Sheet (2. 창호 상세 견적사항)
 */
function tryParseOfficialKccSheet(rawRows) {
  let detailHeaderRow = -1;
  for (let i = 0; i < Math.min(rawRows.length, 25); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const joined = row.map(c => String(c || '').replace(/\s+/g, '')).join('|');
    if (joined.includes('순번') && joined.includes('설치위치') && joined.includes('제품명') && joined.includes('모델명')) {
      detailHeaderRow = i;
      break;
    }
  }

  if (detailHeaderRow === -1) return null;

  const header = rawRows[detailHeaderRow].map(c => String(c || '').replace(/\s+/g, ''));
  const col = {
    seq: header.findIndex(h => h === '순번'),
    loc: header.findIndex(h => h.includes('설치위치')),
    product: header.findIndex(h => h.includes('제품명')),
    model: header.findIndex(h => h.includes('모델명')),
    shape: header.findIndex(h => h.includes('창형태')),
    w: header.findIndex(h => h.includes('길이(W)')),
    h: header.findIndex(h => h.includes('높이(H)')),
    glassType: header.findIndex(h => h.includes('유리종류')),
    qty: header.findIndex(h => h === '수량'),
    handle: header.findIndex(h => h.includes('잠금장치')),
    mesh: header.findIndex(h => h.includes('방충망')),
    amount: header.findIndex(h => h === '금액')
  };

  // Extract metadata if present
  let siteAddress = '';
  let kccQuoteNo = '';
  for (let i = 0; i < detailHeaderRow; i++) {
    const r = rawRows[i] || [];
    for (let c = 0; c < r.length; c++) {
      const cell = String(r[c] || '').replace(/\s+/g, '');
      if (cell === '현장주소') siteAddress = String(r[c + 2] || r[c + 1] || '').trim();
      if (cell === '창호견적번호') kccQuoteNo = String(r[c + 2] || r[c + 1] || '').trim();
    }
  }

  const items = [];
  for (let i = detailHeaderRow + 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    const seqVal = String(row[col.seq] ?? '').trim();
    if (!/^\d+$/.test(seqVal)) continue;

    const locText = String(row[col.loc] ?? '').trim();
    const prodText = String(row[col.product] ?? '').trim();
    const modelText = String(row[col.model] ?? '').trim();
    const amountRaw = String(row[col.amount] ?? '').replace(/[^\d.-]/g, '');
    const amountTotal = Math.round(Number(amountRaw) || 0);

    // Skip sub-rows (row 2 & '비고' row 3 of the same sequence number)
    if (locText === '비고' || (!prodText && !modelText && amountTotal === 0)) {
      continue;
    }
    if (amountTotal <= 0) continue;

    const nextRow = Array.isArray(rawRows[i + 1]) && String(rawRows[i + 1][col.seq] ?? '').trim() === seqVal
      ? rawRows[i + 1]
      : null;

    const qty = Math.max(1, Number(String(row[col.qty] ?? '1').replace(/[^\d.]/g, '')) || 1);
    const unitCost = Math.round(amountTotal / qty);

    const isExtra = prodText === '기타견적' || /(철거|사다리|양중|보양|몰딩|마감)/.test(modelText || locText);
    if (isExtra) {
      const extraName = modelText || locText || prodText;
      items.push({
        name: extraName,
        spec: prodText === '기타견적' ? '부대 작업' : prodText,
        category: 'extra',
        detail: { sub: '' },
        quantity: qty,
        cost_unit_price: unitCost
      });
      continue;
    }

    const wStr = formatMm(row[col.w]);
    const hStr = formatMm(row[col.h]);
    const sizeStr = wStr && hStr ? `${wStr} × ${hStr} mm` : (wStr ? `W ${wStr} mm` : '맞춤 규격');
    const shapeStr = String(row[col.shape] ?? '').trim() || '표준창';
    const inGlass = String(row[col.glassType] ?? '').replace(/^P_/, '').trim();
    const outGlass = nextRow ? String(nextRow[col.glassType] ?? '').replace(/^P_/, '').trim() : '';
    const glassStr = [inGlass, outGlass].filter(Boolean).join(' / ') || '표준 로이유리';
    const handleStr = String(row[col.handle] ?? '').trim() || '해당 없음';
    const meshStr = normalizeMesh(row[col.mesh]);
    const isUpgrade = glassStr.includes('더블로이') || meshStr.includes('STS');

    items.push({
      name: locText || prodText || `창호 ${seqVal}`,
      spec: `${prodText} · ${sizeStr}`,
      category: 'window',
      detail: {
        type: prodText || '창호',
        size: sizeStr,
        shape: shapeStr,
        model: modelText || '-',
        glass: glassStr,
        handle: handleStr === 'X' ? '해당 없음' : handleStr,
        mesh: meshStr,
        panes: parsePanesFromShape(shapeStr),
        upgrade: isUpgrade
      },
      quantity: qty,
      cost_unit_price: unitCost
    });
  }

  if (!items.length) return null;
  return { items, siteAddress, kccQuoteNo };
}

/**
 * Parse KCC Estimate Excel / CSV file buffer
 */
export function parseEstimateFile(fileBuffer, originalFilename = '') {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('엑셀 시트를 찾을 수 없습니다.');
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('빈 엑셀 파일입니다.');
  }

  // 1. Check Official KCC Glass Window Estimate Format first
  const officialParsed = tryParseOfficialKccSheet(rawRows);
  if (officialParsed) {
    const quoteCalculations = calculateQuote(officialParsed.items, 20.0);
    return {
      filename: originalFilename,
      kcc_quote_no: officialParsed.kccQuoteNo,
      site_address: officialParsed.siteAddress,
      item_count: officialParsed.items.length,
      items: quoteCalculations.items,
      total_cost: quoteCalculations.total_cost,
      sale_price: quoteCalculations.sale_price,
      vat: quoteCalculations.vat,
      total_price: quoteCalculations.total_price
    };
  }

  // 2. Standard tabular Excel / CSV header detection
  let headerRowIndex = -1;
  let colMap = { name: -1, spec: -1, qty: -1, cost: -1 };

  for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    let hasItem = false;
    let hasCost = false;

    row.forEach((cell, colIdx) => {
      const text = String(cell || '').trim().replace(/\s+/g, '');
      if (text.includes('품목') || text.includes('품명') || text.includes('내역') || text === '항목') {
        colMap.name = colIdx;
        hasItem = true;
      } else if (text.includes('규격') || text.includes('사양') || text.includes('사이즈')) {
        colMap.spec = colIdx;
      } else if (text.includes('수량') || text === 'qty' || text === 'ea') {
        colMap.qty = colIdx;
      } else if (text.includes('원가단가') || text.includes('원가') || text.includes('단가') || text.includes('공급가')) {
        colMap.cost = colIdx;
        hasCost = true;
      }
    });

    if (hasItem && (hasCost || colMap.cost !== -1)) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    colMap = { name: 0, spec: 1, qty: 2, cost: 3 };
    headerRowIndex = 0;
  }

  const parsedItems = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawName = String(row[colMap.name] || '').trim();
    if (!rawName || rawName === '합계' || rawName === '소계' || rawName === '총계' || rawName.startsWith('※')) {
      continue;
    }

    const rawSpec = colMap.spec !== -1 ? String(row[colMap.spec] || '').trim() : '';
    const rawQty = colMap.qty !== -1 ? String(row[colMap.qty] || '1').replace(/[^\d.]/g, '') : '1';
    const rawCost = colMap.cost !== -1 ? String(row[colMap.cost] || '0').replace(/[^\d.]/g, '') : '0';

    const qty = parseFloat(rawQty) || 1;
    const cost = Math.round(parseFloat(rawCost) || 0);

    if (rawName && (cost > 0 || qty > 0)) {
      parsedItems.push({
        name: rawName,
        spec: rawSpec || '표준 규격',
        quantity: qty,
        cost_unit_price: cost
      });
    }
  }

  if (parsedItems.length === 0) {
    throw new Error('유효한 견적 품목(품목명, 단가)을 추출하지 못했습니다. 파일 양식을 확인해 주세요.');
  }

  const quoteCalculations = calculateQuote(parsedItems, 20.0);

  return {
    filename: originalFilename,
    item_count: parsedItems.length,
    items: quoteCalculations.items,
    total_cost: quoteCalculations.total_cost,
    sale_price: quoteCalculations.sale_price,
    vat: quoteCalculations.vat,
    total_price: quoteCalculations.total_price
  };
}
