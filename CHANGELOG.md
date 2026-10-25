# Changelog

What's new on the site, newest first. The same list is on the site's **What's new** page (`/novedades`), in the site's language; the Spanish version is [CHANGELOG.es.md](CHANGELOG.es.md).

Versions are `MAJOR.MINOR.PATCH`: a new minor version brings new features, a patch brings fixes and small tweaks. 1.0.0 was the first version the league used. How to cut a release is in the [developer guide](docs/development.md#releases).

## [Unreleased]

### Added
- Every circuit has its own page: how many races it has hosted, the king of the track, how often the pole sitter wins, the biggest comeback, every driver's record there, the full race history and the next races booked on it. Find them all under **Circuits** on the Races page, or tap a track's name on a race page or in the Stats tracks table.

### Changed
- The **Pass.** column in a recorded race's data now counts every car a driver passes, even if they're passed back later in the same round. Before, it counted the places gained each round, so passing two cars and then losing one place counted as one.

### Removed
- The **Corners** card of recorded races: crediting every pass to a whole corner-to-corner stretch didn't say much about where the overtakes really happen.

### Fixed
- On the track maps (recorder and replay), the spaces now bend with the track instead of cutting straight across the curves, which left dark gaps in tight corners.
- On phones, the track section of an upcoming race no longer makes the whole page scroll sideways.

## [1.10.0] - 2026-10-24

### Added
- **France** can now be recorded round by round, like the USA: its race page gets the lap chart, the replay and the race stats.

### Changed
- For admins recording a race: the map now shows, beside each space, how many spaces are left before the next corner, the same numbers as on the board, so it's easier to find where each car ended up.

## [1.9.0] - 2026-10-23

### Added
- Races can be announced with just a month while the day is still to be decided. They show "December 2026 · date to be decided", with a **Pick a date** button on the race page that leads to the date poll; the countdown and the calendar invite appear once the day is set. For admins: tick **Date to be decided** in the race form and choose the month, then use **Schedule race** on the date poll to give it a day.

### Changed
- **When do we race?** Drivers who haven't raced yet now count too: they appear under **Still to answer** and in the number of drivers who have answered.

### Fixed
- **News:** articles are now laid out on a plain white page under the title, instead of over the striped background, so they're easier to read.

## [1.8.0] - 2026-10-23

### Added
- **When do we race?** Help pick the date of the next race: when the organiser opens a poll, mark each day as *Can do*, *Maybe* or *Can't* with a tap, or fill in all your remaining days at once. **Best days** shows the days most drivers can make and who's missing. Open it from the banner on the home page or **Pick a date** on the Races page; if you get race emails, you'll get one when a poll opens.
- For admins: open a poll over one to three months, block the days you can't do, and use **Schedule race** on any day to create a race on that date, or to move a race that's already scheduled there (its sign-up deadline moves with it). Saving the race closes the poll.

## [1.7.0] - 2026-10-23

### Added
- **Driver of the Day:** admins can close the vote early (for example once everyone has voted), and the winner is announced straight away.

### Changed
- Race photos show who uploaded each one, and the full caption instead of cutting it off.

### Fixed
- **Team radio:** the last letter of some drivers' names is no longer cut off, and longer names have more room.
- Long driver names no longer make the standings on the home page scroll sideways, and your name in the top bar stays on one line; both are shortened with "…" instead.

## [1.6.1] - 2026-10-19

### Changed
- **Podium prediction:** you make or change your pick in a pop-up, and everyone's picks are on the race page as soon as they're made, no longer hidden until the start.

## [1.6.0] - 2026-10-19

### Added
- This **What's new** page, linked from the version number at the bottom of every page.

## [1.5.1] - 2026-10-19

### Changed
- The next race on the home page shows the day of the week with its date.

### Fixed
- Charts, the race replay and the lap chart fit narrow phone screens instead of spilling off the side.
- The upcoming race page no longer overflows on phones.

## [1.5.0] - 2026-10-16

### Added
- **Season in review:** a Wrapped-style page for each driver and season, linked from the profile. Your numbers, best day, biggest comeback, nemesis and favourite victim, favourite car and track, spins, slipstreams, Driver of the Day awards, prediction points and the badges you earned.
- **Team radio:** after a race you drove, leave one short line about it (up to 140 characters). It shows under the results, broadcast-radio style, and you can change or clear it later.
- **Report data** for organisers: one download per race with everything needed to write its report or preview.

## [1.4.0] - 2026-10-16

### Added
- **Driver of the Day:** for a week after the results, the race's drivers vote for another driver of that race. The tally stays hidden until voting closes; the winner gets a notification and a badge.
- **Podium predictions:** until the race starts, anyone in the league can pick the top three, themselves included. 3 points per exact place, 1 for a podium driver in another place. Picks stay private until the start. The standings page keeps a season **Oracle** table, with badges for an exact podium and the season's best predictor.
- **Chances:** upcoming races show each confirmed driver's chance of a win and of a podium, worked out from recent form and history at the track.
- **Title fight:** while a season is running, the standings show the points left, who can still be champion and what the leader needs at the next race to seal it.

### Changed
- Shared race links preview the grid before the race and the podium after it.

## [1.3.0] - 2026-10-16

### Added
- **Round-by-round race log:** the organiser can log a race from a phone at the table, tapping where each car ends every round. The results sheet fills itself in at the end.
- Logged races get a **replay** on the track map, a **lap chart**, per-driver numbers (overtakes, slipstreams, spins, rounds led) and **JSON / CSV** downloads.
- **Moment of the race** (the biggest climb in a single round) and **rivalry of the race** (the pair that swapped places most often).
- **Corners heat map:** where the passes, slipstreams and spins happened, corner by corner.
- **Replay video**, recorded in your browser and ready to send on WhatsApp from a phone.
- Four new badges: *Wire to wire*, *Last gasp*, *Spin and podium* and *Slipstream king*.
- The head-to-head grid counts how many times two drivers swapped places in logged races.

## [1.2.0] - 2026-10-15

### Added
- **Emails** (optional): add an address in your profile and pick what you want to hear about: new races, results or news. Every email has a one-click unsubscribe link.
- The site can run **in English** for leagues that want it.
- Guides for anyone who wants to run their own league, and an MIT licence.

## [1.1.0] - 2026-10-15

### Added
- **News:** previews, race reports, news and rules from the organiser. Articles can include live race cards, results, podiums, standings and driver cards, plus images and a cover photo.
- **Mentions:** write `@username` to link a driver.
- **Comments** on articles, with replies.
- **Notification bell:** when someone mentions you, replies to you or the results of a race you drove are published.
- **Activity feed:** new drivers, races, sign-ups, results, photos and seasons, also on the home page.
- Shared article links show a preview image.

## [1.0.0] - 2026-10-14

The first version the league used.

### Added
- **Welcome step** after signing up: photo, favourite colour and bio.
- **Spins (trompos):** every result records how many times the driver spun out, with a *Most spins* record and a *Spin* badge.
- **Race calendar:** the races page has a month-by-month calendar besides the list.
- Races can be announced as **Coming soon** before sign-up opens.
- Your own name is highlighted wherever it appears, and your line stands out in the points chart.

### Changed
- In Heat everyone finishes, so retirements are gone: every result has a position.
- Drivers without a photo get a helmet with their initial, and your avatar in the header takes your favourite colour.
- New logo: a rev gauge whose needle sweeps to the redline.
- Redesigned race countdown.

## [0.2.0] - 2026-10-13

### Added
- **Achievements:** season trophies for the top three, and badges like *From the back*, *Hat-trick* or *Globetrotter*, all worked out from the results.
- **Sharing:** send a race on WhatsApp, copy its link or add it to your calendar. Shared links show a preview image.
- **Track history** on upcoming races: past winners, the king of the track, the biggest comeback and each entrant's record there.
- **LED countdown** to the next race on the home page, and a slim season bar on top.
- The track's country flag in each race banner.
- Add the site to your phone's home screen, with its own icon.
- Organisers can rename drivers, reset passwords and manage admins.

### Changed
- The podium stands out in the standings and race results.
- The races list is one column of timing rows, each with its podium.

## [0.1.0] - 2026-10-13

The first build.

### Added
- Accounts for every driver.
- Races with sign-up, limited seats and an automatic waitlist.
- Results with points, the podium and race photos.
- Standings with countback tie-breaks and a points chart.
- Driver profiles with career numbers, form and race history.
- Statistics: records, head-to-head, win rate by starting position, tracks, car colours and upgrade cards.

[Unreleased]: https://github.com/DevJav/HeatChampionship/compare/v1.10.0...HEAD
[1.10.0]: https://github.com/DevJav/HeatChampionship/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/DevJav/HeatChampionship/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/DevJav/HeatChampionship/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/DevJav/HeatChampionship/compare/v1.6.1...v1.7.0
[1.6.1]: https://github.com/DevJav/HeatChampionship/compare/v1.6.0...v1.6.1
[1.6.0]: https://github.com/DevJav/HeatChampionship/compare/v1.5.1...v1.6.0
[1.5.1]: https://github.com/DevJav/HeatChampionship/compare/v1.5.0...v1.5.1
[1.5.0]: https://github.com/DevJav/HeatChampionship/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/DevJav/HeatChampionship/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/DevJav/HeatChampionship/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/DevJav/HeatChampionship/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/DevJav/HeatChampionship/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/DevJav/HeatChampionship/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/DevJav/HeatChampionship/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/DevJav/HeatChampionship/releases/tag/v0.1.0
