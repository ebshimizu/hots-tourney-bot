const fs = require('fs-extra');
const fetch = require('node-fetch');
const path = require('path');
const { sotsLocation } = require('../config.json');
const Parser = require('hots-parser');

function processReplay(file, id, sotsDB, message) {
  sotsDB.getCollections((err, collections) => {
    // retrieve collection ID, created on tournament load
    try {
      const cid = collections.find((c) => c.name === id)._id;

      // check duplicate
      sotsDB.checkDuplicate(file, function (result) {
        if (result === false) {
          console.log(`File ${file} is not a duplicate, importing...`);

          // parse it
          const parsedData = Parser.processReplay(file, {
            legacyTalentKeys: true,
          });

          if (parsedData.status !== 1) {
            message.channel.send(
              `Error ${Parser.StatusString[parsedData.status]} encountered while importing replay.`
            );
          } else {
            // insert
            sotsDB.insertReplay(
              parsedData.match,
              parsedData.players,
              [cid],
              function () {
                console.log(`Added ${file} to database`);
                message.channel.send(`Added uploaded replay to database.`);
              }
            );
          }
        } else {
          message.channel.send(`This replay is a duplicate. Already in database.`);
        }
      });
    } catch (e) {
      message.channel.send(`Couldn't add replay to database. Error: ${e}.`);
    }
  });
}

module.exports = {
  name: 'upload',
  description: 'Submit replays.',
  guildOnly: true,
  usage: 'After exeucting the command, upload ONE replay.',
  async execute(message, args, db, sotsDB) {
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply('No active tournament in this server.');
      return;
    }

    const tournament = active[0];

    message.channel
      .send(`Uploading a replay for ${tournament.name}. Please send ONE file.`)
      .then(() => {
        const filter = (m) => message.author.id === m.author.id;
        message.channel
          .awaitMessages(filter, { time: 60000, max: 1, errors: ['time'] })
          .then(async (messages) => {
            const attachments = messages.first().attachments;

            // first, download the replay
            const resp = await fetch(attachments.first().url);
            const data = await resp.buffer();

            // write to disk
            const replayFolder = path.join(
              sotsLocation,
              'replays',
              tournament.uuid
            );
            const replayFile = path.join(
              replayFolder,
              attachments.first().name
            );
            await fs.ensureDir(replayFolder);
            await fs.writeFile(replayFile, data);

            // add to database (yikes). Splitting into files to help with infinite callbacks
            processReplay(replayFile, tournament.uuid, sotsDB, message);
          })
          .catch((e) => {
            message.reply(`Unable to upload replays: ${e}`);
          });
      });
  },
};
