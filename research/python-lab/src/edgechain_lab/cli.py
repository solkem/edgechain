"""Command-line entry points for EdgeChain Python Lab."""

import argparse


def main() -> None:
    """Run the CLI."""

    from edgechain_lab import __version__

    parser = argparse.ArgumentParser(description="Run EdgeChain Python Lab experiments.")
    parser.add_argument("--version", action="store_true", help="Print package version.")
    args = parser.parse_args()

    if args.version:
        print(__version__)
        return

    parser.print_help()


if __name__ == "__main__":
    main()
