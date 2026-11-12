import express from 'express';
import { db } from '../db/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id ASC').all();
  res.json({
    products: products.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      category: p.category,
      desc: p.price_text || '',
      url: p.url,
      icon: p.category === '창호' ? 'window' : (p.category === '주방' ? 'kitchen' : 'bath'),
      color: p.category === '창호' ? '#edf3f9' : (p.category === '주방' ? '#f4f1ec' : '#edf4f1'),
      views: db.prepare('SELECT COUNT(*) as cnt FROM landing_events WHERE product_name = ?').get(p.name)?.cnt || 0,
      active: !!p.url
    }))
  });
});

router.post('/', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { name, category, desc, url } = req.body;
  if (!name || !category) return res.status(400).json({ error: '상품명과 카테고리는 필수입니다.' });

  const code = `PROD_${Date.now()}`;
  db.prepare(`
    INSERT INTO products (name, code, price_text, category, url)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, code, desc || '', category, url || '');

  res.status(201).json({ message: '상품이 등록되었습니다.' });
});

router.patch('/:id', requireAuth, requireRole('hq_admin'), (req, res) => {
  const { name, category, desc, url } = req.body;
  db.prepare(`
    UPDATE products
    SET name = coalesce(?, name),
        category = coalesce(?, category),
        price_text = coalesce(?, price_text),
        url = coalesce(?, url)
    WHERE id = ?
  `).run(name, category, desc, url, req.params.id);

  res.json({ message: '상품이 수정되었습니다.' });
});

export default router;
