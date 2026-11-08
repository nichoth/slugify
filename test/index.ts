import {test} from '@substrate-system/tapzero';
import slugify, {slugifyWithCounter} from '../src/index.js';

test('main', t => {
	t.plan(21);
	t.equal(slugify('Foo Bar'), 'foo-bar');
	t.equal(slugify('foo bar baz'), 'foo-bar-baz');
	t.equal(slugify('foo bar '), 'foo-bar');
	t.equal(slugify('       foo bar'), 'foo-bar');
	t.equal(slugify('[foo] [bar]'), 'foo-bar');
	t.equal(slugify('Foo ÿ'), 'foo-y');
	t.equal(slugify('FooBar'), 'foo-bar');
	t.equal(slugify('fooBar'), 'foo-bar');
	t.equal(slugify('UNICORNS AND RAINBOWS'), 'unicorns-and-rainbows');
	t.equal(slugify('Foo & Bar'), 'foo-and-bar');
	t.equal(slugify('Hællæ, hva skjera?'), 'haellae-hva-skjera');
	t.equal(slugify('Foo Bar2'), 'foo-bar2');
	t.equal(slugify('I ♥ Dogs'), 'i-love-dogs');
	t.equal(slugify('Déjà Vu!'), 'deja-vu');
	t.equal(slugify('fooBar 123 $#%'), 'foo-bar-123');
	t.equal(slugify('foo🦄'), 'foo-unicorn');
	t.equal(slugify('🦄🦄🦄'), 'unicorn-unicorn-unicorn');
	t.equal(slugify('foo&bar'), 'foo-and-bar');
	t.equal(slugify('foo360BAR'), 'foo360-bar');
	t.equal(slugify('FOO360'), 'foo-360');
	t.equal(slugify('FOOBar'), 'foo-bar');
});

test('decamelize acronyms', t => {
	t.plan(13);
	t.equal(slugify('APISection'), 'api-section');
	// The word after the acronym has `s` as its second letter, which used to prevent the split.
	t.equal(slugify('HTMLEscape'), 'html-escape');
	t.equal(slugify('XMLMsgBox'), 'xml-msg-box');
	// The minimum two-character acronym splits from a following capitalized word.
	t.equal(slugify('IDValue'), 'id-value');
	// The minimum uppercase run also splits from a numeric suffix.
	t.equal(slugify('ID2'), 'id-2');
	// Acronyms split correctly when preceded by a lowercase word.
	t.equal(slugify('parseXMLDocument'), 'parse-xml-document');
	// Multiple acronym-to-word boundaries are handled in the same identifier.
	t.equal(slugify('XMLHttpAPIResponse'), 'xml-http-api-response');
	// Numeric acronym suffixes compose with a following capitalized word.
	t.equal(slugify('HTML5Parser'), 'html-5-parser');

	// A plural acronym stays intact.
	t.equal(slugify('APIs'), 'apis');
	t.equal(slugify('Util APIs'), 'util-apis');
	t.equal(slugify('APIsAndMore'), 'apis-and-more');
	t.equal(slugify('APIs2'), 'apis2');
	// A plural acronym remains intact between camel-cased words.
	t.equal(slugify('getAPIsNow'), 'get-apis-now');
});

