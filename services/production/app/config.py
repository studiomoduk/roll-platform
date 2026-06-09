from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Engine configuration, loaded from the environment (and an optional .env).

    The engine shares Postgres with the web app, so DATABASE_URL is the same
    connection string used by packages/db.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = ""
    # Shared bearer token the web app sends on /produce.
    production_engine_token: str = "dev-shared-secret"

    # Output: where print TIFFs + work-order PDFs are written. In production this
    # is S3/Supabase Storage; locally it's a folder served back as file:// URLs.
    out_dir: Path = Path("out")
    public_base_url: str = ""  # e.g. https://<ref>.supabase.co/storage/v1/object/public/palava-print

    # Print parameters (see SPEC §2.6).
    cloth_width_cm: float = 150.0
    rip_dpi: int = 150
    # Where sample pattern files live, relative to repo root.
    patterns_dir: Path = Path("../../patterns")

    @property
    def px_per_cm(self) -> float:
        return self.rip_dpi / 2.54


settings = Settings()
settings.out_dir.mkdir(parents=True, exist_ok=True)
