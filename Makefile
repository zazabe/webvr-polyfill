default:
	mkdir -p build
	browserify src/main.js > build/webvr-polyfill.js

watch:
	watchify src/main.js -v -d -o build/webvr-polyfill.js

lint:
	jscs src/*.js
