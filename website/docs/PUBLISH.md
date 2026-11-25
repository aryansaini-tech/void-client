# Publication steps — authentication still required

The prepared publication checkout is `C:\Users\musta\AppData\Local\Temp\void-new-site-publication-20261125`. It targets `https://github.com/aryansaini-tech/void-client.git`, not the unrelated workspace origin. Its replacement branch is `new-site`, based on legacy main `eb2408c8fdb8706dea163b0f7cd026e6901f3227`. The final local commit hash is recorded in the delivered local `website/STATUS.md` after the commit exists.

No remote backup or replacement push is claimed. Authenticate from a normal Windows PowerShell window:

```powershell
git credential-manager github login
Set-Location 'C:\Users\musta\AppData\Local\Temp\void-new-site-publication-20261125'
```

Complete the browser sign-in with an account that has repository access. If GitHub CLI is preferred, install it using `winget install --id GitHub.cli -e`, reopen PowerShell, then run `gh auth login --hostname github.com --git-protocol https --web` and `gh auth setup-git`.

Review every filename in `website/docs/RELEASE_FILES.txt`. The checkout contains only that allowlist; build/dependency/test output is ignored. Run the final gate again if any committed source changes:

```powershell
node website/scripts/secret-scan.mjs --root . --repo . --manifest website/docs/RELEASE_FILES.txt --base eb2408c8fdb8706dea163b0f7cd026e6901f3227 --head HEAD --require-commits
git -c safe.directory=C:/Users/musta/AppData/Local/Temp/void-new-site-publication-20261125 fetch origin
git -c safe.directory=C:/Users/musta/AppData/Local/Temp/void-new-site-publication-20261125 push origin legacy-site-backup
```

Verify that the backup points to the recorded legacy main hash. Verify remote main still points to that same base. If main advanced, stop and review the new changes; do not force or overwrite them. Once backup and final gate are verified, publish the one normal replacement commit:

```powershell
git -c safe.directory=C:/Users/musta/AppData/Local/Temp/void-new-site-publication-20261125 push origin new-site:main
```

If main is protected, publish the branch:

```powershell
git -c safe.directory=C:/Users/musta/AppData/Local/Temp/void-new-site-publication-20261125 push -u origin new-site
```

On GitHub, open a pull request with base `main` and compare `new-site`; review the exact replacement diff and gate results. Merge using a method producing one replacement commit (the branch has only one new commit; squash merge also produces one). Record GitHub's resulting main hash after the owner verifies it. Never force-push.

If the account cannot push any branch to this repository, ask the repository owner for write access or use GitHub's Fork button, push `new-site` to that fork, and open a PR against `aryansaini-tech/void-client:main`. Repository-owner permission is required to create `legacy-site-backup` in the original repo before replacement.

GitHub publication is separate from deployment. Configure a Node/PostgreSQL host, HTTPS, private Discord/admin/provider settings, a verified database backup/dev restore and an explicitly approved production migration. Live login, shared ownership, admin actions, launcher refresh and payments remain NOT VERIFIED. Real checkout is disabled.
