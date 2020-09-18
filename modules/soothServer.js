const util = require('util');
const path = require('path');
const zip = require('adm-zip');
const summarizeHeroData = require('./stats-of-the-storm/js/database/summarize-hero-data');
const summarizeMatchData = require('./stats-of-the-storm/js/database/summarize-match-data');
const summarizePlayerData = require('./stats-of-the-storm/js/database/summarize-player-data');
const StatData = require('./stats-of-the-storm/js/game-data/detail-stat-string');
const { HeroesTalents } = require('./stats-of-the-storm/js/heroes-talents');
const { sotsLocation } = require('../config.json');

const heroesTalents = new HeroesTalents(
  path.join(__dirname, '/stats-of-the-storm/assets/heroes-talents'),
  path.join(__dirname, '/stats-of-the-storm/assets/data')
);

function formatStat(field, val) {
  if (Number.isNaN(val)) return 'N/A';

  if (val === undefined) return 0;

  if (
    field === 'KillParticipation' ||
    field === 'timeDeadPct' ||
    field === 'mercUptimePercent' ||
    field === 'pct'
  )
    return `${Math.round(val * 100)}%`;
  else if (field === 'KDA') return Math.round(val);
  else if (
    field.startsWith('Time') ||
    field === 'OnFireTimeOnFire' ||
    field === 'timeTo10' ||
    field === 'timeTo20' ||
    field === 'mercUptime' ||
    field === 'avgTimeSpentDead'
  )
    return formatSeconds(val);

  return Math.round(val);
}

async function getCollections(db, sotsDB, cb) {
  // the collections are the current tournaments
  // now, a responsible implementation of this would try to limit the displayed collections
  // to server-specific tournaments, but we're just gonna pick all active tournaments and go with it
  // because this bot is somewhat singular in its purpose at the moment
  const active = await db.tournament.allActive();

  // format into the proper thing
  // which means we need the collection IDs from stats...
  sotsDB.getCollections((err, col) => {
    // match names
    const collections = [];
    for (const t of active) {
      const c = col.find((x) => x.name === t.uuid);

      // collection id is the uuid
      if (c) {
        collections.push({
          value: c._id,
          text: t.name,
          name: t.name,
        });
      }
    }

    cb(null, collections);
  });
}

function heroDraft(opts, sotsDB, cb) {
  const hero = opts.hero;
  const wildcard = opts.wildcard;

  sotsDB.setCollection(opts.collection);
  sotsDB.getMatches({}, function (err, docs) {
    sotsDB.getHeroData({ hero }, function (err, heroDocs) {
      const draftData = summarizeMatchData(docs, heroesTalents);
      const heroStats = summarizeHeroData(heroDocs);

      // check that data exists
      const draft = draftData.data[hero];
      const numbers = heroStats.averages[hero];

      if (!draft || !numbers) {
        cb(null, { error: `No Hero Data Available for ${hero}` });
        return;
      }

      const ret = {
        pick: draft.games,
        pickPct: draft.games / draftData.data.totalMatches,
        ban: draft.bans.total,
        banPct: draft.bans.total / draftData.data.totalMatches,
        part: draft.games + draft.bans.total,
        partPct: (draft.games + draft.bans.total) / draftData.data.totalMatches,
        win: draft.wins,
        winPct: draft.wins / draft.games,
        K: numbers.SoloKill,
        TD: numbers.Takedowns,
        A: numbers.Assists,
        D: numbers.Deaths,
        KDA: heroStats.heroes[hero].stats.totalKDA,
      };

      if (wildcard && wildcard.name in numbers) {
        ret.wildcardName = StatData[wildcard.name];
        ret.wildcardData = formatStat(
          wildcard.name,
          heroStats[wildcard.type][hero][wildcard.name]
        );
      }

      cb(null, ret);
    });
  });
}

