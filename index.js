let path = require('path');
let fs = require('fs');
let _ = require('lodash');
let walk = require('walk')
let log4js = require('log4js');
let argv = require('minimist')(process.argv.slice(2));
let config = require('./config.json');

let createdDirs = [];

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
logger.setLevel(config.logLevel || 'DEBUG');

//TODO pass in as args
let sourceHdd = path.resolve(config.source);
let destHdd = path.resolve(config.dest);

let dirsInSource = fs.readdirSync(config.source);
dirsInSource = _.filter(dirsInSource, (dir) => {
	return dir !== "$RECYCLE.BIN" && dir !== "System Volume Information";
});

_.each(dirsInSource, (dir, index, dirs) => {
	dirs[index] = path.resolve(sourceHdd + dirs[index]);
});

logger.info("scanning the following directories: " + dirsInSource);

_.each(dirsInSource, (dir) => {
	logger.info("scanning: " + dir);
	copyFoldersRecursive(dir);
	walkDir(dir);
});

function copyFoldersRecursive(dir) {
	let filesOrDirs = fs.readdirSync(dir);
	
	_.each(filesOrDirs, (fileOrDir) => {
		let filePath = path.join(dir, fileOrDir);
		let stat = fs.statSync(filePath);
		
		if (stat.isDirectory()) {
			let destDir = filePath.replace(sourceHdd, destHdd);
			let sourceDir = dir.replace(sourceHdd, destHdd);
			createDirsAsNeeded(destDir,sourceDir);
			copyFoldersRecursive(filePath);
		}
	});
}

function createDirsAsNeeded(dir, sourceDir) {
	dir = path.resolve(dir);
	let folders = dir.split('\\');
	
	
	let totalDepth = folders.length;
	
	for (let i = 1; i < totalDepth; i++) {
		let folderPath = folders[0];
		
		for (let j = 1; j <= i; j++) {
			folderPath += "/" + folders[j];
		}
		
		if (!fs.existsSync(folderPath)) {
			fs.mkdirSync(folderPath);
			logger.info(`directory ${folderPath} created`);
			createdDirs.push(sourceDir);
		}
		else {
			logger.debug(`directory ${folderPath} already exists, skipping`);
			createdDirs.push(sourceDir);
		}
	}
}

//do not include first '\', but escape all others
	
function walkDir(dir) {

	let options = {
		followLinks: false, filters: config.patternsToIgnore
	};

	//TODO pass as arg, or do root HDD always
	walker = walk.walk(dir, options);

	walker.on("directories", function (root, dirStatsArray, next) {
		next();
	});

	function copyFile(src, dest, callback) {
		fs.createReadStream(src)
			.pipe(fs.createWriteStream(dest))
			.on('close', () => {
				logger.info(`copied ${src} to ${dest}`);
				callback();
			});
	}

	function createFileIfNeeded(src, dest, srcFileStats, callback) {
		if (!fs.existsSync(dest)) {
			logger.debug(`copying ${src} to ${dest}`);
			copyFile(src, dest, callback);
		}
		else if (config.forceOverwrite) {
			logger.debug(`file already exists, but forceOverwrite is on.  copying ${src} to ${dest}`);
			copyFile(src, dest, callback);
		}
		else {
			logger.debug(`${dest} already exists, comparing file size`);
			let destFileStats = fs.statSync(dest);
			
			if (srcFileStats.size === destFileStats.size) {
				logger.debug(`file sizes are the same, doing nothing`);
				callback();
			}
			else {
				logger.debug(`file sizes are different, overwriting`);
				copyFile(src, dest, callback);
			}
		}
	}

	function ignoreDir(dir) {
		return false;
	}

	walker.on("file", function (root, fileStats, next) {
		if (!ignoreDir(root)) {
			createFileIfNeeded(root + '/' + fileStats.name, root.replace(sourceHdd, destHdd) + '/' + fileStats.name, fileStats, () => { next() });
		}
		else {
			logger.debug(`walker file: ignoring ${root}`);
			next();
		}
	});

	walker.on("directories", function (root, dirStatsArray, next) {
		logger.trace("walker on directory " + root);
		if (!ignoreDir(root)) {
			next();
		}
		else {
			logger.debug(`walker directories: ignoring ${root}`);
			next();
		}
	});

	walker.on("errors", function (root, nodeStatsArray, next) {
		logger.error("error");
		logger.error(nodeStatsArray);
		next();
	});

	walker.on("end", function () {
		logger.info("Done syncing " + dir);
	});
}