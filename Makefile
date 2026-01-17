.PHONY: server build clean

server:
	python3 -m http.server 1515

build: clean
	@echo "Building dist/..."
	@mkdir -p dist/roulette dist/ambient
	@echo "Minifying common JavaScript..."
	@npx --yes esbuild common.js --minify --outfile=dist/common.js
	@echo "Minifying CSS..."
	@npx --yes esbuild styles.css --minify --outfile=dist/styles.css
	@echo "Minifying landing page HTML..."
	@npx --yes html-minifier-terser index.html \
		--collapse-whitespace \
		--remove-comments \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-style-link-type-attributes \
		--minify-css true \
		--minify-js true \
		-o dist/index.html
	@echo "Minifying roulette page..."
	@npx --yes esbuild roulette/roulette.js --minify --outfile=dist/roulette/roulette.js
	@npx --yes html-minifier-terser roulette/index.html \
		--collapse-whitespace \
		--remove-comments \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-style-link-type-attributes \
		--minify-css true \
		--minify-js true \
		-o dist/roulette/index.html
	@echo "Minifying ambient page..."
	@npx --yes esbuild ambient/ambient.js --minify --outfile=dist/ambient/ambient.js
	@npx --yes html-minifier-terser ambient/index.html \
		--collapse-whitespace \
		--remove-comments \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-style-link-type-attributes \
		--minify-css true \
		--minify-js true \
		-o dist/ambient/index.html
	@echo "Copying assets..."
	@cp ambient-stations.json atc-sources.json dist/
	@echo "Build complete!"
	@echo "Size comparison:"
	@echo "  Source JS:"
	@wc -c common.js roulette/roulette.js ambient/ambient.js | tail -1 | awk '{print "    " $$1 " bytes"}'
	@echo "  Minified JS:"
	@wc -c dist/common.js dist/roulette/roulette.js dist/ambient/ambient.js | tail -1 | awk '{print "    " $$1 " bytes"}'

clean:
	@rm -rf dist
