#!/usr/bin/env python3
import zipfile, os

SRC = '/home/noyal/Mini_Project/warehouse_management'
OUT = os.path.join(SRC, 'SmartwareERP_SRS.zip')

if os.path.exists(OUT):
    os.remove(OUT)

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zf:
    zf.write(os.path.join(SRC, 'srs.tex'), 'srs.tex')
    for f in ['usecase.puml', 'activity.puml', 'sequence1.puml', 'class.puml', 'README.md']:
        path = os.path.join(SRC, 'srs_diagrams', f)
        if os.path.exists(path):
            zf.write(path, f)

print(f'Created: {OUT}')
for info in zipfile.ZipFile(OUT).infolist():
    print(f'  {info.filename} ({info.file_size} bytes)')
