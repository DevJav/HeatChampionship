# Heat Championship

A website for running a league of **[Heat: Pedal to the Metal](https://boardgamegeek.com/boardgame/366013/heat-pedal-to-the-metal)**, the racing board game. Friends sign up for each month's race, the organiser enters the results, and the site keeps the championship table, statistics, achievements and news, all with a retro F1-broadcast look (circa 2012).

It was built for one group of friends, but anyone can run their own copy. The site works in **Spanish or English**: you pick the language when you set it up.

> Fan project, not affiliated with or endorsed by Days of Wonder or the designers of Heat.

![Home page: next race with countdown, standings, last race and news](docs/screenshots/home.png)

## What's in it

- **Race sign-ups** with limited seats and an automatic waitlist, plus WhatsApp sharing and calendar invites.
- **Standings** with countback tie-breaks, position changes and a points-progression chart.
- **Statistics:** records, head-to-head, win rate by starting position, track kings, results by car and upgrade card.
- **Achievements** worked out from the results: season trophies and badges like *From the back* or *Hat-trick*.
- **Driver profiles** with career numbers, form and race history.
- **News** with live race cards, podiums and standings inside the articles, plus comments and `@mentions`.
- **Activity feed** and a **notification bell**.
- **Admin panel** for the organiser: races, results, seasons, articles, drivers and catalogues.

| | |
|---|---|
| [![Standings](docs/screenshots/standings.png)](docs/tour.md#standings) | [![Upcoming race](docs/screenshots/race-upcoming.png)](docs/tour.md#before-a-race) |
| [![Driver profile](docs/screenshots/profile.png)](docs/tour.md#driver-profiles) | [![Entering results](docs/screenshots/admin-results.png)](docs/tour.md#admin-panel) |

**[Take the full tour of the site →](docs/tour.md)**

## Try it with demo data

You need [Node.js 24](https://nodejs.org/). Then:

```bash
git clone https://github.com/DevJav/HeatChampionship.git
cd HeatChampionship
cp .env.example .env      # works as is for a local try-out
npm install
npm run db:showcase:en    # builds data/heat-en.db with a full demo league in English
npm run dev:en            # http://localhost:3000
```

The demo database has two seasons of results, an open race with a waitlist, articles with comments and a filled-in activity feed. Log in with the admin account from `.env` (`admin` / `change-me-please` by default) or as any demo driver (for example `maya`) with the password `racedemo`.

## Documentation

| Guide | For |
|---|---|
| [A tour of the site](docs/tour.md) | Every page, with a screenshot and what it does, including the admin panel |
| [Running your own league](docs/setup.md) | Configuration, first start, deploying, back-ups, languages and npm scripts |
| [Developer guide](docs/development.md) | Project layout, translations, customising the look and the code conventions |

Built with Next.js 16, React 19, Tailwind CSS 4, TypeScript, Prisma 7 + SQLite and Better Auth.

## License

[MIT](LICENSE). Heat: Pedal to the Metal is a trademark of its publisher; this project only tracks your own games of it.
