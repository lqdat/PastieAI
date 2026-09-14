import assert from 'node:assert/strict';
import gemini from '../gemini-helper.js';

console.log('=== TEST DUAL NAME LOGIC ===');

// 1. Test splitVenueName prefix-first (traditional)
{
  const res = gemini.splitVenueName('Nhà hàng Pastie Beach');
  assert.equal(res.prefix.toLowerCase(), 'nhà hàng');
  assert.equal(res.propel, 'Pastie Beach');
  assert.equal(res.order, 'prefix_first');
  console.log('✓ splitVenueName prefix-first: "Nhà hàng Pastie Beach" -> prefix: "Nhà hàng", propel: "Pastie Beach"');
}

// 2. Test splitVenueName proper-first (swapped)
{
  const res = gemini.splitVenueName('Pastie Beach Nhà hàng');
  assert.equal(res.prefix.toLowerCase(), 'nhà hàng');
  assert.equal(res.propel, 'Pastie Beach');
  assert.equal(res.order, 'propel_first');
  console.log('✓ splitVenueName proper-first: "Pastie Beach Nhà hàng" -> prefix: "Nhà hàng", propel: "Pastie Beach"');
}

// 3. Test company acronyms & multi-word prefixes
{
  const res = gemini.splitVenueName('Công ty TNHH Pastie');
  assert.equal(res.prefix.toLowerCase(), 'công ty tnhh');
  assert.equal(res.propel, 'Pastie');
  assert.equal(res.order, 'prefix_first');
  console.log('✓ splitVenueName multi-word: "Công ty TNHH Pastie" -> prefix: "Công ty TNHH"');
}

// 4. Test no prefix
{
  const res = gemini.splitVenueName('Đan Trinh Pastie');
  assert.equal(res.prefix, '');
  assert.equal(res.propel, 'Đan Trinh Pastie');
  assert.equal(res.order, 'propel_first');
  console.log('✓ splitVenueName no prefix: "Đan Trinh Pastie" -> propel: "Đan Trinh Pastie"');
}

// 5. Test protectNames with proper product name
{
  const protectedRes = gemini.protectNames(
    'Bò bít tết Wagyu A5 sốt tiêu đen',
    ['Wagyu A5']
  );
  assert.ok(protectedRes.text.includes('ZQX0ZQX'));
  assert.ok(!protectedRes.text.includes('Wagyu A5'));
  const restored = protectedRes.restore(protectedRes.text);
  assert.equal(restored, 'Bò bít tết Wagyu A5 sốt tiêu đen');
  console.log('✓ protectNames for product brand: "Wagyu A5" is masked and safely restored');
}

console.log('ALL DUAL NAME TESTS PASSED!');