test('possessives and contractions', t => {
	t.plan(33);
	// Straight apostrophes
	t.equal(slugify('Conway\'s Law'), 'conways-law');
	t.equal(slugify('Conway\'s'), 'conways');
	t.equal(slugify('Don\'t Repeat Yourself'), 'dont-repeat-yourself');
	t.equal(slugify('my parents\' rules'), 'my-parents-rules');
	t.equal(slugify('it-s-hould-not-modify-t-his'), 'it-s-hould-not-modify-t-his');

	// Curly/smart apostrophes
	t.equal(slugify('Sindre’s app'), 'sindres-app');
	t.equal(slugify('can’t stop'), 'cant-stop');
	t.equal(slugify('won’t work'), 'wont-work');

	// Punctuation after the contraction must not stop it from being collapsed.
	t.equal(slugify('Don\'t!'), 'dont');
	t.equal(slugify('Conway\'s, revisited'), 'conways-revisited');
	t.equal(slugify('it\'s, then'), 'its-then');
	t.equal(slugify('can\'t-stop'), 'cant-stop');
	t.equal(slugify('it\'s...'), 'its');
	t.equal(slugify('Don’t!'), 'dont');
	t.equal(slugify('(it\'s)'), 'its');
	t.equal(slugify('He said “It\'s”'), 'he-said-its');
	t.equal(slugify('user\'s_id'), 'users-id');

	// Several contractions in the same string.
	t.equal(slugify('It\'s, Bob\'s, and Sue\'s.'), 'its-bobs-and-sues');

	// A digit before the apostrophe counts as the word.
	t.equal(slugify('1990\'s, 2000\'s'), '1990s-2000s');

	// Not a contraction when a letter or digit follows.
	t.equal(slugify('foo\'sbar'), 'foo-sbar');
	t.equal(slugify('it\'s2'), 'it-s2');

	// An apostrophe that does not end a `'s`/`'t` word is untouched.
	t.equal(slugify('\'tis the season'), 'tis-the-season');
	t.equal(slugify('rock \'n\' roll'), 'rock-n-roll');

	// Works with the other options.
	t.equal(slugify('Don\'t! stop', {separator: '_'}), 'dont_stop');
	t.equal(slugify('Don\'t! stop', {separator: ''}), 'dontstop');
	t.equal(slugify('Don\'t Stop, Please', {lowercase: false}), 'Dont-Stop-Please');
	// An uppercase contraction is collapsed too when `lowercase` is disabled.
	t.equal(slugify('DON\'T STOP!', {lowercase: false}), 'DONT-STOP');
	t.equal(slugify('IT\'S, THEN', {lowercase: false}), 'ITS-THEN');
	// Unicode letters kept by `transliterate: false` count as part of the word on both sides of the apostrophe.
	t.equal(slugify('Don’t!', {transliterate: false}), 'dont');
	t.equal(slugify('Déjà’s vu', {transliterate: false}), 'déjàs-vu');
	t.equal(slugify('foo\'sé', {transliterate: false}), 'foo-sé');
	// A character transliteration drops cannot be part of the word, so the contraction still ends there.
	t.equal(slugify('Sindre\'s日記'), 'sindres');
	t.equal(slugify('Sindre\'s日記', {transliterate: false}), 'sindre-s日記');
});

test('custom separator', t => {
	t.plan(14);
	t.equal(slugify('foo bar', {separator: '_'}), 'foo_bar');
	t.equal(slugify('aaa bbb', {separator: ''}), 'aaabbb');
	t.equal(slugify('BAR&baz', {separator: '_'}), 'bar_and_baz');
	t.equal(slugify('Déjà Vu!', {separator: '-'}), 'deja-vu');
	t.equal(slugify('UNICORNS AND RAINBOWS!', {separator: '@'}), 'unicorns@and@rainbows');
	t.equal(slugify('[foo] [bar]', {separator: '.'}), 'foo.bar', 'escape regexp special characters');

	// Test multi-character separator collapse
	t.equal(slugify('a   b   c', {separator: '__'}), 'a__b__c');
	t.equal(slugify('a____b', {separator: '__'}), 'a__b');
	t.equal(slugify('__a__b__', {separator: '__'}), 'a__b');
	t.equal(slugify('foo---bar', {separator: '---'}), 'foo---bar');

	// A backslash is kept when it is the separator or a preserved character, and removed otherwise
	t.equal(slugify('foo bar', {separator: '\\'}), String.raw`foo\bar`);
	t.equal(slugify(String.raw`foo\bar baz`, {preserveCharacters: ['\\']}), String.raw`foo\bar-baz`);
	t.equal(slugify(String.raw`foo\bar baz`, {transliterate: false, preserveCharacters: ['\\']}), String.raw`foo\bar-baz`);
	t.equal(slugify(String.raw`foo\bar`), 'foo-bar');
});

