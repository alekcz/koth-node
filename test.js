'use strict'
const majiImport = require('./index.js');


majiImport.loadGravitFile("test/gravitfiletest.gvdesign",function(data) {
	console.log(JSON.stringify(data,function(key,value) {
		if(key == "image") return undefined;
		else return value
	},2));
})