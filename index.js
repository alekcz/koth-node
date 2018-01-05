'use strict'
const jsonfile = require('jsonfile');
const core = require('./core/layer');
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

function loadSketchFile(src,dest) {
	var sketchfile = core.getSketchFile(src, dest);
	fs.outputFile(dest+"/"+sketchfile.filename+".coffee", sketchfile.data, (err) => {  
	    if (err) {
	    	console.log(err)
	    }
	});
}

loadSketchFile("tmp/fileformattest.sketch","tmp/views");

module.exports =  {
    createFramerViewfile: createFramerViewfile,
    loadSketchFile: loadSketchFile,
    sanitizeName: core.sanitizeName,

};