test('options set to `undefined` use the defaults', t => {
	t.plan(1);
	t.equal(slugify('Déjà Vu fooBar', {
		separator: undefined,
		lowercase: undefined,
		decamelize: undefined,
		customReplacements: undefined,
		preserveLeadingUnderscore: undefined,
		preserveTrailingDash: undefined,
		preserveCharacters: undefined,
		transliterate: undefined,
		locale: undefined,
	}), 'deja-vu-foo-bar');
});

test('a separator containing `$` is inserted literally', t => {
	t.plan(4);
	// A separator is a plain string, not a replacement pattern, so `$&`, `$$` and `` $` `` must not be expanded.
	t.equal(slugify('foo bar', {separator: '$&'}), 'foo$&bar');
	t.equal(slugify('foo bar', {separator: '$$'}), 'foo$$bar');
	t.equal(slugify('foo bar', {separator: '$1'}), 'foo$1bar');
	t.equal(slugify('foo bar', {separator: '$`'}), 'foo$`bar');
});

test('custom replacements', t => {
	t.plan(5);
	t.equal(slugify('foo | bar', {
		customReplacements: [
			['|', ' or '],
		],
	}), 'foo-or-bar');

	t.equal(slugify('10 | 20 %', {
		customReplacements: [
			['|', ' or '],
			['%', ' percent '],
		],
	}), '10-or-20-percent');

	t.equal(slugify('I ♥ 🦄', {
		customReplacements: [
			['♥', ' amour '],
			['🦄', ' licorne '],
		],
	}), 'i-amour-licorne');

	t.equal(slugify('x.y.z', {
		customReplacements: [
			['.', ''],
		],
	}), 'xyz');

	t.equal(slugify('Zürich', {
		customReplacements: [
			['ä', 'ae'],
			['ö', 'oe'],
			['ü', 'ue'],
			['ß', 'ss'],
		],
	}), 'zuerich');
});

test('lowercase option', t => {
	t.plan(6);
	t.equal(slugify('foo bar', {lowercase: false}), 'foo-bar');
	t.equal(slugify('BAR&baz', {lowercase: false}), 'BAR-and-baz');
	t.equal(slugify('Déjà Vu!', {separator: '_', lowercase: false}), 'Deja_Vu');
	t.equal(slugify('UNICORNS AND RAINBOWS!', {separator: '@', lowercase: false}), 'UNICORNS@AND@RAINBOWS');
	t.equal(slugify('[foo] [bar]', {separator: '.', lowercase: false}), 'foo.bar', 'escape regexp special characters');
	t.equal(slugify('Foo🦄', {lowercase: false}), 'Foo-unicorn');
});

test('decamelize option', t => {
	t.plan(2);
	t.equal(slugify('fooBar'), 'foo-bar');
	t.equal(slugify('fooBar', {decamelize: false}), 'foobar');
});

test('supports German umlauts', t => {
	t.plan(1);
	t.equal(slugify('ä ö ü Ä Ö Ü ß', {lowercase: false, separator: ' '}), 'ae oe ue Ae Oe Ue ss');
});

test('supports Vietnamese', t => {
	t.plan(1);
	t.equal(slugify('ố Ừ Đ', {lowercase: false, separator: ' '}), 'o U D');
});

test('supports Arabic', t => {
	t.plan(1);
	t.equal(slugify('ث س و', {lowercase: false, separator: ' '}), 'th s w');
});

test('supports Persian / Farsi', t => {
	t.plan(1);
	t.equal(slugify('چ ی پ', {lowercase: false, separator: ' '}), 'ch y p');
});

test('supports Urdu', t => {
	t.plan(1);
	t.equal(slugify('ٹ ڈ ھ', {lowercase: false, separator: ' '}), 't d h');
});

test('supports Pashto', t => {
	t.plan(1);
	t.equal(slugify('ګ ړ څ', {lowercase: false, separator: ' '}), 'g r c');
});

