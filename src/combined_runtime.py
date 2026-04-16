from typing import TYPE_CHECKING

from .settings import Settings
from .status_snapshot import MODE_ONCE

if TYPE_CHECKING:
    from .maintainer import CPACodexKeeper
    from .status_server import StatusServer


def run_combined(
    settings: Settings,
    *,
    dry_run: bool = False,
    daemon: bool = True,
    keeper_cls: type["CPACodexKeeper"] | None = None,
    server_cls: type["StatusServer"] | None = None,
) -> None:
    if keeper_cls is None:
        from .maintainer import CPACodexKeeper

        keeper_cls = CPACodexKeeper
    if server_cls is None:
        from .status_server import StatusServer

        server_cls = StatusServer

    server = None
    try:
        server = server_cls(
            settings.status_host,
            settings.status_port,
            settings.status_snapshot_path,
            settings.status_static_dir,
        )
        server.start()
        keeper = keeper_cls(settings=settings, dry_run=dry_run)
        if daemon:
            keeper.run_forever(interval_seconds=settings.interval_seconds)
        else:
            keeper.run(mode=MODE_ONCE)
    finally:
        if server is not None:
            server.close()
