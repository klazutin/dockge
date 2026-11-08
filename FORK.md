# About this fork

This is [louislam/dockge](https://github.com/louislam/dockge) `master` plus a few small patches, rebuilt automatically as a Docker image whenever upstream changes.

```yaml
services:
  dockge:
    image: klazutin/dockge:latest
    # ...rest as in upstream's compose.yaml
```

## Patches

| Commit | What it does |
| --- | --- |
| `feat: complete light theme` | Polishes the Light/Dark/Auto switcher already in upstream's Settings → Appearance: a light compose editor theme, readable text on primary-coloured buttons and badges (`frontend/src/styles/theme-light.scss`). |
| `feat: highlight selected stack in sidebar` | Highlights the open stack in the left list, in both themes and on its container-terminal pages, and scrolls it into view. |
| `feat: update all stacks` | An **Update all** button above the stack list. It pulls and redeploys every running stack in turn, opening each stack's page so you can watch the output. At the end, a summary lists which stacks got new images, which were already up to date and which failed. |
| `fix: let Dockge update its own stack` | Updating (or redeploying) the stack Dockge itself runs in used to stop Dockge and leave it stopped: `docker compose up -d` runs inside the container it's replacing, so it gets killed before it can start the new one. That final `up -d` now runs in a short-lived helper container started from the same image with the same mounts (`backend/self-container.ts`). **Update all** skips the `dockge` stack. |
| `ci: sync upstream and build image` | `.github/workflows/fork-build.yml` and this file. |

All fork changes are marked `[fork]` in the code.

## How the automatic build works

`.github/workflows/fork-build.yml` runs every 2 hours, on every push to `custom` and on demand. It:

1. checks out `custom` (the default branch) and rebases it onto `louislam/dockge` `master`;
2. skips the build if an image for this exact source tree (`up-<upstream sha>-<tree sha>`) is already on Docker Hub;
3. otherwise builds the frontend and pushes a multi-arch image (`linux/amd64`, `linux/arm64`) as `:latest` and `:up-…`;
4. if `FORK_PAT` is set, pushes the rebased branch back to `custom`.

If upstream changes something the patches touch, the rebase fails and GitHub emails you. Fix it locally:

```bash
git fetch upstream
git rebase upstream/master   # resolve conflicts
git push --force-with-lease origin custom
```

## Repository setup (once)

- Secrets: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN` (a Docker Hub access token with Read & Write), and optionally `FORK_PAT` (a fine-grained token for this repo with *Contents* and *Workflows* read/write).
- Variable (optional): `DOCKER_IMAGE` if the image shouldn't be `klazutin/dockge`.
- Make `custom` the default branch, so the schedule runs from it.
- In Actions, disable the workflows inherited from upstream, especially **Nightly Release**, which would try to push to louislam's registry.
