const { v4: uuidv4 } = require('uuid');

module.exports = {
  name: 'debug',
  description: 'Scaffold a tournament for debugging.',
  guildOnly: true,
  args: true,
  usage: '[number of players]',
  permissions: ['ADMINISTRATOR'],
  async execute(message, args, db) {
    message.delete();
    message.channel.startTyping();

    // debug is a test function and takes no responsibility for your
    // environment
    // create a new tournament
    await db.tournament.addNew(message.guild.id, 'Debug Tournament', uuidv4());

    // add a bunch of players
    const playerCount = parseInt(args[0]);
    const active = await db.tournament.active(message.guild.id);
    const tournament = active[0];
    const players = [];

    for (let i = 0; i < playerCount; i++) {
      players.push({
        displayName: `DebugPlayer${i}`,
        id: `debug${i}`,
        wins: 0,
        matches: 0,
      });
    }

    await tournament.update({
      $set: {
        players,
      },
    });

    message.reply(`Constructed a debug tournament with ${playerCount} players`);
    message.channel.stopTyping();
  },
};
