const Discord = require('discord.js');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const YouTube = require("simple-youtube-api");
// const { prefix, token, youtube_api_key } = require('./config.json');

client.on('ready', () => {
    console.log(`Bot tag: ${client.user.tag}`);
    console.log(`Guilds: ${client.guilds.cache.size}`);
  client.user.setActivity(`${process.env.prefix}play // Bot par Queensland#0001`, { type: 'PLAYING' });
});

const youtube = new YouTube("AIzaSyDhEBfgJiHGoFpiGZ5ugLgfnPoIuIIFm3U");
const queue = new Map();
const { Util } = require("discord.js");

client.on('message', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.startsWith(process.env.prefix)) return;

  const args = msg.content.split(" ");
  const searchString = args.slice(1).join(" ");
  const url = args[1] ? args[1].replace(/<(.+)>/g, "$1") : "";
  const serverQueue = queue.get(msg.guild.id);

  let command = msg.content.toLowerCase().split(" ")[0];
  command = command.slice(process.env.prefix.length);

  if (command === "play" || command === "p") {
      const voiceChannel = msg.member.voice.channel;
      if (!msg.member.voice.channel) return msg.channel.send("Vous devez être dans un salon vocal pour utiliser les commandes musicales !");
      const permissions = voiceChannel.permissionsFor(msg.client.user);
      if (!permissions.has("CONNECT")) {
          return msg.channel.send("Il semble que je n'aie pas la permission **CONNECT** et que je ne puisse donc pas me connecter.");
      }
      if (!permissions.has("SPEAK")) {
          return msg.channel.send("Il semble que je n'aie pas la permission **SPEAK**, je suis donc incapable de lire la musique.");
      }
      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
          const playlist = await youtube.getPlaylist(url);
          const videos = await playlist.getVideos();
          for (const video of Object.values(videos)) {
              const video2 = await youtube.getVideoByID(video.id);
              await handleVideo(video2, msg, voiceChannel, true);
          }
          return msg.channel.send(`🔊 Playlist: **\`${playlist.title}\`** Added to queue!`);
      } else {
          try {
              var video = await youtube.getVideo(url);
          } catch (error) {
              try {
                  var videos = await youtube.searchVideos(searchString, 10);
                  var video = await youtube.getVideoByID(videos[0].id);
                  if (!video) return msg.channel.send("**❌ Pas de résultats**");
              } catch (err) {
                  console.error(err);
                  return msg.channel.send("**❌ Pas de résultats**");
              }
          }
          return handleVideo(video, msg, voiceChannel);
      }
  }
  if (command === "search" || command === "src") {
      const voiceChannel = msg.member.voice.channel;
      if (!msg.member.voice.channel) return msg.channel.send("Vous devez être dans un salon vocal pour utiliser les commandes musicales !");
      const permissions = voiceChannel.permissionsFor(msg.client.user);
      if (!permissions.has("CONNECT")) {
        return msg.channel.send("Il semble que je n'aie pas la permission **CONNECT** et que je ne puisse donc pas me connecter.");
      }
      if (!permissions.has("SPEAK")) {
        return msg.channel.send("Il semble que je n'aie pas la permission **SPEAK**, je suis donc incapable de lire la musique.");
      }
      if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
          const playlist = await youtube.getPlaylist(url);
          const videos = await playlist.getVideos();
          for (const video of Object.values(videos)) {
              const video2 = await youtube.getVideoByID(video.id);
              await handleVideo(video2, msg, voiceChannel, true);
          }
          return msg.channel.send(`🔊 Playlist: **\`${playlist.title}\`** Added to queue!`);
      } else {
          try {
              var video = await youtube.getVideo(url);
          } catch (error) {
              try {
                  var videos = await youtube.searchVideos(searchString, 10);
                  let index = 0;
                  msg.channel.send(`__**Song selection**__\n${videos.map(video2 => `**\`${++index}\`  |**  ${video2.title}`).join("\n")}\nSaisissez un nombre entre **1** et **10** pour sélectionner un résultat.`);
                  try {
                      var response = await msg.channel.awaitMessages(msg2 => msg2.content > 0 && msg2.content < 11, {
                          max: 1,
                          time: 10000,
                          errors: ["time"]
                      });
                  } catch (err) {
                      console.error(err);
                      return msg.channel.send("La réponse était soit fausse, soit inexistante. La sélection de la vidéo sera donc annulée.");
                  }
                  const videoIndex = parseInt(response.first().content);
                  var video = await youtube.getVideoByID(videos[videoIndex - 1].id);
              } catch (err) {
                  console.error(err);
                  return msg.channel.send("**❌ Pas de résultats**");
              }
          }
          return handleVideo(video, msg, voiceChannel);
      }

  } else if (command === "skip" || command === "s") {
    if (!msg.member.voice.channel) return msg.channel.send("Vous devez être dans un salon vocal pour utiliser les commandes musicales !");
      if (!serverQueue) return msg.channel.send("Il n'y a rien que je puisse skip en ce moment..");
      serverQueue.connection.dispatcher.end("La fonction skip a été utilisée !");
      return msg.channel.send("***⏩ Skipped 👍***");

  } else if (command === "disconnect" || command === "dc") {
    if (!msg.member.voice.channel) return msg.channel.send("Vous devez être dans un salon vocal pour utiliser les commandes musicales !");
      if (!serverQueue) return msg.channel.send("Il n'y a rien que je puisse stopper en ce moment.");
      serverQueue.songs = [];
      serverQueue.connection.dispatcher.end("The stop function has been used!");
      return msg.channel.send("**📭 Bye !**");

  } else if (command === "volume" || command === "v") {
      if (!msg.member.voice.channel) return msg.channel.send("Vous devez être dans un salon vocal pour utiliser les commandes musicales !");
      if (!serverQueue) return msg.channel.send("Aucune chanson ne joue en ce moment.");
      if (!args[1]) return msg.channel.send(`Le volume est de**\`${serverQueue.volume}%\`**.`);
      if (isNaN(args[1]) || args[1] > 100) return msg.channel.send("Le volume doit être compris entre **1** et **100** !");
      serverQueue.volume = args[1];
      serverQueue.connection.dispatcher.setVolume(args[1] / 100);
      return msg.channel.send(`The volume has been set to **\`${args[1]}%\`**`);

  } else if (command === "nowplaying" || command === "np") {
      if (!serverQueue) return msg.channel.send("Aucune chanson ne joue en ce moment.");
      return msg.channel.send(`🎶 Playing: **\`${serverQueue.songs[0].title}\`**`);

  } else if (command === "queue" || command === "q") {
      if (!serverQueue) return msg.channel.send("Aucune chanson ne joue en ce moment.");
      return msg.channel.send(`__**Song Queue**__\n${serverQueue.songs.map(song => `**-** ${song.title}`).join("\n")}\n**Playing: \`${serverQueue.songs[0].title}\`**`);

  } else if (command === "pause" || command === "stop") {
      if (serverQueue && serverQueue.playing) {
          serverQueue.playing = false;
          serverQueue.connection.dispatcher.pause();
          return msg.channel.send("**Paused ⏸**");
      }
      return msg.channel.send("Aucune chanson ne joue en ce moment.");

  } else if (command === "resume" | command === "res") {
      if (serverQueue && !serverQueue.playing) {
          serverQueue.playing = true;
          serverQueue.connection.dispatcher.resume();
          return msg.channel.send("**⏯️ Resuming 👍**");
      }
      return msg.channel.send("Aucune chanson ne joue en ce moment.");
  } else if (command === "loop" | command === "l") {
      if (serverQueue) {
          serverQueue.loop = !serverQueue.loop;
          return msg.channel.send(`**🔂 ${serverQueue.loop === true ? "Activé" : "Désactivé"}!**`);
      };
      return msg.channel.send("Aucune chanson ne joue en ce moment.");
  }
});

