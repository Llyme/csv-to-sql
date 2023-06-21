const DEFAULT_TYPE = 'INT';
const priority = ['DATETIME', 'DATE', 'TIME', 'INT', 'BIGINT', 'FLOAT', 'CHAR', 'VARCHAR'];

const conditions = {
	DATETIME(text) {
		if (text.length == 0)
			return true;
		
		if (!/^\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d$/.test(text))
			return false;
		
		let datetime = text.split(' ');
		
		return conditions.DATE(datetime[0]) && conditions.TIME(datetime[1]);
	},
	DATE(text) {
		if (text.length == 0)
			return true;
		
		if (!/^\d\d\d\d-\d\d-\d\d$/.test(text))
			return false;
		
		// YYYY-MM-DD
		let date = text.split('-').map(v => Number(v));
		
		// Month
		if (date[1] > 12)
			return false;
		else if (date[1] < 8) {
			if (date[1] % 2 === 0 && date[2] > 30)
				return false;
		} else if (date[1] % 2 === 1 && date[2] > 30)
			return false;
		
		// Day
		if (date[2] > 31)
			return false;
		
		// Leap year.
		if (date[0] % 4 > 0 && date[1] == 2 && date[2] > 28)
			return false;
		
		return true;
	},
	TIME(text) {
		if (text.length == 0)
			return true;
		
		if (!/^\d\d:\d\d:\d\d$/.test(text))
			return false;
		
		let time = text.split(':').map(v => Number(v));
		
		// Hour
		if (time[0] > 23)
			return false;
		
		// Minute
		if (time[1] > 59)
			return false;
		
		// Second
		if (time[2] > 59)
			return false;
		
		return true;
	},
	INT(text) {
		if (text.length == 0)
			return true;
		
		let value = Number(text);
		
		if (value >= 2 ** 31)
			return false;
		
		if (isNaN(value) || value != Math.floor(value))
			return false;
		
		return true;
	},
	BIGINT(text) {
		if (text.length == 0)
			return true;
		
		let value = Number(text);
		
		if (isNaN(value) || value != Math.floor(value))
			return false;
		
		return true;
	},
	FLOAT(text) {
		return text.length == 0 || !isNaN(Number(text));
	},
	CHAR(text) {
		return text.length <= 1;
	}
};

const specials = {
	VARCHAR(maxLength) {
		return `VARCHAR(${maxLength})`;
	}
};

module.exports = {
	read(start, length, predicate) {
		let cache = {};
		let config = {
			type: '',
			typeDescriptor: '',
			hasEmpty: false,
			allEmpty: true,
			unique: true,
			dateformat: null
		};
		let typeId = -1;
		let maxLength = 0;
		
		for (let i = start; i < length; i++) {
			let text = predicate(i) || '';
			
			if (text.length > 0) {
				config.allEmpty = false;
				
				if (config.unique)
					if (cache[text])
						config.unique = false;
					else
						cache[text] = true;
			} else
				config.hasEmpty = true;
			
			if (text.length > maxLength)
				maxLength = text.length;
			
			if (typeId == -1) {
				for (let n = 0; n < priority.length; n++) {
					let condition = conditions[priority[n]];
					
					if (condition == null || condition(text)) {
						typeId = n;
						break;
					}
				}
			} else {
				for (typeId; typeId < priority.length - 1; typeId++) {
					let type = priority[typeId];
					
					if (conditions[type] == null || conditions[type](text))
						break;
				}
			}
		}
		
		if (config.allEmpty)
			config.type = DEFAULT_TYPE;
		else
			config.type = priority[typeId];
		
		if (specials[config.type] != null)
			config.typeDescriptor = specials[config.type](maxLength);
		else
			config.typeDescriptor = config.type;
		
		return config;
	}
}