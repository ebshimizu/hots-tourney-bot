require('babel-polyfill');
const moment = require('moment');
const RxDB = require('rxdb');
RxDB.plugin(require('pouchdb-adapter-node-websql'));
const tournamentSchema = require('../data/schema/tournament');
const matchSchema = require('../data/schema/match');
const { dbLocation } = require('../config.json');

const Database = {};

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const create = async () => {
  const database = await RxDB.create({
    name: `${dbLocation}/hots-bot`,
    adapter: 'websql',
    multiInstance: true,
  });

  await database.collection({
    name: 'tournament',
    schema: tournamentSchema,
    migrationStrategies: {},
    statics: {
      active: async function (serverId) {
        const docs = await this.find({
          serverId,
          active: true,
        }).exec();
        return docs;
      },
      addNew: async function (serverId, name, uuid) {
        this.insert({
          serverId,
          name,
          uuid,
          date: moment().unix(),
          active: true,
        });
      },
      adjustWins: async function (serverId, uuid, users, delta) {
        // map ids
        const ids = users.map((u) => u.id);
        const doc = await this.findOne({
          serverId,
          uuid,
        }).exec();

        // fix up the array
        if (doc) {
          const newArray = doc.players.map((p) => {
            if (ids.indexOf(p.id) !== -1) {
              p.wins += delta;
            }

            return p;
          });

          await doc.update({
            $set: {
              players: newArray,
            },
          });
        } else {
          console.log(`Unable to find tournament ${uuid}`);
        }
      },
      adjustMatches: async function (serverId, uuid, users, delta) {
        // map ids
        const ids = users.map((u) => u.id);
        const doc = await this.findOne({
          serverId,
          uuid,
        }).exec();

        // fix up the array
        if (doc) {
          const newArray = doc.players.map((p) => {
            if (ids.indexOf(p.id) !== -1) {
              p.matches += delta;
            }

            return p;
          });

          await doc.update({
            $set: {
              players: newArray,
            },
          });
        } else {
          console.log(`Unable to find tournament ${uuid}`);
        }
      }
    },
  });

  await database.collection({
    name: 'match',
    schema: matchSchema,
    migrationStrategies: {},
    statics: {
      active: async function (serverId, tournamentId, round) {
        const docs = await this.find({
          serverId,
          tournamentId,
          roundNumber: round,
        }).exec();

        return docs;
      },
      getMatch: async function (serverId, tournamentId, round, match) {
        const doc = await this.findOne({
          serverId,
          tournamentId,
          roundNumber: round,
          matchNumber: match,
        }).exec();

        return doc;
      },
    },
  });

  return database;
};

let createPromise = null;
Database.get = async () => {
  if (!createPromise) createPromise = create();
  return createPromise;
};

module.exports = Database;
