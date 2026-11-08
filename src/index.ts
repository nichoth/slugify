import escapeStringRegexp from 'escape-string-regexp';
import transliterate from '@sindresorhus/transliterate';
import builtinOverridableReplacements from './overridable-replacements.js';

export type Options = {
	/**
		@default '-'

		@example
		```
		import slugify from '@substrate-system/slugify';

		slugify('BAR and baz');
		//=> 'bar-and-baz'

		slugify('BAR and baz', {separator: '_'});
		//=> 'bar_and_baz'

		slugify('BAR and baz', {separator: ''});
		//=> 'barandbaz'
		```
	*/
	readonly separator?: string;

	/**
	Make the slug lowercase.

	@default true

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('Déjà Vu!');
	//=> 'deja-vu'

	slugify('Déjà Vu!', {lowercase: false});
	//=> 'Deja-Vu'
	```
	*/
	readonly lowercase?: boolean;

	/**
	Convert camelcase to separate words. Internally it does
	`fooBar` -> `foo bar`.

	@default true

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('fooBar');
	//=> 'foo-bar'

	slugify('fooBar', {decamelize: false});
	//=> 'foobar'
	```
	*/
	readonly decamelize?: boolean;

	/**
	Add your own custom replacements.

	The replacements are run on the original string before any other
	transformations.

	This only overrides a default replacement if you set an item with the
	same key, like `&`.

	Add a leading and trailing space to the replacement to have it
	separated by dashes.

	@default [ ['&', ' and '], ['🦄', ' unicorn '], ['♥', ' love '] ]

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('Foo@unicorn', {
		customReplacements: [
			['@', 'at']
		]
	});
	//=> 'fooatunicorn'

	slugify('foo@unicorn', {
		customReplacements: [
			['@', ' at ']
		]
	});
	//=> 'foo-at-unicorn'

	slugify('I love 🐶', {
		customReplacements: [
			['🐶', 'dogs']
		]
	});
	//=> 'i-love-dogs'
	```
	*/
	readonly customReplacements?: ReadonlyArray<[string, string]>;

	/**
	If your string starts with an underscore, it will be preserved in the
	slugified string.

	Sometimes leading underscores are intentional, for example, filenames
	representing hidden paths on a website.

	@default false

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('_foo_bar');
	//=> 'foo-bar'

	slugify('_foo_bar', {preserveLeadingUnderscore: true});
	//=> '_foo-bar'
	```
	*/
	readonly preserveLeadingUnderscore?: boolean;

	/**
	If your string ends with a dash, it will be preserved in the slugified
	string.

	For example, using slugify on an input field would allow for validation
	while not preventing the user from writing a slug.

	@default false

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('foo-bar-');
	//=> 'foo-bar'

	slugify('foo-bar-', {preserveTrailingDash: true});
	//=> 'foo-bar-'
	```
	*/
	readonly preserveTrailingDash?: boolean;

	/**
	Preserve certain characters.

	It cannot contain the `separator`.

	For example, if you want to slugify URLs, but preserve the HTML
	fragment `#` character, you could set `preserveCharacters: ['#']`.

	@default []

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('foo_bar#baz', {preserveCharacters: ['#']});
	//=> 'foo-bar#baz'
	```
	*/
	readonly preserveCharacters?: readonly string[];

	/**
	The locale to use for language-specific transliteration.

	See the [`@sindresorhus/transliterate` package](https://github.com/sindresorhus/transliterate#locale)
	for more info.

	@default undefined

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('Räksmörgås');
	//=> 'raeksmoergas'

	slugify('Räksmörgås', {locale: 'sv'});
	//=> 'raksmorgas'
	```
	*/
	readonly locale?: string | undefined;

	/**
	Whether to transliterate Unicode characters to ASCII.

	When `false`, non-ASCII characters will be preserved instead of being
	transliterated. This can improve performance when you don't need
	transliteration.

	@default true

	@example
	```
	import slugify from '@substrate-system/slugify';

	slugify('Déjà Vu');
	//=> 'deja-vu'

	slugify('Déjà Vu', {transliterate: false});
	//=> 'déjà-vu'
	```
	*/
	readonly transliterate?: boolean;
};

/**
`Options` after the defaults have been applied. Everything except `locale`
is guaranteed to be present, so the internal helpers do not need to handle
`undefined`.
*/
type ResolvedOptions = {
	readonly separator: string;
	readonly lowercase: boolean;
	readonly decamelize: boolean;
	readonly customReplacements: ReadonlyArray<[string, string]>;
	readonly preserveLeadingUnderscore: boolean;
	readonly preserveTrailingDash: boolean;
	readonly preserveCharacters: readonly string[];
	readonly transliterate: boolean;
	readonly locale?: string | undefined;
};