async function handleVideo(video, msg, voiceChannel, playlist = false) {
  const serverQueue = queue.get(msg.guild.id);
  const song = {
      id: video.id,
      title: Util.escapeMarkdown(video.title),
      url: `https://www.youtube.com/watch?v=${video.id}`
  };
  if (!serverQueue) {
      const queueConstruct = {
          textChannel: msg.channel,
          voiceChannel: voiceChannel,
          connection: null,
          songs: [],
          volume: 100,
          playing: true,
          loop: false
      };
      queue.set(msg.guild.id, queueConstruct);

      queueConstruct.songs.push(song);

      try {
          var connection = await voiceChannel.join();
          queueConstruct.connection = connection;
          play(msg.guild, queueConstruct.songs[0]);
      } catch (error) {
          console.error(`I couldn't join the voice channel: ${error}`);
          queue.delete(msg.guild.id);
          return msg.channel.send(`I couldn't join the voice channel: **\`${error}\`**`);
      }
  } else {
      serverQueue.songs.push(song);
      if (playlist) return;
      else return msg.channel.send(`🔊 **\`${song.title}\`** added to queue!`);
  }
  return;
}

function play(guild, song) {
  const serverQueue = queue.get(guild.id);

  if (!song) {
      serverQueue.voiceChannel.leave();
      return queue.delete(guild.id);
  }

  const dispatcher = serverQueue.connection.play(ytdl(song.url))
      .on("finish", () => {
          const shiffed = serverQueue.songs.shift();
          if (serverQueue.loop === true) {
              serverQueue.songs.push(shiffed);
          };
          play(guild, serverQueue.songs[0]);
      })
      .on("error", error => console.error(error));
  dispatcher.setVolume(serverQueue.volume / 100);

  serverQueue.textChannel.send(`**🎶 C'est parti pour  \`${song.title}\`**`);
}

client.login(process.env.token);
