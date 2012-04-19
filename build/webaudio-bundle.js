

/**
 * Tutorials:
 * http://www.html5rocks.com/en/tutorials/webaudio/games/
 * http://www.html5rocks.com/en/tutorials/webaudio/positional_audio/ <- +1 as it is three.js
 * http://www.html5rocks.com/en/tutorials/webaudio/intro/
 *
 * Spec:
 * https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html
 *
 * Chromium Demo:
 * http://chromium.googlecode.com/svn/trunk/samples/audio/index.html  <- running page
 * http://code.google.com/p/chromium/source/browse/trunk/samples/audio/ <- source
*/


/**
 * Notes on removing tQuery dependancy
 * * some stuff depends on tQuery
 * * find which one
 * * tQuery.Webaudio got a world link for the listener
 *   * do a plugin with followListener(world), unfollowListener(world)
 * * namespace become WebAudio.* instead of tQuery.WebAudio.*
*/

//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//		tQuery.WebAudio							//
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////


/**
 * Main class to handle webkit audio
 * 
 * TODO make the clip detector from http://www.html5rocks.com/en/tutorials/webaudio/games/
 *
 * @class Handle webkit audio API
 *
 * @param {tQuery.World} [world] the world on which to run 
*/
tQuery.WebAudio	= function(){
	// sanity check - the api MUST be available
	console.assert(tQuery.WebAudio.isAvailable === true, 'webkitAudioContext isnt available on your browser');

	// create the context
	this._ctx	= new webkitAudioContext();

	// setup the end of the node chain
	// TODO later code the clipping detection from http://www.html5rocks.com/en/tutorials/webaudio/games/ 
	this._gainNode	= this._ctx.createGainNode();
	this._compressor= this._ctx.createDynamicsCompressor();
	this._gainNode.connect( this._compressor );
	this._compressor.connect( this._ctx.destination );	
};


// vendor.js way to make plugins ala jQuery
tQuery.WebAudio.fn	= tQuery.WebAudio.prototype;

/**
 * destructor
*/
tQuery.WebAudio.prototype.destroy	= function(){
};

/**
 * 
 *
 * @return {Boolean} true if it is available or not
*/
tQuery.WebAudio.isAvailable	= window.webkitAudioContext ? true : false;

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * get the audio context
 *
 * @returns {AudioContext} the audio context
*/
tQuery.WebAudio.prototype.context	= function(){
	return this._ctx;
};

/**
 * return the entry node in the master node chains
*/
tQuery.WebAudio.prototype._entryNode	= function(){
	//return this._ctx.destination;
	return this._gainNode;
}

/**
 * getter/setter on the volume
*/
tQuery.WebAudio.prototype.volume	= function(value){
	if( value === undefined )	return this._gainNode.gain.value;
	this._gainNode.gain.value	= value;
	return this;
};

/**
 * Constructor
 *
 * @class builder to generate nodes chains. Used in tQuery.WebAudio.Sound
 * @param {webkitAudioContext} audioContext the audio context
*/
tQuery.WebAudio.NodeChainBuilder	= function(audioContext){
	console.assert( audioContext instanceof webkitAudioContext );
	this._context	= audioContext;
	this._firstNode	= null;
	this._lastNode	= null;
	this._nodes	= {};
};

/**
 * destructor
*/
tQuery.WebAudio.NodeChainBuilder.prototype.destroy	= function(){
};

/**
 * getter for the nodes
*/
tQuery.WebAudio.NodeChainBuilder.prototype.nodes	= function(){
	return this._nodes;
}

/**
 * @returns the first node of the chain
*/
tQuery.WebAudio.NodeChainBuilder.prototype.first	= function(){
	return this._firstNode;
}

/**
 * @returns the last node of the chain
*/
tQuery.WebAudio.NodeChainBuilder.prototype.last	= function(){
	return this._lastNode;
}

