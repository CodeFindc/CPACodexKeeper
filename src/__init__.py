from .settings import Settings, SettingsError, load_settings

__all__ = ["Settings", "SettingsError", "load_settings", "CPACodexKeeper"]


def __getattr__(name: str):
    if name == "CPACodexKeeper":
        from .maintainer import CPACodexKeeper

        return CPACodexKeeper
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
