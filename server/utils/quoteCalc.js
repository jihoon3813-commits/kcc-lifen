/**
 * KCC HomeCC Quote Calculation Utility
 *
 * Pricing & Rounding Rules:
 * - Each item's raw cost (cost_total) in KCC Excel is VAT-excluded (부가세 별도).
 * - Per-item margin_rate defaults to 100% (100% = ×1.0, 120% = ×1.2).
 * - Customer-facing item amount (sale_total, VAT-excluded) truncates the 10-won place
 *   (10원단위 절삭 -> clean 100원 units: Math.floor(raw / 100) * 100).
 * - Subtotals (VAT-excluded, truncated):
 *     * material_subtotal (자재 총액): sum of items NOT marked as 기타견적/기타
 *     * extra_subtotal (기타견적): sum of items marked as 기타견적/기타
 * - sale_price = material_subtotal + extra_subtotal (절삭 공급가 합계, VAT 별도)
 * - vat = Math.round(sale_price * 0.1)
 * - original_price = sale_price + vat (절삭 기준 부가세 포함 총액, 할인 전)
 * - total_price = Math.max(0, original_price - discount_amount) (일시불 할인 반영 최종 합계)
 * - supply_cost (공급원가, VAT 포함) = exact Excel 금액 총계 (발주 기준) or total_cost + round(total_cost * 0.1)
 * - margin_amount (마진금액) = total_price - supply_cost
 */

export function trunc10(amount) {
  const num = Number(amount) || 0;
  if (num <= 0) return 0;
  // Integer-safe rounding to nearest cent before flooring 10-won unit
  const roundedWon = Math.floor(Math.round(num * 100) / 100);
  return Math.floor(roundedWon / 100) * 100;
}

export function inferCategory(name = '', explicitCategory = '', excelProduct = '') {
  const prod = String(excelProduct || '').replace(/\s+/g, '');
  if (prod === '기타견적' || prod === '기타') return 'extra';
  if (prod) return 'window';

  if (explicitCategory === 'extra') return 'extra';
  if (explicitCategory === 'window' || explicitCategory === 'material') return 'window';

  const n = String(name || '').trim();
  if (n === '기타견적' || n === '기타') return 'extra';
  if (/(철거|사다리|양중|보양|몰딩|마감|기타견적|폐기물)/.test(n) && !/(창호|이중창|발코니|분합|통바|공틀)/.test(n)) {
    return 'extra';
  }
  return 'window';
}