tQuery.WebAudio.NodeChainBuilder.prototype._addNode	= function(node, properties)
{
	// update this._bufferSourceDst - needed for .cloneBufferSource()
	var lastIsBufferSource	= this._lastNode && ('playbackRate' in this._lastNode) ? true : false;
	if( lastIsBufferSource )	this._bufferSourceDst	= node;

	// connect this._lastNode to node if suitable
	if( this._lastNode !== null )	this._lastNode.connect(node);
	
	// update this._firstNode && this._lastNode
	if( this._firstNode === null )	this._firstNode	= node;
	this._lastNode	= node;
		
	// apply properties to the node
	for( var property in properties ){
		node[property]	= properties[property];
	}

	// for chained API
	return this;
};


/**
 * Clone the bufferSource. Used just before playing a sound
 * @returns {AudioBufferSourceNode} the clone AudioBufferSourceNode
*/
tQuery.WebAudio.NodeChainBuilder.prototype.cloneBufferSource	= function(){
	console.assert(this._nodes.bufferSource, "no buffersource presents. Add one.");
	var orig	= this._nodes.bufferSource;
	var clone	= this._context.createBufferSource()
	clone.buffer		= orig.buffer;
	clone.playbackRate	= orig.playbackRate;
	clone.loop		= orig.loop;
	clone.connect(this._bufferSourceDst);
	return clone;
}

/**
 * add a bufferSource
 *
 * @param {Object} [properties] properties to set in the created node
*/
tQuery.WebAudio.NodeChainBuilder.prototype.bufferSource	= function(properties){
	var node		= this._context.createBufferSource()
	this._nodes.bufferSource= node;
	return this._addNode(node, properties)
};

/**
 * add a panner
 * 
 * @param {Object} [properties] properties to set in the created node
*/
tQuery.WebAudio.NodeChainBuilder.prototype.panner	= function(properties){
	var node		= this._context.createPanner()
	this._nodes.panner	= node;
	return this._addNode(node, properties)
};

/**
 * add a analyser
 *
 * @param {Object} [properties] properties to set in the created node
*/
tQuery.WebAudio.NodeChainBuilder.prototype.analyser	= function(properties){
	var node		= this._context.createAnalyser()
	this._nodes.analyser	= node;
	return this._addNode(node, properties)
};

/**
 * add a gainNode
 *
 * @param {Object} [properties] properties to set in the created node
*/
tQuery.WebAudio.NodeChainBuilder.prototype.gainNode	= function(properties){
	var node		= this._context.createGainNode()
	this._nodes.gainNode	= node;
	return this._addNode(node, properties)
};

/**
 * sound instance
 *
 * @class Handle one sound for tQuery.WebAudio
 *
 * @param {tQuery.World} [world] the world on which to run
 * @param {tQuery.WebAudio.NodeChainBuilder} [nodeChain] the nodeChain to use
*/
tQuery.WebAudio.Sound	= function(webaudio, nodeChain){
	this._webaudio	= webaudio;
	this._context	= this._webaudio.context();

	console.assert( this._webaudio instanceof tQuery.WebAudio );

	// create a default NodeChainBuilder if needed
	if( nodeChain === undefined ){
		nodeChain	= new tQuery.WebAudio.NodeChainBuilder(this._context)
					.bufferSource().gainNode().analyser().panner();
	}
	// setup this._chain
	console.assert( nodeChain instanceof tQuery.WebAudio.NodeChainBuilder );
	this._chain	= nodeChain;

	// connect this._chain.last() node to this._webaudio._entryNode()
	this._chain.last().connect( this._webaudio._entryNode() );
	
	// create some alias
	this._source	= this._chain.nodes().bufferSource;
	this._gainNode	= this._chain.nodes().gainNode;
	this._analyser	= this._chain.nodes().analyser;
	this._panner	= this._chain.nodes().panner;
	
	// sanity check
	console.assert(this._source	, "no bufferSource: not yet supported")
	console.assert(this._gainNode	, "no gainNode: not yet supported")
	console.assert(this._analyser	, "no analyser: not yet supported")
	console.assert(this._panner	, "no panner: not yet supported")
};

/**
 * destructor
*/
tQuery.WebAudio.Sound.prototype.destroy	= function(){
	// disconnect from this._webaudio
	this._chain.last().disconnect();
	// destroy this._chain
	this._chain.destroy();
	this._chain	= null;
};

// vendor.js way to make plugins ala jQuery
tQuery.WebAudio.Sound.fn	= tQuery.WebAudio.Sound.prototype;

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * getter of the chain nodes
*/
tQuery.WebAudio.Sound.prototype.nodes	= function(){
	return this._chain.nodes();
};

