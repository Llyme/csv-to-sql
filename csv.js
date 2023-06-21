const NEWLINE_R = '\r';
const NEWLINE = '\n';
const QUOTE = '"';
const COMMA = ',';

module.exports = {
	read(text) {
		let array = [];
		let sentence = [];
		let phrase = '';
		let character;
		let n = 0;
		let offset = 0;
		let flag = false;

		function writeCharacter() {
			phrase += character;
		}

		function writePhrase() {
			sentence.push(phrase);
			phrase = '';
			offset = n + 1;
		}

		function writeSentence() {
			sentence.push(phrase);
			array.push(sentence);
			sentence = [];
			phrase = '';
			offset = n + 1;
		}

		while (n < text.length) {
			character = text[n];
			
			if (character == NEWLINE_R) {
				n++;
				continue;
			}

			if (character == QUOTE) {
				if (offset == n)
					flag = true;
				else if (n < text.length - 1 && text[n + 1] == QUOTE) {
					writeCharacter();
					n++;
				} else
					flag = false;
			} else if (character == COMMA) {
				if (!flag)
					writePhrase();
				else
					writeCharacter();
			}
			else if (character == NEWLINE) {
				if (!flag)
					writeSentence();
				else
					writeCharacter();
			}
			else
				writeCharacter();

			n++;
		}

		if (phrase.length > 0)
			sentence.push(phrase);

		if (sentence.length > 0)
			array.push(sentence);

		return array;
	}
}