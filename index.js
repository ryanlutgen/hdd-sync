let path = require('path');
let fs = require('fs');
let _ = require('lodash');
let walk = require('walk')
let log4js = require('log4js');
let argv = require('minimist')(process.argv.slice(2));
let config = require('./config.json');

log4js.configure({
    appenders: [
        { type: 'console' }//,
        //{ type: 'file', filename: 'output/logs.log', category: 'logs' }
    ]
});
let logger = log4js.getLogger('logs');
//error, warn, info, debug
// logger.setLevel(argv.logLevel.toUpperCase() || 'DEBUG');
// logger.setLevel('INFO');
logger.setLevel('DEBUG');

//TODO pass in as args
let sourceHdd = path.resolve(config.source);
let destHdd = path.resolve(config.dest);

//do not include first '\', but escape all others

//recycle bin doesn't work in the walker filters (possibly because of the period char, so it goes here for now
const DIRS_TO_IGNORE = [config.source + "$RECYCLE.BIN"];

let createdDirs = [];

let options = {
    followLinks: false, filters: config.patternsToIgnore
};

//TODO pass as arg, or do root HDD always
walker = walk.walk(sourceHdd, options);

walker.on("directories", function (root, dirStatsArray, next) {
	next();
});

function createDirsAsNeeded(dir, sourceDir) {
	dir = path.resolve(dir);
	let folders = dir.split('\\');
	
	if (folders.length === 2 && folders[1] === '') {
		logger.warn(`trying to create dir on a root drive ${dir}`);
		return;
	}
	
	let totalDepth = folders.length;
	
	for (let i = 1; i < totalDepth; i++) {
		let folderPath = folders[0];
		
		for (let j = 1; j <= i; j++) {
			folderPath += "/" + folders[j];
		}
		
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath);
			logger.info(`createDirsAsNeeded: ${folderPath} created`);
			createdDirs.push(sourceDir);
		}
		else {
			logger.debug(`createDirsAsNeeded: ${folderPath} already exists, skipping`);
			createdDirs.push(sourceDir);
		}
	}
}

function copyFile(src, dest) {
	fs.createReadStream(src).pipe(fs.createWriteStream(dest));
}

function createFileIfNeeded(src, dest, srcFileStats) {
	if (!fs.existsSync(dest)) {
		logger.info(`copying ${src} to ${dest}`);
		copyFile(src, dest);
	}
	else {
		logger.info(`${dest} already exists, comparing file size`);
		let destFileStats = fs.statSync(dest);
		
		if (srcFileStats.size === destFileStats.size) {
			logger.info(`file sizes are the same, doing nothing`);
		}
		else {
			logger.info(`file sizes are different, overwriting`);
			copyFile(src, dest);
		}
	}
}

function ignoreDir(dir) {
	dir = path.resolve(dir);
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
		let destDir = root.replace(sourceHdd, destHdd);
		if (!_.includes(createdDirs, root)) {
			createDirsAsNeeded(destDir, root);
		}
		else {
			logger.debug(`walker file: ${root} has already been created, skipping creation call`);
		}
		createFileIfNeeded(root + '/' + fileStats.name, root.replace(sourceHdd, destHdd) + '/' + fileStats.name, fileStats)
		next();
	}
	else {
		logger.debug(`walker file: ignoring ${root}`);
		next();
	}
});

walker.on("directories", function (root, dirStatsArray, next) {
	if (!ignoreDir(root)) {
		let destDir = root.replace(sourceHdd, destHdd);
		
		if (!_.includes(createdDirs, root)) {
			createDirsAsNeeded(destDir, root);
		}
		else {
			logger.debug(`walker directories: ${root} has already been created, skipping creation call`);
		}
		
		next();
	}
	else {
		logger.debug(`walker directories: ignoring ${root}`);
		next();
	}
});

walker.on("errors", function (root, nodeStatsArray, next) {
	logger.error("error");
	next();
});

walker.on("end", function () {
	logger.info("Done syncing!");
});