/**
 * @returns {Boolean} true if the sound is playable, false otherwise
*/
tQuery.WebAudio.Sound.prototype.isPlayable	= function(){
	return this._source.buffer ? true : false;
};

/**
 * play the sound
 *
 * @param {Number} [time] time when to play the sound
*/
tQuery.WebAudio.Sound.prototype.play		= function(time){
	if( time ===  undefined )	time	= 0;
	// clone the bufferSource
	var clonedNode	= this._chain.cloneBufferSource();
	// set the noteOn
	clonedNode.noteOn(time);
	// create the source object
	var source	= {
		node	: clonedNode,
		stop	: function(time){
			if( time ===  undefined )	time	= 0;
			this.node.noteOff(time);
			return source;	// for chained API
		}
	}
	// return it
	return source;
};

/**
 * getter/setter on the volume
 *
 * @param {Number} [value] the value to set, if not provided, get current value
*/
tQuery.WebAudio.Sound.prototype.volume	= function(value){
	if( value === undefined )	return this._gainNode.gain.value;
	this._gainNode.gain.value	= value;
	return this;	// for chained API
};


/**
 * getter/setter on the loop
 * 
 * @param {Number} [value] the value to set, if not provided, get current value
*/
tQuery.WebAudio.Sound.prototype.loop	= function(value){
	if( value === undefined )	return this._source.loop;
	this._source.loop	= value;
	return this;	// for chained API
};

/**
 * Set parameter for the pannerCone
 *
 * @param {Number} innerAngle the inner cone hangle in radian
 * @param {Number} outerAngle the outer cone hangle in radian
 * @param {Number} outerGain the gain to apply when in the outerCone
*/
tQuery.WebAudio.Sound.prototype.pannerCone	= function(innerAngle, outerAngle, outerGain)
{
	this._panner.coneInnerAngle	= innerAngle * 180 / Math.PI;
	this._panner.coneOuterAngle	= outerAngle * 180 / Math.PI;
	this._panner.coneOuterGain	= outerGain;
	return this;	// for chained API
};

/**
 * getter/setter on the pannerConeInnerAngle
 * 
 * @param {Number} value the angle in radian
*/
tQuery.WebAudio.Sound.prototype.pannerConeInnerAngle	= function(value){
	if( value === undefined )	return this._panner.coneInnerAngle / 180 * Math.PI;
	this._panner.coneInnerAngle	= value * 180 / Math.PI;
	return this;	// for chained API
};

/**
 * getter/setter on the pannerConeOuterAngle
 *
 * @param {Number} value the angle in radian
*/
tQuery.WebAudio.Sound.prototype.pannerConeOuterAngle	= function(value){
	if( value === undefined )	return this._panner.coneOuterAngle / 180 * Math.PI;
	this._panner.coneOuterAngle	= value * 180 / Math.PI;
	return this;	// for chained API
};

/**
 * getter/setter on the pannerConeOuterGain
 * 
 * @param {Number} value the value
*/
tQuery.WebAudio.Sound.prototype.pannerConeOuterGain	= function(value){
	if( value === undefined )	return this._panner.coneOuterGain;
	this._panner.coneOuterGain	= value;
	return this;	// for chained API
};

/**
 * compute the amplitude of the sound (not sure at all it is the proper term)
 *
 * @param {Number} width the number of frequencyBin to take into account
 * @returns {Number} return the amplitude of the sound
*/
tQuery.WebAudio.Sound.prototype.amplitude	= function(width)
{
	// handle paramerter
	width		= width !== undefined ? width : 2;
	// inint variable
	var analyser	= this._analyser;
	var freqByte	= new Uint8Array(analyser.frequencyBinCount);
	// get the frequency data
	analyser.getByteFrequencyData(freqByte);
	// compute the sum
	var sum	= 0;
	for(var i = 0; i < width; i++){
		sum	+= freqByte[i];
	}
	// complute the amplitude
	var amplitude	= sum / (width*256-1);
	// return ampliture
	return amplitude;
}

//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