async function playerStatsForHero(opts, sotsDB, cb) {
  const player = opts.player;
  const hero = opts.hero;
  const wildcard = opts.wildcard;

  // determine player
  const query = {};

  if (player.indexOf('#') >= 0) {
    query.name = {
      $regex: new RegExp(player.substr(0, player.indexOf('#')), 'i'),
    };
    query.tag = parseInt(player.substr(player.indexOf('#') + 1), 10);
  } else {
    query.name = { $regex: new RegExp(`^${player}$`, 'i') };
  }

  sotsDB.setCollection(opts.collection);
  sotsDB.getPlayers(query, function (err, players) {
    if (err) {
      cb(null, { error: err });
      return;
    }

    if (players.length === 0) {
      cb(null, { error: `No player named ${player} found` });
      return;
    }

    // ok well we're just gonna take the first player sooo hope there's no duplicates
    sotsDB.getHeroDataForPlayerWithFilter(players[0]._id, { hero }, function (
      err,
      docs
    ) {
      if (err) {
        cb(null, { error: err });
        return;
      }

      if (docs.length === 0) {
        cb(null, {
          error: `No data available for player ${player} on hero ${hero}`,
        });
        return;
      }

      const heroStats = summarizeHeroData(docs);
      const stats = heroStats.averages[hero];

      const ret = {
        games: heroStats.games,
        win: heroStats.wins,
        winPct: heroStats.wins / heroStats.games,
        K: stats.SoloKill,
        TD: stats.Takedowns,
        A: stats.Assists,
        D: stats.Deaths,
        KDA: heroStats.heroes[hero].stats.totalKDA,
        timeDeadPct: stats.timeDeadPct,
        KillParticipation: stats.KillParticipation,
        ToonHandle: players[0]._id,
        BTag: `${players[0].name}#${players[0].tag}`,
        name: players[0].name,
      };

      if (wildcard && wildcard.name in stats) {
        ret.wildcardName = StatData[wildcard.name];
        ret.wildcardData = formatStat(
          wildcard.name,
          heroStats[wildcard.type][hero][wildcard.name]
        );
      }

      cb(null, ret);
    });
  });
}

function playerStats(opts, sotsDB, callback) {
  const player = opts.player;
  const wildcard = opts.wildcard;

  // determine player
  const query = {};

  if (player.indexOf('#') >= 0) {
    query.name = {
      $regex: new RegExp(player.substr(0, player.indexOf('#')), 'i'),
    };
    query.tag = parseInt(player.substr(player.indexOf('#') + 1), 10);
  } else {
    query.name = { $regex: new RegExp(`^${player}$`, 'i') };
  }

  sotsDB.setCollection(opts.collection);
  sotsDB.getPlayers(query, function (err, players) {
    if (err) {
      callback(null, { error: err });
      return;
    }

    if (players.length === 0) {
      callback(null, { error: `No player named ${player} found` });
      return;
    }

    // ok well we're just gonna take the first player sooo hope there's no duplicates
    sotsDB.getHeroDataForPlayerWithFilter(players[0]._id, {}, function (
      err,
      docs
    ) {
      if (err) {
        callback(null, { error: err });
        return;
      }

      if (docs.length === 0) {
        callback(null, {
          error: `No data available for player ${player} on hero ${hero}`,
        });
        return;
      }

      const playerStats = summarizePlayerData(docs)[players[0]._id];
      const stats = playerStats.averages;

      const ret = {
        games: playerStats.games,
        win: playerStats.wins,
        winPct: playerStats.wins / playerStats.games,
        K: stats.SoloKill,
        TD: stats.Takedowns,
        A: stats.Assists,
        D: stats.Deaths,
        KDA: playerStats.totalKDA,
        timeDeadPct: stats.timeDeadPct,
        KillParticipation: stats.KillParticipation,
        ToonHandle: players[0]._id,
        BTag: `${players[0].name}#${players[0].tag}`,
        name: players[0].name,
      };

      if (wildcard && wildcard.name in stats) {
        ret.wildcardName = StatData[wildcard.name];
        ret.wildcardData = formatStat(
          wildcard.name,
          playerStats[wildcard.type][wildcard.name]
        );
      }

      callback(null, ret);
    });
  });
}

