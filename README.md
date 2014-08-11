# Chrome Extension Twitter Bootstrap 3 Template
> A template for making a Google Chrome Extension, using Twitter Bootstrap 3.

![Screenshot](http://i.imgur.com/RK4GhXu.jpg)

## Jump to Section

* [Getting Started](#getting-started)
* [Installation](#installation)
* [Usage](#usage)

## Getting Started

This package has been made to quickly get yourself up and running with making a new Google Chrome extension.  The basic structure of this package is as follows:

    - css/
		-- bootstrap.min (Edited, please see "important notes")
		-- custom.css (Contains small style tweaks, edit this file at your will)
    - fonts/
        -- glyphicons-halflings-regular.eot
        -- glyphicons-halflings-regular.svg
        -- glyphicons-halflings-regular (TrueType font file)
        -- glyphicons-halflings-regular.woff
    - img/
        -- icon16.png
        -- icon48.png
        -- icon128.png
			--- Please note, this is just a filler image for your extension.
	- js/
		-- bootstrap.min
		-- jquery-2.0.3.min
    - manifest.json
	- popup.html
	- README.md
	
### Installation

- Please either clone this repository or download as a ZIP file.
- Extract the contents into your preferred working directory.
- Open your Google Chrome browser.
- Enter `chrome://extensions/` into the address bar.
- Ensure "Developer Mode" is ticked/enabled in the top right.
- Click on "Load unpacked extension...".
- Navigate to your extracted directory, and click "OK".
- Your basic extension template should now be alongside your address bar, showing the Google Chrome logo.

## Important Notes

Please note, the Bootstrap 3 CSS file has been modified to disable the standard responsive features Bootstrap 3 offers.  Since the maximum width an extension can be is 800px (without overflow), the content and navbar are shrunk into a mobile format when the extension is below 769px.  These changes disable this, to allow your extension to function properly whatever size you wish it to be.

Please visit:

- http://bassjobsen.weblogs.fm/compile-twitters-bootstrap-3-without-responsive-features/
- https://github.com/bassjobsen/non-responsive-tb3/blob/master/bootstrap.css

## Usage

This package is standalone.  Please visit the Google Developer documentation if you wish to know more about Extension creating:

http://developer.chrome.com/extensions/getstarted.html

### Files to edit

The main files you will need to edit are:

> manifest.json

- This contains all of your extension information.
- As an example, the storage permission has been added.
- The default popup window for this extension is called `popup.html`.
- Google Analytics tracking requirement has also been added.

> popup.html

- Contains the basic HTML boilerplate, edit at your will.
- A standard (non-responsive) navbar is enabled.
- The main content area is wrapped inside `section`.

> css/custom.css

- Contains extension height and width.
- Once the extension breaks the height overflow, a styled CSS scroll bar is added.
- Style tweaks are also present to deal with scroll bar presence.