/**
 * Load a sound
 *
 * @param {String} url the url of the sound to load
 * @param {Function} callback function to notify once the url is loaded (optional)
*/
tQuery.WebAudio.Sound.prototype.load = function(url, callback){
	this._loadAndDecodeSound(url, function(buffer){
		this._source.buffer	= buffer;
		callback && callback(this);
	}.bind(this), function(){
		console.warn("unable to load sound "+url);
	});
	return this;	// for chained API
};

/**
 * Load and decode a sound
 *
 * @param {String} url the url where to get the sound
 * @param {Function} onLoad the function called when the sound is loaded and decoded (optional)
 * @param {Function} onError the function called when an error occured (optional)
*/
tQuery.WebAudio.Sound.prototype._loadAndDecodeSound	= function(url, onLoad, onError){
	var context	= this._context;
	var request	= new XMLHttpRequest();
	request.open('GET', url, true);
	request.responseType	= 'arraybuffer';
	// Decode asynchronously
	request.onload	= function() {
		context.decodeAudioData(request.response, function(buffer) {
			onLoad && onLoad(buffer);
		}, function(){
			onError && onError();
		});
	};
	// actually start the request
	request.send();
}
/**
 * Update the source with object3d. usefull for positional sounds
 * 
 * @param {THREE.Object3D} object3d the object which originate the source
 * @param {Number} deltaTime the number of seconds since last update
*/
tQuery.WebAudio.Sound.fn.updateWithObject3d	= function(object3d, deltaTime){
	// sanity check on parameters
	console.assert( object3d instanceof THREE.Object3D );
	console.assert( typeof(deltaTime) === 'number' );

	// ensure object3d.matrixWorld is up to date
	object3d.updateMatrixWorld();
	
	this.updateWithMatrix4(object3d.matrixWorld, deltaTime);
	
	return this;	// for chained API
}

/**
 * Update the source with a matrixWorld. usefull for positional sounds
 * 
 * @param {THREE.Matrix4} matrixWorld the matrixWorld describing the position of the sound
 * @param {Number} deltaTime the number of seconds since last update
*/
tQuery.WebAudio.Sound.fn.updateWithMatrix4	= function(matrixWorld, deltaTime){
	// sanity check on parameters
	console.assert( matrixWorld instanceof THREE.Matrix4 );
	console.assert( typeof(deltaTime) === 'number' );

	////////////////////////////////////////////////////////////////////////
	// set position
	var position	= matrixWorld.getPosition();
	this._panner.setPosition(position.x, position.y, position.z);

	////////////////////////////////////////////////////////////////////////
	// set orientation
	var vOrientation= new THREE.Vector3(0,0,1);
	var mOrientation= matrixWorld.clone();
	// zero the translation
	mOrientation.setPosition({x : 0, y: 0, z: 0});
	// Multiply the 0,0,1 vector by the world matrix and normalize the result.
	mOrientation.multiplyVector3(vOrientation);
	vOrientation.normalize();
	// Set panner orientation
	this._panner.setOrientation(vOrientation.x, vOrientation.y, vOrientation.z);
	
	////////////////////////////////////////////////////////////////////////
	// set velocity
	if( this._prevPos === undefined ){
		this._prevPos	= matrixWorld.getPosition().clone();
	}else{
		var position	= matrixWorld.getPosition();
		var velocity	= position.clone().subSelf(this._prevPos).divideScalar(deltaTime);
		this._prevPos	= matrixWorld.getPosition().clone();
		this._panner.setVelocity(velocity.x, velocity.y, velocity.z);
	}
}
/**
 * follow a object3D
*/
tQuery.WebAudio.Sound.fn.follow	= function(object3d, world){
	console.assert( this.isFollowing() === false );
	// handle parameter
	if( object3d instanceof tQuery.Object3D ){
		console.assert(object3d.length === 1)
		object3d	= object3d.get(0);
	}
	// sanity check on parameters
	console.assert( object3d instanceof THREE.Object3D );

	// hook the world loop
	this._followCb		= function(deltaTime){
		this.updateWithObject3d(object3d, deltaTime);
	}.bind(this);
	world.loop().hook(this._followCb);
	// for chained API
	return this;
}

