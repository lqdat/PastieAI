# -*- coding: utf-8 -*-
# BÓC ẢNH TỪNG MÓN TỪ 6 TRANG MENU IN.
# Toạ độ đo tay trên ảnh gốc 1414x2000, đã soi lại từng khung bằng mắt.
from PIL import Image
import importlib.util, os, json
sp = importlib.util.spec_from_file_location('toado', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'toado.py'))
td = importlib.util.module_from_spec(sp); sp.loader.exec_module(td)

RA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anh-mon')
os.makedirs(RA, exist_ok=True)
RONG_TOI_DA = 1000   # ảnh menu trên điện thoại, 1000px là thừa nét

daMo = {}
bangKe = []
for so in sorted(td.HOP):
    trang, x0, y0, x1, y1 = td.HOP[so]
    if trang not in daMo:
        daMo[trang] = Image.open(os.path.join(td.SRC, td.TRANG[trang])).convert('RGB')
    cr = daMo[trang].crop((x0, y0, x1, y1))
    if cr.width > RONG_TOI_DA:
        cr = cr.resize((RONG_TOI_DA, round(cr.height * RONG_TOI_DA / cr.width)), Image.LANCZOS)
    ten = 'mon-%02d.jpg' % so
    cr.save(os.path.join(RA, ten), 'JPEG', quality=86, optimize=True)
    bangKe.append({'so': so, 'tep': ten, 'rong': cr.width, 'cao': cr.height,
                   'byte': os.path.getsize(os.path.join(RA, ten))})

json.dump(bangKe, open(os.path.join(RA, 'bang-ke.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
tong = sum(b['byte'] for b in bangKe)
print(f'Đã bóc {len(bangKe)} ảnh, tổng {tong/1024/1024:.2f} MB')
for b in bangKe:
    print(f"  {b['tep']}  {b['rong']}x{b['cao']}  {b['byte']//1024} KB")
