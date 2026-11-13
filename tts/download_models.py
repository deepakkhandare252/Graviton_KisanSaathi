from model_manager import ensure_model, get_model_directories


def main() -> None:
    model_directories = get_model_directories()
    for language in ("en", "kn"):
        print(f"Downloading pinned {language} speech model...")
        ensure_model(language, model_directories[language])
    print("Local speech models are ready.")


if __name__ == "__main__":
    main()