test('supports Russian', t => {
	t.plan(1);
	t.equal(slugify('Ж п ю', {lowercase: false, separator: ' '}), 'Zh p yu');
});

test('supports Romanian', t => {
	t.plan(1);
	t.equal(slugify('ș Ț', {lowercase: false, separator: ' '}), 's T');
});

test('supports Turkish', t => {
	t.plan(1);
	t.equal(slugify('İ ı Ş ş Ç ç Ğ ğ', {lowercase: false, separator: ' '}), 'I i S s C c G g');
});

test('supports Armenian', t => {
	t.plan(1);
	t.equal(slugify('Ե ր ե ւ ա ն', {lowercase: false, separator: ' '}), 'Ye r ye v a n');
});

test('leading underscore', t => {
	t.plan(4);
	t.equal(slugify('_foo bar', {preserveLeadingUnderscore: true}), '_foo-bar');
	t.equal(slugify('_foo_bar', {preserveLeadingUnderscore: true}), '_foo-bar');
	t.equal(slugify('__foo__bar', {preserveLeadingUnderscore: true}), '_foo-bar');
	t.equal(slugify('____-_______foo__bar', {preserveLeadingUnderscore: true}), '_foo-bar');
});

test('trailing dash', t => {
	t.plan(5);
	t.equal(slugify('foo bar-', {preserveTrailingDash: true}), 'foo-bar-');
	t.equal(slugify('foo-bar--', {preserveTrailingDash: true}), 'foo-bar-');
	t.equal(slugify('foo-bar -', {preserveTrailingDash: true}), 'foo-bar-');
	t.equal(slugify('foo-bar - ', {preserveTrailingDash: true}), 'foo-bar');
	t.equal(slugify('foo-bar ', {preserveTrailingDash: true}), 'foo-bar');
});

test('counter', t => {
	t.plan(26);
	const countingSlugify = slugifyWithCounter();
	t.equal(countingSlugify('foo bar'), 'foo-bar');
	t.equal(countingSlugify('foo bar'), 'foo-bar-2');

	countingSlugify.reset();

	t.equal(countingSlugify('foo'), 'foo');
	t.equal(countingSlugify('foo'), 'foo-2');
	t.equal(countingSlugify('foo 1'), 'foo-1');
	t.equal(countingSlugify('foo-1'), 'foo-1-2');
	t.equal(countingSlugify('foo-1'), 'foo-1-3');
	t.equal(countingSlugify('foo'), 'foo-3');
	t.equal(countingSlugify('foo'), 'foo-4');
	t.equal(countingSlugify('foo-1'), 'foo-1-4');
	t.equal(countingSlugify('foo-2'), 'foo-2-1');
	t.equal(countingSlugify('foo-2'), 'foo-2-2');
	t.equal(countingSlugify('foo-2-1'), 'foo-2-1-1');
	t.equal(countingSlugify('foo-2-1'), 'foo-2-1-2');
	t.equal(countingSlugify('foo-11'), 'foo-11-1');
	t.equal(countingSlugify('foo-111'), 'foo-111-1');
	t.equal(countingSlugify('foo-111-1'), 'foo-111-1-1');
	t.equal(countingSlugify('fooCamelCase', {lowercase: false, decamelize: false}), 'fooCamelCase');
	t.equal(countingSlugify('fooCamelCase', {decamelize: false}), 'foocamelcase-2');
	t.equal(countingSlugify('_foo'), 'foo-5');
	t.equal(countingSlugify('_foo', {preserveLeadingUnderscore: true}), '_foo');
	t.equal(countingSlugify('_foo', {preserveLeadingUnderscore: true}), '_foo-2');

	const secondCountingSlugify = slugifyWithCounter();
	t.equal(secondCountingSlugify('foo'), 'foo');
	t.equal(secondCountingSlugify('foo'), 'foo-2');

	t.equal(secondCountingSlugify(''), '', 'first empty slug');
	t.equal(secondCountingSlugify(''), '', 'an empty slug must not consume a counter value');
});