const defaultOptions: ResolvedOptions = {
	separator: '-',
	lowercase: true,
	decamelize: true,
	customReplacements: [],
	preserveLeadingUnderscore: false,
	preserveTrailingDash: false,
	preserveCharacters: [],
	transliterate: true,
};

// Separate capitalized words. Each pattern captures the least leading
// context it needs, as a greedy quantifier there causes quadratic
// backtracking on long runs of the same character class.
const decamelize = (string: string): string => string
	// `FOO360` -> `FOO 360`
	.replaceAll(
		/(?<acronym>[A-Z]{2})(?<digits>\d+)/g,
		'$<acronym> $<digits>',
	)
	// `foo360BAR` -> `foo360 BAR`, `fooBar` -> `foo Bar`
	.replaceAll(
		/(?<word>[\da-z])(?<uppercase>[A-Z])/g,
		'$<word> $<uppercase>',
	)
	// `APISection` -> `API Section`. A lowercase `s` right after the
	// acronym is a plural marker rather than the start of a new word,
	// unless another lowercase letter follows it, so `APIs` is left alone
	// while `APIUsage` is still separated.
	.replaceAll(
		/(?<acronymHead>[A-Z])(?<rest>[A-Z](?!s(?![a-z]))[\da-z]+)/g,
		'$<acronymHead> $<rest>',
	);

const removeMootSeparators = (string: string, separator: string): string => {
	const escapedSeparator = escapeStringRegexp(separator);
	const repeated = new RegExp(`(?:${escapedSeparator}){2,}`, 'g');
	const edges = new RegExp(
		`^(?:${escapedSeparator})|(?:${escapedSeparator})$`,
		'g',
	);

	// The replacement is a function so a separator containing `$` is
	// inserted literally instead of being read as a replacement pattern.
	return string
		.replaceAll(repeated, () => separator)
		.replaceAll(edges, '');
};

// Strip the trailing counter groups from a slug, so `foo-1-2` becomes
// `foo`. This is done with a split rather than a `(?:-\d+)+$` regex, as
// that pattern is unanchored and so retries at every `-` in the string,
// which is quadratic on input such as `-1-1-1...-1a`.
const removeCounterSuffix = (string: string): string => {
	const parts = string.split('-');

	while (parts.length > 1 && /^\d+$/.test(parts.at(-1) ?? '')) {
		parts.pop();
	}

	return parts.join('-');
};

const buildPatternSlug = (options: ResolvedOptions): RegExp => {
	let negationSetPattern = String.raw`a-z\d`;
	negationSetPattern += options.lowercase ? '' : 'A-Z';

	// When transliteration is disabled, preserve Unicode characters,
	// including combining marks
	if (!options.transliterate) {
		negationSetPattern += String.raw`\p{L}\p{M}\p{N}`;
	}

	for (const character of options.preserveCharacters) {
		if (character === options.separator) {
			throw new Error(`The separator character \`${options.separator}\` cannot be included in preserved characters: ${options.preserveCharacters.join(',')}`);
		}

		negationSetPattern += escapeStringRegexp(character);
	}

	// Not `v`, as `escapeStringRegexp` does not escape characters that a
	// `v`-mode character class requires escaped, like `/` and `&&`. The
	// `u` flag is enough for `\p{...}`.
	const flags = options.transliterate ? 'g' : 'gu';
	// Discard combining marks with a removed character so emoji do not
	// leave orphaned variation selectors.
	const combiningMarks = options.transliterate ? '' : String.raw`\p{M}*`;
	return new RegExp(
		`(?:[^${negationSetPattern}]${combiningMarks})+`,
		flags,
	);
};

// The locale is only used without transliteration, as a transliterated
// string is ASCII and locale-aware lowercasing could make it non-ASCII
// again, like `I` to `ı` for Turkish.
const toLowerCase = (string: string, options: ResolvedOptions): string => {
	if (!options.locale || options.transliterate) {
		return string.toLowerCase();
	}

	return string.toLocaleLowerCase(options.locale);
};

// Drop the apostrophe from contractions and possessives so that
// `Conway's Law` becomes `conways-law` rather than `conway-s-law`. Only a
// word-final `'t` or `'s` qualifies, so `foo'sbar` is left alone, and both
// straight and curly apostrophes are handled. What counts as a word
// character has to be what survives into the slug, so it widens to Unicode
// alongside `buildPatternSlug` when transliteration is disabled. The `i`
// flag covers `DON'T` when the `lowercase` option is disabled.
const contractionEnd = String.raw`['\u{2019}](?<ending>[st])`;
const asciiContraction = new RegExp(
	String.raw`(?<word>[\da-z])${contractionEnd}(?![\da-z])`,
	'giu',
);
const unicodeWord = String.raw`[\p{Letter}\p{Mark}\p{Number}]`;
const unicodeContraction = new RegExp(
	`(?<word>${unicodeWord})${contractionEnd}(?!${unicodeWord})`,
	'giu',
);

