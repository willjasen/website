# Repository Instructions

## Hugo theme setup

The `themes/DoIt` Git submodule may be uninitialized in a new worktree. Before running Hugo builds or inspecting theme files, check whether `themes/DoIt` is populated. If it is not, initialize it with:

```sh
git submodule update --init --recursive
```

The production site serves the checked-in `public/` directory without rebuilding Hugo. When changing site assets, update both the source file and its generated counterpart under `public/`.
