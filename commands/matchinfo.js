const _ = require('lodash');
const Discord = require('discord.js');

module.exports = {
  name: 'matchinfo',
  description: 'Display a match.',
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
        .setTitle(`Round ${round} Match ${match}`)
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
    } else {
      message.reply(
        `Could not find round ${round} match ${match} in ${tournament.name}.`
      );
    }

    message.channel.stopTyping();
  },
};
