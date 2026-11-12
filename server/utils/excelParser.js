import * as XLSXModule from 'xlsx';
import { calculateQuote } from './quoteCalc.js';

const XLSX = XLSXModule.read ? XLSXModule : XLSXModule.default;

function formatMm(val) {
  const s = String(val ?? '').trim();
  if (!s || s === 'X' || s === '-') return '';
  const n = Number(s.replace(/[^\d.-]/g, ''));
  return n > 0 ? Math.round(n).toLocaleString('ko-KR') : '';
}

function cleanVal(val) {
  const s = String(val ?? '').trim();
  if (!s || s === 'X' || s === '-') return '';
  return s;
}

function formatExcelDateOrText(val) {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number' && val > 35000 && val < 80000 && XLSX?.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(val);
    if (d && d.y && d.m && d.d) {
      return `${String(d.y).padStart(4, '0')}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  return String(val).trim();
}

function parsePanesFromShape(shape = '') {
  const s = String(shape).toUpperCase();
  if (s.includes('4W') || s.includes('4짝')) return 4;
  if (s.includes('3W') || s.includes('3짝')) return 3;
  if (s.includes('2W') || s.includes('2짝')) return 2;
  return 1;
}

function normalizeMesh(raw = '') {
  const s = String(raw || '').trim();
  if (!s || s === 'X' || s === '-') return '미포함';
  if (s === 'AL') return '알루미늄 방충망 (AL)';
  if (s.toUpperCase().includes('STS') || s.includes('스텐')) return '블랙 STS 방충망';
  return s;
}

function normalizeDrain(raw = '') {
  const s = String(raw || '').trim().toUpperCase();
  if (!s || s === 'X' || s === '-') return '미적용';
  if (s === 'O') return '적용 (O)';
  return raw;
}

function formatGlassLayer(thickRaw, typeRaw) {
  const thick = cleanVal(thickRaw).replace(/T$/i, '');
  const type = cleanVal(typeRaw).replace(/^P_/, '');
  if (!thick && !type) return '';
  if (thick && type) {
    if (type.toUpperCase().startsWith(`${thick}T`)) return type;
    return `${thick}T ${type}`;
  }
  return thick ? `${thick}T` : type;
}

function findNextNonEmpty(row, startIdx, endIdx) {
  const max = Math.min(row.length - 1, endIdx);
  for (let idx = startIdx; idx <= max; idx++) {
    const v = row[idx];
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return v;
    }
  }
  return '';
}

/**
 * Parse Official KCC Glass Window Estimate Sheet
 * (1. 기본정보 + 2. 창호 상세 견적사항 + 3. 기타 현장 특이사항)
 */
function tryParseOfficialKccSheet(rawRows) {
  let detailHeaderRow = -1;
  for (let i = 0; i < Math.min(rawRows.length, 30); i++) {
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
  const findCol = (pred, fallback) => {
    const idx = header.findIndex(pred);
    return idx !== -1 ? idx : fallback;
  };

  const col = {
    seq: findCol(h => h === '순번', 1),
    loc: findCol(h => h.includes('설치위치'), 2),
    product: findCol(h => h.includes('제품명'), 3),
    model: findCol(h => h.includes('모델명'), 4),
    shape: findCol(h => h.includes('창형태'), 5),
    w: findCol(h => h.includes('길이(W)'), 6),
    w2: 7, // H열: 길이(W2)
    h: findCol(h => h.includes('높이(H)'), 8),
    h2: 9, // J열: 높이(H2)
    wrap: findCol(h => h.includes('랩핑'), 10),
    glassThick: findCol(h => h.includes('유리두께'), 11),
    glassType: findCol(h => h.includes('유리종류'), 12),
    qty: findCol(h => h === '수량', 13),
    handle: findCol(h => h.includes('잠금장치'), 14),
    opt1: findCol(h => h.includes('옵션1'), 15),
    opt2: findCol(h => h.includes('옵션2'), 16),
    mesh: findCol(h => h.includes('방충망'), 17),
    drain: findCol(h => h.includes('배수홀'), 18),
    amount: findCol(h => h === '금액', 19)
  };

  // 1. Extract Section 1 (기본정보)
  const meta = {
    doc_title: '',
    kcc_quote_no: '',
    quote_date: '',
    valid_period: '',
    build_scheduled_date: '',
    recipient: '',
    site_address: '',
    excel_grand_total: 0,
    construction_included: '',
    supplier_name: '',
    supplier_biz_no: '',
    supplier_ceo: '',
    supplier_address: '',
    supplier_manager: '',
    supplier_phone: '',
    excel_subtotal: 0,
    excel_vat: 0,
    site_notes: ''
  };

  for (let i = 0; i < detailHeaderRow; i++) {
    const r = rawRows[i] || [];
    for (let c = 0; c < r.length; c++) {
      const rawCell = String(r[c] ?? '').trim();
      if (!rawCell) continue;
      const key = rawCell.replace(/\s+/g, '');

      if (key === '견적서' && !meta.doc_title) {
        meta.doc_title = 'KCC 창호 견적서';
      } else if (key === '창호견적번호') {
        meta.kcc_quote_no = String(findNextNonEmpty(r, c + 1, c + 3)).trim();
      } else if (key === '최종견적일') {
        meta.quote_date = formatExcelDateOrText(findNextNonEmpty(r, c + 1, c + 3));
      } else if (key === '견적유효기간') {
        meta.valid_period = String(findNextNonEmpty(r, c + 1, c + 2)).trim();
      } else if (key === '시공예정일') {
        const parts = [];
        for (let k = c + 1; k <= Math.min(r.length - 1, c + 6); k++) {
          const t = String(r[k] ?? '').trim();
          if (t) parts.push(t);
        }
        const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
        if (joined && joined !== '년 월 일') {
          meta.build_scheduled_date = joined;
        }
      } else if (key === '공급받는자') {
        meta.recipient = String(findNextNonEmpty(r, c + 1, c + 4)).trim();
      } else if (key === '공급자') {
        meta.supplier_name = String(findNextNonEmpty(r, c + 1, c + 2)).trim();
      } else if (key === '사업자번호') {
        meta.supplier_biz_no = String(findNextNonEmpty(r, c + 1, c + 5)).trim();
      } else if (key === '현장주소') {
        meta.site_address = String(findNextNonEmpty(r, c + 1, c + 6)).trim();
      } else if (key === '대표자') {
        meta.supplier_ceo = String(findNextNonEmpty(r, c + 1, c + 2)).trim();
      } else if (key === '주소' && c >= 11) {
        meta.supplier_address = String(findNextNonEmpty(r, c + 1, c + 6)).trim();
      } else if (key === '금액총계') {
        const amtRaw = String(findNextNonEmpty(r, c + 1, c + 3)).replace(/[^\d.-]/g, '');
        meta.excel_grand_total = Math.max(0, Math.round(Number(amtRaw) || 0));
      } else if (key === '시공유/무' || key === '시공유무') {
        const inc = String(findNextNonEmpty(r, c + 1, c + 3)).trim();
        meta.construction_included = inc === 'O' ? '포함 (O)' : inc === 'X' ? '미포함 (X)' : inc;
      } else if (key === '담당자') {
        meta.supplier_manager = String(findNextNonEmpty(r, c + 1, c + 2)).trim();
      } else if (key === '연락처') {
        meta.supplier_phone = String(findNextNonEmpty(r, c + 1, c + 5)).trim();
      }
    }
  }

  // 2. Parse Section 2 (창호 상세 견적사항) + Footer Totals + Section 3 (기타 현장 특이사항)
  const items = [];
  let inSiteNotesSection = false;
  const siteNoteLines = [];

  for (let i = detailHeaderRow + 2; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    // Check bottom summary rows (계 / 부가세) & Section 3 header
    for (let c = 0; c < row.length; c++) {
      const cellStr = String(row[c] ?? '').trim();
      const compact = cellStr.replace(/\s+/g, '');
      if (compact === '계' && col.amount < row.length) {
        const subRaw = String(row[col.amount] ?? '').replace(/[^\d.-]/g, '');
        const subVal = Math.round(Number(subRaw) || 0);
        if (subVal > 0) meta.excel_subtotal = subVal;
      } else if (compact === '부가세' && col.amount < row.length) {
        const vatRaw = String(row[col.amount] ?? '').replace(/[^\d.-]/g, '');
        const vatVal = Math.round(Number(vatRaw) || 0);
        if (vatVal > 0) meta.excel_vat = vatVal;
      }
      if (compact.includes('3.기타현장특이사항') || compact.includes('기타현장특이사항')) {
        inSiteNotesSection = true;
      }
    }

    if (inSiteNotesSection) {
      const lineParts = row
        .map(v => String(v ?? '').trim())
        .filter(v => v && !v.replace(/\s+/g, '').includes('기타현장특이사항') && v !== '계' && v !== '부가세' && !/^\d+$/.test(v));
      if (lineParts.length > 0) {
        siteNoteLines.push(lineParts.join(' '));
      }
      continue;
    }

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

    // 3행 구조 파싱 (row: 1행 메인 / row2: 2행 세부스펙 / row3: 3행 비고·단열·최종계산일)
    const row2 = Array.isArray(rawRows[i + 1]) && String(rawRows[i + 1][col.seq] ?? '').trim() === seqVal
      ? rawRows[i + 1]
      : null;
    const row3 = Array.isArray(rawRows[i + 2]) && String(rawRows[i + 2][col.seq] ?? '').trim() === seqVal
      ? rawRows[i + 2]
      : null;

    const qty = Math.max(1, Number(String(row[col.qty] ?? '1').replace(/[^\d.]/g, '')) || 1);
    const unitCost = Math.round(amountTotal / qty);

    // K열 단열 감지 (Row 3 K열 또는 Row 1~3 전체 K열에서 '단열' 여부 확인)
    const k3Val = row3 ? cleanVal(row3[col.wrap]) : '';
    const isInsulation = k3Val.includes('단열') ||
      cleanVal(row[col.wrap]).includes('단열') ||
      (row2 ? cleanVal(row2[col.wrap]).includes('단열') : false);
    const insulationLabel = isInsulation ? '단열' : (k3Val || '');

    // Extract remark & calcDate from row 3 (설치위치 == '비고')
    let remark = '';
    let calcDate = '';
    let handleHeight = '';
    if (row3) {
      const remarkParts = [];
      for (let rc = col.model; rc <= Math.min(row3.length - 1, col.h + 1); rc++) {
        const rv = cleanVal(row3[rc]);
        if (rv && rv !== '0' && rv !== '최종계산일') remarkParts.push(rv);
      }
      remark = remarkParts.join(' ').trim();
      calcDate = formatExcelDateOrText(row3[col.glassType] || row3[col.glassThick + 1]);
      
      // O열 잠금장치 높이 (row 2 또는 row 3)
      const hHeightNum3 = Number(String(row3[col.handle] ?? '').replace(/[^\d.]/g, '')) || 0;
      if (hHeightNum3 > 0) {
        handleHeight = `${hHeightNum3}mm`;
      }
    }
    if (!handleHeight && row2) {
      const hHeightNum2 = Number(String(row2[col.handle] ?? '').replace(/[^\d.]/g, '')) || 0;
      if (hHeightNum2 > 0) {
        handleHeight = `${hHeightNum2}mm`;
      }
    }

    // Strict D-column (제품명) classification per user requirement:
    // - 기타견적: D열에 기타견적(또는 기타)로 표시된 항목
    // - 자재: D열에 기타견적을 제외한 나머지 모든 항목 (통바/공틀 포함)
    const prodCompact = prodText.replace(/\s+/g, '');
    const isExtra = prodCompact === '기타견적' || prodCompact === '기타';

    if (isExtra) {
      const extraName = modelText || locText || prodText;
      const extraSpec = remark || (locText ? `${prodText} · ${locText}` : `기타견적 · 수량 ${qty}식`);
      items.push({
        name: extraName,
        spec: extraSpec,
        category: 'extra',
        excel_product: prodText,
        detail: {
          seq: Number(seqVal),
          excel_product: prodText,
          product_name: prodText || '기타견적',
          model_name: modelText || extraName,
          location: locText || '',
          type: prodText || '기타견적',
          model: modelText || extraName,
          sub: remark || (qty > 1 ? `수량 ${qty}식` : ''),
          remark,
          is_insulation: false,
          insulation: '',
          calc_date: calcDate,
          quantity: qty,
          amount_raw: amountTotal
        },
        quantity: qty,
        margin_rate: 100,
        cost_unit_price: unitCost,
        cost_total: amountTotal
      });
      continue;
    }

    // 창호 세부 17개 항목 정밀 추출
    const wVal = cleanVal(row[col.w]);
    const hVal = cleanVal(row[col.h]);
    const wStr = formatMm(wVal);
    const hStr = formatMm(hVal);
    const sizeStr = wStr && hStr
      ? `${wStr} × ${hStr} mm`
      : wStr
      ? `W ${wStr} mm`
      : hStr
      ? `H ${hStr} mm`
      : '맞춤 규격';

    const w1Val = row2 ? cleanVal(row2[col.w]) : '';
    const w2Val = row2 ? cleanVal(row2[col.w2]) : '';
    const h1Val = row2 ? cleanVal(row2[col.h]) : '';
    const h2Val = row2 ? cleanVal(row2[col.h2]) : '';
    const w1Str = formatMm(w1Val);
    const w2Str = formatMm(w2Val);
    const h1Str = formatMm(h1Val);
    const h2Str = formatMm(h2Val);
    const subSizeParts = [];
    if (w1Str) subSizeParts.push(`W1 ${w1Str}`);
    if (w2Str) subSizeParts.push(`W2 ${w2Str}`);
    if (h1Str) subSizeParts.push(`H1 ${h1Str}`);
    if (h2Str) subSizeParts.push(`H2 ${h2Str}`);
    const subSizeStr = subSizeParts.join(' · ');

    const shapeRaw = cleanVal(row[col.shape]);
    const openDirRaw = row2 ? cleanVal(row2[col.shape]) : '';
    const shapeStr = shapeRaw || (prodText.includes('통바') || prodText.includes('공틀') ? '통바 시공용' : '표준창');
    const openDirStr = openDirRaw === 'N' ? '양개/고정(N)' : openDirRaw ? `${openDirRaw}측 개폐` : '';

    const wrapIn = cleanVal(row[col.wrap]);
    const wrapOut = row2 ? cleanVal(row2[col.wrap]) : '';
    const wrapStr = [wrapIn ? `내부 ${wrapIn}` : '', wrapOut ? `외부 ${wrapOut}` : ''].filter(Boolean).join(' / ');

    const glassThickIn = cleanVal(row[col.glassThick]).replace(/T$/i, '');
    const glassThickOut = row2 ? cleanVal(row2[col.glassThick]).replace(/T$/i, '') : '';
    const glassTypeIn = cleanVal(row[col.glassType]).replace(/^P_/, '');
    const glassTypeOut = row2 ? cleanVal(row2[col.glassType]).replace(/^P_/, '') : '';

    const glassIn = formatGlassLayer(row[col.glassThick], row[col.glassType]);
    const glassOut = row2 ? formatGlassLayer(row2[col.glassThick], row2[col.glassType]) : '';
    const glassStr = glassIn && glassOut
      ? `내창 ${glassIn} / 외창 ${glassOut}`
      : glassIn || glassOut || '해당 없음';

    const handleRaw = cleanVal(row[col.handle]);
    const handleStr = handleRaw
      ? handleHeight
        ? `${handleRaw} (높이 ${handleHeight})`
        : handleRaw
      : '해당 없음';

    const opt1 = cleanVal(row[col.opt1]);
    const opt2 = cleanVal(row[col.opt2]);
    const optionsStr = [opt1 && opt1 !== 'X' ? opt1 : '', opt2 && opt2 !== 'X' ? opt2 : ''].filter(Boolean).join(', ');
    const meshStr = normalizeMesh(row[col.mesh]);
    const drainStr = normalizeDrain(row[col.drain]);
    const isUpgrade = isInsulation || glassStr.includes('더블로이') || meshStr.includes('STS');

    // Item display name: 설치위치 우선 (예: '거실 발코니', '후면방 통바')
    const displayName = locText || modelText || prodText || `자재 ${seqVal}`;

    // Rich spec string for quick preview
    const specParts = [
      prodText,
      sizeStr !== '맞춤 규격' ? sizeStr : modelText,
      glassStr !== '해당 없음' ? glassStr : '',
      wrapStr ? `랩핑 ${wrapStr}` : '',
      handleStr !== '해당 없음' ? handleStr : '',
      isInsulation ? '[단열]' : ''
    ].filter(Boolean);
    const displaySpec = specParts.join(' · ');

    items.push({
      name: displayName,
      spec: displaySpec,
      category: 'window',
      excel_product: prodText,
      detail: {
        seq: Number(seqVal),
        excel_product: prodText,
        product_name: prodText || '창호',
        location: locText || '',
        type: prodText || '창호',
        model_name: modelText || '-',
        model: modelText || '-',
        shape: shapeStr,
        open_dir: openDirStr,
        w: wStr || wVal,
        w1: w1Str || w1Val,
        w2: w2Str || w2Val,
        h: hStr || hVal,
        h1: h1Str || h1Val,
        h2: h2Str || h2Val,
        size: sizeStr,
        sub_size: subSizeStr,
        wrap_in: wrapIn,
        wrap_out: wrapOut,
        wrap: wrapStr,
        is_insulation: isInsulation,
        insulation: insulationLabel,
        glass_thick_in: glassThickIn,
        glass_thick_out: glassThickOut,
        glass_type_in: glassTypeIn,
        glass_type_out: glassTypeOut,
        glass_in: glassIn,
        glass_out: glassOut,
        glass: glassStr,
        quantity: qty,
        handle: handleStr,
        handle_raw: handleRaw,
        handle_height: handleHeight,
        opt1: opt1 || 'X',
        opt2: opt2 || 'X',
        options: optionsStr || '미적용',
        mesh: meshStr,
        drain: drainStr,
        amount_raw: amountTotal,
        calc_date: calcDate,
        remark: remark || '',
        panes: parsePanesFromShape(shapeStr),
        upgrade: isUpgrade
      },
      quantity: qty,
      margin_rate: 100,
      cost_unit_price: unitCost,
      cost_total: amountTotal
    });
  }

  if (!items.length) return null;

  meta.site_notes = siteNoteLines.join('\n').trim();
  if (!meta.excel_grand_total && meta.excel_subtotal > 0) {
    meta.excel_grand_total = meta.excel_subtotal + (meta.excel_vat || Math.round(meta.excel_subtotal * 0.1));
  }

  return { items, meta };
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
  const sheetRange = sheet['!ref'] ? XLSX.utils.decode_range(sheet['!ref']) : null;
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: '',
    ...(sheetRange ? { range: { s: { r: 0, c: 0 }, e: sheetRange.e } } : {})
  });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('빈 엑셀 파일입니다.');
  }

  // 1. Check Official KCC Glass Window Estimate Format first
  const officialParsed = tryParseOfficialKccSheet(rawRows);
  if (officialParsed) {
    const { meta } = officialParsed;
    const quoteCalculations = calculateQuote(officialParsed.items, {
      defaultMarginRate: 100,
      discountAmount: 0,
      supplyCost: meta.excel_grand_total,
      excelSubtotal: meta.excel_subtotal
    });

    return {
      filename: originalFilename,
      format: 'kcc_official',
      kcc_quote_no: meta.kcc_quote_no,
      site_address: meta.site_address,
      meta,
      item_count: quoteCalculations.items.length,
      items: quoteCalculations.items,
      total_cost: quoteCalculations.total_cost,
      supply_cost: quoteCalculations.supply_cost,
      margin_rate: quoteCalculations.margin_rate,
      material_subtotal: quoteCalculations.material_subtotal,
      extra_subtotal: quoteCalculations.extra_subtotal,
      sale_price: quoteCalculations.sale_price,
      vat: quoteCalculations.vat,
      original_price: quoteCalculations.original_price,
      discount_amount: quoteCalculations.discount_amount,
      total_price: quoteCalculations.total_price,
      margin_amount: quoteCalculations.margin_amount
    };
  }

  // 2. Standard tabular Excel / CSV header detection
  let headerRowIndex = -1;
  let colMap = { name: -1, spec: -1, category: -1, qty: -1, cost: -1 };

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
      } else if (text.includes('제품명') || text === '구분' || text === '분류') {
        colMap.category = colIdx;
      } else if (text.includes('규격') || text.includes('사양') || text.includes('사이즈')) {
        colMap.spec = colIdx;
      } else if (text.includes('수량') || text === 'qty' || text === 'ea') {
        colMap.qty = colIdx;
      } else if (
        text.includes('원가단가') ||
        text.includes('원가') ||
        text.includes('단가') ||
        text.includes('공급가') ||
        text === '금액'
      ) {
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
    colMap = { name: 0, spec: 1, category: -1, qty: 2, cost: 3 };
    headerRowIndex = 0;
  }

  const parsedItems = [];
  for (let i = headerRowIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0) continue;

    const rawName = String(row[colMap.name] || '').trim();
    if (!rawName || rawName === '합계' || rawName === '소계' || rawName === '총계' || rawName === '계' || rawName.startsWith('※')) {
      continue;
    }

    const rawSpec = colMap.spec !== -1 ? String(row[colMap.spec] || '').trim() : '';
    const rawCat = colMap.category !== -1 ? String(row[colMap.category] || '').trim() : '';
    const rawQty = colMap.qty !== -1 ? String(row[colMap.qty] || '1').replace(/[^\d.]/g, '') : '1';
    const rawCost = colMap.cost !== -1 ? String(row[colMap.cost] || '0').replace(/[^\d.]/g, '') : '0';

    const qty = parseFloat(rawQty) || 1;
    const cost = Math.round(parseFloat(rawCost) || 0);

    if (rawName && (cost > 0 || qty > 0)) {
      parsedItems.push({
        name: rawName,
        spec: rawSpec || '표준 규격',
        excel_product: rawCat,
        quantity: qty,
        margin_rate: 100,
        cost_unit_price: cost,
        cost_total: Math.round(qty * cost)
      });
    }
  }

  if (parsedItems.length === 0) {
    throw new Error('유효한 견적 품목(품목명, 단가)을 추출하지 못했습니다. 파일 양식을 확인해 주세요.');
  }

  const quoteCalculations = calculateQuote(parsedItems, {
    defaultMarginRate: 100,
    discountAmount: 0
  });

  return {
    filename: originalFilename,
    format: 'tabular',
    meta: null,
    item_count: quoteCalculations.items.length,
    items: quoteCalculations.items,
    total_cost: quoteCalculations.total_cost,
    supply_cost: quoteCalculations.supply_cost,
    margin_rate: quoteCalculations.margin_rate,
    material_subtotal: quoteCalculations.material_subtotal,
    extra_subtotal: quoteCalculations.extra_subtotal,
    sale_price: quoteCalculations.sale_price,
    vat: quoteCalculations.vat,
    original_price: quoteCalculations.original_price,
    discount_amount: quoteCalculations.discount_amount,
    total_price: quoteCalculations.total_price,
    margin_amount: quoteCalculations.margin_amount
  };
}