export default function slugify(string: string, options?: Options): string {
	if (typeof string !== 'string') {
		throw new TypeError(`Expected a string, got \`${typeof string}\``);
	}

	// An option set to `undefined` uses the default.
	const definedOptions = Object.fromEntries(Object.entries(options ?? {})
		.filter(([, value]) => value !== undefined)) as Options;

	const resolvedOptions: ResolvedOptions = {
		...defaultOptions,
		...definedOptions,
	};

	const shouldPrependUnderscore = resolvedOptions.preserveLeadingUnderscore && string.startsWith('_');
	const shouldAppendDash = resolvedOptions.preserveTrailingDash && string.endsWith('-');

	if (resolvedOptions.transliterate) {
		const customReplacements = new Map<string, string>([
			...builtinOverridableReplacements,
			...resolvedOptions.customReplacements,
		]);

		string = transliterate(string, {customReplacements, locale: resolvedOptions.locale});
	} else {
		// Apply custom replacements even when transliteration is disabled
		for (const [key, value] of resolvedOptions.customReplacements) {
			// A replacement value keeps `replaceAll`'s replacement-pattern
			// semantics here, so that this branch agrees with the
			// transliterating one, where `@sindresorhus/transliterate`
			// applies the same replacements the same way. Escaping `$`
			// would make the two branches disagree.
			string = string.replaceAll(key, value);
		}
	}

	if (resolvedOptions.decamelize) {
		string = decamelize(string);
	}

	const patternSlug = buildPatternSlug(resolvedOptions);

	if (resolvedOptions.lowercase) {
		string = toLowerCase(string, resolvedOptions);
	}

	string = string.replaceAll(
		resolvedOptions.transliterate ? asciiContraction : unicodeContraction,
		'$<word>$<ending>',
	);

	// The replacement is a function so a separator containing `$` is
	// inserted literally instead of being read as a replacement pattern.
	string = string.replace(patternSlug, () => resolvedOptions.separator);

	if (resolvedOptions.separator) {
		string = removeMootSeparators(string, resolvedOptions.separator);
	}

	if (shouldPrependUnderscore) {
		string = `_${string}`;
	}

	if (shouldAppendDash) {
		string += '-';
	}

	return string;
}

export type CountableSlugify = {
	/**
	Reset the counter.

	@example
	```
	import {slugifyWithCounter} from '@substrate-system/slugify';

	const slugify = slugifyWithCounter();

	slugify('foo bar');
	//=> 'foo-bar'

	slugify('foo bar');
	//=> 'foo-bar-2'

	slugify.reset();

	slugify('foo bar');
	//=> 'foo-bar'
	```
	*/
	reset: () => void;

	/**
	Returns a new instance of `slugify(string, options?)` with a counter to
	handle multiple occurrences of the same string.

	@param string - String to slugify.
	*/
	(string: string, options?: Options): string;
};

export function slugifyWithCounter(): CountableSlugify {
	const occurrences = new Map<string, number>();
	const returned = new Set<string>();

	const countable = (string: string, options?: Options): string => {
		string = slugify(string, options);

		if (!string) {
			return '';
		}

		const stringLower = string.toLowerCase();
		const base = removeCounterSuffix(stringLower);
		const numberless = occurrences.get(base) ?? 0;
		const counter = occurrences.get(stringLower);
		const nextCount = typeof counter === 'number' ? counter + 1 : 1;
		occurrences.set(stringLower, nextCount);
		let newCounter = occurrences.get(stringLower) ?? 2;
		const needsCounter = newCounter >= 2 || numberless > 2;
		let result = needsCounter ? `${string}-${newCounter}` : string;

		// The counter is keyed on the incoming slug, so it cannot see a
		// slug that was previously handed out by appending a counter to a
		// *different* input. Without this loop, `foo`, `foo`, `foo 2` would
		// return `foo-2` twice. Keep bumping the counter until the result is
		// one that has not been returned before.
		while (returned.has(result.toLowerCase())) {
			newCounter += 1;
			occurrences.set(stringLower, newCounter);
			result = `${string}-${newCounter}`;
		}

		returned.add(result.toLowerCase());

		return result;
	};

	countable.reset = () => {
		occurrences.clear();
		returned.clear();
	};

	return countable;
}