export function calculateQuote(items = [], optionsOrMargin = 100) {
  let defaultMarginRate = 100;
  let discountAmount = 0;
  let excelGrandTotal = 0;
  let excelSubtotal = 0;

  if (optionsOrMargin && typeof optionsOrMargin === 'object') {
    if (optionsOrMargin.defaultMarginRate !== undefined && optionsOrMargin.defaultMarginRate !== null) {
      defaultMarginRate = Number(optionsOrMargin.defaultMarginRate);
    } else if (optionsOrMargin.marginRate !== undefined && optionsOrMargin.marginRate !== null) {
      defaultMarginRate = Number(optionsOrMargin.marginRate);
    }
    discountAmount = Math.max(0, Math.round(Number(optionsOrMargin.discountAmount ?? optionsOrMargin.discount_amount ?? 0) || 0));
    excelGrandTotal = Math.max(0, Math.round(Number(optionsOrMargin.supplyCost ?? optionsOrMargin.excelGrandTotal ?? 0) || 0));
    excelSubtotal = Math.max(0, Math.round(Number(optionsOrMargin.excelSubtotal ?? 0) || 0));
  } else if (optionsOrMargin !== undefined && optionsOrMargin !== null && optionsOrMargin !== '') {
    defaultMarginRate = Number(optionsOrMargin);
  }

  if (!Number.isFinite(defaultMarginRate) || defaultMarginRate <= 0) {
    defaultMarginRate = 100;
  }

  let totalCost = 0;
  let materialSubtotal = 0;
  let extraSubtotal = 0;

  const processedItems = items.map((item, index) => {
    const qtyRaw = Number(item.quantity ?? item.qty ?? 1);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 1;

    let costTotal = 0;
    let costUnitPrice = 0;
    const hasExactCostTotal =
      item.cost_total !== undefined &&
      item.cost_total !== null &&
      item.cost_total !== '' &&
      !item._recalcFromUnit;

    if (hasExactCostTotal) {
      costTotal = Math.max(0, Math.round(Number(item.cost_total) || 0));
      costUnitPrice = qty > 0 ? Math.round(costTotal / qty) : costTotal;
    } else {
      costUnitPrice = Math.max(0, Math.round(Number(item.cost_unit_price ?? item.costUnitPrice ?? item.price ?? 0) || 0));
      costTotal = Math.max(0, Math.round(qty * costUnitPrice));
    }

    totalCost += costTotal;

    const rawItemMargin =
      item.margin_rate !== undefined && item.margin_rate !== null && item.margin_rate !== ''
        ? Number(item.margin_rate)
        : item.margin !== undefined && item.margin !== null && item.margin !== ''
        ? Number(item.margin)
        : defaultMarginRate;
    const itemMarginRate = Number.isFinite(rawItemMargin) && rawItemMargin >= 0 ? rawItemMargin : defaultMarginRate;

    // Multiply in integer-safe arithmetic and truncate 10-won place (10원단위 절삭)
    const rawSaleTotal = (costTotal * Math.round(itemMarginRate * 100)) / 10000;
    const saleTotal = trunc10(rawSaleTotal);
    const saleUnitPrice = qty > 0 ? Math.round(saleTotal / qty) : saleTotal;

    const name = String(item.name || item.품목 || '').trim() || `항목 ${index + 1}`;
    const spec = String(item.spec || item.규격 || '').trim();

    let parsedDetail = null;
    if (item.detail && typeof item.detail === 'object') {
      parsedDetail = item.detail;
    } else if (item.detail_json) {
      try {
        parsedDetail = typeof item.detail_json === 'string' ? JSON.parse(item.detail_json) : item.detail_json;
      } catch {
        parsedDetail = null;
      }
    }

    const excelProd = item.excel_product || parsedDetail?.excel_product || '';
    const category = inferCategory(name, item.category, excelProd);

    if (category === 'extra') {
      extraSubtotal += saleTotal;
    } else {
      materialSubtotal += saleTotal;
    }

    const detailJson = parsedDetail
      ? JSON.stringify(parsedDetail)
      : typeof item.detail_json === 'string'
      ? item.detail_json
      : null;

    return {
      sort_order: index + 1,
      name,
      spec,
      category,
      detail_json: detailJson,
      detail: parsedDetail || undefined,
      quantity: qty,
      margin_rate: itemMarginRate,
      cost_unit_price: costUnitPrice,
      cost_total: costTotal,
      sale_unit_price: saleUnitPrice,
      sale_total: saleTotal
    };
  });

  const salePrice = materialSubtotal + extraSubtotal;
  const vat = Math.round(salePrice * 0.1);
  const originalPrice = salePrice + vat;
  const totalPrice = Math.max(0, originalPrice - discountAmount);

  let supplyCost = 0;
  if (excelGrandTotal > 0) {
    if (excelSubtotal > 0 && totalCost !== excelSubtotal) {
      supplyCost = Math.max(0, excelGrandTotal + Math.round((totalCost - excelSubtotal) * 1.1));
    } else {
      supplyCost = excelGrandTotal;
    }
  } else {
    supplyCost = totalCost + Math.round(totalCost * 0.1);
  }

  const marginAmount = totalPrice - supplyCost;
  const marginAmountExclVat = salePrice - totalCost;

  return {
    total_cost: totalCost,
    supply_cost: supplyCost,
    margin_rate: defaultMarginRate,
    material_subtotal: materialSubtotal,
    extra_subtotal: extraSubtotal,
    sale_price: salePrice,
    vat,
    original_price: originalPrice,
    discount_amount: discountAmount,
    total_price: totalPrice,
    margin_amount: marginAmount,
    margin_amount_excl_vat: marginAmountExclVat,
    items: processedItems
  };
}
