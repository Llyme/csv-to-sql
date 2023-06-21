const path = require('path');
const fs = require('fs');
const csv = require('./csv.js');
const dtd = require('./data_type_detector.js');


//const INPUT_PATH = path.resolve(__dirname, 'input');
const INPUT_PATH = 'input';
const OUTPUT_PATH = 'output';


const DEFAULT_VALUE =
{
	DATETIME: '0000-00-00 00:00:00',
	DATE: '0000-00-00',
	TIME: '00:00:00',
	INT: '0',
	FLOAT: '0',
	CHAR: '""',
	VARCHAR: '""'
};

const QUOTED_VALUE = ['DATETIME', 'DATE', 'TIME', 'CHAR', 'VARCHAR'];


function ParseFolder(loc = '', files = [])
{
	let root = INPUT_PATH + '\\' + loc;
	
	fs.readdirSync(INPUT_PATH + '\\' + loc, { withFileTypes: true })
		.forEach(v =>
		{
			let name = loc + '\\' + v;
			let lstat = fs.lstatSync(INPUT_PATH + '\\' + name);
			
			if (lstat.isDirectory())
				files = ParseFolder(name, files);
			else
				files.push(name);
		});
	
	return files;
}

function RecursiveMkdir(dirpath)
{
	let root = '';
	
	dirpath.split('\\').forEach(dir =>
	{
		root += dir + '\\';
		
		if (!fs.existsSync(root))
			fs.mkdirSync(root);
	});
}


let files = ParseFolder();

if (files.length == 0)
{
	console.log(
		'No files detected.\n' +
		'The `.csv` file(s) should be in the `input` folder.'
	);
	return;
}

console.log(`Found ${files.length} file(s).`);

function readFile(i = 0)
{
	if (i >= files.length)
	{
		console.log('All files are successfully converted.');
		return;
	}
	
	let file = files[i];
	let filename = path.basename(file).split('.').slice(0, -1).join('.');
	
	console.log(`(${i+1}/${files.length}) Parsing '${file}'...`);
	
	let output_directory = OUTPUT_PATH + file.split('\\').slice(0, -1).join('\\');
	let output_name = `${output_directory}\\${filename}.sql`
	
	RecursiveMkdir(output_directory);
	
	let stream = fs.createWriteStream(output_name, { flags : 'w' });

	stream.on('close', function()
	{
		console.log(`File '${output_name}' created.`);
		readFile(i + 1);
	});

	stream.once('open', fd =>
	{
		let input_file = INPUT_PATH + file;
		let lines = csv.read(fs.readFileSync(input_file).toString());
		let typeConfigs = [];
		let headers = '';
		let phrase = '';
		
		// Drop existing table.
		phrase = `DROP TABLE IF EXISTS ${filename};\n`;
		// Create table.
		phrase += `CREATE TABLE ${filename}(`;
		
		// Write headers.
		lines[0].forEach((header, n) =>
		{
			// Parse data type.
			let config = typeConfigs[n] = dtd.read(1, lines.length, v => lines[v][n]);
			
			if (header.indexOf('.') != -1)
				header = '`' + header + '`';
			
			headers += header + ',';
			phrase += header + ` ${config.typeDescriptor}`;
			
			if (!config.hasEmpty)
				phrase += ' NOT NULL';
			
			phrase += ',';
		});
		
		headers = headers.slice(0, -1);
		stream.write(phrase.slice(0, -1));
		stream.write(
			`);\nLOCK TABLES ${filename} WRITE;\n`
		);
		
		for (let n = 1; n < lines.length; n++)
		{
			let line = lines[n];
			
			if (line == null)
				continue;
			
			if (n % 1000 == 1)
				if (n == 1)
					phrase = `INSERT INTO ${filename} VALUES(`;
				else
					phrase = `;\nINSERT INTO ${filename} VALUES(`;
			else
				phrase = ',\n(';
			
			typeConfigs.forEach((config, k) =>
			{
				let value = line[k];
				
				if (!config.hasEmpty || value.length > 0)
					if (QUOTED_VALUE.indexOf(config.type) != -1)
						if (value.indexOf('"') == -1)
							phrase += `"${value}",`;
						else
							phrase += `'${value}',`;
					else
						phrase += `${value},`;
				else
					phrase += 'NULL,';
			});
			
			stream.write(phrase.slice(0, -1) + ')');
		};
		
		stream.write(';\nUNLOCK TABLES;\n');
		stream.end();
	});
}

readFile();