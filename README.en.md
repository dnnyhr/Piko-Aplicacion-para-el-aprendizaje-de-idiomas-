# Piko — offline language learning for rural Nicaragua

> Español: [README.md](README.md) — this project's primary language is Spanish.

**Website:** [piko.mugiware.com](https://piko.mugiware.com)

Piko teaches **Miskito, Mayangna, Rama, Garífuna and English** in rural
Nicaraguan schools. It works **with no internet at all**: the teacher's phone
raises a local network, and students join that hotspot to play together.

Miskito, Mayangna, Rama and Garífuna are indigenous languages of Nicaragua's
Caribbean coast. They are losing speakers generation by generation — not for
lack of interest, but because teaching them collides with three constraints at
once: **almost no connectivity**, **few and low-end devices**, and **one teacher
for a large classroom** who may not fully speak the language being taught.

Every design decision below follows from those three constraints.

---

## Two routes, one destination

The easy mistake would have been to build one solution and assume it fits every
community. It doesn't. Communities differ in what they actually have, so Piko
ships two routes:

| | **Route 1 — classrooms with phones** | **Route 2 — classrooms without enough phones** |
|---|---|---|
| **What it is** | A local-multiplayer learning game the teacher drives | A physical classroom companion that only needs mains power |
| **How it connects** | Teacher's phone hosts over its own hotspot | Configured from the app over the same WiFi, then runs standalone |
| **What it does** | Listening, translation and sentence-building exercises | Organizes students into groups and evaluates one speaker per group |

---

## How it works

**Local multiplayer.** The teacher's phone becomes the game host the moment the
hotspot goes up; student phones connect to it. A simple star topology — the
teacher is the only central point, students never talk to each other directly.
We chose this over peer-to-peer because everyone is already on the same local
network, so the complexity of establishing direct device-to-device connections
buys nothing.

**Differential sync.** When a student's progress changes, only the delta travels
— never the whole history. A student who drops off and rejoins resumes exactly
where they were. A device that has never seen that student receives a
already-projected state of fixed size, not the event log.

**Progress belongs to the student, not the device.** A child can play on a
borrowed phone today and a different one tomorrow without losing anything. They
claim their name from the teacher's roster and their progress follows.

**Piko reinforces, it never scolds.** Mistakes are never painted red, XP never
goes down, and the mascot shows the right answer with an encouraging phrase. A
child learning their own community's language does not need an app telling them
they speak it badly.

**The classroom companion** is built on an Arduino-class board that drives the
body and sensors, while a single small computer per classroom handles the
heavier processing — one machine per room is far cheaper than a capable device
per student. It forms mixed-level groups for peer teaching, rotates them between
sessions, and runs a lightweight speech model that checks whether the expected
key words were said and how clearly — which is what useful feedback actually
requires, without a heavy model.

---

## Why the indigenous language packs are empty

Today Piko ships content in English only. The four indigenous languages have the
format ready and **are deliberately empty**.

Vocabulary and pronunciation have to come from native speakers or from published
linguistic material. Inventing them would mean teaching a fake language to
exactly the children who are trying to keep it alive.

The content validator **rejects text-to-speech on those four languages on
purpose**: if a pack requests synthesized audio in Miskito, Mayangna, Rama or
Garífuna, the build fails. We would rather ship no audio than a pronunciation
invented by a machine.

**This is the project's real risk, and the contribution we most need.** If you
speak one of these languages, or work with people who do, see
[CONTRIBUTING.md](CONTRIBUTING.md) — no coding required.

---

## Repository layout

```
app/        The mobile app (Expo / React Native + TypeScript)
  src/core/   ⚠ PURE TypeScript — not one React Native import
  content/    Language packs as JSON data, not code
robot/      Classroom companion: Arduino firmware + Node control bridge
web/        Landing page
docs/       Architecture, technology choices, decision log
```

**The rule that holds the architecture together:** `app/src/core/` never imports
React Native. The classroom protocol, the differential sync, the progress engine
and answer checking are all pure TypeScript. That is why they run in Node in two
seconds, and why the same session logic runs identically in the simulator and on
a low-end phone — only the injected transport changes.

## Running it

```bash
cd app
npm install

npm test              # 121 tests over the pure core and persistence
npm run typecheck
npm run validate:packs

npm run web           # UI and solo practice in a browser
npm run sim -- --students 8 --rondas 2
```

That last one is worth calling out: it starts **a real host and eight real
clients** over TCP on localhost, running the same code that runs on phones. It
plays two rounds, drops a phone mid-way, reconnects it, and asserts everyone
converges. A whole classroom, tested without a single device.

The network classroom needs native TCP sockets, so it does not run in Expo Go or
in a browser — a development build is required. See [`app/README.md`](app/README.md).

## Documentation

| Document | About |
|---|---|
| [docs/arquitectura.md](docs/arquitectura.md) | Code layout, classroom protocol, synchronization |
| [docs/tecnologias.md](docs/tecnologias.md) | What is used and why, over the alternatives |
| [docs/decisiones.md](docs/decisiones.md) | Decision log, with context and consequences |
| [docs/desarrollo.md](docs/desarrollo.md) | Running, testing, building the APK |
| [app/content/README.md](app/content/README.md) | Content pack format |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Issues and pull requests in English are
welcome — we will reply in whichever language you write in.

## License

[MIT](LICENSE). Built by **MugiWare**, from Jinotega, Nicaragua.
