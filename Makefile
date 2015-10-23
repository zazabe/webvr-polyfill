default:
	mkdir -p build
	NODE_PATH="." browserify main.js > build/webvr-polyfill.js

watch:
	NODE_PATH="." watchify main.js -v -d -o build/webvr-polyfill.js

lint:
	jscs src/*.js
