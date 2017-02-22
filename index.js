let path = require('path');
let fs = require('fs');
let _ = require('lodash');
let walk = require('walk')
let log4js = require('log4js');
var argv = require('minimist')(process.argv.slice(2));

log4js.configure({
    appenders: [
        { type: 'console' }//,
        //{ type: 'file', filename: 'output/logs.log', category: 'logs' }
    ]
});
let logger = log4js.getLogger('logs');
//error, warn, info, debug
// logger.setLevel(argv.logLevel.toUpperCase() || 'DEBUG');
logger.setLevel('DEBUG');

//TODO pass in as args
let sourceHdd = path.resolve("F:/");
let destHdd = path.resolve("G:/");

//do not include first '\', but escape all others
//const DIRS_TO_IGNORE = [sourceHdd + "Dropbox\\Work"];
const DIRS_TO_IGNORE = [];

let createdDirs = [];

//TODO pass as arg, or do root HDD always
//Walk through the dropbox folder
walker = walk.walk(sourceHdd + "Dropbox");

walker.on("directories", function (root, dirStatsArray, next) {
	next();
});

function createDirsAsNeeded(dir) {
	dir = path.resolve(dir);
	var folders = dir.split('\\');
	
	let totalDepth = folders.length;
	
	for (let i = 1; i < totalDepth; i++) {
		let folderPath = folders[0];
		
		for (let j = 1; j <= i; j++) {
			folderPath += "/" + folders[j];
		}
		
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath);
			createdDirs.push(folderPath);
		}
		else {
			logger.debug(`createDirsAsNeeded: ${folderPath} already exists, skipping`);
			createdDirs.push(folderPath);
		}
	}
}

function createFileIfNeeded(src, dest) {
	if (!fs.existsSync(dest)) {
		logger.info(`copying ${src} to ${dest}`);
		fs.createReadStream(src).pipe(fs.createWriteStream(dest));
	}
	else {
		logger.info(`${dest} already exists, doing nothing`);
	}
}

function ignoreDir(dir) {
	//exact match
	if (_.includes(DIRS_TO_IGNORE, dir)) {
		return true;
	}
	
	//iterate through to see if dir is a sub-dir of a dir to ignore
	let shouldIgnore = false;
	_.each(DIRS_TO_IGNORE, (dirToIgnore) => {
		if (dir.includes(dirToIgnore)) {
			shouldIgnore = true;
		}
	});
	
	return shouldIgnore;
}

walker.on("file", function (root, fileStats, next) {
	if (!ignoreDir(root)) {
		var destDir = root.replace(sourceHdd, destHdd);
		if (!_.includes(createdDirs, root)) {
			createDirsAsNeeded(destDir);
		}
		else {
			logger.debug(`${root} has already been created, skipping creation call`);
		}
		//TODO activate file copying, just copying folders for testing
		//createFileIfNeeded(root + '/' + fileStats.name, root.replace(sourceHdd, destHdd) + '/' + fileStats.name)
		next();
	}
	else {
		logger.debug(`ignoring ${root}`);
		next();
	}
});

walker.on("errors", function (root, nodeStatsArray, next) {
	console.log("error");
	next();
});

walker.on("end", function () {
	console.log("Done syncing!");
});