/**
 * unfollow the object3D if any
*/
tQuery.WebAudio.Sound.fn.unfollow	= function(world){
	this._world.loop().unhook(this._followCb);
	this._followCb		= null;
	// for chained API
	return this;
}

/**
 * @returns {Boolean} true if this sound is following a object3d, false overwise
*/
tQuery.WebAudio.Sound.prototype.isFollowing	= function(){
	return this._followCb ? true : false;
	// for chained API
	return this;
}
/**
 * @fileoverview WebAudio.js plugin for tQuery
*/
tQuery.World.register('enableWebAudio', function(){
	// sanity check
	console.assert( this.hasWebAudio() === false, "there is already a webaudio" );
	// intenciate a tQuery.World.WebAudio
	var webaudio	= new tQuery.WebAudio();
	// follow the listener 
	webaudio.followListener(this);
	// store webaudio in the world
	tQuery.data(this, "webaudio", webaudio);
	// for chained API
	return this;
});

tQuery.World.register('disabledWebAudio', function(){
	if( this.hasWebAudio() === false )	return this;
	var webaudio	= tQuery.data(this, "webaudio");
	webaudio.destroy();
	tQuery.removeData(this, "webaudio");
	return this;	// for chained API
});

tQuery.World.register('getWebAudio', function(){
	var webaudio	= tQuery.data(this, "webaudio");
	return webaudio;
});

tQuery.World.register('hasWebAudio', function(){
	var webaudio	= tQuery.data(this, "webaudio");
	return webaudio ? true : false;
});

tQuery.World.register('supportWebAudio', function(){
	return tQuery.WebAudio.isAvailable;
});

tQuery.register('createSound', function(world, nodeChain){
	world	= world || tQuery.world;
	return new tQuery.WebAudio.Sound(world.getWebAudio(), nodeChain);
});


//////////////////////////////////////////////////////////////////////////////////
//										//
//////////////////////////////////////////////////////////////////////////////////

tQuery.WebAudio.fn.followListener	= function(world){
	this._$followListenerCb	= function(deltaTime){
		this._followListenerCb(world.camera(), deltaTime);
	}.bind(this);
	world.loop().hook(this._$followListenerCb);
}

tQuery.WebAudio.fn.unfollowListener	= function(world){
	// unhook this._updateCb from this.world.loop()
	world.loop().unhook(this._$followListenerCb);
	this._$followListenerCb	= null;
}

tQuery.WebAudio.fn._followListenerCb	= function(object3d, deltaTime){
	var context	= this._ctx;
	// sanity check on parameters
	console.assert( object3d instanceof THREE.Object3D );
	console.assert( typeof(deltaTime) === 'number' );

	// ensure object3d.matrixWorld is up to date
	object3d.updateMatrixWorld();
	
	////////////////////////////////////////////////////////////////////////
	// set position
	var position	= object3d.matrixWorld.getPosition();
	context.listener.setPosition(position.x, position.y, position.z);

	////////////////////////////////////////////////////////////////////////
	// set orientation
	var mOrientation= object3d.matrixWorld.clone();
	// zero the translation
	mOrientation.setPosition({x : 0, y: 0, z: 0});
	// Compute Front vector: Multiply the 0,0,1 vector by the world matrix and normalize the result.
	var vFront= new THREE.Vector3(0,0,1);
	mOrientation.multiplyVector3(vFront);
	vFront.normalize();
	// Compute UP vector: Multiply the 0,-1,0 vector by the world matrix and normalize the result.
	var vUp= new THREE.Vector3(0,-1, 0);
	mOrientation.multiplyVector3(vUp);
	vUp.normalize();
	// Set panner orientation
	context.listener.setOrientation(vFront.x, vFront.y, vFront.z, vUp.x, vUp.y, vUp.z);

	////////////////////////////////////////////////////////////////////////
	// set velocity
	if( this._prevPos === undefined ){
		this._prevPos	= object3d.matrixWorld.getPosition().clone();
	}else{
		var position	= object3d.matrixWorld.getPosition();
		var velocity	= position.clone().subSelf(this._prevPos).divideScalar(deltaTime);
		this._prevPos	= object3d.matrixWorld.getPosition().clone();
		context.listener.setVelocity(velocity.x, velocity.y, velocity.z);
	}
}

