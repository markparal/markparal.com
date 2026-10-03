# My Personal Website
This codebase operates my personal website using GitHub pages. The base format uses a slightly modified version of the [Tactile](https://github.com/pages-themes/tactile?tab=readme-ov-file) theme. 

The website includes sections covering:
- _Projects_
- _Publications_
- _Resume_
- _About_

## Organization
The splash page is `index.md`. 

The files for the main website pages (_Projects_, _Publications_, etc.) are located in the default directory as .md files. 

Assets such as images and pdfs as well as a css stylesheet can be found in the `/assets` directory. 

The various project pages are located in the `/_projects` directory as .md files. 

The modified Tactile html layout can be found in the `/_layouts` directory.

The main Jekyll settings file is `_config.yml`.

Local debugging and testing is accomplished with the Gemfiles, which contains the Ruby libraries needed to run the site.

## Testing
One can test the website locally using the command

    bundle exec jekyll serve

## Markdown
Use [this](https://www.markdownguide.org/basic-syntax/) helpful guide for Markdown syntax.
