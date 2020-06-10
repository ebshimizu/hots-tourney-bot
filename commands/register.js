module.exports = {
  name: 'register',
  aliases: ['signup'],
  description: 'Register yourself as a tournament participant.',
  guildOnly: true,
  async execute(message, args, db) {
    message.channel.startTyping();
    message.delete();

    // check for active tournaments in the server
    const active = await db.tournament.active(message.guild.id);

    if (active.length == 0) {
      message.reply(
        "You can't register because there is no tournament running"
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

        if (!existing) {
          await tournament.update({
            $push: {
              players: { displayName: name, id },
            },
          });

          message.reply(`You're registered for **${tournament.name}**.`);
        } else {
          message.reply(
            `You're already registered for **${tournament.name}**.`
          );
        }
      } else {
        message.reply(`Registration for **${active[0].name}** has closed.`);
      }
    }
    message.channel.stopTyping();
  },
};
