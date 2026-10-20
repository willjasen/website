#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
OUTPUT_DIR=${1:-"$ROOT_DIR/public"}
TINYSEARCH_VERSION=0.11.1
RUST_VERSION=1.89.0
CARGO_HOME=${CARGO_HOME:-"$HOME/.cargo"}

if [ ! -f "$OUTPUT_DIR/index.json" ] || [ ! -f "$OUTPUT_DIR/tinysearch.toml" ]; then
    echo "Hugo search index or Tinysearch schema is missing from $OUTPUT_DIR" >&2
    exit 1
fi

if ! command -v rustup >/dev/null 2>&1; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
fi

export PATH="$CARGO_HOME/bin:$PATH"

rustup toolchain install "$RUST_VERSION" --profile minimal --target wasm32-unknown-unknown

if ! rustup run "$RUST_VERSION" cargo install --list | grep -Fq "tinysearch v$TINYSEARCH_VERSION:"; then
    rustup run "$RUST_VERSION" cargo install tinysearch \
        --version "$TINYSEARCH_VERSION" \
        --locked \
        --features bin
fi

mkdir -p "$OUTPUT_DIR/wasm"
rm -f \
    "$OUTPUT_DIR/wasm/tinysearch_engine.wasm" \
    "$OUTPUT_DIR/wasm/tinysearch_engine.js" \
    "$OUTPUT_DIR/wasm/demo.html"

rustup run "$RUST_VERSION" tinysearch \
    --release \
    --mode wasm \
    --path "$OUTPUT_DIR/wasm" \
    "$OUTPUT_DIR/index.json"
