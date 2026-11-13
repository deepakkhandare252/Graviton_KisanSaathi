import io
import json
import logging
import os
import re
import sys
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from model_manager import ensure_model, get_model_directories


logging.basicConfig(level=logging.INFO, format="[local-tts] %(message)s")
SYNTHESIS_LOCK = threading.Lock()
KANNADA_PRONUNCIATIONS = {
    "PM-KISAN": "ಪಿ ಎಂ ಕಿಸಾನ್",
    "PMFBY": "ಪಿ ಎಂ ಎಫ್ ಬಿ ವೈ",
    "NPCI": "ಎನ್ ಪಿ ಸಿ ಐ",
    "DCCB": "ಡಿ ಸಿ ಸಿ ಬಿ",
    "PACS": "ಪಿಎಸಿಎಸ್",
    "DBT": "ಡಿ ಬಿ ಟಿ",
    "RTC": "ಆರ್ ಟಿ ಸಿ",
    "FRUITS": "ಫ್ರೂಟ್ಸ್",
    "FID": "ಎಫ್ ಐ ಡಿ",
    "CGHS": "ಸಿ ಜಿ ಎಚ್ ಎಸ್",
    "ESI": "ಇ ಎಸ್ ಐ",
    "PSU": "ಪಿ ಎಸ್ ಯು",
    "MLC": "ಎಂ ಎಲ್ ಸಿ",
    "MLA": "ಎಂ ಎಲ್ ಎ",
    "MP": "ಎಂ ಪಿ",
    "OBC": "ಓ ಬಿ ಸಿ",
    "GEN": "ಜೆನ್",
    "SC": "ಎಸ್ ಸಿ",
    "ST": "ಎಸ್ ಟಿ",
    "RD": "ಆರ್ ಡಿ",
    "ID": "ಐಡಿ",
    "Bele Sameekshe": "ಬೆಳೆ ಸಮೀಕ್ಷೆ",
}


def prepare_speech_text(text: str, language: str) -> str:
    if language == "en":
        return text.replace("₹", "rupees ")

    text = re.sub(r"(?<=\d)\.(?=\d)", " ದಶಮಾಂಶ ", text)
    text = text.replace("₹", "ರೂಪಾಯಿ ")
    for source, pronunciation in KANNADA_PRONUNCIATIONS.items():
        text = re.sub(
            rf"\b{re.escape(source)}\b",
            pronunciation,
            text,
            flags=re.IGNORECASE,
        )
    return text


class SpeechHandler(BaseHTTPRequestHandler):
    models = {}

    def do_GET(self) -> None:
        if self.path == "/health":
            self._send_json(200, {"status": "ready"})
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:
        if self.path != "/synthesize":
            self._send_json(404, {"error": "Not found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0 or content_length > 8192:
            self._send_json(400, {"error": "Invalid request size"})
            return

        try:
            payload = json.loads(self.rfile.read(content_length))
            text = payload.get("text")
            language = payload.get("language")
            if not isinstance(text, str) or not text.strip() or len(text) > 600:
                self._send_json(400, {"error": "Text must contain 1 to 600 characters"})
                return
            if language not in ("en", "kn"):
                self._send_json(400, {"error": "Unsupported speech language"})
                return

            text = prepare_speech_text(text, language)

            model = self.models[language]
            voice = "male" if language == "en" else "female"
            with SYNTHESIS_LOCK:
                samples = model.synthesize(text, voice=voice, speed=1.0, seed=0)
            if samples.size == 0:
                self._send_json(422, {"error": "No speech could be generated for this text"})
                return

            audio_buffer = io.BytesIO()
            pcm = (samples * 32767).astype("<i2").tobytes()
            with wave.open(audio_buffer, "wb") as audio_file:
                audio_file.setnchannels(1)
                audio_file.setsampwidth(2)
                audio_file.setframerate(model.sample_rate)
                audio_file.writeframes(pcm)

            audio = audio_buffer.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(audio)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(audio)
        except (json.JSONDecodeError, UnicodeDecodeError, ValueError) as error:
            logging.warning("Rejected speech request: %s", error)
            self._send_json(400, {"error": "Invalid speech request"})
        except Exception:
            logging.exception("Local speech synthesis failed")
            self._send_json(500, {"error": "Local speech synthesis failed"})

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format: str, *_args) -> None:
        return


def load_models() -> dict:
    model_directories = get_model_directories()
    for language in ("en", "kn"):
        ensure_model(language, model_directories[language])

    sys.path.insert(0, str(model_directories["en"]))
    from indic_tiny_tts import TinyTTSOnnx

    return {
        language: TinyTTSOnnx.from_pretrained(str(folder), threads=2)
        for language, folder in model_directories.items()
    }


def main() -> None:
    SpeechHandler.models = load_models()
    port = int(os.environ.get("TTS_PORT", "3211"))
    server = ThreadingHTTPServer(("127.0.0.1", port), SpeechHandler)
    logging.info("English male and Kannada female offline voices are ready on port %s", port)
    server.serve_forever()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logging.exception("Offline voice service could not start")
        raise
