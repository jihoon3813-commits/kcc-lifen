import { db } from '../server/db/index.js';

const CORRECT_FIELDS = {
  date: {
    key: 'date',
    label: '날짜',
    page: 1,
    x: 58.0,
    y: 78.5,
    w: 32.0,
    h: 3.6,
    fontSize: 14,
    color: '#1a202c',
    align: 'center',
    format: 'YYYY년 MM월 DD일',
    enabled: true
  },
  name: {
    key: 'name',
    label: '성명',
    page: 1,
    x: 62.0,
    y: 83.2,
    w: 16.0,
    h: 3.6,
    fontSize: 15,
    color: '#1a202c',
    align: 'center',
    fontWeight: 'bold',
    enabled: true
  },
  signature: {
    key: 'signature',
    label: '서명',
    page: 1,
    x: 78.5,
    y: 81.2,
    w: 16.0,
    h: 6.8,
    color: '#1a202c',
    enabled: true
  },
  birthDate: {
    key: 'birthDate',
    label: '생년월일',
    page: 1,
    x: 18.0,
    y: 83.2,
    w: 28.0,
    h: 3.6,
    fontSize: 14,
    color: '#1a202c',
    align: 'center',
    format: 'YYYY-MM-DD',
    enabled: true
  },
  phone: {
    key: 'phone',
    label: '연락처',
    page: 1,
    x: 18.0,
    y: 87.5,
    w: 28.0,
    h: 3.6,
    fontSize: 14,
    color: '#1a202c',
    align: 'center',
    enabled: true
  }
};

const row = db.prepare("SELECT id, fields_config FROM consent_forms WHERE id = 'rental_privacy'").get();
if (row) {
  let existing = {};
  if (row.fields_config) {
    try {
      existing = JSON.parse(row.fields_config);
    } catch (e) {}
  }

  // Preserve user-configured x, y, w, h, page, fontSize if valid, but fix label and format
  const merged = {};
  for (const [k, def] of Object.entries(CORRECT_FIELDS)) {
    const ex = existing[k] || {};
    merged[k] = {
      ...def,
      ...ex,
      label: def.label, // Force correct Korean label!
      format: def.format,
      page: parseInt(ex.page, 10) || def.page || 1,
      x: typeof ex.x === 'number' ? ex.x : def.x,
      y: typeof ex.y === 'number' ? ex.y : def.y,
      w: typeof ex.w === 'number' ? ex.w : def.w,
      h: typeof ex.h === 'number' ? ex.h : def.h,
    };
  }

  const jsonStr = JSON.stringify(merged);
  db.prepare("UPDATE consent_forms SET fields_config = ? WHERE id = 'rental_privacy'").run(jsonStr);
  console.log('Successfully updated fields_config for rental_privacy:');
  console.log(JSON.stringify(merged, null, 2));
} else {
  console.log('rental_privacy not found!');
}
