from .maintainer import CPACodexKeeper
from .settings import SettingsError, load_settings, load_status_settings
from .status_server import StatusServer


def build_arg_parser():
    import argparse

    parser = argparse.ArgumentParser(description="CPACodexKeeper")
    parser.add_argument("--dry-run", action="store_true", help="演练模式，不实际修改 / Dry run")
    parser.add_argument("--daemon", action="store_true", default=True, help="守护模式，默认开启 / Run forever")
    parser.add_argument("--once", dest="daemon", action="store_false", help="仅执行一轮后退出 / Run once")
    subparsers = parser.add_subparsers(dest="command")
    subparsers.add_parser("status-server", help="启动状态页服务 / Run status server")
    parser.set_defaults(command="run")
    return parser


def serve_status(settings) -> None:
    server = StatusServer(
        settings.status_host,
        settings.status_port,
        settings.status_snapshot_path,
        settings.status_static_dir,
    )
    host, port = server.address
    print(f"Status server listening on http://{host}:{port}/status")
    print(f"JSON status endpoint: http://{host}:{port}/api/status.json")
    server.start()
    try:
        server.wait()
    except KeyboardInterrupt:
        pass
    finally:
        server.close()


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    if args.command == "status-server":
        try:
            settings = load_status_settings()
        except SettingsError as exc:
            parser.exit(status=2, message=f"Configuration error: {exc}\n")
        serve_status(settings)
        return 0

    try:
        settings = load_settings()
    except SettingsError as exc:
        parser.exit(status=2, message=f"Configuration error: {exc}\n")

    maintainer = CPACodexKeeper(settings=settings, dry_run=args.dry_run)
    if args.daemon:
        maintainer.run_forever(interval_seconds=settings.interval_seconds)
        return 0
    maintainer.run()
    return 0
