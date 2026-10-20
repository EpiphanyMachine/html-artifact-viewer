from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import json
root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'extension/manifest.json').read_text())['version']
output = root / 'dist' / f'html-artifact-viewer-{version}.zip'
extension_files = [
    'config.js', 'worker.js', 'settings.js', 'settings.html', 'settings.css',
    'manifest.json', 'icons/16.png', 'icons/32.png', 'icons/48.png', 'icons/128.png',
]
files = [(root / 'extension' / name, name) for name in extension_files]
files += [(root / name, name) for name in ['LICENSE', 'PRIVACY.md']]
for path, name in files:
    if not path.is_file():
        raise ValueError(f'Package input must be a regular file: {name}')
    if path.resolve() != path.absolute():
        raise ValueError(f'Package input must not traverse symlinks: {name}')
output.parent.mkdir(exist_ok=True)
with ZipFile(output, 'w', ZIP_DEFLATED) as package:
    for path, name in files:
        package.write(path, name)
with ZipFile(output) as package:
    assert set(package.namelist()) == {name for _, name in files}
    assert package.testzip() is None
print(output)
