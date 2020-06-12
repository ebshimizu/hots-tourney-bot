module.exports = {
  name: 'adminregister',
  aliases: ['adminadd'],
  description: 'Register someone else as a tournament participant.',
  guildOnly: true,
  args: true,
  usage: '[discord handle (@)]',
  permissions: ['ADMINISTRATOR'],
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
      // admin bypasses open/close deadlines
      const tournament = active[0];
      const user = message.mentions.users.first();

      if (user) {
        // check for duplicate players
        const id = user.id;
        const name = user.username;

        const existing = tournament.players.find((p) => {
          return p.id === id;
        });

        if (!existing) {
          await tournament.update({
            $push: {
              players: { displayName: name, id },
            },
          });

          message.reply(`Registered ${name} for **${tournament.name}**.`);
        } else {
          message.reply(
            `${name} is already registered for **${tournament.name}**.`
          );
        }
      }
    }

    message.channel.stopTyping();
  },
};
