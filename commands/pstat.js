const {
  pHeroDraft,
  pGetCollections,
  pPlayerStatsForHero,
  pPlayerStats,
  pAllPlayerStats,
} = require('../modules/dbUtils');
const Discord = require('discord.js');

// get hero stats for the current tournament
module.exports = {
  name: 'pstat',
  description: 'Get player stats for currently active tournament.',
  guildOnly: true,
  usage: '[battletag (numbers optional)]',
  args: true,
  async execute(message, args, db, sotsDB) {
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply('No active tournament in this server.');
      return;
    }

    const tournament = active[0];
    sotsDB.getCollections(async (err, col) => {
      // find the active
      const c = col.find((x) => x.name === tournament.uuid);
      const opts = { collection: c._id, player: args[0] };

      // get all stats
      const data = await pAllPlayerStats(opts, sotsDB);

      // sort heroes
      data.heroes.sort((a, b) => {
        a.games - b.games;
      });

      // format in an embed
      const embed = new Discord.MessageEmbed()
        .setColor('blue')
        .setTitle(data.name)
        .addField('Games', data.games, true)
        .addField(
          'Wins',
          `${data.wins} (${((data.wins / data.games) * 100).toFixed(0)}%)`,
          true
        )
        .addField('KDA', data.stats.KDA.toFixed(2), true)
        .addField(
          'Most Played Heroes',
          data.heroes
            .slice(0, 3)
            .map((h) => {
              return `${h.name} - ${h.games} games, ${h.wins} wins`;
            })
            .join('\n')
        )
        .setTimestamp();

      message.channel.send(embed);
    });
  },
};