function allPlayerStats(opts, sotsDB, callback) {
  const player = opts.player;

  // determine player
  const query = {};

  if (player.indexOf('#') >= 0) {
    query.name = {
      $regex: new RegExp(player.substr(0, player.indexOf('#')), 'i'),
    };
    query.tag = parseInt(player.substr(player.indexOf('#') + 1), 10);
  } else {
    query.name = { $regex: new RegExp(`^${player}$`, 'i') };
  }

  sotsDB.setCollection(opts.collection);
  sotsDB.getPlayers(query, function (err, players) {
    if (err) {
      callback(null, { error: err });
      return;
    }

    if (players.length === 0) {
      callback(null, { error: `No player named ${player} found` });
      return;
    }

    // ok well we're just gonna take the first player sooo hope there's no duplicates
    sotsDB.getHeroDataForPlayerWithFilter(players[0]._id, {}, function (
      err,
      docs
    ) {
      if (err) {
        callback(null, { error: err });
        return;
      }

      if (docs.length === 0) {
        callback(null, { error: `No data available for player ${player}.` });
        return;
      }

      const playerStats = summarizePlayerData(docs)[players[0]._id];
      const heroStats = summarizeHeroData(docs);

      // some reformatting
      const stats = {
        name: player,
        stats: playerStats.averages,
        heroes: [],
        wins: playerStats.wins,
        games: playerStats.games,
      };

      stats.stats.KDA = playerStats.totalKDA;
      stats.stats.HighestKillStreak = playerStats.highestStreak;

      for (const h in heroStats.heroes) {
        const hData = {
          name: h,
          games: heroStats.heroes[h].games,
          wins: heroStats.heroes[h].wins,
        };
        hData.winPct = hData.wins / hData.games;
        stats.heroes.push(hData);
      }

      stats.heroPool = stats.heroes.length;

      callback(null, stats);
    });
  });
}

const pHeroDraft = util.promisify(heroDraft);
const pGetCollections = util.promisify(getCollections);
const pPlayerStatsForHero = util.promisify(playerStatsForHero);
const pPlayerStats = util.promisify(playerStats);
const pAllPlayerStats = util.promisify(allPlayerStats);

module.exports = function handleRequest(req, res, db, sotsDB) {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString(); // convert Buffer to string
  });
  req.on('end', async () => {
    try {
      const opts = body === '' ? {} : JSON.parse(body);
      let resp = null;
      // console.log(body);

      // check the url and handle appropriately
      // this should mirror the things that the sots-db extension is asking for in soothsayer
      if (req.url === '/collections') {
        resp = await pGetCollections(db, sotsDB);
      } else if (req.url === '/heroDraft') {
        resp = await pHeroDraft(opts, sotsDB);
      } else if (req.url === '/playerStatsForHero') {
        resp = await pPlayerStatsForHero(opts, sotsDB);
      } else if (req.url === '/playerStats') {
        resp = await pPlayerStats(opts, sotsDB);
      } else if (req.url === '/allPlayerStats') {
        resp = await pAllPlayerStats(opts, sotsDB);
      }
      if (req.url === '/get/database') {
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename=database.zip',
        });

        const zipDb = new zip();
        zipDb.addLocalFolder(`${sotsLocation}/db`);
        resp.write(zipDb.toBuffer());
        resp.end();
      }

      // console.log(resp);
      res.writeHead(200, { 'Content-Type': 'text/json' });
      res.write(JSON.stringify(resp));
      res.end();
    } catch (e) {
      console.log(`Error processing soothsayer request: ${e}`);
    }
  });
};
