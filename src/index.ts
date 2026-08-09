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

const decamelize = (string: string): string => string
	// Separate capitalized words.
	.replaceAll(/([A-Z]{2,})(\d+)/g, '$1 $2')
	.replaceAll(/([a-z\d]+)([A-Z]{2,})/g, '$1 $2')

	.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2')
	// `[a-rt-z]` matches all lowercase characters except `s`.
	// This avoids matching plural acronyms like `APIs`.
	.replaceAll(/([A-Z]+)([A-Z][a-rt-z\d]+)/g, '$1 $2');

const removeMootSeparators = (string: string, separator: string): string => {
	const escapedSeparator = escapeStringRegexp(separator);

	return string
		.replaceAll(new RegExp(`(?:${escapedSeparator}){2,}`, 'g'), separator)
		.replaceAll(new RegExp(`^(?:${escapedSeparator})|(?:${escapedSeparator})$`, 'g'), '');
};

const buildPatternSlug = (options: ResolvedOptions): RegExp => {
	let negationSetPattern = String.raw`a-z\d`;
	negationSetPattern += options.lowercase ? '' : 'A-Z';

	// When transliteration is disabled, preserve Unicode characters
	if (!options.transliterate) {
		negationSetPattern += String.raw`\p{L}\p{N}`;
	}

	if (options.preserveCharacters.length > 0) {
		for (const character of options.preserveCharacters) {
			if (character === options.separator) {
				throw new Error(`The separator character \`${options.separator}\` cannot be included in preserved characters: ${options.preserveCharacters.join(',')}`);
			}

			negationSetPattern += escapeStringRegexp(character);
		}
	}

	const flags = options.transliterate ? 'g' : 'gu';
	return new RegExp(`[^${negationSetPattern}]+`, flags);
};

export default function slugify(string: string, options?: Options): string {
	if (typeof string !== 'string') {
		throw new TypeError(`Expected a string, got \`${typeof string}\``);
	}

	const resolvedOptions: ResolvedOptions = {
		...defaultOptions,
		...options,
	};

	const shouldPrependUnderscore = resolvedOptions.preserveLeadingUnderscore && string.startsWith('_');
	const shouldAppendDash = resolvedOptions.preserveTrailingDash && string.endsWith('-');

	if (resolvedOptions.transliterate) {
		const customReplacements = new Map<string, string>([
			...builtinOverridableReplacements,
			...resolvedOptions.customReplacements,
		]);

		string = transliterate(string, {customReplacements, locale: resolvedOptions.locale});
	} else if (resolvedOptions.customReplacements.length > 0) {
		// Apply custom replacements even when transliteration is disabled
		for (const [key, value] of resolvedOptions.customReplacements) {
			string = string.replaceAll(key, value);
		}
	}

	if (resolvedOptions.decamelize) {
		string = decamelize(string);
	}

	const patternSlug = buildPatternSlug(resolvedOptions);

	if (resolvedOptions.lowercase) {
		string = resolvedOptions.locale ? string.toLocaleLowerCase(resolvedOptions.locale) : string.toLowerCase();
	}

	// Detect contractions/possessives by looking for any word followed by a `'t` or `'s`
	// in isolation and then remove it. Handles both straight and curly apostrophes.
	string = string.replaceAll(/([a-zA-Z\d]+)['’]([ts])(\s|$)/g, '$1$2$3');

	string = string.replace(patternSlug, resolvedOptions.separator);
	string = string.replaceAll('\\', '');

	if (resolvedOptions.separator) {
		string = removeMootSeparators(string, resolvedOptions.separator);
	}

	if (shouldPrependUnderscore) {
		string = `_${string}`;
	}

	if (shouldAppendDash) {
		string = `${string}-`;
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

	const countable = (string: string, options?: Options): string => {
		string = slugify(string, options);

		if (!string) {
			return '';
		}

		const stringLower = string.toLowerCase();
		const numberless = occurrences.get(stringLower.replace(/(?:-\d+?)+?$/, '')) ?? 0;
		const counter = occurrences.get(stringLower);
		occurrences.set(stringLower, typeof counter === 'number' ? counter + 1 : 1);
		const newCounter = occurrences.get(stringLower) ?? 2;
		if (newCounter >= 2 || numberless > 2) {
			string = `${string}-${newCounter}`;
		}

		return string;
	};

	countable.reset = () => {
		occurrences.clear();
	};

	return countable;
}
