"""CLI — Entry point para o motor de coleta Analise Quant."""

import argparse
import sys
from datetime import date, timedelta

from analise_quant.config import settings
from analise_quant.engine import CollectionEngine
from analise_quant.exporter import export_result


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="analise-quant",
        description="Motor de coleta de dados de mercado — Analise Quant",
    )
    parser.add_argument(
        "--module", "-m",
        type=str,
        default=None,
        help="Nome do módulo de coleta (ex: acoes_yfinance). Se omitido, usa todos.",
    )
    parser.add_argument(
        "--tickers", "-t",
        nargs="+",
        default=None,
        help="Lista de tickers (ex: PETR4 VALE3). Se omitido, usa lista padrão.",
    )
    parser.add_argument(
        "--days", "-d",
        type=int,
        default=30,
        help="Número de dias para trás a partir de hoje (default: 30).",
    )
    parser.add_argument(
        "--start",
        type=str,
        default=None,
        help="Data inicial (YYYY-MM-DD). Sobrescreve --days.",
    )
    parser.add_argument(
        "--end",
        type=str,
        default=None,
        help="Data final (YYYY-MM-DD). Default: hoje.",
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default=None,
        help=f"Diretório de saída (default: {settings.output_dir}).",
    )
    parser.add_argument(
        "--list-modules",
        action="store_true",
        help="Lista todos os módulos disponíveis e sai.",
    )
    parser.add_argument(
        "--no-export",
        action="store_true",
        help="Não exporta arquivos, apenas exibe resumo.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    engine = CollectionEngine()

    if args.list_modules:
        modules = engine.list_modules()
        print("\n📦 Módulos disponíveis:")
        for name in modules:
            info = engine.get_module_info(name)
            print(f"  • {name} — {info.description} [fonte: {info.source}]")
        return

    end_date = date.fromisoformat(args.end) if args.end else date.today()
    start_date = (
        date.fromisoformat(args.start) if args.start else end_date - timedelta(days=args.days)
    )
    tickers = args.tickers or settings.default_tickers

    print(f"\n🚀 Analise Quant — Motor de Coleta")
    print(f"   Tickers : {tickers}")
    print(f"   Período : {start_date} → {end_date}")
    print(f"   Módulo  : {args.module or 'todos'}\n")

    if args.module:
        result = engine.collect(args.module, tickers, start_date, end_date)
        results = {args.module: result}
    else:
        results = engine.collect_all(tickers, start_date, end_date)

    for module_name, result in results.items():
        print(f"\n📊 Resultado [{module_name}]:")
        print(f"   Status    : {result.status.value}")
        print(f"   Registros : {result.total_records}")
        print(f"   Duração   : {result.duration_seconds:.2f}s")
        print(f"   Sucesso   : {result.tickers_success}")
        if result.tickers_failed:
            print(f"   ⚠️  Falhas  : {result.tickers_failed}")
        if result.errors:
            for err in result.errors:
                print(f"   ❌ {err}")

        if not args.no_export and result.data:
            exported = export_result(result, args.output)
            if exported:
                print(f"   📁 Exportado:")
                for fmt, path in exported.items():
                    print(f"      {fmt.upper()}: {path}")

    print("\n✅ Coleta concluída.\n")


if __name__ == "__main__":
    main()
