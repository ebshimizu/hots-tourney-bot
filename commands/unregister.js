module.exports = {
  name: 'unregister',
  description: 'Remove yourself as a tournament participant.',
  guildOnly: true,
  async execute(message, args, db) {
    message.channel.startTyping();
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply(
        "You can't unregister because there is no tournament running"
      );
    } else {
      if (active[0].signupsOpen) {
        const tournament = active[0];

        // check for duplicate players
        const id = message.author.id;
        const name = message.author.username;

        const existing = tournament.players.find((p) => {
          return p.id === message.author.id;
        });

        if (existing) {
          await tournament.update({
            $set: {
              players: tournament.players.filter(
                (p) => p.id !== message.author.id
              ),
            },
          });

          message.reply(
            `You're no longer registered for **${tournament.name}**.`
          );
        } else {
          message.reply(
            `You're not registered for **${tournament.name}**.`
          );
        }
      } else {
        message.reply(
          `Registration for **${active[0].name}** has closed and cannot be changed. Please contact an admin.`
        );
      }
    }
    message.channel.stopTyping();
  },
};
