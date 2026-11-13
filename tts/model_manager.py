import os
from pathlib import Path

from huggingface_hub import snapshot_download


MODEL_SOURCES = {
    "en": {
        "repo": "sulabhkatiyar/indic-tiny-tts-english",
        "revision": "eea5d4a578c0f18173825a037487cf9c47ed4247",
    },
    "kn": {
        "repo": "sulabhkatiyar/indic-tiny-tts-kannada",
        "revision": "d18baf85f1d890422e7e641d92a92be881d75fa3",
    },
}

MODEL_FILES = ["config.json", "onnx/**", "LICENSE.md"]
CODE_FILES = MODEL_FILES + ["indic_tiny_tts/**"]


def get_model_directories() -> dict[str, Path]:
    root = Path(os.environ.get("TTS_MODELS_DIR", ".tts-models")).resolve()
    return {language: root / language for language in MODEL_SOURCES}


def ensure_model(language: str, folder: Path) -> Path:
    source = MODEL_SOURCES[language]
    required = [folder / "config.json"] + [
        folder / "onnx" / f"{graph}.onnx"
        for graph in ("text_encoder", "flow_decoder", "vocoder")
    ]
    if not all(path.is_file() for path in required):
        snapshot_download(
            repo_id=source["repo"],
            revision=source["revision"],
            local_dir=str(folder),
            allow_patterns=CODE_FILES if language == "en" else MODEL_FILES,
        )
    return folder