test('slugifyWithCounter() never returns the same slug twice', t => {
	t.plan(13);
	// A slug produced by appending a counter to one input can collide with the plain slug of a different input, as the counter is keyed on the incoming slug only.
	const countingSlugify = slugifyWithCounter();
	t.equal(countingSlugify('foo'), 'foo');
	t.equal(countingSlugify('foo'), 'foo-2');
	t.equal(countingSlugify('foo 2'), 'foo-2-2');

	countingSlugify.reset();

	// The same collision in the other order.
	t.equal(countingSlugify('foo'), 'foo');
	t.equal(countingSlugify('foo 2'), 'foo-2');
	t.equal(countingSlugify('foo'), 'foo-3');

	countingSlugify.reset();

	// The bump has to keep going while the next candidate is also taken.
	t.equal(countingSlugify('bar'), 'bar');
	t.equal(countingSlugify('bar 2'), 'bar-2');
	t.equal(countingSlugify('bar 3'), 'bar-3');
	t.equal(countingSlugify('bar'), 'bar-4');

	countingSlugify.reset();

	// The collision check is case-insensitive, matching the counter itself.
	t.equal(countingSlugify('baz'), 'baz');
	t.equal(countingSlugify('BAZ 2', {lowercase: false}), 'BAZ-2');
	t.equal(countingSlugify('baz'), 'baz-3');
});

test('preserve characters', async t => {
	t.plan(15);
	t.equal(slugify('foo#bar', {preserveCharacters: []}), 'foo-bar');
	t.equal(slugify('foo.bar', {preserveCharacters: []}), 'foo-bar');
	t.equal(slugify('foo?bar ', {preserveCharacters: ['#']}), 'foo-bar');
	t.equal(slugify('foo#bar', {preserveCharacters: ['#']}), 'foo#bar');
	t.equal(slugify('foo_bar#baz', {preserveCharacters: ['#']}), 'foo-bar#baz');
	t.equal(slugify('foo.bar#baz-quux', {preserveCharacters: ['.', '#']}), 'foo.bar#baz-quux');
	t.equal(slugify('foo.bar#baz-quux', {separator: '.', preserveCharacters: ['-']}), 'foo.bar.baz-quux');

	// Contraction collapsing runs first, so a word-final `'s`/`'t` apostrophe is dropped even when `'` is preserved.
	t.equal(slugify('it\'s!', {preserveCharacters: ['\'']}), 'its');
	t.equal(slugify('rock \'n\' roll', {preserveCharacters: ['\'']}), 'rock-\'n\'-roll');

	// Characters that are only special in a `v`-mode character class work without transliteration too
	t.equal(slugify('foo/bar baz', {transliterate: false, preserveCharacters: ['/']}), 'foo/bar-baz');
	t.equal(slugify('foo&&bar', {transliterate: false, preserveCharacters: ['&', '&']}), 'foo&&bar');
	t.equal(slugify('foo#!~bar', {transliterate: false, preserveCharacters: ['#', '#', '!', '~']}), 'foo#!~bar');
	t.equal(slugify('foo.-|bar', {transliterate: false, preserveCharacters: ['.', '-', '|'], separator: '_'}), 'foo.-|bar');

	await t.throws(() => {
		slugify('foo', {separator: '-', preserveCharacters: ['-']});
	}, /cannot be included in preserved characters/);
	await t.throws(() => {
		slugify('foo', {separator: '.', preserveCharacters: ['.']});
	}, /cannot be included in preserved characters/);
});

