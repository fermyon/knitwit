CARGO_BUILD_TARGET = wasm32-wasi
WASM_FILE = target/wasm32-wasi/release/knitwit.wasm
OUTPUT_DIR = obj
OUTPUT_WASM = $(OUTPUT_DIR)/knitwit.wasm
LIB_DIR = lib

all: build

build:
	cargo build --release --target $(CARGO_BUILD_TARGET)
	mkdir -p $(OUTPUT_DIR)
	jco new $(WASM_FILE) -o $(OUTPUT_WASM) --wasi-reactor
	jco transpile -q --name knitwit $(OUTPUT_WASM) -o $(LIB_DIR) -- -O1

clean:
	cargo clean
	rm -rf $(OUTPUT_DIR)
	rm -rf $(LIB_DIR)

.PHONY: all build clean