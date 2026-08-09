import slugify from '../src/index.js';
import './style.css';

const input = document.querySelector<HTMLInputElement>('#text-input')!;
const output = document.querySelector<HTMLOutputElement>('#output')!;

/**
Render the slug for the given text.
*/
function render(text: string): void {
	output.textContent = slugify(text);
}

input.addEventListener('input', event => {
	render((event.target as HTMLInputElement).value);
});

// The input ships with a default value, so paint once on load.
render(input.value);
