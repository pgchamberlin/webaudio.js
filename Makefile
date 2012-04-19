# makefile to automatize simple operations

server:
	python -m SimpleHTTPServer

deploy:
	# assume there is something to commit
	# use "git diff --exit-code HEAD" to know if there is something to commit
	# so two lines: one if no commit, one if something to commit 
	git commit -a -m "New deploy" && git push -f origin HEAD:gh-pages && git reset HEAD~

build:	buildCore minifyCore buildBundle minifyBundle

buildCore:
	echo 				 	 > build/webaudio.js
	cat src/webaudio.js			>> build/webaudio.js
	cat src/webaudio.nodechainbuilder.js	>> build/webaudio.js
	cat src/webaudio.sound.js		>> build/webaudio.js
	cat src/webaudio.loader.js		>> build/webaudio.js

buildBundle: buildCore
	echo 			 > build/webaudio-bundle.js
	cat build/webaudio.js	>> build/webaudio-bundle.js
	cat src/plugins/*.js	>> build/webaudio-bundle.js

minifyCore:
	curl --data-urlencode "js_code@build/webaudio.js" 	\
		-d "output_format=text&output_info=compiled_code&compilation_level=SIMPLE_OPTIMIZATIONS" \
		http://closure-compiler.appspot.com/compile		\
		>> build/webaudio.min.js
	@echo size minified + gzip is `gzip -c build/webaudio.min.js | wc -c` byte

minifyBundle:
	curl --data-urlencode "js_code@build/webaudio-bundle.js" 	\
		-d "output_format=text&output_info=compiled_code&compilation_level=SIMPLE_OPTIMIZATIONS" \
		http://closure-compiler.appspot.com/compile		\
		>> build/webaudio-bundle.min.js
	@echo size minified + gzip is `gzip -c build/webaudio-bundle.min.js | wc -c` byte

.PHONY: build