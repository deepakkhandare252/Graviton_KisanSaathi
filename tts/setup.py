import os
import subprocess
import sys
import venv
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
VENV_DIR = ROOT / ".venv-tts"
REQUIREMENTS = ROOT / "requirements-tts.txt"


def main() -> None:
    if not VENV_DIR.exists():
        venv.EnvBuilder(with_pip=True).create(VENV_DIR)

    python = VENV_DIR / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
    subprocess.run(
        [str(python), "-m", "pip", "install", "-r", str(REQUIREMENTS)],
        check=True,
    )
    subprocess.run(
        [str(python), str(Path(__file__).with_name("download_models.py"))],
        check=True,
        env={**os.environ, "TTS_MODELS_DIR": str(ROOT / ".tts-models")},
    )


if __name__ == "__main__":
    main()
