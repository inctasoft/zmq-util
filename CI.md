# CI / template repo
- Upon creating a repository from the template the Gthub Actions pipeline will fail for the `sonarcloud` step
- You would want to first
  - One-time execute `npm run prepare` to install git hooks
  - remove other files, change contents of `package.json`, etc.
  - make sure these secrets exists, have access to your repo and are valid:
    - `PAT_TOKEN_GHA_AUTH` the token of the account to setup git for automatic version bumps and mergebacks in dev. Needs a `repo` scope
    - `SONAR_TOKEN` - sonar cloud token. You will need a https://sonarcloud.io/ account and a corresponding project
    - `NPM_TOKEN` - NPM token (classic). You will need a https://www.npmjs.com/ account

* On push to `main`, `release/**` or `hotfix/**`, commits are pulled back in `dev` branch 
* On push to  `main`:
  * package version is bumped depending on commit messages
    * see https://github.com/phips28/gh-action-bump-version#workflow on commit messages
    * (version bump commit will be automerged in `dev` from _2._)
  * new tag is being created with the new version

* _pre-commit_ hooks are running tests and linting commit messages. Using `git cz` is encouraged
* Once a Github release from tag _is manually created_ 
  * npm package with the new version is pushed to https://registry.npmjs.org/
  * npm package with the new version is pushed to https://npm.pkg.github.com/

* Encouraged is ussage of `commitizen`
```bash
git add ...
npm install -g commitizen
git cz
# follow commitizen cli instructions
git push
```

* Once a branch was merged into main, and a new tag is created, you can manually from github or via github cli create a new release. And it will get published to `npm` and `github` registries