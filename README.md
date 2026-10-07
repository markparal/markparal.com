# My Personal Website
This codebase operates my personal website using GitHub pages. The base format uses a slightly modified version of the [Tactile](https://github.com/pages-themes/tactile?tab=readme-ov-file) theme. 

The website includes sections covering:
- _Projects_
- _Publications_
- _Resume_
- _About_

## Organization
The splash page is `index.md`. 

The files for the main website pages (_Projects_, _Publications_, etc.) are located in the default directory as .md or .html files. 

Assets such as images and pdfs as well as a css stylesheet can be found in the `/assets` directory. 

The various project pages are located in the `/_projects` directory as .md files. Publications are listed from the `/_publications` directory.

The modified Tactile html layout can be found in the `/_layouts` directory.

The main Jekyll settings file is `_config.yml`.

Local debugging and testing is accomplished with the Gemfiles, which contains the Ruby libraries needed to run the site.

## Front Matter Options
Besides the usual `title`, `date`, `description`, and `image`, pages support:

| Option | Where | Effect |
| --- | --- | --- |
| `featured: <n>` | projects, publications | Lists the item in the home page _Featured_ section, sorted by `n` (1 is first) |
| `demo: <url>` | projects | Adds a "Try the live demo" link on the home page and _Projects_ page |
| `hide_title: true` | any page | Hides the page title heading at the top of the content |
| `wide: true` | any page | Uses a wider content column (for the mako-sgp4 demo) |
| `published: false` | any page | Keeps a draft off the live site |

## mako-sgp4 Demo
The interactive demo at `/projects/mako-sgp4/demo/` runs [mako-sgp4](https://github.com/markparal/mako-sgp4) in the browser through WebAssembly. The page is `mako-sgp4-demo.html` and its script is `assets/js/mako-demo.js`. It loads three.js from a CDN.

The WebAssembly build in `assets/mako-sgp4/` is copied from the mako-sgp4 repository. To update it, run this in `mako-sgp4/wasm`:

    wasm-pack build --target web --profile wasm-release

Then copy `pkg/mako_sgp4_wasm.js` and `pkg/mako_sgp4_wasm_bg.wasm` into `assets/mako-sgp4/`.

The Earth is drawn from the land mask `assets/images/mako/earth-mask.png` and colored at runtime. The colors are set at the top of `mako-demo.js`.

## Testing
One can test the website locally using the command

    bundle exec jekyll serve

Add `--unpublished` to also show pages marked `published: false`. The build output in `_site/` is ignored by git.

## Markdown
Use [this](https://www.markdownguide.org/basic-syntax/) helpful guide for Markdown syntax.
