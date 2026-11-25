# Third-party notices

Versions are pinned by `package-lock.json` and `cmake/Dependencies.cmake`. This notice covers the proposed website and launcher source release, not the excluded client DLL, game assets or reference captures. Retain upstream notices when redistributing dependencies or compiled bundles.

| Dependency | Use | License / source |
| --- | --- | --- |
| React and React DOM | Website UI | MIT; Meta / React contributors, https://github.com/facebook/react |
| Vite and esbuild | Website build | MIT; https://github.com/vitejs/vite and https://github.com/evanw/esbuild |
| GSAP | Existing page motion | GSAP Standard License; https://gsap.com/community/standard-license/ — retain applicable upstream terms. |
| node-postgres (`pg`) and transitive packages | PostgreSQL runtime | MIT; https://github.com/brianc/node-postgres |
| PGlite | Isolated PostgreSQL development/test engine | Apache-2.0; https://github.com/electric-sql/pglite. Embedded PostgreSQL retains its PostgreSQL License and upstream notices. |
| Playwright | Synthetic browser verification | Apache-2.0; https://github.com/microsoft/playwright |
| React Bits Magnet | Existing button interaction | MIT; notice retained in `src/components/ReactBits-LICENSE.txt`. |
| design-taste frontend motion/moment helpers | Existing page motion | Retain distributed helper attribution/license notices with the source. These are included only for the active page helpers. |
| Dear ImGui | Native launcher UI | MIT; https://github.com/ocornut/imgui |
| nlohmann/json | Launcher protocol/configuration | MIT; https://github.com/nlohmann/json |
| Monocraft | Optional native UI preview / launcher font | SIL Open Font License 1.1; Idrees Hassan / Monocraft contributors. License and notice in `public/void/fonts` and `launcher/assets/fonts`. |

Node.js, Windows SDK, WinHTTP, CNG and DPAPI are platform dependencies, not bundled third-party source in this release. Dependency licenses copied from installed packages are under `dependency-licenses/`. The release does not include Mojang sample textures, Minecraft skins/worlds, copied reference pages, provider credentials, databases or compiled DLL/PDB files.
