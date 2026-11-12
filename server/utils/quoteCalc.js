/**
 * KCC HomeCC Quote Calculation Utility
 *
 * Requirements:
 * - Cost = sum(quantity * cost_unit_price)
 * - Sale Price (excl. VAT) = round(Cost / (1 - margin_rate / 100))
 * - VAT = round(Sale Price * 0.1)
 * - Total Price = Sale Price + VAT
 */

function inferCategory(name = '', explicitCategory = '') {
  if (explicitCategory === 'extra' || explicitCategory === 'window') return explicitCategory;
  const n = String(name);
  if (/(철거|사다리|양중|보양|몰딩|마감|기타견적|부자재|인상|폐기물)/.test(n) && !/(창호|이중창|발코니|분합)/.test(n)) {
    return 'extra';
  }
  return 'window';
}

export function calculateQuote(items, marginRate = 20.0) {
  const margin = Number(marginRate) || 0;
  const marginRatio = margin / 100;

  if (marginRatio >= 1) {
    throw new Error('마진율은 100% 미만이어야 합니다.');
  }

  let totalCost = 0;
  const processedItems = items.map((item, index) => {
    const qty = Number(item.quantity ?? item.qty ?? 1);
    const costUnitPrice = Math.round(Number(item.cost_unit_price ?? item.costUnitPrice ?? item.price ?? 0));
    const costTotal = Math.round(qty * costUnitPrice);
    totalCost += costTotal;

    const saleUnitPrice = marginRatio < 1 && marginRatio >= 0
      ? Math.round(costUnitPrice / (1 - marginRatio))
      : costUnitPrice;
    const saleTotal = Math.round(qty * saleUnitPrice);

    const name = String(item.name || item.품목 || '').trim();
    const spec = String(item.spec || item.규격 || '').trim();
    const category = inferCategory(name, item.category);
    let detailJson = null;
    if (item.detail_json) {
      detailJson = typeof item.detail_json === 'string' ? item.detail_json : JSON.stringify(item.detail_json);
    } else if (item.detail && typeof item.detail === 'object') {
      detailJson = JSON.stringify(item.detail);
    }

    return {
      sort_order: index + 1,
      name,
      spec,
      category,
      detail_json: detailJson,
      quantity: qty,
      cost_unit_price: costUnitPrice,
      cost_total: costTotal,
      sale_unit_price: saleUnitPrice,
      sale_total: saleTotal
    };
  });

  const salePrice = marginRatio < 1 && marginRatio >= 0
    ? Math.round(totalCost / (1 - marginRatio))
    : totalCost;
  const vat = Math.round(salePrice * 0.1);
  const totalPrice = salePrice + vat;

  return {
    total_cost: totalCost,
    margin_rate: margin,
    sale_price: salePrice,
    vat: vat,
    total_price: totalPrice,
    items: processedItems
  };
}
