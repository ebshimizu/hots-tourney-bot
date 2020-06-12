module.exports = {
  name: 'adminunregister',
  aliases: ['adminremove'],
  description: 'Remove a user from the tournament.',
  args: true,
  usage: '[discord handle (@)]',
  permissions: ['ADMINISTRATOR'],
  guildOnly: true,
  async execute(message, args, db) {
    message.channel.startTyping();
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);
    const user = message.mentions.users.first();

    // check for duplicate players
    const id = user.id;
    const name = user.username;

    if (active.length == 0) {
      message.reply(
        "You can't unregister because there is no tournament running"
      );
    } else {
      const tournament = active[0];

      const existing = tournament.players.find((p) => {
        return p.id === id;
      });

      if (existing) {
        await tournament.update({
          $set: {
            players: tournament.players.filter((p) => p.id !== id),
          },
        });

        message.reply(
          `${name} is no longer registered for **${tournament.name}**.`
        );
      } else {
        message.reply(`${name} is not in **${tournament.name}**.`);
      }
    }

    message.channel.stopTyping();
  },
};
