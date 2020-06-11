const _ = require('lodash');
const Discord = require('discord.js');

module.exports = {
  name: 'report',
  description: 'Report the results of a match.',
  guildOnly: true,
  args: true,
  usage: '[round number] [match number]',
  permissions: ['ADMINISTRATOR'],
  async execute(message, args, db) {
    message.delete();
    message.channel.startTyping();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply('No active tournament in this server.');
      message.channel.stopTyping();
      return;
    }

    const tournament = active[0];

    // check for arguments
    if (args.length < 2) {
      message.reply('Missing round and match number argument.');
      message.channel.stopTyping();
      return;
    }

    const round = parseInt(args[0]);
    const match = parseInt(args[1]);

    // find the match
    const doc = await db.match.getMatch(
      message.guild.id,
      tournament.uuid,
      round,
      match
    );

    if (doc) {
      // output the match
      const matchEmbed = new Discord.MessageEmbed()
        .setColor('00a3cc')
        .setTitle(`Reporting Round ${round} Match ${match}`)
        .addField(
          'Winner',
          doc.reported
            ? doc.winner === '1'
              ? 'Blue Team'
              : 'Red Team'
            : 'Unreported'
        )
        .addField(
          'Blue Team',
          doc.team1.map((p) => p.displayName).join('\n'),
          true
        )
        .addField(
          'Red Team',
          doc.team2.map((p) => p.displayName).join('\n'),
          true
        )
        .setFooter(tournament.name);
      message.channel.send(matchEmbed);
      message.channel
        .send(
          'Reporting result for the above match. Enter **1** for a Blue Team Win, or **2** for a Red Team Win. Enter anything else to cancel'
        )
        .then(() => {
          const filter = (m) => message.author.id === m.author.id;
          message.channel
            .awaitMessages(filter, { time: 60000, max: 1, errors: ['time'] })
            .then(async (messages) => {
              const choice = messages.first().content;
              if (choice === '1' || choice === '2') {
                // update the stuff
                // let's assume you can update reported stuff, in that case...
                // first, allocate +1 wins to the winners
                await db.tournament.adjustWins(
                  message.guild.id,
                  tournament.uuid,
                  choice === '1' ? doc.team1 : doc.team2,
                  1
                );

                // then, check if this was reported before
                // if so, then decrement 1 win from the team that was reported as the old winner
                if (doc.reported) {
                  // decrement 1 win from the old winning team
                  await db.tournament.adjustWins(
                    message.guild.id,
                    tournament.uuid,
                    doc.winner === '1' ? doc.team1 : doc.team2,
                    -1
                  );
                } else {
                  // if not reported, update the number of games played by each user
                  await db.tournament.adjustMatches(
                    message.guild.id,
                    tournament.uuid,
                    doc.team1.concat(doc.team2),
                    1
                  );

                  // then mark the match as reported and assign a winner
                  doc.update({
                    $set: {
                      reported: true,
                      winner: choice,
                    },
                  });
                }

                message.channel.send('Match result reported.');
                message.channel.stopTyping();
              } else {
                message.reply('Cancelled report.');
                message.channel.stopTyping();
              }
            })
            .catch(() => {
              message.reply('Cancelled report.');
              message.channel.stopTyping();
            });
        });
    } else {
      message.reply(
        `Could not find round ${round} match ${match} in ${tournament.name}`
      );
      message.channel.stopTyping();
      return;
    }
  },
};
