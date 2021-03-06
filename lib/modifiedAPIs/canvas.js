/* Author: kkapsner
 * https://github.com/kkapsner*/

/* jslint moz: true, bitwise: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	function getFakeCanvas(window, original){
		var context = window.HTMLCanvasElement.prototype.getContext.call(original, "2d");
		var imageData, data, source;
		if (context){
			imageData = window.CanvasRenderingContext2D.prototype.getImageData.call(context, 0, 0, original.width, original.height);
			source = imageData.data;
		}
		else {
			context = 
				window.HTMLCanvasElement.prototype.getContext.call(original, "webgl") ||
				window.HTMLCanvasElement.prototype.getContext.call(original, "experimental-webgl") ||
				window.HTMLCanvasElement.prototype.getContext.call(original, "webgl2") ||
				window.HTMLCanvasElement.prototype.getContext.call(original, "experimental-webgl2");
			imageData = new window.wrappedJSObject.ImageData(original.width, original.height);
			source = new window.wrappedJSObject.Uint8Array(imageData.data.length);
			window.WebGLRenderingContext.prototype.readPixels.call(
				context,
				0, 0, original.width, original.height,
				context.RGBA, context.UNSIGNED_BYTE,
				source
			);
		}
		data = imageData.data;
		var l = data.length;
		var randomI = 65536;
		var randomOffset = 0;
		var randomNumbers = new Uint8Array(Math.min(65536, l));
		
		for (var i = 0; i < l; i += 1, randomI += 1){
			if (randomI >= randomNumbers.length){
				randomI = 0;
				randomOffset += randomNumbers.length;
				if (l - i < 65536){
					randomNumbers = new Uint8Array(l - i);
				}
				window.crypto.getRandomValues(randomNumbers);
			}
			var rnd = randomNumbers[randomI];
			var value = source[i];
			if (value >= 0x80){
				value = value ^ (rnd & 0x1F);
			}
			else if (value >= 0x40){
				value = value ^ (rnd & 0x0F);
			}
			else if (value >= 0x20){
				value = value ^ (rnd & 0x07);
			}
			else if (value >= 0x10){
				value = value ^ (rnd & 0x03);
			}
			else if (value >= 0x08){
				value = value ^ (rnd & 0x01);
			}
			// else if (value >= 0x04){
				// value = value ^ (rnd * 0x00);
			// }
			data[i] = value;
		}
		var canvas = original.cloneNode(true);
		context = window.HTMLCanvasElement.prototype.getContext.call(canvas, "2d");
		context.putImageData(imageData, 0, 0);
		return canvas;
	}
	function getWindow(canvas){
		return canvas.ownerDocument.defaultView;
	}
	// changed functions and their fakes
	exports.changedFunctions = {
		getContext: {
			type: "context",
			object: "HTMLCanvasElement"
		},
		toDataURL: {
			type: "readout",
			object: "HTMLCanvasElement",
			fake: function toDataURL(){
				var window = getWindow(this);
				return window.HTMLCanvasElement.prototype.toDataURL.apply(getFakeCanvas(window, this), arguments);
			}
		},
		toBlob: {
			type: "readout",
			object: "HTMLCanvasElement",
			fake: function toBlob(callback){
				var window = getWindow(this);
				return window.HTMLCanvasElement.prototype.toBlob.apply(getFakeCanvas(window, this), arguments);
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			type: "readout",
			object: "HTMLCanvasElement",
			mozGetAsFile: function mozGetAsFile(callback){
				var window = getWindow(this);
				return window.HTMLCanvasElement.prototype.mozGetAsFile.apply(getFakeCanvas(window, this), arguments);
			}
		},
		getImageData: {
			type: "readout",
			object: "CanvasRenderingContext2D",
			fakeGenerator: function(){
				var maxSize = Number.POSITIVE_INFINITY;
				return function getImageData(sx, sy, sw, sh){
					var window = getWindow(this.canvas);
					var context;
					if (sw * sh > maxSize){
						context = this;
					}
					else {
						context = window.HTMLCanvasElement.prototype.getContext.call(
							getFakeCanvas(window, this.canvas),
							"2d"
						);
					}
					var data = window.CanvasRenderingContext2D.prototype.getImageData.apply(context, arguments).data;
					
					var imageData = new window.wrappedJSObject.ImageData(sw, sh);
					for (var i = 0, l = data.length; i < l; i += 1){
						imageData.data[i] = data[i];
					}
					return imageData;
				}
			}
		},
		readPixels: {
			type: "readout",
			object: "WebGLRenderingContext",
			fake: function readPixels(x, y, width, height, format, type, pixels){
				var window = getWindow(this.canvas);
				var context = window.HTMLCanvasElement.prototype.getContext.call(getFakeCanvas(window, this.canvas), "webGL");
				return window.WebGLRenderingContext.prototype.readPixels.apply(context, arguments);
				
			}
		}
	};
}());