test('locale option', t => {
	t.plan(12);
	// Locale-specific transliteration
	t.equal(slugify('Räksmörgås'), 'raeksmoergas');
	t.equal(slugify('Räksmörgås', {locale: 'sv'}), 'raksmorgas');
	t.equal(slugify('Räksmörgås', {locale: 'de'}), 'raeksmoergas');
	t.equal(slugify('Fön', {locale: 'de'}), 'foen');
	t.equal(slugify('Fön', {locale: 'sv'}), 'fon');

	// Locale-specific lowercasing demonstrates locale awareness
	// Note: Some locales may have complex behavior with transliteration
	t.equal(slugify('TEST', {locale: 'tr'}), 'test'); // Basic test
	t.equal(slugify('TEST'), 'test'); // Default behavior same for basic ASCII

	// The transliterated `I` must not be lowercased to the non-ASCII dotless `ı`, which would then be dropped
	t.equal(slugify('ISTANBUL', {locale: 'tr'}), 'istanbul');
	t.equal(slugify('İstanbul', {locale: 'tr'}), 'istanbul');
	t.equal(slugify('BAKI', {locale: 'az'}), 'baki');

	// Without transliteration, the locale is used for lowercasing
	t.equal(slugify('ISTANBUL', {locale: 'tr', transliterate: false}), 'ıstanbul');
	t.equal(slugify('İstanbul', {locale: 'tr', transliterate: false}), 'istanbul');
});

test('transliterate option disabled', t => {
	t.plan(15);
	// Test what happens when transliteration is disabled
	// ASCII characters work normally
	t.equal(slugify('foo bar', {transliterate: false}), 'foo-bar');
	t.equal(slugify('hello world', {transliterate: false}), 'hello-world');

	// Non-ASCII characters are preserved instead of transliterated
	t.equal(slugify('Déjà Vu', {transliterate: false}), 'déjà-vu');
	t.equal(slugify('Räksmörgås', {transliterate: false}), 'räksmörgås');
	t.equal(slugify('你好世界', {transliterate: false}), '你好世界');
	t.equal(slugify('مرحبا', {transliterate: false}), 'مرحبا');

	// Combining marks are preserved with their base letters
	t.equal(slugify('हिन्दी', {transliterate: false}), 'हिन्दी');
	t.equal(slugify('नमस्ते दुनिया', {transliterate: false}), 'नमस्ते-दुनिया');
	t.equal(slugify('Café au lait', {transliterate: false}), 'café-au-lait');
	t.equal(slugify('Café\'s menu', {transliterate: false}), 'cafés-menu');

	// Custom replacements should still work when transliterate is disabled
	t.equal(slugify('foo & bar', {transliterate: false, customReplacements: [['&', ' and ']]}), 'foo-and-bar');

	// Built-in replacements (like & -> and) are disabled when transliterate is false
	t.equal(slugify('foo & bar', {transliterate: false}), 'foo-bar');

	// Mixed ASCII and non-ASCII
	t.equal(slugify('Hello Déjà Vu', {transliterate: false}), 'hello-déjà-vu');

	// Ensure transliterate: true still works normally (default behavior)
	t.equal(slugify('Déjà Vu'), 'deja-vu');
	t.equal(slugify('foo & bar'), 'foo-and-bar');
});

test('discarded emoji do not leave combining marks behind', t => {
	t.plan(7);
	t.equal(slugify('☀️', {transliterate: false}), '');
	t.equal(slugify('Hello ❤️ world', {transliterate: false}), 'hello-world');
	t.equal(slugify('✈️ Flights', {transliterate: false}), 'flights');
	t.equal(slugify('Café ☕️', {transliterate: false}), 'café');
	t.equal(slugify('☀️', {transliterate: false, preserveCharacters: ['☀']}), '☀️');

	const countingSlugify = slugifyWithCounter();
	t.equal(countingSlugify('☀️', {transliterate: false}), '');
	t.equal(countingSlugify('✈️', {transliterate: false}), '');
});

test('slugifyWithCounter() is not vulnerable to ReDoS', t => {
	t.plan(1);
	const countingSlugify = slugifyWithCounter();

	// Stripping the trailing counter used to backtrack quadratically on a long run of `-<digits>` groups that ends in a non-digit. This input took over 30 seconds; the threshold is generous so that it only trips on that blowup.
	const start = performance.now();
	countingSlugify(`${'-1'.repeat(50_000)}a`);
	const duration = performance.now() - start;

	t.ok(duration < 5000, `Took ${duration.toFixed(0)}ms`);
});
