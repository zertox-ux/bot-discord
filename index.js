require('dotenv').config();
const fs = require('fs');
const express = require('express');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder,
  PermissionsBitField
} = require('discord.js');

const app = express();
const port = process.env.PORT || 3000;

// Gestion des erreurs globales
process.on('uncaughtException', (err) => {
  console.error('Erreur non interceptée :', err);
  fs.appendFileSync('error.log', `[${new Date().toISOString()}] UncaughtException: ${err.stack}\n`);
});
process.on('unhandledRejection', (reason) => {
  console.error('Promesse rejetée sans catch :', reason);
  fs.appendFileSync('error.log', `[${new Date().toISOString()}] UnhandledRejection: ${reason}\n`);
});

// Serveur Express
app.get('/', (req, res) => res.send('Bot is online!'));
app.listen(port, () => console.log(`✅ Serveur Express démarré sur le port ${port}`));

// Client Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

// Fonction utilitaire pour embed
function createEmbed(description, color = 0x5865F2) {
  return new EmbedBuilder()
    .setDescription(description)
    .setColor(color)
    .setTimestamp();
}

// --- Déclaration des commandes ---
const commands = [
  new SlashCommandBuilder().setName('ping').setDescription('Vérifie la latence du bot'),
  new SlashCommandBuilder().setName('help').setDescription('Affiche la liste des commandes disponibles'),
  new SlashCommandBuilder()
    .setName('say')
    .setDescription('Envoie un message dans un salon')
    .addStringOption(option => option.setName('message').setDescription('Le message à envoyer').setRequired(true))
    .addChannelOption(option => option.setName('salon').setDescription('Le salon cible').setRequired(true)),
  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannir un membre')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à bannir').setRequired(true))
    .addStringOption(option => option.setName('raison').setDescription('Raison du bannissement')),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute un membre')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à mute').setRequired(true)),
  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute un membre')
    .addUserOption(option => option.setName('membre').setDescription('Le membre à unmute').setRequired(true)),
  new SlashCommandBuilder()
    .setName('deban')
    .setDescription('Débannir un utilisateur via son ID')
    .addStringOption(option => option.setName('id').setDescription('ID de l\'utilisateur').setRequired(true)),
  new SlashCommandBuilder()
    .setName('dmall')
    .setDescription('Envoie un message privé à tous les membres du serveur')
    .addStringOption(option => option.setName('message').setDescription('Message à envoyer').setRequired(true)),
  new SlashCommandBuilder()
    .setName('info')
    .setDescription('Affiche les informations de tous les serveurs où le bot est présent'),
  new SlashCommandBuilder()
    .setName('infoserveur')
    .setDescription('Affiche des informations sur le serveur actuel')
].map(cmd => cmd.toJSON());

// --- Enregistrement des commandes ---
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  if (!process.env.CLIENT_ID || !process.env.TOKEN) {
    console.error("❌ Erreur : CLIENT_ID ou TOKEN manquant dans le fichier .env");
    process.exit(1);
  }
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ Commandes slash enregistrées.');
  } catch (error) {
    console.error('❌ Erreur enregistrement commandes :', error);
  }
})();

// --- Gestion des commandes ---
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const cmd = interaction.commandName;
  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);

  // Ping
  if (cmd === 'ping') {
    await interaction.reply({ embeds: [createEmbed(`🏓 Pong ! Latence API : **${Math.round(client.ws.ping)}ms**`)] });
  }

  // Help
  if (cmd === 'help') {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📜 Commandes du bot')
      .setDescription('Voici toutes les commandes disponibles :')
      .addFields(
        { name: '🌐 Commandes publiques', value: '`/ping` - Latence\n`/help` - Aide\n`/say` - Envoyer un message\n`/info` - Infos serveurs\n`/infoserveur` - Infos serveur actuel' },
        { name: '🛠 Commandes admin', value: '`/ban` - Bannir\n`/mute` - Mute\n`/unmute` - Unmute\n`/deban` - Débannir\n`/dmall` - MP à tous' }
      )
      .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Infoserveur
  if (cmd === 'infoserveur') {
    const guild = interaction.guild;
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`ℹ️ Informations sur ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Nom du serveur', value: guild.name, inline: true },
        { name: 'ID du serveur', value: guild.id, inline: true },
        { name: 'Membres', value: `${guild.memberCount}`, inline: true },
        { name: 'Propriétaire', value: `<@${guild.ownerId}>`, inline: true },
        { name: 'Créé le', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: 'Rôles', value: `${guild.roles.cache.size}`, inline: true }
      )
      .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Info bot
  if (cmd === 'info') {
    const guildsInfo = await Promise.all(client.guilds.cache.map(async guild => {
      // Cherche un salon où le bot peut créer une invitation
      const inviteChannel = guild.channels.cache.find(ch => 
        ch.isTextBased() && ch.permissionsFor(guild.members.me).has('CreateInstantInvite')
      );

      let inviteLink = '❌ Pas d\'invite';
      if (inviteChannel) {
        try {
          const invite = await inviteChannel.createInvite({ maxAge: 0, maxUses: 0 });
          inviteLink = `[🔗 Inviter](${invite.url})`;
        } catch {
          inviteLink = '❌ Erreur création invite';
        }
      }

      return `**${guild.name}** - ${inviteLink}`;
    }));

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🤖 Informations sur le bot')
      .setDescription(guildsInfo.join('\n'))
      .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  // Ici tu peux garder toutes tes autres commandes existantes (say, ban, mute, etc.)
  // ...
});

client.login(process.env.TOKEN);