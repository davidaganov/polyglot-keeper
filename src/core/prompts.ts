export const TRANSLATION_PROMPT = `Translate the following JSON object's values into the language with code "{targetLang}".
Preserve the keys exactly.
The values may contain placeholders like "{count}", preserve them as is.
Output ONLY the translated JSON object, no markdown, no explanation.

JSON to translate:
{jsonBatch}`
