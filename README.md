# StreamCraft

A Twitch overlay engine that I'm actively working on. The whole point is to make it easier for people who want to start streaming without dealing with complicated setups.

## What is this?

It's basically a plugin system for stream overlays. You run it on your computer, it gives you web pages that you can add to OBS as browser sources, and that's it - you have overlays. No need to mess with tons of different tools.

## How it works

The architecture is simple:
- **Bits** are the main modules (like SC2 stats tracker or heart rate monitor)
- **Panels** are the UI parts inside bits (like player stats panel or opponent info)
- **Screens** are different views that a panel can show (like switching between MMR history and match stats)

But really, you can do whatever you want with it. The system is flexible.

## Current state

I made this pretty quickly, so the code is messy, but it's a good foundation to build on.

### What works right now

- Basic SC2 overlay with player stats, opponent tracking, MMR history
- Heart rate monitor through Garmin broadcast
- ISS location tracker (just for fun)

### What I'm planning to add

- **Custom bits from public APIs** - You'll be able to configure your own overlays using any public API without coding. Want to show your XP leaderboard? Track your speedrun rankings? Show League stats? Just configure it and it works.

Some API examples that would be cool:
- Gaming leaderboards (TrueSkill, Elo, speedrun.com)
- Discord notifications
- Twitch chat stats
- Spotify now playing
- Weather
- Pretty much anything with a REST API

Goal is to make it super easy to add new stuff to your stream without needing to be a programmer.

---

**Note:** This is experimental and I'm still refactoring things. Code isn't production-ready yet.

## Contact

If you want to reach out or have questions:

- **Email:** ppotepa+streamcraft@hotmail.com
- **Telegram:** @protectmyballz
- **Video demo:** https://www.youtube.com/watch?v=C7Ebfe9p_U0
