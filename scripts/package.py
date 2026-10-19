from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'extension/manifest.json').read_text())['version']
output = root / 'dist' / f'html-artifact-viewer-{version}.zip'
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as package:
    for path in sorted((root / 'extension').rglob('*')):
        if path.is_file():
            package.write(path, path.relative_to(root / 'extension'))
print(output)
