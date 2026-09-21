# Repository Instructions

## Hugo theme setup

The `themes/DoIt` Git submodule may be uninitialized in a new worktree. Before running Hugo builds or inspecting theme files, check whether `themes/DoIt` is populated. If it is not, initialize it with:

```sh
git submodule update --init --recursive
```

Netlify rebuilds the site with Hugo according to `netlify.toml`. Make site changes in the source files rather than editing generated files under `public/` directly.
