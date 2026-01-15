.PHONY: server build clean

server:
	python3 -m http.server 1515

build: clean
	@echo "Building dist/..."
	@mkdir -p dist
	@echo "Minifying JavaScript..."
	@npx --yes esbuild app.js --minify --outfile=dist/app.js
	@echo "Minifying CSS..."
	@npx --yes esbuild styles.css --minify --outfile=dist/styles.css
	@echo "Minifying HTML..."
	@npx --yes html-minifier-terser index.html \
		--collapse-whitespace \
		--remove-comments \
		--remove-redundant-attributes \
		--remove-script-type-attributes \
		--remove-style-link-type-attributes \
		--minify-css true \
		--minify-js true \
		-o dist/index.html
	@echo "Copying assets..."
	@cp *.json dist/
	@echo "Build complete!"
	@echo "Original vs minified:"
	@wc -c app.js styles.css index.html | tail -1 | awk '{print "  Source: " $$1 " bytes"}'
	@wc -c dist/app.js dist/styles.css dist/index.html | tail -1 | awk '{print "  Minified: " $$1 " bytes"}'

clean:
	@rm -rf dist
