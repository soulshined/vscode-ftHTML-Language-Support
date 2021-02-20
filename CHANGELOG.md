# Change Log

## [v3.0.0]

- Support for ftHTML 3.0.0
  > NOTE: This is a breaking update since templates have been removed. Please update after reading the
  > documentation: https://www.fthtml.com/changelog/#Smaragdine

- Add code action
  - Quickly convert a simple element to a parent element
- Add suggestions (autocomplete) for all language specific features
  - Macros
  - Functions
  - Embedded Langs
  - Keywords
- Added hover documentation and suggestion details
- Added search by symbol (variables and imports are considered symbols)
- Added 'GoTo Definition' and 'Peek Definitions' functionality for import files and variables
  - This works with the new 'by reference' imports as well
- fthtmlconfig.json
  - Removed `templateDir` (templates are now called with the `importDir` as well)
  - Add `jsonDir`
  - Add `prettify` to define if the output file should be minified or not
  - Add `globalvars` (define variables here and then call these variables from any file)
- Small formatting implementation
- Added '#region' to the code folding strategy
- Removed dark and light default altered themes now that vscode allows editing tokens from settings.

### Roadmap:

- A complete custom formatter
- File name autocomplete for import/templates/json
- An HTML to ftHTML converter on copy/paste
- Better 'Problems' identifier and diagnostic information

## [v2.2.4]
- Update to support ftHTML v2.1.5

## [v2.2.3]
- Fixes issue for mac/linux users

## [v2.2.2]
- Supports fthtml v2.1.1
- Changed the convert process from global bin to a local call so you will always be using the version relative to what the extension uses now.

## [v2.2.1]
- Support for fthtml v2.1.0

  see www.fthtml.com for documentation and changes

## [v2.0.0]
- Support for fthtml v2.0.0
  IMPORTANT: Do not update to 2.0.0 until you have reviewed the docs for fthtml 2.0.
  Some changes for future support of features may break your syntax, or cause weird color coding

  see www.fthtml.com for documentation and changes

## [v1.1.0]
-  Support for fthtml v1.0.2

## [v1.0.3]
-  Refreshed file extension icon

## [v1.0.0]
- Initial release