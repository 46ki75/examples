from pathlib import Path
import shutil
import zipfile

dist_dir = Path("dist")

if dist_dir.exists():
    shutil.rmtree(dist_dir)
else:
    dist_dir.mkdir(exist_ok=True)

shutil.copytree(Path("./.venv/lib/python3.13/site-packages"),
                Path("dist/bundle"), dirs_exist_ok=True)

shutil.copytree(Path("./src"),
                Path("dist/bundle"), dirs_exist_ok=True)


def zipdir(path: Path, ziph: zipfile.ZipFile):
    for file in path.rglob("*"):
        ziph.write(file, arcname=file.relative_to(path))


with zipfile.ZipFile("dist/lambda.zip", "w", zipfile.ZIP_DEFLATED) as zipf:
    zipdir(Path("dist/bundle"), zipf)
