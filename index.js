'use strict'
const jsonfile = require('jsonfile');
const core = require('./lib/core');
const gravit = require('./lib/gravit');
const fs = require('fs-extra');
const path = require('path');

function readFile(path,cb) {
	
	if(path)
	{
		jsonfile.readFile(path, function(err, obj) {
		  cb(null, obj)
		})
	}

}

function createFramerViewfile (src,dest) {
	readFile(src,function (err, data) {
		if(err) return false;
		//var file = core.createLayer(data);
		var pagename = path.basename(src);
		pagename = pagename.substring(0,(pagename.indexOf('.') || -1));
		pagename = core.sanitizeName(pagename);
		var contents = core.render(pagename,data);
		fs.outputFile(dest, contents, (err) => {  
		    // throws an error, you could also catch it here
		    if (err)
		    {
		    	console.log(err)
		    	return false;
		    }
		    console.log(contents);
		    return true;
		});
	});
}

function loadGravitFile(src, cb) {
	gravit.importFile(src, function(object) {
		cb(object);
	});
}

loadGravitFile("tmp/gravitfiletest.gvdesign",function(data) {
	console.log(data)
})

module.exports =  {
    createFramerViewfile: createFramerViewfile,
    sanitizeName: core.sanitizeName,
    loadGravitFile: loadGravitFile,
    render: core.render
};